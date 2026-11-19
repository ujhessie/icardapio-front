import { useEffect, useState } from 'react'

/*
 * Abertura do cardápio: só a arte da loja.
 *
 * O topo é a imagem em sangria, sem nome, logo ou degradê por cima — muita arte
 * já traz o nome escrito dentro, e escrever por cima duplicava o nome e apagava
 * a imagem. Nada de botão flutuante aqui também: o menu mora no header.
 *
 * Várias artes viram carrossel: elas empilham na mesma célula do grid e trocam
 * em fade. Os tracinhos ficam no canto inferior esquerdo.
 *
 * Loja sem banner não ganha hero nenhum: o header já mostra logo, nome e
 * status, e uma faixa colorida repetindo isso só empurrava o cardápio para
 * baixo. Quem renderiza decide, mas aqui devolvemos `null`.
 */
export default function CapaLoja({ loja }) {
  // Arte externa pode sair do ar: slide quebrado não entra no carrossel, e se
  // sobrar nenhum o hero some em vez de virar um retângulo quebrado.
  const [falhas, setFalhas] = useState([])
  const [indice, setIndice] = useState(0)
  const [pausado, setPausado] = useState(false)

  const capas = (Array.isArray(loja.capas) && loja.capas.length > 0
    ? loja.capas
    : loja.capa
      ? [loja.capa]
      : []
  ).filter((url) => url && !falhas.includes(url))

  // Lista pode encolher quando uma arte falha: o índice nunca aponta pro vazio.
  const ativo = Math.min(indice, Math.max(capas.length - 1, 0))

  function falhar(url) {
    setFalhas((anteriores) => (anteriores.includes(url) ? anteriores : [...anteriores, url]))
  }

  // Troca sozinho a cada 6s. Não roda com uma arte só, com o dedo em cima da
  // foto ou para quem pediu menos movimento no sistema.
  useEffect(() => {
    if (capas.length < 2 || pausado) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const id = setInterval(() => {
      setIndice((atual) => (atual + 1) % capas.length)
    }, 6000)

    return () => clearInterval(id)
  }, [capas.length, pausado])

  if (capas.length === 0) return null

  return (
    <header
      className="loja__capa loja__capa--banner"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onTouchStart={() => setPausado(true)}
    >
      {/* A arte ativa borrada atrás: nas laterais da tela larga ela preenche o
          que a imagem nítida não cobre, sem cortar o nome do banner. */}
      <img className="loja__capa-fundo" src={capas[ativo]} alt="" aria-hidden="true" />

      <div className="loja__capa-slides">
        {capas.map((url, i) => (
          <img
            key={url}
            className={`loja__capa-foto ${i === ativo ? 'loja__capa-foto--ativa' : ''}`}
            src={url}
            alt=""
            aria-hidden="true"
            loading={i === 0 ? 'eager' : 'lazy'}
            onError={() => falhar(url)}
          />
        ))}
      </div>

      {capas.length > 1 && (
        <div className="loja__hero-pontos" aria-label="Banners da loja">
          {capas.map((url, i) => (
            <button
              key={url}
              className={`loja__hero-ponto ${i === ativo ? 'loja__hero-ponto--ativo' : ''}`}
              type="button"
              onClick={() => setIndice(i)}
              aria-label={`Banner ${i + 1} de ${capas.length}`}
              aria-current={i === ativo ? 'true' : undefined}
            >
              <span className="loja__hero-ponto-barra" />
            </button>
          ))}
        </div>
      )}
    </header>
  )
}
