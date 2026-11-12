/*
 * Código do link exclusivo do balcão.
 *
 * O lojista que escolhe "só com o link" manda um endereço tipo
 * /minha-loja?balcao=ABC123. O código precisa continuar valendo quando o
 * cliente sai do cardápio e vai para o checkout — e sem arrastar ?balcao=...
 * por toda URL. Por isso ele fica guardado por loja na sessão do navegador.
 */
const CHAVE = 'icardapio:balcao'

function lerMapa() {
  try {
    const bruto = sessionStorage.getItem(CHAVE)
    const mapa = bruto ? JSON.parse(bruto) : {}

    return mapa && typeof mapa === 'object' ? mapa : {}
  } catch {
    return {}
  }
}

export function guardarCodigoBalcao(slug, codigo) {
  if (!slug || !codigo) return

  try {
    const mapa = lerMapa()
    mapa[slug] = String(codigo).trim().toUpperCase()
    sessionStorage.setItem(CHAVE, JSON.stringify(mapa))
  } catch {
    // Armazenamento bloqueado (modo privado antigo): o link vale só nesta
    // navegação, que já é o suficiente para fechar o pedido.
  }
}

export function lerCodigoBalcao(slug) {
  return lerMapa()[slug] || ''
}
