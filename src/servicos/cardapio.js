import { requisitar } from './api.js'

export const cardapio = {
  listarCategorias: () => requisitar('/cardapio/categorias'),
  criarCategoria: (corpo) => requisitar('/cardapio/categorias', { method: 'POST', corpo }),
  atualizarCategoria: (id, corpo) =>
    requisitar(`/cardapio/categorias/${id}`, { method: 'PATCH', corpo }),
  removerCategoria: (id) => requisitar(`/cardapio/categorias/${id}`, { method: 'DELETE' }),

  listarProdutos: () => requisitar('/cardapio/produtos'),
  criarProduto: (corpo) => requisitar('/cardapio/produtos', { method: 'POST', corpo }),
  atualizarProduto: (id, corpo) =>
    requisitar(`/cardapio/produtos/${id}`, { method: 'PATCH', corpo }),
  removerProduto: (id) => requisitar(`/cardapio/produtos/${id}`, { method: 'DELETE' }),
}
