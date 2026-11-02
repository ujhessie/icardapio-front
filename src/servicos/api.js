const BASE = import.meta.env.VITE_URL_API || '/api'
const CHAVE_TOKEN = 'sistema-delivery:token'

export function salvarToken(token) {
  localStorage.setItem(CHAVE_TOKEN, token)
}

export function lerToken() {
  return localStorage.getItem(CHAVE_TOKEN)
}

export function removerToken() {
  localStorage.removeItem(CHAVE_TOKEN)
}

/**
 * Chamada única para a API.
 * Lança Error com a mensagem que o back devolveu em { erro }.
 */
export async function requisitar(caminho, { corpo, ...opcoes } = {}) {
  const token = lerToken()

  const resposta = await fetch(`${BASE}${caminho}`, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opcoes.headers || {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  })

  const dados = await resposta.json().catch(() => null)

  if (!resposta.ok) {
    throw new Error(dados?.erro || 'Não foi possível falar com o servidor')
  }

  return dados
}

export const api = {
  saude: () => requisitar('/saude'),
}
