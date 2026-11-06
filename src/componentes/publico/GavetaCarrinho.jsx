import { useNavigate, useParams } from 'react-router-dom'
import { useCarrinho } from '../../contextos/CarrinhoContexto.jsx'
import { useLoja } from '../../contextos/LojaContexto.jsx'
import { formatarDinheiro } from '../../utils/dinheiro.js'

/*
 * Gaveta do carrinho.
 *
 * Ela é a última revisão antes do checkout, então cada linha mostra o que vai
 * ser cobrado (preço unitário e total da linha) e o único botão forte manda
 * para o pagamento. Observação fica na própria linha, sem tela escondida.
 */
export default function GavetaCarrinho({ onFechar }) {
  const { slug } = useParams()
  const navegar = useNavigate()
  const { dados, status } = useLoja()
  const {
    itens,
    alterarQuantidade,
    alterarObservacao,
    remover,
    quantidadeTotal,
    subtotal,
  } = useCarrinho()

  function irParaCheckout() {
    onFechar()
    navegar(`/${slug}/checkout`)
  }

  return (
    <div className="loja__carrinho-fundo" onClick={onFechar}>
      <aside
        className="loja__carrinho"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-carrinho"
        onClick={(evento) => evento.stopPropagation()}
      >
        <header className="loja__carrinho-topo">
          <div className="loja__carrinho-identidade">
            <h2 id="titulo-carrinho">Seu carrinho</h2>

            <p className="loja__carrinho-sub">
              {itens.length === 0
                ? dados.loja.nome
                : `${quantidadeTotal} ${quantidadeTotal === 1 ? 'item' : 'itens'} · ${
                    dados.loja.nome
                  }`}
            </p>
          </div>

          <button
            className="loja__fechar"
            type="button"
            onClick={onFechar}
            aria-label="Fechar carrinho"
          >
            ×
          </button>
        </header>

        {itens.length === 0 ? (
          <div className="loja__carrinho-vazio">
            <p className="loja__carrinho-vazio-titulo">O carrinho está vazio</p>
            <p className="loja__nota">
              Escolha um item do cardápio e ele aparece aqui, com a quantidade e a
              observação que você quiser.
            </p>

            <button className="loja__botao" type="button" onClick={onFechar}>
              Ver o cardápio
            </button>
          </div>
        ) : (
          <>
            <ul className="loja__carrinho-itens">
              {itens.map((item) => (
                <li key={item.linhaId} className="loja__carrinho-item">
                  <div className="loja__carrinho-item-topo">
                    <span className="loja__carrinho-item-foto" aria-hidden="true">
                      {item.imagem ? (
                        <img src={item.imagem} alt="" loading="lazy" />
                      ) : (
                        item.nome.charAt(0).toUpperCase()
                      )}
                    </span>

                    <div className="loja__carrinho-item-texto">
                      <strong className="loja__carrinho-item-nome">{item.nome}</strong>
                      <span className="loja__carrinho-item-unit">
                        {formatarDinheiro(item.preco)} cada
                      </span>
                    </div>

                    <span className="loja__preco">
                      {formatarDinheiro(item.preco * item.quantidade)}
                    </span>
                  </div>

                  <div className="loja__carrinho-item-controles">
                    <div className="loja__contador">
                      <button
                        type="button"
                        onClick={() => alterarQuantidade(item.linhaId, item.quantidade - 1)}
                        aria-label={`Diminuir ${item.nome}`}
                      >
                        −
                      </button>
                      <span aria-label={`${item.quantidade} unidades`}>
                        {item.quantidade}
                      </span>
                      <button
                        type="button"
                        onClick={() => alterarQuantidade(item.linhaId, item.quantidade + 1)}
                        aria-label={`Aumentar ${item.nome}`}
                      >
                        +
                      </button>
                    </div>

                    <button
                      className="loja__remover"
                      type="button"
                      onClick={() => remover(item.linhaId)}
                    >
                      Remover
                    </button>
                  </div>

                  <input
                    className="loja__observacao"
                    value={item.observacao}
                    onChange={(evento) =>
                      alterarObservacao(item.linhaId, evento.target.value)
                    }
                    placeholder="Alguma observação? (ex: sem cebola)"
                    maxLength={140}
                    aria-label={`Observação para ${item.nome}`}
                  />
                </li>
              ))}
            </ul>

            <footer className="loja__carrinho-rodape">
              <div className="loja__carrinho-total">
                <span>
                  Subtotal
                  <span className="loja__carrinho-total-nota">
                    {quantidadeTotal} {quantidadeTotal === 1 ? 'item' : 'itens'}
                  </span>
                </span>

                <strong>{formatarDinheiro(subtotal)}</strong>
              </div>

              <p className="loja__carrinho-nota">
                A taxa de entrega é calculada no checkout.
              </p>

              {!status.aberto && (
                <p className="loja__carrinho-aviso">
                  {status.texto}. O pedido só é aceito quando a loja abrir.
                </p>
              )}

              <button
                className="loja__botao loja__botao--largo"
                type="button"
                onClick={irParaCheckout}
                disabled={!status.aberto}
              >
                Continuar
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  )
}
