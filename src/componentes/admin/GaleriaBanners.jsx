import { useEffect, useRef, useState } from 'react'
import { LIMITE_MB, enviarImagem } from '../../servicos/uploads.js'
import './GaleriaBanners.css'

/*
 * Banners do topo do cardápio.
 *
 * Diferente do CampoImagem (que guarda uma URL só), aqui a loja tem uma lista:
 * a primeira arte é a que abre o carrossel, e as outras entram na paginação.
 * A ordem é editável porque a primeira imagem é a que o cliente vê primeiro.
 *
 * Cada arquivo sobe sozinho e entra no fim da lista; quem salva é a tela dona
 * do formulário, como no resto do painel.
 */

const FORMATOS = 'image/jpeg,image/png,image/webp,image/avif'

export default function GaleriaBanners({
  capas = [],
  limite = 5,
  ajuda,
  onMudar,
  desabilitado = false,
  aoEnviando,
}) {
  const arquivoRef = useRef(null)
  const [enviando, setEnviando] = useState(false)
  const [progresso, setProgresso] = useState(0)
  const [erro, setErro] = useState('')
  const [arrastando, setArrastando] = useState(false)

  const aoEnviandoRef = useRef(aoEnviando)
  aoEnviandoRef.current = aoEnviando

  useEffect(() => {
    aoEnviandoRef.current?.(enviando)
  }, [enviando])

  useEffect(() => () => aoEnviandoRef.current?.(false), [])

  const cheio = capas.length >= limite

  async function subir(arquivo) {
    if (!arquivo || enviando || cheio) return

    setErro('')
    setEnviando(true)
    setProgresso(0)

    try {
      const { url } = await enviarImagem(arquivo, { tipo: 'capa', aoProgredir: setProgresso })
      onMudar([...capas, url])
    } catch (e) {
      setErro(e.message)
    } finally {
      setEnviando(false)
      setProgresso(0)
    }
  }

  function escolher(evento) {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    subir(arquivo)
  }

  function soltar(evento) {
    evento.preventDefault()
    setArrastando(false)
    subir(evento.dataTransfer.files?.[0])
  }

  function remover(indice) {
    setErro('')
    onMudar(capas.filter((_, i) => i !== indice))
  }

  function mover(indice, direcao) {
    const destino = indice + direcao

    if (destino < 0 || destino >= capas.length) return

    const lista = [...capas]
    ;[lista[indice], lista[destino]] = [lista[destino], lista[indice]]
    onMudar(lista)
  }

  return (
    <div className="galeria">
      <div className="galeria__topo">
        <span className="galeria__rotulo">Banners do cardápio</span>
        <span className="galeria__contador">
          {capas.length} de {limite}
        </span>
      </div>

      <p className="galeria__ajuda">
        {ajuda ||
          `A primeira arte abre o cardápio; as outras entram nos tracinhos do topo e trocam sozinhas a cada 6 segundos. JPG, PNG ou WebP · até ${LIMITE_MB} MB cada.`}
      </p>

      <input
        ref={arquivoRef}
        type="file"
        accept={FORMATOS}
        className="galeria__arquivo"
        onChange={escolher}
        disabled={desabilitado || enviando}
      />

      <div className="galeria__grade">
        {capas.map((url, indice) => (
          <figure className="galeria__item" key={url}>
            <img className="galeria__foto" src={url} alt="" />

            {indice === 0 && <figcaption className="galeria__principal">principal</figcaption>}

            <div className="galeria__acoes">
              <button
                className="galeria__acao"
                type="button"
                onClick={() => mover(indice, -1)}
                disabled={indice === 0 || desabilitado || enviando}
                aria-label={`Passar o banner ${indice + 1} para a frente`}
              >
                ←
              </button>

              <button
                className="galeria__acao galeria__acao--remover"
                type="button"
                onClick={() => remover(indice)}
                disabled={desabilitado || enviando}
                aria-label={`Remover o banner ${indice + 1}`}
              >
                ×
              </button>

              <button
                className="galeria__acao"
                type="button"
                onClick={() => mover(indice, 1)}
                disabled={indice === capas.length - 1 || desabilitado || enviando}
                aria-label={`Passar o banner ${indice + 1} para trás`}
              >
                →
              </button>
            </div>
          </figure>
        ))}

        {!cheio && (
          <button
            className={`galeria__adicionar ${arrastando ? 'galeria__adicionar--ativo' : ''}`}
            type="button"
            onClick={() => arquivoRef.current?.click()}
            onDragOver={(evento) => {
              evento.preventDefault()
              setArrastando(true)
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={soltar}
            disabled={desabilitado || enviando}
          >
            <span className="galeria__mais" aria-hidden="true">
              +
            </span>
            <span className="galeria__adicionar-texto">
              {arrastando ? 'Solte a imagem aqui' : 'Adicionar banner'}
            </span>
          </button>
        )}
      </div>

      {enviando && (
        <div
          className="galeria__progresso"
          role="progressbar"
          aria-valuenow={progresso}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Enviando banner"
        >
          <span className="galeria__progresso-barra" style={{ width: `${progresso}%` }} />
          <span className="galeria__progresso-texto">Enviando… {progresso}%</span>
        </div>
      )}

      {cheio && (
        <p className="galeria__dica">
          Limite de {limite} artes. Remova uma para subir outra.
        </p>
      )}

      {erro && <p className="galeria__erro">{erro}</p>}
    </div>
  )
}
