/*
 * Regras de vitrine do cardápio público.
 *
 * Telefone vira link de WhatsApp, endereço vira busca no mapa, "18:00" vira
 * "18h". Ficam num lugar só porque a capa, a barra compacta e o rodapé usam as
 * mesmas contas — três cópias seriam três divergências esperando a vez.
 */

const DIAS_DA_SEMANA = [
  { dia: 1, rotulo: 'Segunda' },
  { dia: 2, rotulo: 'Terça' },
  { dia: 3, rotulo: 'Quarta' },
  { dia: 4, rotulo: 'Quinta' },
  { dia: 5, rotulo: 'Sexta' },
  { dia: 6, rotulo: 'Sábado' },
  { dia: 0, rotulo: 'Domingo' },
]

export function linkWhatsApp(telefone, mensagem = '') {
  const digitos = String(telefone || '').replace(/\D/g, '')

  // Número pela metade (sem DDD) não vira link: o cliente abriria uma conversa
  // com número quebrado e a loja nunca saberia que alguém tentou falar.
  if (digitos.length < 10) return ''

  // Quem digita o DDI já digitou 55; quem digita só DDD + número precisa dele.
  const comDdi = digitos.length >= 12 && digitos.startsWith('55') ? digitos : `55${digitos}`
  const texto = mensagem ? `?text=${encodeURIComponent(mensagem)}` : ''

  return `https://wa.me/${comDdi}${texto}`
}

export function linhasDoEndereco(endereco) {
  if (!endereco) return []

  const rua = String(endereco.rua || '').trim()
  const numero = String(endereco.numero || '').trim()
  const complemento = String(endereco.complemento || '').trim()
  const cidade = String(endereco.cidade || '').trim()
  const estado = String(endereco.estado || '').trim()

  const linhas = []

  if (rua) linhas.push(numero ? `${rua}, ${numero}` : rua)
  if (complemento) linhas.push(complemento)

  const local = [cidade, estado].filter(Boolean).join(' - ')
  if (local) linhas.push(local)

  return linhas
}

/*
 * Mapa pelo endereço digitado, sem chave de API e sem iframe.
 *
 * A busca leva o nome da loja junto: "Rua Augusta, 1200, São Paulo - SP" pode
 * cair em qualquer ponto da rua, mas "Pizzaria Demo, Rua Augusta..." acerta o
 * estabelecimento quando o Google já conhece aquele endereço.
 */
export function linkDoMapa(endereco, nomeDaLoja = '') {
  const partes = linhasDoEndereco(endereco)

  if (partes.length === 0) return ''

  const busca = [nomeDaLoja, ...partes].filter(Boolean).join(', ')

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(busca)}`
}

export function horaCurta(hora) {
  const [textoHora, textoMinuto = '00'] = String(hora || '').split(':')

  if (!/^\d{1,2}$/.test(textoHora)) return ''

  const minutos = textoMinuto.padStart(2, '0').slice(0, 2)

  // "23:00" vira "23h" (mais leve na lista); "23:30" mantém os minutos.
  return minutos === '00' ? `${Number(textoHora)}h` : `${Number(textoHora)}h${minutos}`
}

export function textoDoHorario(horario) {
  if (!horario || horario.aberto === false) return 'Fechado'

  const abre = horaCurta(horario.abre)
  const fecha = horaCurta(horario.fecha)

  if (!abre || !fecha) return 'Fechado'

  return `${abre} às ${fecha}`
}

/*
 * A grade da semana na ordem em que o brasileiro lê: segunda primeiro, domingo
 * no fim. O banco guarda 0 = domingo (mesmo número do Date.getDay()), então a
 * conversão mora aqui e ninguém precisa lembrar disso na tela.
 */
export function semanaDeHorarios(horarios, hoje = new Date().getDay()) {
  const porDia = new Map(
    (Array.isArray(horarios) ? horarios : []).map((horario) => [Number(horario.dia), horario]),
  )

  return DIAS_DA_SEMANA.map(({ dia, rotulo }) => {
    const horario = porDia.get(dia) || null

    return {
      dia,
      rotulo,
      hoje: dia === hoje,
      horario,
      texto: textoDoHorario(horario),
    }
  })
}
