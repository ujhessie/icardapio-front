import { requisitar } from './api.js'

function parametros({ status, hoje, arquivados } = {}) {
  const busca = new URLSearchParams()

  if (status) busca.set('status', status)
  if (hoje) busca.set('hoje', '1')
  if (arquivados) busca.set('arquivados', '1')

  const texto = busca.toString()
  return texto ? `?${texto}` : ''
}

export const pedidos = {
  listar: (filtros) => requisitar(`/pedidos${parametros(filtros)}`),
  resumo: () => requisitar('/pedidos/resumo'),
  detalhar: (id) => requisitar(`/pedidos/${id}`),
  mudarStatus: (id, status) =>
    requisitar(`/pedidos/${id}/status`, { method: 'PATCH', corpo: { status } }),
  arquivar: (id) =>
    requisitar(`/pedidos/${id}/arquivar`, { method: 'PATCH', corpo: { arquivado: true } }),
  desarquivar: (id) =>
    requisitar(`/pedidos/${id}/arquivar`, { method: 'PATCH', corpo: { arquivado: false } }),
  remover: (id) => requisitar(`/pedidos/${id}`, { method: 'DELETE' }),
}
