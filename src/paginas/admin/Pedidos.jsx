import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import TempoDoPedido from '../../componentes/admin/TempoDoPedido.jsx'
import { lerToken } from '../../servicos/api.js'
import { lojas as servicoLojas } from '../../servicos/lojas.js'
import { pedidos as servicoPedidos } from '../../servicos/pedidos.js'
import { abrirCanalDaLoja } from '../../servicos/tempoReal.js'
import { formatarDinheiro } from '../../utils/dinheiro.js'
import { TEMPOS_PADRAO } from '../../utils/tempos.js'
import './Painel.css'
import './Pedidos.css'

/*
 * Quadro de pedidos.
 *
 * A fila anda da esquerda para a direita e o status só avança — quem garante
 * isso é a API. No desktop o lojista pode arrastar a ficha até a etapa
 * seguinte; no celular a mesma coisa é feita pelo botão do cartão.
 *
 * Cancelado não ocupa espaço no quadro: fica fechado no fim da tela, para
 * consulta, e no histórico (Arquivados) quando é arquivado.
 */

/*
 * Cores das etapas.
 *
 * Servem para o lojista achar a coluna de longe, sem ler: cada etapa tem a sua.
 * A ordem vai do quente (esperando) ao frio (terminado) de propósito — é a
 * leitura natural de quem chega no quadro e quer saber onde está o trabalho.
 */
const COLUNAS = [
  { status: 'novo', titulo: 'Novo', acao: 'Aceitar pedido', cor: '#c2410c' },
  { status: 'aceito', titulo: 'Aceito', acao: 'Iniciar preparo', cor: '#1d4ed8' },
  { status: 'preparando', titulo: 'Preparando', acao: 'Marcar pronto', cor: '#6d28d9' },
  { status: 'pronto', titulo: 'Pronto', acao: 'Saiu para entrega', cor: '#047857' },
  { status: 'saiu_entrega', titulo: 'Saiu para entrega', acao: 'Marcar entregue', cor: '#0369a1' },
  { status: 'entregue', titulo: 'Entregue', acao: null, cor: '#475569' },
]

// Ordem do atendimento: define até onde cada pedido pode ser arrastado.
const ORDEM = COLUNAS.map((coluna) => coluna.status)

// Fluxo de fábrica. A loja escolhe quais etapas aparecem em Configurações.
const FLUXO_PADRAO = { etapas: [...ORDEM], autoAceite: false }

/*
 * Colunas que o quadro vai mostrar.
 *
 * `alvo` é para onde o botão da coluna leva e `acao` é o texto dele. A última
 * coluna visível finaliza o pedido: se a loja escondeu "Entregue", "Pronto"
 * vira o fim da linha — sem isso o pedido ficaria preso no quadro para sempre.
 */
function colunasDa(etapas) {
  const visiveis = COLUNAS.filter((coluna) => etapas.includes(coluna.status))
  const lista = visiveis.length ? visiveis : COLUNAS

  return lista.map((coluna, indice) => {
    const proxima = lista[indice + 1]
    const ultima = !proxima
    const alvo = ultima ? (coluna.status === 'entregue' ? null : 'entregue') : proxima.status

    // Etapa escondida no meio do caminho: o texto diz para onde o pedido vai.
    const pulaEtapa =
      !ultima && ORDEM.indexOf(proxima.status) !== ORDEM.indexOf(coluna.status) + 1

    let acao = coluna.acao

    if (ultima) acao = alvo ? 'Finalizar pedido' : null
    else if (pulaEtapa) acao = `Mover para ${proxima.titulo}`

    return { ...coluna, acao, alvo }
  })
}

/*
 * Em que coluna um pedido aparece: a do próprio status. Se essa etapa estiver
 * escondida, ele cai na próxima etapa visível — pedido nenhum pode sumir.
 */
function colunaDoPedido(pedido, colunas) {
  const posicao = ORDEM.indexOf(pedido.status)

  return (
    colunas.find((coluna) => ORDEM.indexOf(coluna.status) >= posicao) ||
    colunas[colunas.length - 1]
  )
}

const PAGAMENTO = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao: 'Cartão',
}

// Busca sem frescura: "jose" acha "José", "#58" acha o 58.
function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/*
 * O que a busca procura: nome do cliente, número do pedido e código (_id).
 * O telefone entrou de brinde — é o que o lojista tem na mão quando o cliente
 * liga perguntando do pedido.
 */
function combinaBusca(pedido, termo) {
  const alvo = normalizar(termo)

  if (!alvo) return true

  const limpo = alvo.replace(/^#/, '')
  const numero = String(pedido.numero ?? '')
  const id = String(pedido._id ?? '').toLowerCase()
  const nome = normalizar(pedido.cliente?.nome)
  const telefone = String(pedido.cliente?.telefone ?? '').replace(/\D/g, '')
  const digitos = limpo.replace(/\D/g, '')

  if (nome.includes(alvo)) return true
  if (numero && numero.startsWith(limpo)) return true
  // Código só a partir de 4 dígitos: senão "1" chamaria meio banco.
  if (limpo.length >= 4 && id.endsWith(limpo)) return true
  if (digitos.length >= 4 && telefone.includes(digitos)) return true

  return false
}

// Mesa ainda é rara: o filtro só aparece quando existe pedido de mesa na tela.
const FILTROS_TIPO = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'delivery', rotulo: 'Delivery' },
  { valor: 'mesa', rotulo: 'Mesa' },
  { valor: 'balcao', rotulo: 'Balcão' },
]

const NOME_DO_TIPO = {
  delivery: 'Delivery',
  mesa: 'Mesa',
  balcao: 'Balcão',
}

function horaDoPedido(criadoEm) {
  return new Date(criadoEm).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function dataDoPedido(criadoEm) {
  return new Date(criadoEm).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function podeAvancarPara(pedido, status) {
  return ORDEM.indexOf(status) > ORDEM.indexOf(pedido.status)
}

function Ficha({
  pedido,
  tempos,
  acao,
  confirmando,
  ocupado,
  arrastando,
  onAvancar,
  onArquivar,
  onPedirConfirmacao,
  onDesistir,
  onConfirmar,
  onComecarArrasto,
  onTerminarArrasto,
}) {
  const telefoneLimpo = (pedido.cliente.telefone || '').replace(/\D/g, '')
  const observacao = pedido.observacao

  return (
    <article
      className={`ficha ${pedido.status === 'novo' ? 'ficha--novo' : ''} ${
        arrastando ? 'ficha--arrastando' : ''
      }`}
      draggable={!confirmando}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', pedido._id)
        e.dataTransfer.effectAllowed = 'move'
        onComecarArrasto(pedido._id)
      }}
      onDragEnd={onTerminarArrasto}
    >
      <header className="ficha__cabeca">
        <span className="ficha__numero">#{pedido.numero}</span>
        <span className="ficha__hora">{horaDoPedido(pedido.criadoEm)}</span>
        <span
          className={`ficha__origem ${
            pedido.tipo === 'delivery' ? 'ficha__origem--entrega' : ''
          }`}
        >
          {pedido.tipo === 'delivery' ? 'Delivery' : 'Balcão'}
        </span>
      </header>

      <p className="ficha__cliente">{pedido.cliente.nome}</p>

      {/* O lojista atende pelo celular: o telefone tem que discar. */}
      {telefoneLimpo && (
        <a className="ficha__telefone" href={`tel:${telefoneLimpo}`}>
          {pedido.cliente.telefone}
        </a>
      )}

      <ul className="ficha__itens">
        {pedido.itens.map((item, indice) => (
          <li className="ficha__item" key={`${item.nome}-${indice}`}>
            <span className="ficha__item-qtd">{item.quantidade}×</span>
            <span>
              {item.nome}
              {item.observacao && <span className="ficha__obs">“{item.observacao}”</span>}
            </span>
          </li>
        ))}
      </ul>

      {pedido.tipo === 'delivery' && pedido.endereco?.rua && (
        <p className="ficha__endereco">
          {pedido.endereco.rua}, {pedido.endereco.numero} · {pedido.bairroNome}
          {pedido.endereco.referencia && (
            <span className="ficha__referencia">Referência: {pedido.endereco.referencia}</span>
          )}
        </p>
      )}

      {observacao && (
        <p className="ficha__endereco">
          <span className="ficha__referencia">Observação do cliente</span>
          {observacao}
        </p>
      )}

      {pedido.status !== 'entregue' && pedido.status !== 'cancelado' && (
        <div className="ficha__tempo">
          <TempoDoPedido pedido={pedido} tempos={tempos} />
        </div>
      )}

      <footer className="ficha__rodape">
        <div className="ficha__pagamento">
          <span className="ficha__pagamento-nome">
            {PAGAMENTO[pedido.pagamento] || pedido.pagamento}
          </span>
          {pedido.pagamento === 'dinheiro' && pedido.trocoPara > 0 && (
            <span className="ficha__troco">troco para {formatarDinheiro(pedido.trocoPara)}</span>
          )}
        </div>
        <strong className="ficha__total">{formatarDinheiro(pedido.total)}</strong>
      </footer>

      {confirmando ? (
        <div className="ficha__confirmar">
          <span className="ficha__confirmar-texto">
            {confirmando === 'remover' ? 'Apagar de vez?' : 'Cancelar este pedido?'}
          </span>
          <div className="ficha__confirmar-botoes">
            <button
              className="ficha__confirmar-nao"
              type="button"
              disabled={ocupado}
              onClick={onDesistir}
            >
              Não
            </button>
            <button
              className="ficha__confirmar-sim"
              type="button"
              disabled={ocupado}
              onClick={onConfirmar}
            >
              {confirmando === 'remover' ? 'Apagar' : 'Cancelar pedido'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {acao && (
            <button
              className="ficha__acao"
              type="button"
              disabled={ocupado}
              onClick={onAvancar}
            >
              {ocupado ? 'Salvando…' : acao}
            </button>
          )}

          <div className="ficha__links">
            {(pedido.status === 'entregue' || pedido.status === 'cancelado') && (
              <button
                className="ficha__link"
                type="button"
                disabled={ocupado}
                onClick={onArquivar}
              >
                Arquivar
              </button>
            )}

            {pedido.status !== 'entregue' && pedido.status !== 'cancelado' && (
              <button
                className="ficha__link ficha__link--perigo"
                type="button"
                disabled={ocupado}
                onClick={() => onPedirConfirmacao('cancelar')}
              >
                Cancelar pedido
              </button>
            )}

            {pedido.status === 'cancelado' && (
              <button
                className="ficha__link ficha__link--perigo"
                type="button"
                disabled={ocupado}
                onClick={() => onPedirConfirmacao('remover')}
              >
                Apagar
              </button>
            )}
          </div>
        </>
      )}
    </article>
  )
}

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([])
  const [resumo, setResumo] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [aoVivo, setAoVivo] = useState(false)
  const [periodo, setPeriodo] = useState('hoje')
  const [visao, setVisao] = useState('quadro')
  const [ocupado, setOcupado] = useState(null)
  const [confirmar, setConfirmar] = useState(null)

  // Prazo de cada etapa, por loja. Enquanto não chega, vale o padrão: contador
  // nunca pode ser o motivo de o quadro não abrir.
  const [tempos, setTempos] = useState(TEMPOS_PADRAO)
  // Quais etapas esta loja mostra. Mesmo caso: até a resposta chegar, o fluxo
  // completo vale, senão o quadro abriria vazio.
  const [fluxo, setFluxo] = useState(FLUXO_PADRAO)

  // Ficha sendo arrastada e coluna sob o ponteiro.
  const [arrastandoId, setArrastandoId] = useState(null)
  const [colunaAlvo, setColunaAlvo] = useState(null)

  // Aba só existe no celular. null = segue a fila.
  const [abaEscolhida, setAbaEscolhida] = useState(null)

  // Busca e filtro do quadro. Não vão para a API: a fila já vem inteira na
  // memória, então filtrar aqui é instantâneo e não perde o tempo real.
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState('todos')

  const arquivados = visao === 'arquivados'

  const carregar = useCallback(async () => {
    try {
      const [lista, numeros] = await Promise.all([
        servicoPedidos.listar({ hoje: periodo === 'hoje', arquivados }),
        servicoPedidos.resumo(),
      ])

      setPedidos(lista.pedidos)
      setResumo(numeros.resumo)
      setErro('')
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [periodo, arquivados])

  // O canal precisa sempre da versão nova de carregar().
  const carregarAtual = useRef(carregar)

  useEffect(() => {
    carregarAtual.current = carregar
  }, [carregar])

  useEffect(() => {
    setCarregando(true)
    carregar()
  }, [carregar])

  useEffect(() => {
    let ativo = true

    servicoLojas
      .minha()
      .then(({ loja }) => {
        if (!ativo) return

        setTempos({ ...TEMPOS_PADRAO, ...(loja.tempos || {}) })

        const etapas = loja.fluxoPedidos?.etapas

        setFluxo({
          etapas: Array.isArray(etapas) && etapas.length ? etapas : FLUXO_PADRAO.etapas,
          autoAceite: loja.fluxoPedidos?.autoAceite === true,
        })
      })
      .catch(() => {
        // Sem os tempos da loja o contador usa o padrão.
      })

    return () => {
      ativo = false
    }
  }, [])

  useEffect(() => {
    const token = lerToken()

    if (!token) return undefined

    const canal = abrirCanalDaLoja()
    const atualizar = () => carregarAtual.current()

    canal.on('connect', () => setAoVivo(true))
    canal.on('disconnect', () => setAoVivo(false))
    canal.on('pedido:atualizado', atualizar)

    return () => canal.disconnect()
  }, [])

  const numeros = {
    fila: (resumo?.novos || 0) + (resumo?.emAndamento || 0),
    entregues: resumo?.entreguesHoje || 0,
    faturamento: resumo?.faturamentoHoje || 0,
    ticket: resumo?.entreguesHoje ? resumo.faturamentoHoje / resumo.entreguesHoje : 0,
  }

  const cancelados = pedidos.filter((pedido) => pedido.status === 'cancelado')

  // O quadro só trabalha com pedido em andamento: cancelado fica de fora.
  const noQuadro = pedidos.filter((pedido) => pedido.status !== 'cancelado')

  const colunas = useMemo(() => colunasDa(fluxo.etapas), [fluxo.etapas])

  // Filtro é de tela: o quadro mostra o que o lojista procura, sem esconder
  // pedido nenhum do banco. "Mesa" só entra quando existe pedido de mesa.
  const tiposNaTela = new Set(noQuadro.map((pedido) => pedido.tipo))

  const filtrando = busca.trim() !== '' || tipo !== 'todos'

  const visiveis = noQuadro.filter(
    (pedido) => (tipo === 'todos' || pedido.tipo === tipo) && combinaBusca(pedido, busca),
  )

  function totalDa(status) {
    return visiveis.filter((pedido) => colunaDoPedido(pedido, colunas).status === status).length
  }

  // No celular abre na primeira etapa que tem pedido esperando.
  const statusDaVez =
    colunas.find((coluna) => totalDa(coluna.status) > 0)?.status || colunas[0].status

  const abaAtiva = abaEscolhida ?? statusDaVez
  const colunaAtiva = colunas.find((coluna) => coluna.status === abaAtiva) || colunas[0]

  async function executar(id, acao) {
    setOcupado(id)
    setErro('')

    try {
      await acao()
      await carregar()
    } catch (e) {
      setErro(e.message)
    } finally {
      setOcupado(null)
      setConfirmar(null)
    }
  }

  function avancar(pedido, coluna) {
    // Pedido numa etapa escondida: primeiro ele alcança a coluna onde está.
    const alvo =
      ORDEM.indexOf(pedido.status) < ORDEM.indexOf(coluna.status) ? coluna.status : coluna.alvo

    if (!alvo) return

    executar(pedido._id, () => servicoPedidos.mudarStatus(pedido._id, alvo))
  }

  /* Arrastar e soltar: leva o pedido para a etapa onde a ficha caiu. Só vale
     para frente — voltar etapa não existe no atendimento. */
  function soltarNaColuna(evento, status) {
    evento.preventDefault()

    const id = evento.dataTransfer.getData('text/plain')
    const pedido = pedidos.find((item) => item._id === id)

    setColunaAlvo(null)
    setArrastandoId(null)

    if (!pedido || !podeAvancarPara(pedido, status)) return

    executar(pedido._id, () => servicoPedidos.mudarStatus(pedido._id, status))
  }

  function confirmarAcao(pedido) {
    const acao = confirmar?.acao

    if (acao === 'cancelar') {
      executar(pedido._id, () => servicoPedidos.mudarStatus(pedido._id, 'cancelado'))
      return
    }

    if (acao === 'remover') {
      executar(pedido._id, () => servicoPedidos.remover(pedido._id))
    }
  }

  function ficha(pedido, coluna) {
    return (
      <Ficha
        key={pedido._id}
        pedido={pedido}
        tempos={tempos}
        acao={coluna?.acao || null}
        ocupado={ocupado === pedido._id}
        confirmando={confirmar?.id === pedido._id ? confirmar.acao : null}
        arrastando={arrastandoId === pedido._id}
        onAvancar={() => coluna && avancar(pedido, coluna)}
        onArquivar={() => executar(pedido._id, () => servicoPedidos.arquivar(pedido._id))}
        onPedirConfirmacao={(novaAcao) => setConfirmar({ id: pedido._id, acao: novaAcao })}
        onDesistir={() => setConfirmar(null)}
        onConfirmar={() => confirmarAcao(pedido)}
        onComecarArrasto={setArrastandoId}
        onTerminarArrasto={() => {
          setArrastandoId(null)
          setColunaAlvo(null)
        }}
      />
    )
  }

  return (
    <div className="tabuleiro">
      <header className="tabuleiro__topo">
        <div>
          <h1 className="tabuleiro__titulo">
            {arquivados ? 'Pedidos arquivados' : 'Pedidos'}
          </h1>
          <p className="tabuleiro__subtitulo">
            {arquivados
              ? 'Histórico do que saiu do quadro. Continua valendo para relatórios e faturamento.'
              : 'A fila corre da esquerda para a direita. '}
            {!arquivados && (
              <span className="tabuleiro__dica">Arraste a ficha para mudar a etapa.</span>
            )}
          </p>
        </div>

        <div className="tabuleiro__controles">
          <span className={`tabuleiro__sinal ${aoVivo ? 'tabuleiro__sinal--ligado' : ''}`}>
            {aoVivo ? 'ao vivo' : 'reconectando'}
          </span>

          <div className="segmento" role="group" aria-label="Período">
            <button
              type="button"
              className={`segmento__botao ${periodo === 'hoje' ? 'segmento__botao--ativo' : ''}`}
              onClick={() => setPeriodo('hoje')}
            >
              Hoje
            </button>
            <button
              type="button"
              className={`segmento__botao ${periodo === 'todos' ? 'segmento__botao--ativo' : ''}`}
              onClick={() => setPeriodo('todos')}
            >
              Todos
            </button>
          </div>

          <div className="segmento" role="group" aria-label="Visão">
            <button
              type="button"
              className={`segmento__botao ${!arquivados ? 'segmento__botao--ativo' : ''}`}
              onClick={() => setVisao('quadro')}
            >
              Quadro
            </button>
            <button
              type="button"
              className={`segmento__botao ${arquivados ? 'segmento__botao--ativo' : ''}`}
              onClick={() => setVisao('arquivados')}
            >
              Arquivados
            </button>
          </div>
        </div>
      </header>

      {erro && <p className="tabuleiro__erro">{erro}</p>}

      <div className="tabuleiro__resumo">
        <div className={`tabuleiro__numero ${numeros.fila > 0 ? 'tabuleiro__numero--destaque' : ''}`}>
          <span className="tabuleiro__numero-valor">{numeros.fila}</span>
          <span className="tabuleiro__numero-rotulo">na fila agora</span>
        </div>
        <div className="tabuleiro__numero">
          <span className="tabuleiro__numero-valor">{numeros.entregues}</span>
          <span className="tabuleiro__numero-rotulo">entregues hoje</span>
        </div>
        <div className="tabuleiro__numero">
          <span className="tabuleiro__numero-valor">{formatarDinheiro(numeros.faturamento)}</span>
          <span className="tabuleiro__numero-rotulo">faturamento de hoje</span>
        </div>
        <div className="tabuleiro__numero">
          <span className="tabuleiro__numero-valor">{formatarDinheiro(numeros.ticket)}</span>
          <span className="tabuleiro__numero-rotulo">ticket médio</span>
        </div>
      </div>

      {/* Busca e filtro. A fila já está inteira na memória: filtrar aqui é
          instantâneo e não atrapalha o tempo real. */}
      {!arquivados && (
        <section className="busca" aria-label="Buscar e filtrar pedidos">
          <label className="busca__campo">
            <svg
              className="busca__lupa"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.6-3.6" strokeLinecap="round" />
            </svg>

            <input
              type="search"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Buscar por nome, número ou código"
              aria-label="Buscar pedido por nome, número ou código"
            />

            {busca && (
              <button
                className="busca__limpar"
                type="button"
                onClick={() => setBusca('')}
                aria-label="Limpar busca"
              >
                ✕
              </button>
            )}
          </label>

          <div className="segmento busca__tipos" role="group" aria-label="Tipo de pedido">
            {FILTROS_TIPO.filter(
              (opcao) =>
                opcao.valor === 'todos' || opcao.valor === tipo || tiposNaTela.has(opcao.valor),
            ).map((opcao) => (
              <button
                key={opcao.valor}
                type="button"
                className={`segmento__botao ${tipo === opcao.valor ? 'segmento__botao--ativo' : ''}`}
                onClick={() => setTipo(opcao.valor)}
              >
                {opcao.rotulo}
              </button>
            ))}
          </div>

          {filtrando && (
            <p className="busca__resumo">
              <span>
                {visiveis.length} de {noQuadro.length}{' '}
                {noQuadro.length === 1 ? 'pedido' : 'pedidos'}
              </span>

              <button
                className="busca__limpar-tudo"
                type="button"
                onClick={() => {
                  setBusca('')
                  setTipo('todos')
                }}
              >
                limpar filtro
              </button>
            </p>
          )}
        </section>
      )}

      {carregando && <p className="tabuleiro__subtitulo">Carregando pedidos…</p>}

      {!carregando && arquivados && (
        <section className="historico">
          {pedidos.length === 0 && (
            <p className="tabuleiro__aviso-texto">
              Nenhum pedido arquivado {periodo === 'hoje' ? 'hoje' : 'até agora'}.
            </p>
          )}

          {pedidos.map((pedido) => (
            <div className="historico__linha" key={pedido._id}>
              <div className="historico__texto">
                <strong className="historico__titulo">
                  #{pedido.numero} · {pedido.cliente.nome}
                </strong>
                <span className="historico__detalhe">
                  {dataDoPedido(pedido.criadoEm)} · {formatarDinheiro(pedido.total)} ·{' '}
                  {pedido.status === 'cancelado' ? 'cancelado' : 'entregue'}
                </span>
              </div>

              <div className="historico__acoes">
                {confirmar?.id === pedido._id ? (
                  <>
                    <span className="ficha__confirmar-texto">Apagar de vez?</span>
                    <button
                      className="historico__botao historico__botao--perigo"
                      type="button"
                      disabled={ocupado === pedido._id}
                      onClick={() => confirmarAcao(pedido)}
                    >
                      Apagar
                    </button>
                    <button
                      className="historico__botao"
                      type="button"
                      onClick={() => setConfirmar(null)}
                    >
                      Não
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="historico__botao"
                      type="button"
                      disabled={ocupado === pedido._id}
                      onClick={() =>
                        executar(pedido._id, () => servicoPedidos.desarquivar(pedido._id))
                      }
                    >
                      Desarquivar
                    </button>

                    {pedido.status === 'cancelado' && (
                      <button
                        className="historico__botao historico__botao--perigo"
                        type="button"
                        disabled={ocupado === pedido._id}
                        onClick={() => setConfirmar({ id: pedido._id, acao: 'remover' })}
                      >
                        Apagar
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {!carregando && !arquivados && (
        <>
          {/* Desktop: seis prateleiras lado a lado, com arrastar e soltar. */}
          <div className="tabuleiro__quadro">
            {colunas.map((coluna, indice) => {
              const cartoes = visiveis.filter(
                (pedido) => colunaDoPedido(pedido, colunas).status === coluna.status,
              )
              const arrastado = pedidos.find((pedido) => pedido._id === arrastandoId)
              const aceita = arrastado ? podeAvancarPara(arrastado, coluna.status) : false

              const classeAlvo =
                colunaAlvo === coluna.status
                  ? aceita
                    ? 'prateleira--alvo'
                    : 'prateleira--bloqueada'
                  : ''

              return (
                <section
                  className={`prateleira ${classeAlvo}`}
                  key={coluna.status}
                  data-status={coluna.status}
                  style={{ '--cor-coluna': coluna.cor }}
                  onDragOver={(e) => {
                    if (!arrastandoId) return
                    e.preventDefault()
                    e.dataTransfer.dropEffect = aceita ? 'move' : 'none'
                    setColunaAlvo(coluna.status)
                  }}
                  onDragLeave={(e) => {
                    // Só limpa quando o ponteiro sai da coluna de verdade.
                    if (e.currentTarget.contains(e.relatedTarget)) return
                    setColunaAlvo(null)
                  }}
                  onDrop={(e) => soltarNaColuna(e, coluna.status)}
                >
                  <header className="prateleira__topo">
                    <h2 className="prateleira__nome">
                      <span className="prateleira__passo" aria-hidden="true">
                        {indice + 1}
                      </span>
                      {coluna.titulo}
                    </h2>
                    <span className="prateleira__contagem">{cartoes.length}</span>
                  </header>

                  <div className="prateleira__corpo">
                    {cartoes.length === 0 && (
                      <p className="prateleira__vazio">
                        {filtrando ? 'Nenhum pedido com esse filtro' : 'Nenhum pedido'}
                      </p>
                    )}

                    {cartoes.map((pedido) => ficha(pedido, coluna))}
                  </div>
                </section>
              )
            })}
          </div>

          {/* Celular: uma etapa por vez, escolhida nas abas. */}
          <div className="tabuleiro__movel">
            <div className="tabuleiro__abas" role="tablist" aria-label="Etapas do pedido">
              {colunas.map((coluna) => {
                const total = totalDa(coluna.status)

                return (
                  <button
                    key={coluna.status}
                    type="button"
                    role="tab"
                    aria-selected={abaAtiva === coluna.status}
                    className={`tabuleiro__aba ${
                      abaAtiva === coluna.status ? 'tabuleiro__aba--ativa' : ''
                    }`}
                    style={{ '--cor-coluna': coluna.cor }}
                    onClick={() => setAbaEscolhida(coluna.status)}
                  >
                    {coluna.titulo}
                    <span className="tabuleiro__aba-contagem">{total}</span>
                  </button>
                )
              })}
            </div>

            <section className="prateleira" style={{ '--cor-coluna': colunaAtiva.cor }}>
              <header className="prateleira__topo">
                <h2 className="prateleira__nome">
                  <span className="prateleira__passo" aria-hidden="true">
                    {colunas.indexOf(colunaAtiva) + 1}
                  </span>
                  {colunaAtiva.titulo}
                </h2>
                <span className="prateleira__contagem">{totalDa(colunaAtiva.status)}</span>
              </header>

              <div className="prateleira__corpo">
                {totalDa(colunaAtiva.status) === 0 && (
                  <p className="prateleira__vazio">
                    {filtrando
                      ? 'Nenhum pedido com esse filtro'
                      : `Nenhum pedido em “${colunaAtiva.titulo.toLowerCase()}”`}
                  </p>
                )}

                {visiveis
                  .filter((pedido) => colunaDoPedido(pedido, colunas).status === colunaAtiva.status)
                  .map((pedido) => ficha(pedido, colunaAtiva))}
              </div>
            </section>
          </div>

          {noQuadro.length === 0 && (
            <section className="tabuleiro__aviso">
              <p className="tabuleiro__aviso-titulo">
                Nenhum pedido {periodo === 'hoje' ? 'hoje' : 'até agora'}
              </p>
              <p className="tabuleiro__aviso-texto">
                Quando um cliente fechar um pedido, ele aparece aqui na hora.
              </p>
            </section>
          )}

          {cancelados.length > 0 && (
            <details className="tabuleiro__cancelados">
              <summary>
                Cancelados ({cancelados.length})
              </summary>

              <div className="tabuleiro__cancelados-lista">
                {cancelados.map((pedido) => ficha(pedido, null))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  )
}
