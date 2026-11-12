import { requisitar } from './api.js'

export const publico = {
  cardapio: (slug, codigoBalcao) =>
    requisitar(
      `/publico/${slug}${
        codigoBalcao ? `?balcao=${encodeURIComponent(codigoBalcao)}` : ''
      }`,
    ),
  criarPedido: (slug, corpo) =>
    requisitar(`/publico/${slug}/pedidos`, { method: 'POST', corpo }),
  pedido: (slug, id) => requisitar(`/publico/${slug}/pedidos/${id}`),
  meusPedidos: (slug, ids) =>
    requisitar(`/publico/${slug}/pedidos?ids=${encodeURIComponent(ids.join(','))}`),
}
