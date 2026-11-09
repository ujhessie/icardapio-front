/*
 * Sino do painel.
 *
 * O som é gerado no próprio navegador (Web Audio), sem arquivo: não pesa no
 * bundle, não depende de licença e toca na hora.
 *
 * Navegador só libera áudio depois de um gesto do usuário, então chamamos
 * prepararSom() no primeiro clique/tecla — daí em diante o alerta funciona.
 */

const CHAVE = 'sistema-delivery:som'

let contexto = null

export function somLigado() {
  return localStorage.getItem(CHAVE) !== 'mudo'
}

export function guardarSom(ligado) {
  localStorage.setItem(CHAVE, ligado ? 'ligado' : 'mudo')
}

function garantirContexto() {
  const Contexto = window.AudioContext || window.webkitAudioContext

  if (!Contexto) return null

  if (!contexto) contexto = new Contexto()

  // Ficou suspenso (aba em segundo plano, política do navegador): retoma.
  if (contexto.state === 'suspended') contexto.resume().catch(() => {})

  return contexto
}

/** Chamada no primeiro gesto do usuário, só para destravar o áudio. */
export function prepararSom() {
  try {
    garantirContexto()
  } catch {
    // Sem Web Audio o painel continua funcionando, só sem som.
  }
}

// Parciais de um metal: fundamental forte, oitava e quinta bem mais fracas.
// É o que dá o "brilho" de sininho em vez de um bipe de micro-ondas.
const PARCIAIS = [
  { multiplicador: 1, volume: 1 },
  { multiplicador: 2.01, volume: 0.32 },
  { multiplicador: 3.03, volume: 0.13 },
]

function tocarNota(ctx, frequencia, quando, duracao, volume) {
  for (const parcial of PARCIAIS) {
    const oscilador = ctx.createOscillator()
    const ganho = ctx.createGain()

    oscilador.type = 'sine'
    oscilador.frequency.value = frequencia * parcial.multiplicador

    // Ataque curtinho + queda exponencial: é isso que soa como sino, e não
    // como tom contínuo.
    ganho.gain.setValueAtTime(0.0001, quando)
    ganho.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, volume * parcial.volume),
      quando + 0.006,
    )
    ganho.gain.exponentialRampToValueAtTime(0.0001, quando + duracao)

    oscilador.connect(ganho).connect(ctx.destination)
    oscilador.start(quando)
    oscilador.stop(quando + duracao + 0.05)
  }
}

/** Agenda um ding-dong de campainha (duas notas descendo) no instante dado. */
function agendarSino(ctx, quando) {
  tocarNota(ctx, 987.77, quando, 0.85, 0.32) // B5
  tocarNota(ctx, 659.25, quando + 0.17, 1.1, 0.3) // E5
}

/** Ding-dong único, na hora. Usado no teste do botão de som. */
export function tocarSino() {
  if (!somLigado()) return

  let ctx

  try {
    ctx = garantirContexto()
  } catch {
    return
  }

  if (!ctx) return

  agendarSino(ctx, ctx.currentTime + 0.02)
}

/**
 * Alerta de pedido novo: o sino toca `vezes` vezes, com `intervalo` segundos
 * entre uma e outra (padrão: 3 toques a cada 5 s).
 *
 * O agendamento é feito no relógio do próprio áudio, e não em setInterval.
 * Isso importa: aba em segundo plano tem timers estrangulados pelo navegador
 * (chega a 1 min de atraso) e o alerta saía fora de hora — ou não saía. No
 * relógio do áudio os toques já ficam marcados e disparam no tempo certo.
 */
export function tocarAlerta({ vezes = 3, intervalo = 5 } = {}) {
  if (!somLigado()) return

  let ctx

  try {
    ctx = garantirContexto()
  } catch {
    return
  }

  if (!ctx) return

  // Um respiro depois do resume(): o contexto recém-retomado ainda está
  // acertando o relógio.
  const base = ctx.currentTime + 0.05

  for (let i = 0; i < vezes; i += 1) {
    agendarSino(ctx, base + i * intervalo)
  }
}
