import { requisitar } from './api.js'

export const cadastro = {
  criar: (corpo) => requisitar('/cadastro', { method: 'POST', corpo }),
}
