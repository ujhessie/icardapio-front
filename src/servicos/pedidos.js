import { requisitar } from './api.js'

/*
 * Query da lista de pedidos. Quadro manda `hoje`; histórico manda `tudo` + os
 * filtros de busca. Campo vazio nunca vira parâmetro — senão a API recebe
 * `?busca=` e a consulta ganha condição à toa.
 */
function parametros({ status, hoje, tudo, busca, periodo, pagina, limite } = {}) {
  const query = new URLSearchParams()

  if (status) query.set('status', status)
  if (hoje) query.set('hoje', '1')
  if (tudo) query.set('tudo', '1')
  if (busca) query.set('busca', busca)
  if (periodo) query.set('periodo', periodo)
  if (pagina) query.set('pagina', String(pagina))
  if (limite) query.set('limite', String(limite))

  const texto = query.toString()
  return texto ? `?${texto}` : ''
}

export const pedidos = {
  listar: (filtros) => requisitar(`/pedidos${parametros(filtros)}`),
  resumo: () => requisitar('/pedidos/resumo'),
  estatisticas: (dias) => requisitar(`/pedidos/estatisticas?dias=${dias}`),
  detalhar: (id) => requisitar(`/pedidos/${id}`),
  mudarStatus: (id, status) =>
    requisitar(`/pedidos/${id}/status`, { method: 'PATCH', corpo: { status } }),
  editar: (id, corpo) => requisitar(`/pedidos/${id}`, { method: 'PATCH', corpo }),
  criar: (corpo) => requisitar('/pedidos', { method: 'POST', corpo }),
  arquivar: (id) =>
    requisitar(`/pedidos/${id}/arquivar`, { method: 'PATCH', corpo: { arquivado: true } }),
  desarquivar: (id) =>
    requisitar(`/pedidos/${id}/arquivar`, { method: 'PATCH', corpo: { arquivado: false } }),
  remover: (id) => requisitar(`/pedidos/${id}`, { method: 'DELETE' }),
}
