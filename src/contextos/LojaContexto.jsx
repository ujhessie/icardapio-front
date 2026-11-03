import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { publico } from '../servicos/publico.js'
import { statusDaLoja } from '../utils/horario.js'

const Contexto = createContext(null)

// Carrega o cardápio público uma vez por loja e compartilha com as telas filhas.
export function LojaProvider({ slug, children }) {
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [agora, setAgora] = useState(() => new Date())

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

  // A loja abre e fecha com o relógio, não com o F5 do cliente.
  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // `status` é reativo; `loja.aberta` é só o interruptor do dono.
  const status = useMemo(
    () => (dados ? statusDaLoja(dados.loja, agora) : { aberto: false, texto: '' }),
    [dados, agora],
  )

  return (
    <Contexto.Provider value={{ dados, carregando, erro, recarregar: carregar, status }}>
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
