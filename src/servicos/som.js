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

// Osciladores já agendados, com o grupo de origem. Guardar a lista é o que
// permite calar a rajada inteira quando o pedido é atendido: sem isso, as
// notas marcadas para os próximos 15 s tocariam sozinhas depois do "aceitar".
// O grupo separa o alerta do toque de confirmação do botão de som — calar o
// alerta não pode cortar o "tocou, então funcionou".
const agendados = new Set()

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

function tocarNota(ctx, frequencia, quando, duracao, volume, grupo) {
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

    const registro = { oscilador, grupo }

    agendados.add(registro)
    oscilador.onended = () => agendados.delete(registro)
  }
}

/**
 * Agenda uma campainha de duas badaladas ("dim-dom, dim-dooom") no instante
 * dado. Quatro notas em vez de duas: o alerta precisa alcançar quem está no
 * salão, longe do celular, e não só quem já está olhando a tela.
 */
function agendarSino(ctx, quando, grupo) {
  tocarNota(ctx, 987.77, quando, 0.9, 0.34, grupo) // B5
  tocarNota(ctx, 659.25, quando + 0.18, 1.15, 0.32, grupo) // E5
  tocarNota(ctx, 987.77, quando + 0.92, 0.9, 0.32, grupo) // B5
  tocarNota(ctx, 659.25, quando + 1.1, 1.5, 0.32, grupo) // E5
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

  agendarSino(ctx, ctx.currentTime + 0.02, 'teste')
}

/**
 * Alerta de pedido novo: o sino toca `vezes` vezes, com `intervalo` segundos
 * entre uma e outra (padrão: 5 toques a cada 3,5 s).
 *
 * O agendamento é feito no relógio do próprio áudio, e não em setInterval.
 * Isso importa: aba em segundo plano tem timers estrangulados pelo navegador
 * (chega a 1 min de atraso) e o alerta saía fora de hora — ou não saía. No
 * relógio do áudio os toques já ficam marcados e disparam no tempo certo.
 */
export function tocarAlerta({ vezes = 5, intervalo = 3.5 } = {}) {
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
    agendarSino(ctx, base + i * intervalo, 'alerta')
  }
}

/**
 * Cala na hora a rajada de alerta que já estava agendada.
 *
 * O agendamento no relógio do áudio tem um efeito colateral: parar o timer
 * não cala as notas que já estavam marcadas. Sem isto, o lojista aceitava o
 * pedido e o sino continuava tocando por mais dez segundos.
 *
 * Só o grupo do alerta para: o toque de confirmação do botão de som continua
 * até o fim.
 */
export function pararAlerta() {
  for (const registro of [...agendados]) {
    if (registro.grupo !== 'alerta') continue

    try {
      registro.oscilador.stop()
    } catch {
      // Já parado: nada a fazer.
    }

    agendados.delete(registro)
  }
}
