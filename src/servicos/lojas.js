import { requisitar } from './api.js'

export const lojas = {
  listar: () => requisitar('/lojas'),
  criar: (corpo) => requisitar('/lojas', { method: 'POST', corpo }),
  atualizar: (id, corpo) => requisitar(`/lojas/${id}`, { method: 'PATCH', corpo }),
  minha: () => requisitar('/minha-loja'),
  atualizarMinha: (corpo) => requisitar('/minha-loja', { method: 'PATCH', corpo }),
}
