import { useCallback, useEffect, useState } from 'react'
import CampoUrl from '../../componentes/comuns/CampoUrl.jsx'
import { lojas as servicoLojas } from '../../servicos/lojas.js'
import { superPainel } from '../../servicos/super.js'
import { formatarSlugDigitado, gerarSlug } from '../../utils/slug.js'
import './Painel.css'

const FORMULARIO_VAZIO = {
  nome: '',
  slug: '',
  telefone: '',
  donoNome: '',
  donoEmail: '',
  donoSenha: '',
}

const FILTROS = [
  { valor: '', rotulo: 'Todas' },
  { valor: 'ativa', rotulo: 'Ativas' },
  { valor: 'pendente', rotulo: 'Pendentes' },
  { valor: 'suspensa', rotulo: 'Suspensas' },
]

export default function PainelSuperadmin() {
  const [resumo, setResumo] = useState(null)
  const [lojas, setLojas] = useState([])
  const [filtro, setFiltro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [processandoId, setProcessandoId] = useState('')

  const [formulario, setFormulario] = useState(FORMULARIO_VAZIO)
  const [slugManual, setSlugManual] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)

    try {
      const [dadosResumo, dadosLojas] = await Promise.all([
        superPainel.resumo(),
        servicoLojas.listar(),
      ])

      setResumo(dadosResumo)
      setLojas(dadosLojas.lojas)
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

  async function mudarSituacao(loja, situacao) {
    setProcessandoId(loja._id)
    setErro('')
    setAviso('')

    try {
      await servicoLojas.alterarSituacao(loja._id, situacao)
      setAviso(`"${loja.nome}" agora está ${situacao}.`)
      await carregar()
    } catch (e) {
      setErro(e.message)
    } finally {
      setProcessandoId('')
    }
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

  async function criarLoja(evento) {
    evento.preventDefault()
    setEnviando(true)
    setErro('')
    setAviso('')

    try {
      const resultado = await servicoLojas.criar({
        nome: formulario.nome,
        slug: formulario.slug.replace(/^-+|-+$/g, ''),
        telefone: formulario.telefone,
        dono: {
          nome: formulario.donoNome,
          email: formulario.donoEmail,
          senha: formulario.donoSenha,
        },
      })

      setFormulario(FORMULARIO_VAZIO)
      setSlugManual(false)
      setAviso(`Loja criada em /${resultado.loja.slug}, já ativa.`)
      await carregar()
    } catch (e) {
      setErro(e.message)
    } finally {
      setEnviando(false)
    }
  }

  const pendentes = lojas.filter((loja) => loja.situacao === 'pendente')
  const visiveis = filtro ? lojas.filter((loja) => loja.situacao === filtro) : lojas

  return (
    <div className="painel">
      <main className="painel__conteudo">
        <div className="painel__cabecalho">
          <h1 className="painel__titulo">Visão geral</h1>
          <button
            className="botao botao--secundario"
            type="button"
            onClick={carregar}
            disabled={carregando}
          >
            {carregando ? 'Atualizando…' : 'Atualizar'}
          </button>
        </div>

        <section className="painel__numeros">
          <Numero rotulo="Lojas" valor={resumo?.lojas.total} />
          <Numero rotulo="Ativas" valor={resumo?.lojas.ativas} />
          <Numero rotulo="Pendentes" valor={resumo?.lojas.pendentes} />
          <Numero rotulo="Suspensas" valor={resumo?.lojas.suspensas} />
        </section>

        {erro && <p className="painel__erro">{erro}</p>}
        {aviso && <p className="painel__sucesso">{aviso}</p>}

        <section className="painel__secao">
          <h2 className="painel__subtitulo">Aguardando aprovação</h2>

          {carregando && <p className="painel__aviso">Carregando…</p>}

          {!carregando && pendentes.length === 0 && (
            <p className="painel__aviso">Nenhuma loja esperando aprovação.</p>
          )}

          {pendentes.map((loja) => (
            <div key={loja._id} className="painel__fila-item">
              <div>
                <strong>{loja.nome}</strong>
                <span className="painel__slug">/{loja.slug}</span>
              </div>

              <div className="painel__acoes-linha">
                <button
                  className="botao"
                  type="button"
                  onClick={() => mudarSituacao(loja, 'ativa')}
                  disabled={processandoId === loja._id}
                >
                  Aprovar
                </button>
                <button
                  className="botao botao--secundario"
                  type="button"
                  onClick={() => mudarSituacao(loja, 'suspensa')}
                  disabled={processandoId === loja._id}
                >
                  Recusar
                </button>
              </div>
            </div>
          ))}
        </section>

        <section className="painel__secao">
          <div className="painel__cabecalho-secao">
            <h2 className="painel__subtitulo">Todas as lojas</h2>

            <select
              className="painel__filtro"
              value={filtro}
              onChange={(evento) => setFiltro(evento.target.value)}
              aria-label="Filtrar por situação"
            >
              {FILTROS.map((opcao) => (
                <option key={opcao.valor} value={opcao.valor}>
                  {opcao.rotulo}
                </option>
              ))}
            </select>
          </div>

          {!carregando && visiveis.length === 0 && (
            <p className="painel__aviso">Nenhuma loja nesse filtro.</p>
          )}

          {visiveis.length > 0 && (
            <ul className="painel__lista">
              {visiveis.map((loja) => (
                <li key={loja._id} className="painel__item">
                  <div>
                    <strong>{loja.nome}</strong>
                    <span className="painel__slug">/{loja.slug}</span>
                  </div>

                  <div className="painel__acoes-linha">
                    <Etiqueta situacao={loja.situacao} />

                    {loja.situacao === 'suspensa' ? (
                      <button
                        className="botao botao--secundario"
                        type="button"
                        onClick={() => mudarSituacao(loja, 'ativa')}
                        disabled={processandoId === loja._id}
                      >
                        Reativar
                      </button>
                    ) : (
                      <button
                        className="botao botao--secundario"
                        type="button"
                        onClick={() => mudarSituacao(loja, 'suspensa')}
                        disabled={processandoId === loja._id}
                      >
                        Suspender
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="painel__secao">
          <h2 className="painel__subtitulo">Criar loja manualmente</h2>
          <p className="painel__ajuda">
            A loja já nasce ativa. Use quando fechar o cliente por telefone ou indicação.
          </p>

          <form className="painel__formulario" onSubmit={criarLoja}>
            <label className="campo">
              <span>Nome da loja</span>
              <input value={formulario.nome} onChange={alterarNomeLoja} required />
            </label>

            <label className="campo">
              <span>Telefone</span>
              <input value={formulario.telefone} onChange={alterar('telefone')} />
            </label>

            <CampoUrl valor={formulario.slug} aoMudar={alterarSlug} />

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
        </section>
      </main>
    </div>
  )
}

function Numero({ rotulo, valor }) {
  return (
    <div className="painel__numero">
      <span className="painel__numero-valor">{valor ?? '—'}</span>
      <span className="painel__numero-rotulo">{rotulo}</span>
    </div>
  )
}

function Etiqueta({ situacao }) {
  const variante =
    situacao === 'ativa' ? 'ok' : situacao === 'pendente' ? 'alerta' : 'erro'

  return <span className={`etiqueta etiqueta--${variante}`}>{situacao}</span>
}
