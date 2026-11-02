import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import CampoUrl from '../../componentes/comuns/CampoUrl.jsx'
import { useAuth } from '../../contextos/AuthContexto.jsx'
import '../../estilos/acesso.css'
import { formatarSlugDigitado, gerarSlug } from '../../utils/slug.js'

const FORMULARIO_VAZIO = {
  responsavel: '',
  nome: '',
  slug: '',
  telefone: '',
  email: '',
  senha: '',
}

export default function Cadastro() {
  const { usuario, registrar } = useAuth()
  const navegar = useNavigate()

  const [formulario, setFormulario] = useState(FORMULARIO_VAZIO)
  const [slugManual, setSlugManual] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (usuario) {
    return <Navigate to="/admin" replace />
  }

  function alterar(campo) {
    return (evento) => setFormulario({ ...formulario, [campo]: evento.target.value })
  }

  function alterarNomeLoja(evento) {
    const nome = evento.target.value

    setFormulario({
      ...formulario,
      nome,
      slug: slugManual ? formulario.slug : gerarSlug(nome),
    })
  }

  function alterarSlug(evento) {
    setSlugManual(true)
    setFormulario({ ...formulario, slug: formatarSlugDigitado(evento.target.value) })
  }

  async function enviar(evento) {
    evento.preventDefault()
    setErro('')
    setEnviando(true)

    try {
      await registrar({
        nome: formulario.nome,
        slug: formulario.slug.replace(/^-+|-+$/g, ''),
        telefone: formulario.telefone,
        dono: {
          nome: formulario.responsavel,
          email: formulario.email,
          senha: formulario.senha,
        },
      })

      navegar('/admin', { replace: true })
    } catch (e) {
      setErro(e.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="acesso">
      <form className="acesso__cartao" onSubmit={enviar}>
        <span className="acesso__marca">Sistema Delivery</span>
        <h1 className="acesso__titulo">Criar minha loja</h1>
        <p className="acesso__descricao">
          Seu cadastro passa por uma análise antes de ficar no ar.
        </p>

        <div className="acesso__campos">
          <label className="campo">
            <span>Seu nome</span>
            <input value={formulario.responsavel} onChange={alterar('responsavel')} required />
          </label>

          <label className="campo">
            <span>Nome da loja</span>
            <input value={formulario.nome} onChange={alterarNomeLoja} required />
          </label>

          <CampoUrl valor={formulario.slug} aoMudar={alterarSlug} obrigatorio />

          <label className="campo">
            <span>Telefone</span>
            <input value={formulario.telefone} onChange={alterar('telefone')} />
          </label>

          <label className="campo">
            <span>E-mail</span>
            <input
              type="email"
              value={formulario.email}
              onChange={alterar('email')}
              autoComplete="email"
              required
            />
          </label>

          <label className="campo">
            <span>Senha</span>
            <input
              type="password"
              value={formulario.senha}
              onChange={alterar('senha')}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>
        </div>

        {erro && <p className="acesso__erro">{erro}</p>}

        <button className="botao" type="submit" disabled={enviando}>
          {enviando ? 'Criando…' : 'Criar loja'}
        </button>
      </form>

      <p className="acesso__rodape">
        Já tem conta? <Link to="/admin/login">Entrar</Link>
      </p>
    </main>
  )
}
