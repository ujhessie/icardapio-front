import { useEffect, useState } from 'react'
import CabecalhoPainel from '../../componentes/admin/CabecalhoPainel.jsx'
import { lojas as servicoLojas } from '../../servicos/lojas.js'
import './Painel.css'

export default function PainelLoja() {
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
              Cardápio e pedidos chegam nas próximas fases. Por enquanto, esta tela confirma o
              login e o vínculo com a loja.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
