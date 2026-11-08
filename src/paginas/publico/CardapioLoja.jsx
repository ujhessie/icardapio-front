import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import CapaLoja from '../../componentes/publico/CapaLoja.jsx'
import GavetaCarrinho from '../../componentes/publico/GavetaCarrinho.jsx'
import ModalProduto from '../../componentes/publico/ModalProduto.jsx'
import { useCarrinho } from '../../contextos/CarrinhoContexto.jsx'
import { useLoja } from '../../contextos/LojaContexto.jsx'
import { formatarDinheiro } from '../../utils/dinheiro.js'

/*
 * Card do produto.
 *
 * A foto é externa (URL do painel) e pode sair do ar: `fotoFalhou` troca a
 * imagem pela inicial da loja em vez de deixar um quadrado quebrado. Cada card
 * guarda o próprio estado — um item sem foto não afeta os outros.
 */
function CartaoProduto({ produto, podePedir, onAbrir, onAdicionar }) {
  const [fotoFalhou, setFotoFalhou] = useState(false)
  const temFoto = Boolean(produto.imagem) && !fotoFalhou

  return (
    <article className="loja__produto">
      <button
        className="loja__produto-abrir"
        type="button"
        onClick={onAbrir}
        aria-label={`Ver ${produto.nome}`}
      >
        <span className={`loja__produto-foto ${temFoto ? 'loja__produto-foto--cheia' : ''}`}>
          {temFoto ? (
            <img
              src={produto.imagem}
              alt=""
              loading="lazy"
              onError={() => setFotoFalhou(true)}
            />
          ) : (
            produto.nome.charAt(0).toUpperCase()
          )}
        </span>

        <span className="loja__produto-texto">
          <span className="loja__produto-nome">{produto.nome}</span>

          {produto.descricao && (
            <span className="loja__produto-desc">{produto.descricao}</span>
          )}
        </span>
      </button>

      <div className="loja__produto-acoes">
        <span className="loja__produto-preco">{formatarDinheiro(produto.preco)}</span>

        <button
          className="loja__adicionar"
          type="button"
          onClick={onAdicionar}
          disabled={!podePedir}
          aria-label={`Adicionar ${produto.nome} ao carrinho`}
        >
          +
        </button>
      </div>
    </article>
  )
}

export default function CardapioLoja() {
  const { dados, status } = useLoja()
  const { slug } = useParams()
  const [parametros, setParametros] = useSearchParams()

  const { adicionar, adicionarVarios, quantidadeTotal, subtotal } = useCarrinho()

  const [carrinhoAberto, setCarrinhoAberto] = useState(
    () => parametros.get('carrinho') === '1',
  )
  const [produtoAberto, setProdutoAberto] = useState(null)
  const [categoriaAtiva, setCategoriaAtiva] = useState(null)

  const listaRef = useRef(null)

  const { loja, categorias, bairros } = dados

  // "Repetir pedido" manda o cliente para cá com ?carrinho=1: abre o carrinho
  // uma vez e limpa a URL, para o F5 não reabrir em cima do cliente.
  useEffect(() => {
    if (parametros.get('carrinho') !== '1') return

    const limpos = new URLSearchParams(parametros)
    limpos.delete('carrinho')
    setParametros(limpos, { replace: true })
  }, [])

  useEffect(() => {
    document.body.style.overflow = carrinhoAberto ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [carrinhoAberto])

  useEffect(() => {
    function aoTeclar(evento) {
      if (evento.key === 'Escape') setCarrinhoAberto(false)
    }

    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])

  // Qual categoria está na frente? A barra fixa destaca essa. Um listener de
  // scroll com requestAnimationFrame resolve sem lib e sem IntersectionObserver
  // brigando com seções curtas.
  useEffect(() => {
    const alvo = listaRef.current

    if (!alvo) return undefined

    let quadro = 0

    function medir() {
      quadro = 0

      const secoes = alvo.querySelectorAll('[data-categoria]')
      const limite = 130

      let atual = secoes[0]?.dataset.categoria || null

      for (const secao of secoes) {
        if (secao.getBoundingClientRect().top - limite <= 0) {
          atual = secao.dataset.categoria
        }
      }

      setCategoriaAtiva((anterior) => (anterior === atual ? anterior : atual))
    }

    function aoRolar() {
      if (quadro) return
      quadro = requestAnimationFrame(medir)
    }

    medir()
    window.addEventListener('scroll', aoRolar, { passive: true })
    window.addEventListener('resize', aoRolar)

    return () => {
      window.removeEventListener('scroll', aoRolar)
      window.removeEventListener('resize', aoRolar)
      cancelAnimationFrame(quadro)
    }
  }, [categorias.length])

  function irParaCategoria(evento, categoriaId) {
    evento.preventDefault()
    setCategoriaAtiva(categoriaId)
    document
      .getElementById(`categoria-${categoriaId}`)
      ?.scrollIntoView({ block: 'start' })
  }

  function adicionarDoModal({ quantidade, observacao }) {
    adicionarVarios([{ produto: produtoAberto, quantidade, observacao }])
    setProdutoAberto(null)
  }

  return (
    <>
      <CapaLoja loja={loja} status={status} bairros={bairros} />

      <main className="loja__conteudo" ref={listaRef}>
        {!status.aberto && (
          <p className="loja__aviso">
            {status.texto}. Você pode ver o cardápio, mas não é possível enviar pedido.
          </p>
        )}

        {categorias.length === 0 && (
          <p className="loja__vazio">O cardápio está sendo preparado. Volte em breve.</p>
        )}

        {categorias.length > 0 && (
          <>
            <nav className="loja__categorias" aria-label="Categorias do cardápio">
              <div className="loja__categorias-lista">
                {categorias.map((categoria) => {
                  const ativa = categoriaAtiva === categoria._id

                  return (
                    <a
                      key={categoria._id}
                      className={`loja__categoria-link ${
                        ativa ? 'loja__categoria-link--ativa' : ''
                      }`}
                      href={`#categoria-${categoria._id}`}
                      aria-current={ativa ? 'true' : undefined}
                      onClick={(evento) => irParaCategoria(evento, categoria._id)}
                    >
                      {categoria.nome}
                    </a>
                  )
                })}
              </div>
            </nav>

            {categorias.map((categoria) => (
              <section
                key={categoria._id}
                id={`categoria-${categoria._id}`}
                data-categoria={categoria._id}
                className="loja__secao"
              >
                <h2 className="loja__secao-titulo">{categoria.nome}</h2>

                <div className="loja__produtos">
                  {categoria.produtos.map((produto) => (
                    <CartaoProduto
                      key={produto._id}
                      produto={produto}
                      podePedir={status.aberto}
                      onAbrir={() => setProdutoAberto(produto)}
                      onAdicionar={() => adicionar(produto)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </main>

      {produtoAberto && (
        <ModalProduto
          produto={produtoAberto}
          podePedir={status.aberto}
          motivoFechado={`${status.texto}. Você pode montar o carrinho, mas o pedido só é aceito quando a loja abrir.`}
          onFechar={() => setProdutoAberto(null)}
          onAdicionar={adicionarDoModal}
        />
      )}

      {quantidadeTotal > 0 && (
        <button
          className="loja__barra-carrinho"
          type="button"
          onClick={() => setCarrinhoAberto(true)}
        >
          <span className="loja__barra-quantidade">{quantidadeTotal}</span>

          <span className="loja__barra-texto">
            Ver carrinho
            <span className="loja__barra-detalhe">
              {quantidadeTotal === 1 ? '1 item' : `${quantidadeTotal} itens`}
            </span>
          </span>

          <span className="loja__barra-total">{formatarDinheiro(subtotal)}</span>
        </button>
      )}

      {carrinhoAberto && <GavetaCarrinho onFechar={() => setCarrinhoAberto(false)} />}
    </>
  )
}
