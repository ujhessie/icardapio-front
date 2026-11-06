/*
 * Tempos de atendimento.
 *
 * Cada etapa do pedido tem um prazo, em minutos. O padrão vale para toda loja
 * nova; o lojista muda o dele em Configurações (a API guarda por loja).
 *
 * O relógio de cada etapa começa no "marco" daquela etapa (quando o pedido
 * entrou nela). Pedido antigo, sem marco gravado, usa o atualizadoEm — nunca
 * fica sem contador.
 */

export const TEMPOS_PADRAO = {
  aceitar: 5,
  preparar: 5,
  pronto: 30,
  entregar: 10,
}

export const TEMPO_MIN = 1
export const TEMPO_MAX = 240

// Status → qual tempo vale e de onde ele conta.
const ETAPAS = {
  novo: { chave: 'aceitar', rotulo: 'aceitar o pedido', base: 'criadoEm' },
  aceito: { chave: 'preparar', rotulo: 'iniciar o preparo', base: 'aceitoEm' },
  preparando: { chave: 'pronto', rotulo: 'ficar pronto', base: 'preparandoEm' },
  pronto: { chave: 'entregar', rotulo: 'entregar', base: 'prontoEm' },
  // Continua contando do "pronto": os 10 min de entrega cobrem a saída e a
  // chegada, não reiniciam quando o motoboy sai.
  saiu_entrega: { chave: 'entregar', rotulo: 'entregar', base: 'prontoEm' },
}

export function tempoDoPedido(pedido, tempos, agora = Date.now()) {
  const etapa = ETAPAS[pedido?.status]

  if (!etapa) return null

  const minutos = Number(tempos?.[etapa.chave]) || TEMPOS_PADRAO[etapa.chave]
  const inicio =
    pedido.marcos?.[etapa.base] ||
    pedido[etapa.base] ||
    pedido.atualizadoEm ||
    pedido.criadoEm

  const limiteSeg = minutos * 60
  const passadoSeg = Math.max(0, Math.round((agora - new Date(inicio).getTime()) / 1000))
  const restanteSeg = limiteSeg - passadoSeg

  return {
    chave: etapa.chave,
    rotulo: etapa.rotulo,
    minutos,
    inicio,
    limiteSeg,
    passadoSeg,
    restanteSeg,
    atrasado: restanteSeg < 0,
    // 0 a 1+: quanto do prazo já foi consumido.
    proporcao: limiteSeg > 0 ? passadoSeg / limiteSeg : 1,
  }
}

/** Contagem em mm:ss (ou h:mm:ss quando passa de uma hora). */
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
