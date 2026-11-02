import { requisitar } from './api.js'

export const superPainel = {
  resumo: () => requisitar('/super/resumo'),
}
