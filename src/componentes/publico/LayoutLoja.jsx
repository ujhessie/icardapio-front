import { Link, Outlet, useParams } from 'react-router-dom'
import { CarrinhoProvider } from '../../contextos/CarrinhoContexto.jsx'
import { LojaProvider, useLoja } from '../../contextos/LojaContexto.jsx'
import './Loja.css'

export default function LayoutLoja() {
  const { slug } = useParams()

  return (
    <LojaProvider key={slug} slug={slug}>
      <CarrinhoProvider key={slug} slug={slug}>
        <ConteudoLoja />
      </CarrinhoProvider>
    </LojaProvider>
  )
}

function ConteudoLoja() {
  const { dados, carregando, erro } = useLoja()

  if (carregando) {
    return <p className="loja__carregando">Abrindo o cardápio…</p>
  }

  if (erro) {
    return (
      <main className="loja__indisponivel">
        <h1>Loja não encontrada</h1>
        <p>Confira o endereço ou peça o link certo para a loja.</p>
        <Link to="/">Voltar ao início</Link>
      </main>
    )
  }

  const { loja } = dados

  return (
    <div className="loja" style={{ '--loja-cor': loja.corPrimaria || '#e85d04' }}>
      <header className="loja__topo">
        <div className="loja__topo-conteudo">
          <Link to={`/${loja.slug}`} className="loja__marca">
            {loja.logo ? (
              <img className="loja__logo" src={loja.logo} alt="" />
            ) : (
              <span className="loja__monograma" aria-hidden="true">
                {loja.nome.charAt(0)}
              </span>
            )}

            <span className="loja__marca-texto">
              <span className="loja__nome">{loja.nome}</span>
              <span
                className={`loja__status ${
                  loja.aberta ? 'loja__status--aberta' : 'loja__status--fechada'
                }`}
              >
                {loja.aberta ? 'Aberto agora' : 'Fechado no momento'}
              </span>
            </span>
          </Link>

          {loja.telefone && (
            <a className="loja__telefone" href={`tel:${loja.telefone.replace(/\D/g, '')}`}>
              {loja.telefone}
            </a>
          )}
        </div>
      </header>

      <Outlet />

      <footer className="loja__rodape">
        <span>{loja.nome}</span>
        <span className="loja__rodape-selo">Cardápio digital por Sistema Delivery</span>
      </footer>
    </div>
  )
}
