import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatarDinheiro } from '../../utils/dinheiro.js'

/*
 * Topo do cardápio: a "fachada" da loja.
 *
 * Só mostra informação que existe de verdade. Se a loja não tiver bairro
 * cadastrado, a linha de entrega simplesmente não aparece — nada de "30-45 min"
 * inventado. Se não tiver foto de capa, a cor da marca segura o topo sozinha.
 */

function menorValor(lista) {
  const numeros = lista.filter((valor) => Number.isInteger(valor) && valor >= 0)
  return numeros.length > 0 ? Math.min(...numeros) : null
}

export default function CapaLoja({ loja, status, bairros = [], onVerCardapio, linkWhatsApp }) {
  // Foto externa pode sair do ar: se falhar, o topo volta pra cor da loja em
  // vez de virar um retângulo quebrado.
  const [fotoFalhou, setFotoFalhou] = useState(false)

  const [tituloStatus, detalheStatus] = status.texto.split(' · ')

  const tempo = menorValor(bairros.map((bairro) => bairro.tempoEstimado))
  const taxa = menorValor(bairros.map((bairro) => bairro.taxaEntrega))

  const telefoneLimpo = (loja.telefone || '').replace(/\D/g, '')
  const temFoto = Boolean(loja.capa) && !fotoFalhou

  return (
    <header className={`loja__capa ${temFoto ? 'loja__capa--foto' : ''}`}>
      {temFoto && (
        <img
          className="loja__capa-foto"
          src={loja.capa}
          alt=""
          aria-hidden="true"
          onError={() => setFotoFalhou(true)}
        />
      )}

      <div className="loja__capa-conteudo">
        <div className="loja__capa-topo">
          <div className="loja__capa-mark" aria-hidden="true">
            {loja.logo ? (
              <img src={loja.logo} alt="" />
            ) : (
              loja.nome.charAt(0).toUpperCase()
            )}
          </div>

          <div className="loja__capa-texto">
            <h1 className="loja__capa-nome">{loja.nome}</h1>

            <div className="loja__capa-linha">
              <span
                className={`loja__capa-status ${
                  status.aberto ? '' : 'loja__capa-status--fechada'
                }`}
              >
                {tituloStatus}
              </span>

              {detalheStatus && (
                <span className="loja__capa-status-detalhe">{detalheStatus}</span>
              )}
            </div>
          </div>

          <div className="loja__capa-acoes">
            <Link className="loja__capa-atalho" to={`/${loja.slug}/pedidos`}>
              Meus pedidos
            </Link>

            {telefoneLimpo && (
              <a
                className="loja__capa-atalho loja__capa-atalho--discreto"
                href={`tel:${telefoneLimpo}`}
              >
                {loja.telefone}
              </a>
            )}
          </div>
        </div>

        {/*
          Entrega e taxa em uma frase só. Só aparece o que a loja cadastrou:
          sem bairro com tempo estimado, a frase fala só da taxa (e vice-versa).
        */}
        {(tempo !== null || taxa !== null) && (
          <p className="loja__capa-info">
            {tempo !== null && <>Entrega em cerca de {tempo} min</>}
            {tempo !== null && taxa !== null && <span aria-hidden="true"> · </span>}
            {taxa !== null &&
              (taxa === 0
                ? 'Taxa de entrega grátis'
                : `Taxa a partir de ${formatarDinheiro(taxa)}`)}
          </p>
        )}

        {/*
          Ação principal da capa. "Ver o cardápio" é para quem abriu o link e
          só quer a lista; o WhatsApp é para quem já sabe o que quer pedir e
          prefere falar direto. Um botão não atrapalha o outro.
        */}
        {(onVerCardapio || linkWhatsApp) && (
          <div className="loja__capa-cta">
            {onVerCardapio && (
              <button
                className="loja__capa-cta-principal"
                type="button"
                onClick={onVerCardapio}
              >
                Ver o cardápio
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 5v14" />
                  <path d="m6 13 6 6 6-6" />
                </svg>
              </button>
            )}

            {linkWhatsApp && (
              <a
                className="loja__capa-cta-whats"
                href={linkWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 12a8 8 0 0 1-11.7 7.1L4 20.4l1.4-4.2A8 8 0 1 1 20 12z" />
                  <path d="M9.3 8.3c.3-.3.7-.3 1 0l1 1c.3.3.3.7 0 1l-.6.6c.5 1.1 1.4 2 2.5 2.5l.6-.6c.3-.3.7-.3 1 0l1 1c.3.3.3.7 0 1l-.7.7c-.4.4-1 .6-1.6.4-2.7-.8-4.9-3-5.7-5.7-.2-.6 0-1.2.5-1.6z" />
                </svg>
                Chamar no WhatsApp
              </a>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
