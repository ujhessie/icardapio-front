import { useEffect, useRef, useState } from 'react'
import { formatarDinheiro } from '../../utils/dinheiro.js'

/*
 * Ficha do produto.
 *
 * O modal existe para resolver o pedido que o "+" do card não resolve: quero
 * dois, sem cebola. Por isso quantidade e observação moram aqui, e o botão já
 * mostra o total — o cliente vê quanto vai custar antes de tocar.
 */

const LIMITE_OBSERVACAO = 140

export default function ModalProduto({
  produto,
  podePedir,
  motivoFechado,
  onFechar,
  onAdicionar,
}) {
  const [quantidade, setQuantidade] = useState(1)
  const [observacao, setObservacao] = useState('')
  // Foto externa pode sair do ar: cai na inicial em vez de quadrado quebrado.
  const [fotoFalhou, setFotoFalhou] = useState(false)
  const botaoFechar = useRef(null)
  const fundo = useRef(null)
  const aoFechar = useRef(onFechar)

  // O pai recria `onFechar` a cada render. Guardar numa ref evita que o efeito
  // de foco seja desmontado e remontado no meio da digitação.
  useEffect(() => {
    aoFechar.current = onFechar
  }, [onFechar])

  // Cada produto abre do zero: sobra de outro produto seria um pedido errado.
  useEffect(() => {
    setQuantidade(1)
    setObservacao('')
    setFotoFalhou(false)
  }, [produto?._id])

  // Esc fecha, o foco vai pro X e volta pro card de onde o cliente veio.
  useEffect(() => {
    const anterior = document.activeElement
    botaoFechar.current?.focus()

    function aoTeclar(evento) {
      if (evento.key === 'Escape') aoFechar.current()
    }

    window.addEventListener('keydown', aoTeclar)

    return () => {
      window.removeEventListener('keydown', aoTeclar)

      if (anterior instanceof HTMLElement) anterior.focus()
    }
  }, [])

  // Enquanto o modal está aberto, a página atrás não rola.
  useEffect(() => {
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = anterior
    }
  }, [])

  if (!produto) return null

  const total = produto.preco * quantidade

  function ajustar(passo) {
    setQuantidade((atual) => Math.max(1, Math.min(99, atual + passo)))
  }

  function adicionar() {
    onAdicionar({ quantidade, observacao: observacao.trim() })
  }

  return (
    <div
      className="loja__modal-fundo"
      ref={fundo}
      onMouseDown={(evento) => {
        if (evento.target === fundo.current) onFechar()
      }}
    >
      <div
        className="loja__modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="loja-modal-titulo"
      >
        <button
          className="loja__modal-fechar"
          type="button"
          onClick={onFechar}
          aria-label="Fechar detalhes do produto"
          ref={botaoFechar}
        >
          ×
        </button>

        <div className="loja__modal-foto" aria-hidden="true">
          {produto.imagem && !fotoFalhou ? (
            <img src={produto.imagem} alt="" onError={() => setFotoFalhou(true)} />
          ) : (
            <span>{produto.nome.charAt(0).toUpperCase()}</span>
          )}
        </div>

        <div className="loja__modal-corpo">
          <h2 className="loja__modal-titulo" id="loja-modal-titulo">
            {produto.nome}
          </h2>

          {produto.descricao && <p className="loja__modal-desc">{produto.descricao}</p>}

          <div className="loja__modal-compra">
            <div className="loja__contador">
              <button
                type="button"
                onClick={() => ajustar(-1)}
                disabled={quantidade <= 1}
                aria-label="Diminuir quantidade"
              >
                −
              </button>

              <span aria-live="polite">{quantidade}</span>

              <button
                type="button"
                onClick={() => ajustar(1)}
                disabled={quantidade >= 99}
                aria-label="Aumentar quantidade"
              >
                +
              </button>
            </div>

            <span className="loja__modal-total">{formatarDinheiro(total)}</span>
          </div>

          <label className="loja__modal-campo">
            <span>Observação</span>
            <textarea
              value={observacao}
              onChange={(evento) => setObservacao(evento.target.value)}
              placeholder="Ex: sem cebola, ponto da carne, troco para R$ 100"
              maxLength={LIMITE_OBSERVACAO}
              rows={2}
            />
            <span className="loja__modal-contador">
              {observacao.length}/{LIMITE_OBSERVACAO}
            </span>
          </label>

          {!podePedir && (
            <p className="loja__aviso loja__aviso--compacto">{motivoFechado}</p>
          )}

          <button
            className="loja__botao loja__botao--largo"
            type="button"
            onClick={adicionar}
            disabled={!podePedir}
          >
            {podePedir ? `Adicionar · ${formatarDinheiro(total)}` : 'Loja fechada agora'}
          </button>
        </div>
      </div>
    </div>
  )
}
