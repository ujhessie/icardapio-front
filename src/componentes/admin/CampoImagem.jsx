import { useEffect, useId, useRef, useState } from 'react'
import { LIMITE_MB, enviarImagem } from '../../servicos/uploads.js'
import './CampoImagem.css'

/*
 * Campo de imagem do painel.
 *
 * Três estados: vazio (área para arrastar/escolher), enviando (barra de
 * progresso) e pronto (prévia + trocar/remover). Quem salva é a tela dona do
 * campo: aqui só devolvemos a URL pelo `onMudar`.
 *
 * Também aceita link colado — quem já tem a foto hospedada não precisa subir de
 * novo, e é o caminho de quem está migrando para o Cloudinary.
 */

const FORMATOS = 'image/jpeg,image/png,image/webp,image/avif'

export default function CampoImagem({
  rotulo,
  ajuda,
  tipo,
  valor = '',
  onMudar,
  formato = 'quadrada',
  className = '',
  desabilitado = false,
  aoEnviando,
}) {
  const id = useId()
  const arquivoRef = useRef(null)
  const [enviando, setEnviando] = useState(false)
  const [progresso, setProgresso] = useState(0)
  const [erro, setErro] = useState('')
  const [arrastando, setArrastando] = useState(false)
  const [linkAberto, setLinkAberto] = useState(false)
  const [link, setLink] = useState('')
  const [previaFalhou, setPreviaFalhou] = useState(false)

  /*
   * A tela dona do campo precisa saber que tem upload em voo para não deixar
   * salvar no meio: o formulário salvaria sem a URL nova e o dono perderia a
   * foto. A referência evita efeito em todo render (o callback vem inline).
   */
  const aoEnviandoRef = useRef(aoEnviando)
  aoEnviandoRef.current = aoEnviando

  useEffect(() => {
    aoEnviandoRef.current?.(enviando)
  }, [enviando])

  useEffect(() => () => aoEnviandoRef.current?.(false), [])

  async function subir(arquivo) {
    if (!arquivo || enviando) return

    setErro('')
    setEnviando(true)
    setProgresso(0)

    try {
      const { url } = await enviarImagem(arquivo, { tipo, aoProgredir: setProgresso })
      setPreviaFalhou(false)
      onMudar(url)
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

  function aplicarLink(evento) {
    evento.preventDefault()

    const texto = link.trim()

    if (!/^https?:\/\//i.test(texto)) {
      setErro('O link precisa começar com http:// ou https://')
      return
    }

    setErro('')
    setPreviaFalhou(false)
    onMudar(texto)
    setLink('')
    setLinkAberto(false)
  }

  function remover() {
    setErro('')
    setLinkAberto(false)
    onMudar('')
  }

  // Link quebrado não apaga o valor: mostramos o aviso e deixamos o dono
  // decidir (trocar ou remover) em vez de sumir com o campo sem explicação.
  const temImagem = Boolean(valor)

  return (
    <div className={`img ${className}`.trim()}>
      <div className="img__topo">
        <span className="img__rotulo" id={`${id}-rotulo`}>
          {rotulo}
        </span>
        <span className="img__limite">
          JPG, PNG ou WebP · até {LIMITE_MB} MB
        </span>
      </div>

      {ajuda && <p className="img__ajuda">{ajuda}</p>}

      <input
        ref={arquivoRef}
        id={id}
        type="file"
        accept={FORMATOS}
        className="img__arquivo"
        onChange={escolher}
        disabled={desabilitado || enviando}
      />

      {temImagem ? (
        <div className={`img__pronto img__pronto--${formato}`}>
          <span className={`img__previa img__previa--${formato}`}>
            {previaFalhou ? (
              <span className="img__previa-vazia">sem visual</span>
            ) : (
              <img src={valor} alt="" onError={() => setPreviaFalhou(true)} />
            )}
          </span>

          {previaFalhou && (
            <span className="img__aviso">Esta imagem não carregou. Envie outra ou cole um link novo.</span>
          )}

          <div className="img__acoes">
            <button
              className="botao botao--secundario botao--pequeno"
              type="button"
              onClick={() => arquivoRef.current?.click()}
              disabled={desabilitado || enviando}
            >
              Trocar
            </button>

            <button
              className="botao botao--secundario botao--pequeno"
              type="button"
              onClick={remover}
              disabled={desabilitado || enviando}
            >
              Remover
            </button>
          </div>
        </div>
      ) : (
        <button
          className={`img__soltar ${arrastando ? 'img__soltar--ativo' : ''}`}
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
          <span className="img__soltar-icone" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4" />
              <path d="m7 9 5-5 5 5" />
              <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
          </span>

          <span className="img__soltar-texto">
            {arrastando ? 'Solte a imagem aqui' : 'Arraste a foto ou clique para escolher'}
          </span>
        </button>
      )}

      {enviando && (
        <div
          className="img__progresso"
          role="progressbar"
          aria-valuenow={progresso}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Enviando imagem"
        >
          <span className="img__progresso-barra" style={{ width: `${progresso}%` }} />
          <span className="img__progresso-texto">Enviando… {progresso}%</span>
        </div>
      )}

      {erro && <p className="img__erro">{erro}</p>}

      {linkAberto ? (
        <form className="img__link" onSubmit={aplicarLink}>
          <input
            value={link}
            onChange={(evento) => setLink(evento.target.value)}
            placeholder="https://…"
            aria-label="Endereço da imagem"
            autoFocus
          />
          <button className="botao botao--pequeno" type="submit" disabled={!link.trim()}>
            Usar
          </button>
          <button
            className="botao botao--secundario botao--pequeno"
            type="button"
            onClick={() => {
              setLinkAberto(false)
              setLink('')
            }}
          >
            Cancelar
          </button>
        </form>
      ) : (
        !enviando && (
          <button
            className="img__link-abrir"
            type="button"
            onClick={() => setLinkAberto(true)}
            disabled={desabilitado}
          >
            {temImagem ? 'ou trocar por um link' : 'ou colar um link'}
          </button>
        )
      )}
    </div>
  )
}
