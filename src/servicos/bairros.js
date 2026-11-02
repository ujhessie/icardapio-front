import { requisitar } from './api.js'

export const bairros = {
  listar: () => requisitar('/bairros'),
  criar: (corpo) => requisitar('/bairros', { method: 'POST', corpo }),
  atualizar: (id, corpo) => requisitar(`/bairros/${id}`, { method: 'PATCH', corpo }),
  remover: (id) => requisitar(`/bairros/${id}`, { method: 'DELETE' }),
}
