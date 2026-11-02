const BASE = import.meta.env.VITE_URL_API || '/api'

/**
 * Chamada única para a API.
 * Lança Error com a mensagem que o back devolveu em { erro }.
 */
export async function requisitar(caminho, { corpo, ...opcoes } = {}) {
  const resposta = await fetch(`${BASE}${caminho}`, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
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
