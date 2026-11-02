import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../contextos/AuthContexto.jsx'
import { lojas as servicoLojas } from '../../servicos/lojas.js'
import './Painel.css'

export default function Painel() {
  const { usuario, sair } = useAuth()

  return (
    <div className="painel">
      <header className="painel__topo">
        <span className="painel__marca">Sistema Delivery</span>

        <div className="painel__usuario">
          <span className="painel__nome">{usuario.nome}</span>
          <span className="painel__papel">{usuario.papel}</span>
          <button className="botao botao--secundario" type="button" onClick={sair}>
            Sair
          </button>
        </div>
      </header>

      <main className="painel__conteudo">
        <h1 className="painel__titulo">Olá, {usuario.nome.split(' ')[0]}</h1>

        {usuario.papel === 'superadmin' ? <AreaSuperadmin /> : <AreaLoja />}
      </main>
    </div>
  )
}

const FORMULARIO_VAZIO = {
  nome: '',
  telefone: '',
  donoNome: '',
  donoEmail: '',
  donoSenha: '',
}

function AreaSuperadmin() {
  const [lista, setLista] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [formulario, setFormulario] = useState(FORMULARIO_VAZIO)
  const [enviando, setEnviando] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)

    try {
      const dados = await servicoLojas.listar()
      setLista(dados.lojas)
      setErro('')
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  function alterar(campo) {
    return (evento) => setFormulario({ ...formulario, [campo]: evento.target.value })
  }

  async function criar(evento) {
    evento.preventDefault()
    setEnviando(true)
    setErro('')
    setAviso('')

    try {
      await servicoLojas.criar({
        nome: formulario.nome,
        telefone: formulario.telefone,
        dono: {
          nome: formulario.donoNome,
          email: formulario.donoEmail,
          senha: formulario.donoSenha,
        },
      })

      setFormulario(FORMULARIO_VAZIO)
      setAviso('Loja criada. O dono já pode entrar com o e-mail cadastrado.')
      await carregar()
    } catch (e) {
      setErro(e.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <section className="painel__secao">
        <h2 className="painel__subtitulo">Lojas</h2>

        {carregando && <p className="painel__aviso">Carregando lojas…</p>}

        {!carregando && lista.length === 0 && (
          <p className="painel__aviso">Nenhuma loja cadastrada ainda. Crie a primeira abaixo.</p>
        )}

        {!carregando && lista.length > 0 && (
          <ul className="painel__lista">
            {lista.map((loja) => (
              <li key={loja._id} className="painel__item">
                <div>
                  <strong>{loja.nome}</strong>
                  <span className="painel__slug">/{loja.slug}</span>
                </div>
                <span className={loja.ativa ? 'etiqueta etiqueta--ok' : 'etiqueta etiqueta--erro'}>
                  {loja.ativa ? 'ativa' : 'suspensa'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="painel__secao">
        <h2 className="painel__subtitulo">Nova loja</h2>
        <p className="painel__ajuda">
          A loja nasce com um usuário dono, que já pode entrar no painel com o e-mail e a senha
          definidos aqui.
        </p>

        <form className="painel__formulario" onSubmit={criar}>
          <label className="campo">
            <span>Nome da loja</span>
            <input value={formulario.nome} onChange={alterar('nome')} required />
          </label>

          <label className="campo">
            <span>Telefone</span>
            <input value={formulario.telefone} onChange={alterar('telefone')} />
          </label>

          <label className="campo">
            <span>Nome do dono</span>
            <input value={formulario.donoNome} onChange={alterar('donoNome')} required />
          </label>

          <label className="campo">
            <span>E-mail do dono</span>
            <input
              type="email"
              value={formulario.donoEmail}
              onChange={alterar('donoEmail')}
              required
            />
          </label>

          <label className="campo">
            <span>Senha do dono</span>
            <input
              type="password"
              value={formulario.donoSenha}
              onChange={alterar('donoSenha')}
              minLength={6}
              required
            />
          </label>

          <div className="painel__acoes">
            <button className="botao" type="submit" disabled={enviando}>
              {enviando ? 'Criando…' : 'Criar loja'}
            </button>
          </div>
        </form>

        {erro && <p className="painel__erro">{erro}</p>}
        {aviso && <p className="painel__sucesso">{aviso}</p>}
      </section>
    </>
  )
}

function AreaLoja() {
  const [loja, setLoja] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true

    async function carregar() {
      try {
        const dados = await servicoLojas.minha()
        if (ativo) setLoja(dados.loja)
      } catch (e) {
        if (ativo) setErro(e.message)
      }
    }

    carregar()

    return () => {
      ativo = false
    }
  }, [])

  if (erro) return <p className="painel__erro">{erro}</p>
  if (!loja) return <p className="painel__aviso">Carregando loja…</p>

  return (
    <section className="painel__secao">
      <h2 className="painel__subtitulo">{loja.nome}</h2>

      <dl className="painel__dados">
        <div>
          <dt>Endereço público</dt>
          <dd>/{loja.slug}</dd>
        </div>
        <div>
          <dt>Telefone</dt>
          <dd>{loja.telefone || 'não informado'}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{loja.aberta ? 'recebendo pedidos' : 'fechada'}</dd>
        </div>
      </dl>

      <p className="painel__ajuda">
        Cardápio e pedidos chegam na fase 2 e 3. Por enquanto, esta tela confirma o login e o
        vínculo com a loja.
      </p>
    </section>
  )
}
