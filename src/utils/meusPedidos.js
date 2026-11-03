/*
 * Histórico do cliente sem login: fica no aparelho, igual ao carrinho.
 *
 * Guardamos só os ids. Nome, itens e status vêm sempre frescos da API — assim um
 * pedido de ontem aparece como "entregue" hoje, sem ficar congelado no passado.
 */
const PREFIXO = 'sistema-delivery:pedidos:'
const LIMITE = 20

export function lerMeusPedidos(slug) {
  try {
    const salvo = JSON.parse(localStorage.getItem(PREFIXO + slug) || '[]')

    if (!Array.isArray(salvo)) return []

    return salvo.filter((id) => typeof id === 'string' && id.length >= 12)
  } catch {
    return []
  }
}

export function guardarMeuPedido(slug, id) {
  if (typeof id !== 'string' || id.length < 12) return

  const lista = [id, ...lerMeusPedidos(slug).filter((item) => item !== id)].slice(0, LIMITE)

  try {
    localStorage.setItem(PREFIXO + slug, JSON.stringify(lista))
  } catch {
    // Modo privado ou cota cheia: o pedido existe, só não entra no histórico.
  }
}
