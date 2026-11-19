import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatarDinheiro } from '../../utils/dinheiro.js'

/*
 * Topo do cardápio: a "fachada" da loja.
 *
 * Dois estados, porque é material diferente:
 *
 * - Loja COM banner: o topo é só a arte, em sangria. Nada de nome, logo ou
 *   degradê por cima — muita arte já traz o nome escrito dentro, e escrever
 *   por cima duplicava o nome e apagava a imagem. O status vira pílula na
 *   borda de baixo do banner e o nome aparece na barra de categorias.
 * - Loja SEM banner: cor da loja com logo, nome e status, como sempre foi.
 *   Loja nova não pode nascer com um retângulo vazio.
 *
 * Entrega, taxa e os atalhos (Meus pedidos, WhatsApp, telefone) ficam numa
 * linha discreta abaixo do topo, nos dois casos.
 */

function menorValor(lista, minimo = 0) {
  const numeros = lista.filter(
    (valor) => Number.isInteger(valor) && valor >= minimo,
  )
  return numeros.length > 0 ? Math.min(...numeros) : null
}

export default function CapaLoja({ loja, status, bairros = [], linkWhatsApp }) {
  // Arte externa pode sair do ar: se falhar, o topo volta pra cor da loja em
  // vez de virar um retângulo quebrado.
  const [fotoFalhou, setFotoFalhou] = useState(false)

  const [tituloStatus, detalheStatus] = status.texto.split(' · ')

  // Tempo zero é bairro recém-cadastrado, não entrega instantânea: fica de fora.
  const tempo = menorValor(bairros.map((bairro) => bairro.tempoEstimado), 1)
  const taxa = menorValor(bairros.map((bairro) => bairro.taxaEntrega))

  const telefoneLimpo = (loja.telefone || '').replace(/\D/g, '')
  const temBanner = Boolean(loja.capa) && !fotoFalhou

  return (
    <>
      {temBanner ? (
        <header className="loja__capa loja__capa--banner">
          {/*
            A mesma arte duas vezes: uma borrada, atrás, para preencher a
            sangria em telas largas, e a arte inteira por cima. Sem recorte,
            o nome escrito dentro do banner nunca é comido.
          */}
          <img className="loja__capa-fundo" src={loja.capa} alt="" aria-hidden="true" />

          <img
            className="loja__capa-foto"
            src={loja.capa}
            alt=""
            aria-hidden="true"
            onError={() => setFotoFalhou(true)}
          />
        </header>
      ) : (
        <header className="loja__capa loja__capa--cor">
          <div className="loja__capa-conteudo">
            <div className="loja__capa-mark" aria-hidden="true">
              {loja.logo ? (
                <img src={loja.logo} alt="" />
              ) : (
                loja.nome.charAt(0).toUpperCase()
              )}
            </div>

            <div className="loja__capa-texto">
              <h1 className="loja__capa-nome">{loja.nome}</h1>

              <span
                className={`loja__capa-status ${
                  status.aberto ? '' : 'loja__capa-status--fechada'
                }`}
              >
                {tituloStatus}
              </span>
            </div>
          </div>
        </header>
      )}

      <div className={`loja__faixa ${temBanner ? 'loja__faixa--banner' : ''}`}>
        {temBanner && (
          <span
            className={`loja__pilula ${status.aberto ? '' : 'loja__pilula--fechada'}`}
          >
            {tituloStatus}
            {detalheStatus && (
              <span className="loja__pilula-detalhe"> · {detalheStatus}</span>
            )}
          </span>
        )}

        <div className="loja__faixa-linha">
          {/* Só aparece o que a loja cadastrou: sem bairro, a frase fala só da taxa. */}
          {(tempo !== null || taxa !== null) && (
            <p className="loja__faixa-info">
              {tempo !== null && <>Entrega em cerca de {tempo} min</>}
              {tempo !== null && taxa !== null && <span aria-hidden="true"> · </span>}
              {taxa !== null &&
                (taxa === 0
                  ? 'Taxa de entrega grátis'
                  : `Taxa a partir de ${formatarDinheiro(taxa)}`)}
            </p>
          )}

          <div className="loja__faixa-acoes">
            <Link className="loja__faixa-atalho" to={`/${loja.slug}/pedidos`}>
              Meus pedidos
            </Link>

            {linkWhatsApp && (
              <a
                className="loja__faixa-atalho"
                href={linkWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
            )}

            {telefoneLimpo && (
              <a className="loja__faixa-atalho" href={`tel:${telefoneLimpo}`}>
                {loja.telefone}
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
