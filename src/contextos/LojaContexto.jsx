import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { publico } from '../servicos/publico.js'

const Contexto = createContext(null)

// Carrega o cardápio público uma vez por loja e compartilha com as telas filhas.
export function LojaProvider({ slug, children }) {
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)

    try {
      const resposta = await publico.cardapio(slug)
      setDados(resposta)
      setErro('')
    } catch (e) {
      setDados(null)
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [slug])

  useEffect(() => {
    carregar()
  }, [carregar])

  return (
    <Contexto.Provider value={{ dados, carregando, erro, recarregar: carregar }}>
      {children}
    </Contexto.Provider>
  )
}

export function useLoja() {
  const contexto = useContext(Contexto)

  if (!contexto) {
    throw new Error('useLoja precisa estar dentro de <LojaProvider>')
  }

  return contexto
}
