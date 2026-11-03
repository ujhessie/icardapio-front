/*
 * Espelho de `back-sistema-delivery/src/lib/horario.js`.
 *
 * Aqui ele existe por um motivo só: deixar o status vivo enquanto a página está
 * aberta (o cliente não recarrega às 18h em ponto). Quem decide de verdade é o
 * back — ele recusa pedido fora do horário. Se as duas regras divergirem, a tela
 * mente e o pedido volta com erro.
 */

const NOMES_DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

function minutosDe(hora) {
  const [h, m] = String(hora || '00:00').split(':')
  return Number(h) * 60 + Number(m)
}

// 18:00 → "18h" | 22:30 → "22h30" | 00:00 → "meia-noite" | 02:00 → "2h"
function horaCurta(hora) {
  const [h, m] = String(hora || '00:00').split(':')
  const minutos = Number(m)

  if (Number(h) === 0 && minutos === 0) return 'meia-noite'

  return minutos === 0 ? `${Number(h)}h` : `${Number(h)}h${String(m).padStart(2, '0')}`
}

function dataLocalISO(data) {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function dentroDaJanela(abre, fecha, minutos) {
  if (fecha > abre) return minutos >= abre && minutos < fecha
  return minutos >= abre || minutos < fecha
}

function proximaAbertura(horarios, diaHoje) {
  for (let passo = 1; passo <= 7; passo += 1) {
    const dia = horarios.find((item) => item.dia === (diaHoje + passo) % 7)

    if (!dia?.aberto) continue

    const quando = passo === 1 ? 'amanhã' : NOMES_DIAS[dia.dia]
    return `Fechado · abre ${quando} às ${horaCurta(dia.abre)}`
  }

  return 'Fechado · nenhum dia aberto'
}

export function statusDaLoja(loja, agora = new Date()) {
  if (!loja) return { aberto: false, texto: 'Fechado no momento' }

  if (loja.aberta === false) {
    return { aberto: false, texto: 'Fechado no momento' }
  }

  const horarios = loja.horarios || []
  const especiais = loja.datasEspeciais || []

  if (horarios.length === 0) {
    return { aberto: true, texto: 'Aberto agora' }
  }

  const minutos = agora.getHours() * 60 + agora.getMinutes()
  const diaHoje = agora.getDay()
  const hoje = dataLocalISO(agora)
  const especial = especiais.find((item) => item.data === hoje)

  if (especial) {
    if (especial.fechado) {
      return {
        aberto: false,
        texto: `Fechado hoje · ${especial.motivo || 'data especial'}`,
      }
    }

    const abre = minutosDe(especial.abre)
    const fecha = minutosDe(especial.fecha)

    if (dentroDaJanela(abre, fecha, minutos)) {
      return { aberto: true, texto: `Aberto agora · fecha às ${horaCurta(especial.fecha)}` }
    }

    if (minutos < abre) {
      return { aberto: false, texto: `Fechado · abre hoje às ${horaCurta(especial.abre)}` }
    }

    return {
      aberto: false,
      texto: `Fechado · hoje das ${horaCurta(especial.abre)} às ${horaCurta(especial.fecha)}`,
    }
  }

  const hojeHorario = horarios.find((item) => item.dia === diaHoje)

  if (hojeHorario?.aberto) {
    const abre = minutosDe(hojeHorario.abre)
    const fecha = minutosDe(hojeHorario.fecha)

    if (dentroDaJanela(abre, fecha, minutos)) {
      return { aberto: true, texto: `Aberto agora · fecha às ${horaCurta(hojeHorario.fecha)}` }
    }

    if (minutos < abre) {
      return { aberto: false, texto: `Fechado · abre hoje às ${horaCurta(hojeHorario.abre)}` }
    }
  }

  const ontemHorario = horarios.find((item) => item.dia === (diaHoje + 6) % 7)

  if (ontemHorario?.aberto) {
    const abre = minutosDe(ontemHorario.abre)
    const fecha = minutosDe(ontemHorario.fecha)

    if (fecha <= abre && minutos < fecha) {
      return { aberto: true, texto: `Aberto agora · fecha às ${horaCurta(ontemHorario.fecha)}` }
    }
  }

  return { aberto: false, texto: proximaAbertura(horarios, diaHoje) }
}
