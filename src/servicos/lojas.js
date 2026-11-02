import { requisitar } from './api.js'

export const lojas = {
  listar: (situacao) =>
    requisitar(`/lojas${situacao ? `?situacao=${encodeURIComponent(situacao)}` : ''}`),
  criar: (corpo) => requisitar('/lojas', { method: 'POST', corpo }),
  atualizar: (id, corpo) => requisitar(`/lojas/${id}`, { method: 'PATCH', corpo }),
  alterarSituacao: (id, situacao) =>
    requisitar(`/lojas/${id}/situacao`, { method: 'PATCH', corpo: { situacao } }),
  minha: () => requisitar('/minha-loja'),
  atualizarMinha: (corpo) => requisitar('/minha-loja', { method: 'PATCH', corpo }),
}
