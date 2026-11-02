import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contextos/AuthContexto.jsx'
import './Login.css'

export default function Login() {
  const { usuario, entrar } = useAuth()
  const navegar = useNavigate()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (usuario) {
    return <Navigate to="/admin" replace />
  }

  async function enviar(evento) {
    evento.preventDefault()
    setErro('')
    setEnviando(true)

    try {
      await entrar(email, senha)
      navegar('/admin', { replace: true })
    } catch (e) {
      setErro(e.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="login">
      <form className="login__cartao" onSubmit={enviar}>
        <span className="login__marca">Sistema Delivery</span>
        <h1 className="login__titulo">Entrar no painel</h1>
        <p className="login__descricao">Use o e-mail e a senha da sua loja.</p>

        <label className="campo">
          <span>E-mail</span>
          <input
            type="email"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            autoComplete="email"
            autoFocus
            required
          />
        </label>

        <label className="campo">
          <span>Senha</span>
          <input
            type="password"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {erro && <p className="login__erro">{erro}</p>}

        <button className="botao" type="submit" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <p className="login__rodape">
        <Link to="/">Ver status do sistema</Link>
      </p>
    </main>
  )
}
