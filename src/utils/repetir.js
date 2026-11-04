/*
 * "Repetir pedido" aparece em dois lugares (histórico e acompanhamento), então a
 * regra mora aqui: usa o preço de hoje e separa o que saiu do cardápio.
 */

export function mapaDeProdutos(dados) {
  const mapa = new Map()

  dados?.categorias?.forEach((categoria) => {
    categoria.produtos.forEach((produto) => mapa.set(String(produto._id), produto))
  })

  return mapa
}

export function itensParaRepetir(mapa, pedido) {
  const itens = []
  const faltando = []

  for (const item of pedido.itens) {
    const produto = mapa.get(String(item.produtoId))

    if (!produto) {
      faltando.push(item.nome)
      continue
    }

    itens.push({ produto, quantidade: item.quantidade, observacao: item.observacao })
  }

  return { itens, faltando }
}
