import { createContext, useContext, useEffect, useState } from 'react'
import { lerToken, removerToken, salvarToken } from '../servicos/api.js'
import { auth } from '../servicos/auth.js'
import { cadastro as servicoCadastro } from '../servicos/cadastro.js'

const Contexto = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true

    if (!lerToken()) {
      setCarregando(false)
      return undefined
    }

    auth
      .eu()
      .then((dados) => {
        if (ativo) setUsuario(dados.usuario)
      })
      .catch(() => removerToken())
      .finally(() => {
        if (ativo) setCarregando(false)
      })

    return () => {
      ativo = false
    }
  }, [])

  async function entrar(email, senha) {
    const dados = await auth.login(email, senha)
    salvarToken(dados.token)
    setUsuario(dados.usuario)
    return dados.usuario
  }

  // Cadastro público: cria a loja pendente e já deixa o dono logado.
  async function registrar(dados) {
    const resposta = await servicoCadastro.criar(dados)
    salvarToken(resposta.token)
    setUsuario(resposta.usuario)
    return resposta
  }

  function sair() {
    removerToken()
    setUsuario(null)
  }

  return (
    <Contexto.Provider value={{ usuario, carregando, entrar, registrar, sair }}>
      {children}
    </Contexto.Provider>
  )
}

export function useAuth() {
  const contexto = useContext(Contexto)

  if (!contexto) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  }

  return contexto
}
