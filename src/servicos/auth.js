import { requisitar } from './api.js'

export const auth = {
  login: (email, senha) =>
    requisitar('/auth/login', { method: 'POST', corpo: { email, senha } }),
  eu: () => requisitar('/auth/eu'),
}
