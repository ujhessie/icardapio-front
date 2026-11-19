import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

/*
 * Header padrão do cardápio.
 *
 * Antes o topo da loja mudava de cara conforme a tela: no cardápio era a arte
 * do banner com botão flutuante, nas telas internas uma barra compacta. Agora
 * é o mesmo em todas — logo, nome, status e o menu — e o banner vira só a
 * abertura do cardápio.
 *
 * "Meus pedidos" fica do lado de fora quando há espaço (o mesmo atalho das
 * telas internas). No celular ele some e continua dentro da gaveta.
 *
 * A gota no hamburguer é o aviso de pedido em andamento: quem pediu e voltou
 * para o cardápio vê que tem algo acontecendo sem precisar lembrar da tela de
 * pedidos.
 */

const ICONE_PEDIDO = (
  <>
    <path d="M6 3h9l4 4v14H6z" />
    <path d="M9 12h7M9 16h5" />
  </>
)

const ICONE_WHATSAPP = (
  <path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3Zm3.6 12.1c-.2.5-1 1-1.5 1.1-.5.1-1.1.1-3.2-.9s-3.4-3-3.5-3.5c-.1-.5 0-1.1.3-1.5l.6-.6c.2-.2.4-.1.6.1l.9 1.4c.1.2.1.4 0 .6l-.4.5c-.1.1-.1.3 0 .5.3.5 1.4 1.5 2 1.8.2.1.4.1.5 0l.5-.5c.2-.1.4-.1.6 0l1.4.8c.2.1.3.3.2.7Z" />
)

const ICONE_TELEFONE = (
  <path d="M6 3h3l2 5-2 1.5a12 12 0 0 0 5.5 5.5L16 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2Z" />
)

// Contagem curta: a gota tem 18px e "12" ainda cabe legível.
function contagemCurta(total) {
  return total > 9 ? '9+' : String(total)
}

export default function HeaderLoja({
  loja,
  status,
  linkWhatsApp,
  pedidosEmAndamento = 0,
}) {
  const [menuAberto, setMenuAberto] = useState(false)

  // "Aberto agora · fecha às 23h" vira selo curto + detalhe: cabe no celular.
  const [tituloStatus, detalheStatus] = status.texto.split(' · ')

  const telefoneLimpo = (loja.telefone || '').replace(/\D/g, '')

  // Gaveta aberta: a página de trás não rola e o Esc fecha.
  useEffect(() => {
    if (!menuAberto) return undefined

    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function aoTeclar(evento) {
      if (evento.key === 'Escape') setMenuAberto(false)
    }

    window.addEventListener('keydown', aoTeclar)

    return () => {
      document.body.style.overflow = anterior
      window.removeEventListener('keydown', aoTeclar)
    }
  }, [menuAberto])

  const avisoPedidos =
    pedidosEmAndamento > 0
      ? ` — ${pedidosEmAndamento} ${
          pedidosEmAndamento === 1 ? 'pedido em andamento' : 'pedidos em andamento'
        }`
      : ''

  return (
    <>
      <header className="loja__topo">
        <div className="loja__topo-conteudo">
          <Link to={`/${loja.slug}`} className="loja__marca">
            {loja.logo ? (
              <img className="loja__logo" src={loja.logo} alt="" />
            ) : (
              <span className="loja__monograma" aria-hidden="true">
                {loja.nome.charAt(0).toUpperCase()}
              </span>
            )}

            <span className="loja__marca-texto">
              <span className="loja__nome">{loja.nome}</span>

              <span className="loja__estado">
                <span
                  className={`loja__status ${
                    status.aberto ? 'loja__status--aberta' : 'loja__status--fechada'
                  }`}
                >
                  {tituloStatus}
                </span>
                {detalheStatus && <span className="loja__status-detalhe">{detalheStatus}</span>}
              </span>
            </span>
          </Link>

          <div className="loja__topo-acoes">
            <Link
              className="loja__atalho"
              to={`/${loja.slug}/pedidos`}
              aria-label={`Meus pedidos${avisoPedidos}`}
            >
              Meus pedidos
              {pedidosEmAndamento > 0 && (
                <span className="loja__atalho-gota" aria-hidden="true">
                  {contagemCurta(pedidosEmAndamento)}
                </span>
              )}
            </Link>

            <button
              className="loja__menu-botao"
              type="button"
              onClick={() => setMenuAberto(true)}
              aria-label={`Abrir o menu da loja${avisoPedidos}`}
              aria-expanded={menuAberto}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </g>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {menuAberto && (
        <div className="loja__menu" role="dialog" aria-modal="true" aria-label="Menu da loja">
          <button
            className="loja__menu-fundo"
            type="button"
            onClick={() => setMenuAberto(false)}
            aria-label="Fechar o menu"
            tabIndex={-1}
          />

          <div className="loja__menu-painel">
            <div className="loja__menu-topo">
              <div className="loja__menu-marca">
                {loja.logo ? (
                  <img className="loja__menu-logo" src={loja.logo} alt="" />
                ) : (
                  <span className="loja__menu-monograma" aria-hidden="true">
                    {loja.nome.charAt(0).toUpperCase()}
                  </span>
                )}

                <div className="loja__menu-texto">
                  <span className="loja__menu-nome">{loja.nome}</span>

                  <span
                    className={`loja__menu-status ${
                      status.aberto ? '' : 'loja__menu-status--fechada'
                    }`}
                  >
                    {status.texto}
                  </span>
                </div>
              </div>

              <button
                className="loja__menu-fechar"
                type="button"
                onClick={() => setMenuAberto(false)}
                aria-label="Fechar o menu"
                autoFocus
              >
                ×
              </button>
            </div>

            <nav className="loja__menu-lista">
              <Link
                className="loja__menu-item"
                to={`/${loja.slug}/pedidos`}
                onClick={() => setMenuAberto(false)}
              >
                <svg
                  className="loja__menu-item-icone"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {ICONE_PEDIDO}
                </svg>
                Meus pedidos
                {pedidosEmAndamento > 0 && (
                  <span className="loja__menu-item-gota">
                    {pedidosEmAndamento} em andamento
                  </span>
                )}
              </Link>

              {linkWhatsApp && (
                <a
                  className="loja__menu-item"
                  href={linkWhatsApp}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuAberto(false)}
                >
                  <svg
                    className="loja__menu-item-icone"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    {ICONE_WHATSAPP}
                  </svg>
                  WhatsApp
                </a>
              )}

              {telefoneLimpo && (
                <a
                  className="loja__menu-item"
                  href={`tel:${telefoneLimpo}`}
                  onClick={() => setMenuAberto(false)}
                >
                  <svg
                    className="loja__menu-item-icone"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    {ICONE_TELEFONE}
                  </svg>
                  {loja.telefone}
                </a>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
