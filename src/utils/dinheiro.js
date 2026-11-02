// Preços e taxas viajam em centavos na API. Na tela, o usuário digita em reais.

export function paraCentavos(valor) {
  let texto = String(valor ?? '').replace(/[^\d,.]/g, '')

  if (!texto) return NaN

  if (texto.includes(',')) {
    // Formato brasileiro: ponto é milhar, vírgula é decimal.
    texto = texto.replace(/\./g, '').replace(',', '.')
  } else if (!/\.\d{1,2}$/.test(texto)) {
    // "1.500" é milhar; "45.9" e "45.90" são decimais.
    texto = texto.replace(/\./g, '')
  }

  const numero = Number(texto)

  if (!Number.isFinite(numero) || numero < 0) return NaN

  return Math.round(numero * 100)
}

export function paraReais(centavos = 0) {
  return (Number(centavos) / 100).toFixed(2).replace('.', ',')
}

export function formatarDinheiro(centavos = 0) {
  return `R$ ${paraReais(centavos)}`
}
