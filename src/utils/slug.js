// Mesma regra usada no back (back-sistema-delivery/src/lib/slug.js).
export function gerarSlug(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Enquanto o usuário digita: não corta o hífen do fim, senão não dá pra escrever "pizza-".
export function formatarSlugDigitado(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
}
