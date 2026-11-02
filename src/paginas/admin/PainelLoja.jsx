import { useEffect, useState } from 'react'
import CabecalhoPainel from '../../componentes/admin/CabecalhoPainel.jsx'
import { lojas as servicoLojas } from '../../servicos/lojas.js'
import './Painel.css'

export default function PainelLoja() {
  const [loja, setLoja] = useState(null)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)

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

  // Volta o botão para "Copiar link" depois de 2 segundos.
  useEffect(() => {
    if (!copiado) return

    const timer = setTimeout(() => setCopiado(false), 2000)
    return () => clearTimeout(timer)
  }, [copiado])

  const urlPublica = loja ? `${window.location.origin}/${loja.slug}` : ''

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(urlPublica)
    } catch {
      // Fallback para navegador sem Clipboard API ou contexto não seguro.
      const campo = document.createElement('textarea')
      campo.value = urlPublica
      campo.setAttribute('readonly', '')
      campo.style.position = 'fixed'
      campo.style.opacity = '0'
      document.body.appendChild(campo)
      campo.select()
      document.execCommand('copy')
      document.body.removeChild(campo)
    }

    setCopiado(true)
  }

  return (
    <div className="painel">
      <CabecalhoPainel />

      <main className="painel__conteudo">
        {erro && <p className="painel__erro">{erro}</p>}
        {!loja && !erro && <p className="painel__aviso">Carregando loja…</p>}

        {loja && (
          <>
            <h1 className="painel__titulo">{loja.nome}</h1>

            {loja.situacao === 'pendente' && (
              <p className="aviso aviso--alerta">
                Sua loja está em análise. Assim que for aprovada, o cardápio público fica no ar.
              </p>
            )}

            {loja.situacao === 'suspensa' && (
              <p className="aviso aviso--erro">
                Sua loja está suspensa e não aparece no cardápio público. Fale com o suporte.
              </p>
            )}

            <section className="painel__secao">
              <h2 className="painel__subtitulo">Dados da loja</h2>

              <div className="painel__link-publico">
                <div className="painel__link-publico-texto">
                  <span className="painel__link-publico-rotulo">Endereço público</span>
                  <a
                    className="painel__link-publico-url"
                    href={urlPublica}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {urlPublica}
                  </a>
                </div>

                <button
                  className="botao botao--secundario"
                  type="button"
                  onClick={copiarLink}
                  aria-live="polite"
                >
                  {copiado ? 'Copiado!' : 'Copiar link'}
                </button>
              </div>

              <dl className="painel__dados">
                <div>
                  <dt>Telefone</dt>
                  <dd>{loja.telefone || 'não informado'}</dd>
                </div>
                <div>
                  <dt>Situação</dt>
                  <dd>{loja.situacao}</dd>
                </div>
                <div>
                  <dt>Recebendo pedidos</dt>
                  <dd>{loja.aberta ? 'sim' : 'não'}</dd>
                </div>
              </dl>
            </section>

            <p className="painel__ajuda">
              Compartilhe o link público com seus clientes. É por ele que o cardápio e os pedidos
              ficam disponíveis.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
