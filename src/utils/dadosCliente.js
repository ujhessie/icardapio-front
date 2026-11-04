/*
 * Dados do cliente no aparelho, para o próximo pedido não começar do zero.
 *
 * Fica só contato e endereço — nada de histórico nem de pagamento. Se o cliente
 * mudar de casa, edita no checkout e a próxima compra já sai com o endereço novo.
 */
const PREFIXO = 'sistema-delivery:dadoscliente:'

const CAMPOS = [
  'nome',
  'telefone',
  'tipo',
  'bairroId',
  'rua',
  'numero',
  'complemento',
  'referencia',
]

export function lerDadosCliente(slug) {
  try {
    const salvo = JSON.parse(localStorage.getItem(PREFIXO + slug) || '{}')

    if (!salvo || typeof salvo !== 'object') return {}

    const dados = {}

    for (const campo of CAMPOS) {
      if (typeof salvo[campo] === 'string') dados[campo] = salvo[campo]
    }

    // Tipo inválido salvo por versão antiga não pode quebrar o formulário.
    if (dados.tipo !== 'delivery' && dados.tipo !== 'balcao') delete dados.tipo

    return dados
  } catch {
    return {}
  }
}

export function guardarDadosCliente(slug, dados) {
  const limpos = {}

  for (const campo of CAMPOS) {
    const valor = dados[campo]

    if (typeof valor === 'string' && valor.trim()) limpos[campo] = valor
  }

  try {
    localStorage.setItem(PREFIXO + slug, JSON.stringify(limpos))
  } catch {
    // Modo privado ou cota cheia: só não preenche da próxima vez.
  }
}
