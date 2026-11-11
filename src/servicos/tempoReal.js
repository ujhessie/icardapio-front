// Canal de novidades com a loja.
//
// Antes isto era Socket.io: uma conexão aberta, e a loja avisava na hora. A
// Vercel não mantém conexão aberta entre acessos, então trocamos por consulta
// periódica (polling): o front pergunta de tempos em tempos e compara.
//
// Custo aceito: até ~3s de atraso. Ganho: sempre lê a verdade do banco, então
// não perde aviso quando a hospedagem roda várias instâncias ao mesmo tempo.
import { publico } from './publico.js'
import { pedidos } from './pedidos.js'

const INTERVALO_PEDIDO = 3000
const INTERVALO_PEDIDO_ENCERRADO = 15000
const INTERVALO_LOJA = 5000
const STATUS_ENCERRADOS = new Set(['entregue', 'cancelado'])

/*
 * Pedido que o próprio painel acabou de lançar.
 *
 * O sino existe para avisar de pedido que chegou de fora. Quando o lojista
 * lança o pedido na mão, ele já sabe que ele existe — tocar seria o painel
 * avisando o lojista dele mesmo. A marca vale uma leitura só.
 */
const pedidosLocais = new Set()

export function marcarPedidoLocal(id) {
  if (id) pedidosLocais.add(String(id))
}

export function ehPedidoLocal(id) {
  const chave = String(id || '')

  if (!pedidosLocais.has(chave)) return false

  pedidosLocais.delete(chave)
  return true
}

/**
 * Lista de inscritos por evento, no mesmo formato do Socket.io:
 * canal.on('pedido:status', fn).
 */
function criarOuvintes() {
  const mapa = new Map()

  return {
    ao(evento, callback) {
      if (!mapa.has(evento)) mapa.set(evento, new Set())
      mapa.get(evento).add(callback)
      return () => mapa.get(evento)?.delete(callback)
    },

    emitir(evento, dados) {
      const inscritos = mapa.get(evento)
      if (!inscritos) return

      for (const callback of [...inscritos]) {
        try {
          callback(dados)
        } catch (erro) {
          console.error('Erro em ouvinte de tempo real:', erro)
        }
      }
    },
  }
}

/**
 * Relógio que chama `buscar` de tempos em tempos.
 * - começa na hora (primeira carga)
 * - pausa com a aba escondida e retoma ao voltar
 * - nunca dispara duas consultas ao mesmo tempo
 */
function criarRelogio({ buscar, intervalo, intervaloFinal = intervalo, estaFinal = () => false }) {
  let timer = null
  let parado = false
  let consultando = false

  function agendar(espera) {
    if (parado) return

    clearTimeout(timer)
    timer = setTimeout(rodar, espera)
  }

  async function rodar() {
    if (parado || consultando) return

    // Aba escondida: não gasta requisição, só espera.
    if (document.hidden) {
      agendar(intervalo)
      return
    }

    consultando = true

    try {
      await buscar()
    } finally {
      consultando = false
    }

    agendar(estaFinal() ? intervaloFinal : intervalo)
  }

  function aoTrocarVisibilidade() {
    if (document.hidden) return

    clearTimeout(timer)
    rodar()
  }

  document.addEventListener('visibilitychange', aoTrocarVisibilidade)
  agendar(0)

  return {
    parar() {
      parado = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', aoTrocarVisibilidade)
    },
  }
}

/**
 * Canal de um pedido: acompanhamento do cliente.
 * Emite 'connect', 'disconnect', 'pedido:status' e 'pedido:removido'.
 */
export function abrirCanalDoPedido(slug, pedidoId) {
  const { ao, emitir } = criarOuvintes()

  let anterior = null
  let conectado = false
  let ultimoErro = null

  const relogio = criarRelogio({
    intervalo: INTERVALO_PEDIDO,
    intervaloFinal: INTERVALO_PEDIDO_ENCERRADO,
    estaFinal: () => Boolean(anterior && STATUS_ENCERRADOS.has(anterior.status)),

    async buscar() {
      let resposta

      try {
        resposta = await publico.pedido(slug, pedidoId)
      } catch (erro) {
        // O pedido sumiu (arquivado/removido): avisa uma vez e encerra.
        if (erro.status === 404 && ultimoErro !== 'removido') {
          ultimoErro = 'removido'
          emitir('pedido:removido')
          relogio.parar()
          return
        }

        if (conectado) {
          conectado = false
          emitir('disconnect')
        }

        return
      }

      if (!conectado) {
        conectado = true
        ultimoErro = null
        emitir('connect')
      }

      const pedido = resposta.pedido
      const mudou = !anterior || JSON.stringify(pedido) !== JSON.stringify(anterior)

      anterior = pedido

      if (mudou) emitir('pedido:status', { pedido })
    },
  })

  return {
    on: ao,

    disconnect() {
      relogio.parar()
      conectado = false
    },
  }
}

/**
 * Canal do painel: mostra novidade quando qualquer pedido muda.
 * Emite 'connect', 'disconnect' e 'pedido:atualizado' (as telas recarregam).
 */
export function abrirCanalDaLoja() {
  const { ao, emitir } = criarOuvintes()

  let assinaturaAnterior = null
  let conectado = false

  const relogio = criarRelogio({
    intervalo: INTERVALO_LOJA,

    async buscar() {
      let resposta

      try {
        resposta = await pedidos.listar()
      } catch {
        if (conectado) {
          conectado = false
          emitir('disconnect')
        }

        return
      }

      if (!conectado) {
        conectado = true
        emitir('connect')
      }

      const lista = resposta.pedidos || []
      const assinatura = lista
        .map((pedido) => `${pedido._id}:${pedido.status}:${pedido.atualizadoEm || ''}`)
        .sort()
        .join('|')

      // Primeira leitura serve de referência: quem precisa saber o que já
      // existia (o sino não pode tocar para pedido velho) se ancora nela.
      if (assinaturaAnterior === null) {
        emitir('pedidos:iniciais', { pedidos: lista })
      } else if (assinatura !== assinaturaAnterior) {
        emitir('pedido:atualizado', { pedidos: lista })
      }

      assinaturaAnterior = assinatura
    },
  })

  return {
    on: ao,

    disconnect() {
      relogio.parar()
      conectado = false
    },
  }
}
