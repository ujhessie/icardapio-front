import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatarDinheiro } from '../../utils/dinheiro.js'

/*
 * Topo do cardápio: a "fachada" da loja.
 *
 * Só mostra informação que existe de verdade. Se a loja não tiver bairro
 * cadastrado, o chip de entrega simplesmente não aparece — nada de "30-45 min"
 * inventado. Se não tiver foto de capa, a cor da marca segura o topo sozinha.
 */

function menorValor(lista) {
  const numeros = lista.filter((valor) => Number.isInteger(valor) && valor >= 0)
  return numeros.length > 0 ? Math.min(...numeros) : null
}

export default function CapaLoja({ loja, status, bairros = [] }) {
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

        {(tempo !== null || taxa !== null) && (
          <div className="loja__capa-chips">
            {tempo !== null && (
              <div className="loja__capa-chip">
                <span className="loja__capa-chip-rotulo">Entrega</span>
                <span className="loja__capa-chip-valor">cerca de {tempo} min</span>
              </div>
            )}

            {taxa !== null && (
              <div className="loja__capa-chip">
                <span className="loja__capa-chip-rotulo">Taxa</span>
                <span className="loja__capa-chip-valor">
                  {taxa === 0 ? 'grátis' : `a partir de ${formatarDinheiro(taxa)}`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
