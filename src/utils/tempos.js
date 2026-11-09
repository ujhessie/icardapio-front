/*
 * Tempos de atendimento.
 *
 * Cada etapa do pedido tem um prazo, em minutos. O padrão vale para toda loja
 * nova; o lojista muda o dele em Configurações (a API guarda por loja).
 *
 * O quadro mostra duas contagens crescentes por pedido:
 *   - tempo na tela: desde que o pedido chegou (criadoEm);
 *   - tempo na etapa: desde que ele entrou no status atual (marco da etapa).
 * Quem tem prazo é a etapa: quando ela estoura, o chip fica vermelho.
 *
 * Pedido antigo, sem marco gravado, cai no atualizadoEm — nunca fica sem
 * contador.
 */

export const TEMPOS_PADRAO = {
  aceitar: 5,
  preparar: 5,
  pronto: 30,
  entregar: 10,
}

export const TEMPO_MIN = 1
export const TEMPO_MAX = 240

// Status → qual prazo vale e qual marco marca a entrada na etapa.
// Cada etapa conta do seu próprio início: os 10 min de entrega começam quando
// o pedido sai, não quando ficou pronto.
const ETAPAS = {
  novo: { chave: 'aceitar', rotulo: 'aceitar o pedido', marco: 'criadoEm' },
  aceito: { chave: 'preparar', rotulo: 'iniciar o preparo', marco: 'aceitoEm' },
  preparando: { chave: 'pronto', rotulo: 'ficar pronto', marco: 'preparandoEm' },
  pronto: { chave: 'entregar', rotulo: 'entregar', marco: 'prontoEm' },
  saiu_entrega: { chave: 'entregar', rotulo: 'entregar', marco: 'saiuEm' },
}

function segundosDesde(data, agora) {
  const inicio = new Date(data).getTime()

  if (Number.isNaN(inicio)) return 0

  return Math.max(0, Math.round((agora - inicio) / 1000))
}

/** Quando o pedido entrou na etapa em que está agora. */
function inicioDaEtapa(pedido, marco) {
  return (
    pedido?.marcos?.[marco] ||
    pedido?.[marco] ||
    pedido?.atualizadoEm ||
    pedido?.criadoEm
  )
}

/** Há quanto tempo o pedido está na tela, em segundos. */
export function tempoNaTela(pedido, agora = Date.now()) {
  if (!pedido?.criadoEm) return null

  return segundosDesde(pedido.criadoEm, agora)
}

/**
 * Há quanto tempo o pedido está na etapa atual, e o prazo dela.
 * Devolve null em etapa final (entregue/cancelado): ali não há o que contar.
 */
export function tempoNaEtapa(pedido, tempos, agora = Date.now()) {
  const etapa = ETAPAS[pedido?.status]

  if (!etapa) return null

  const minutos = Number(tempos?.[etapa.chave]) || TEMPOS_PADRAO[etapa.chave]
  const limiteSeg = minutos * 60
  const passadoSeg = segundosDesde(inicioDaEtapa(pedido, etapa.marco), agora)

  return {
    chave: etapa.chave,
    rotulo: etapa.rotulo,
    minutos,
    inicio: inicioDaEtapa(pedido, etapa.marco),
    limiteSeg,
    passadoSeg,
    atrasado: passadoSeg > limiteSeg,
    // 0 a 1+: quanto do prazo da etapa já foi consumido.
    proporcao: limiteSeg > 0 ? passadoSeg / limiteSeg : 1,
  }
}

/** Contagem em mm:ss (ou h:mm quando passa de uma hora). */
export function formatarContagem(segundos) {
  const total = Math.abs(Math.round(segundos))
  const horas = Math.floor(total / 3600)
  const minutos = Math.floor((total % 3600) / 60)
  const resto = total % 60

  if (horas > 0) {
    return `${horas}h ${String(minutos).padStart(2, '0')}m`
  }

  return `${String(minutos).padStart(2, '0')}:${String(resto).padStart(2, '0')}`
}

/** Quanto tempo um pedido pode levar no total, somando todas as etapas. */
export function tempoTotal(tempos) {
  const valores = { ...TEMPOS_PADRAO, ...(tempos || {}) }

  return Object.values(valores).reduce((soma, minutos) => soma + Number(minutos || 0), 0)
}
