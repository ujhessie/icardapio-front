import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCarrinho } from '../../contextos/CarrinhoContexto.jsx'
import { useLoja } from '../../contextos/LojaContexto.jsx'
import { publico } from '../../servicos/publico.js'
import { abrirCanalDoPedido } from '../../servicos/tempoReal.js'
import { formatarDinheiro } from '../../utils/dinheiro.js'
import { guardarMeuPedido } from '../../utils/meusPedidos.js'
import { itensParaRepetir, mapaDeProdutos } from '../../utils/repetir.js'

const PASSOS = [
  { status: 'novo', rotulo: 'Pedido recebido', texto: 'A loja recebeu seu pedido.' },
  { status: 'aceito', rotulo: 'Pedido aceito', texto: 'A loja confirmou o pedido.' },
  { status: 'preparando', rotulo: 'Em preparo', texto: 'Sua comida está sendo preparada.' },
  { status: 'pronto', rotulo: 'Pronto', texto: 'O pedido está pronto.' },
  { status: 'saiu_entrega', rotulo: 'Saiu para entrega', texto: 'O pedido saiu para entrega.' },
  { status: 'entregue', rotulo: 'Entregue', texto: 'Bom apetite!' },
]

const ROTULOS_PAGAMENTO = {
  pix: 'Pix',
  cartao: 'Cartão',
  dinheiro: 'Dinheiro',
}

export default function AcompanharPedido() {
  const { slug, pedidoId } = useParams()
  const { dados } = useLoja()
  const { adicionarVarios, quantidadeTotal } = useCarrinho()

  const [pedido, setPedido] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [aoVivo, setAoVivo] = useState(false)
  const [resultado, setResultado] = useState(null)

  const carregar = useCallback(async () => {
    try {
      const resposta = await publico.pedido(slug, pedidoId)
      setPedido(resposta.pedido)
      setErro('')
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [slug, pedidoId])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Quem abriu o link no WhatsApp também passa a ver o pedido em "Meus pedidos"
  // neste aparelho — senão o histórico teria um buraco.
  useEffect(() => {
    guardarMeuPedido(slug, pedidoId)
  }, [slug, pedidoId])

  // A tela acompanha o pedido sozinha: o canal pergunta para a loja de tempos
  // em tempos e avisa quando algo muda (ver servicos/tempoReal.js).
  useEffect(() => {
    const canal = abrirCanalDoPedido(slug, pedidoId)

    canal.on('connect', () => setAoVivo(true))
    canal.on('disconnect', () => setAoVivo(false))

    canal.on('pedido:status', ({ pedido: atualizado }) => {
      setPedido(atualizado)
      setErro('')
      setCarregando(false)
    })

    canal.on('pedido:removido', () => {
      setPedido(null)
      setErro('Este pedido não está mais disponível. Fale com a loja.')
    })

    return () => canal.disconnect()
  }, [slug, pedidoId])

  const loja = dados.loja

  const mapaDeProdutosAtuais = useMemo(() => mapaDeProdutos(dados), [dados])

  const whatsapp = useMemo(() => {
    const numero = (loja.telefone || '').replace(/\D/g, '')

    if (!numero || !pedido) return null

    const comPais = numero.length <= 11 ? `55${numero}` : numero
    const texto = encodeURIComponent(`Olá! Sobre o pedido #${pedido.numero}, daqui é o cliente.`)

    return `https://wa.me/${comPais}?text=${texto}`
  }, [loja.telefone, pedido])

  function repetir() {
    if (!pedido) return

    const { itens, faltando } = itensParaRepetir(mapaDeProdutosAtuais, pedido)

    if (itens.length > 0) adicionarVarios(itens)

    setResultado({
      adicionados: itens.reduce((soma, item) => soma + item.quantidade, 0),
      faltando,
    })
  }

  if (carregando) {
    return <p className="loja__carregando">Carregando pedido…</p>
  }

  if (erro || !pedido) {
    return (
      <main className="loja__indisponivel">
        <h1>Pedido não encontrado</h1>
        <p>{erro || 'Confira o link que a loja enviou.'}</p>
        <Link to={`/${slug}`}>Voltar ao cardápio</Link>
      </main>
    )
  }

  // O cliente vê as mesmas etapas que a loja escolheu no painel. Balcão não
  // tem "saiu para entrega" — não faz sentido para quem retira na loja.
  const etapasDaLoja = dados?.loja?.fluxoPedidos?.etapas
  const visiveis = (Array.isArray(etapasDaLoja) && etapasDaLoja.length
    ? etapasDaLoja
    : PASSOS.map((passo) => passo.status)
  ).filter((status) => pedido.tipo !== 'balcao' || status !== 'saiu_entrega')

  const passos = PASSOS.filter((passo) => visiveis.includes(passo.status))

  /*
   * Etapa escondida não pode deixar o cliente sem referência: o pedido aparece
   * no primeiro passo visível a partir do status real — o mesmo que o painel
   * faz com as colunas. Assim as duas telas contam a mesma história.
   */
  const posicaoReal = PASSOS.findIndex((passo) => passo.status === pedido.status)
  const indiceAtual =
    posicaoReal < 0
      ? passos.length - 1
      : Math.max(
          0,
          passos.findIndex(
            (passo) => PASSOS.findIndex((base) => base.status === passo.status) >= posicaoReal,
          ),
        )

  const atual = passos[indiceAtual]
  const cancelado = pedido.status === 'cancelado'
  const finalizado = cancelado || pedido.status === 'entregue'

  const criadoEm = new Date(pedido.criadoEm).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  const rotuloAtual = cancelado ? 'Pedido cancelado' : atual?.rotulo || pedido.status
  const textoAtual = cancelado
    ? 'A loja cancelou este pedido. Se você já pagou, fale com a loja.'
    : atual?.texto || ''

  return (
    <main className="loja__pedido">
      <div className="loja__voltar-linha">
        <Link className="loja__voltar" to={`/${slug}`}>
          ← Voltar ao cardápio
        </Link>

        <Link className="loja__voltar" to={`/${slug}/pedidos`}>
          Meus pedidos
        </Link>
      </div>

      <header
        className={`loja__status-hero ${
          cancelado
            ? 'loja__status-hero--cancelado'
            : finalizado
              ? 'loja__status-hero--final'
              : ''
        }`}
      >
        <div className="loja__status-hero-topo">
          <span className="loja__pedido-etiqueta">Pedido #{pedido.numero}</span>

          {!finalizado && (
            <span className={`loja__aovivo ${aoVivo ? 'loja__aovivo--ligado' : ''}`}>
              {aoVivo ? 'Ao vivo' : 'Reconectando…'}
            </span>
          )}
        </div>

        <h1 className="loja__status-titulo" aria-live="polite">
          {rotuloAtual}
        </h1>
        <p className="loja__status-texto">{textoAtual}</p>

        <p className="loja__pedido-meta">
          Feito em {criadoEm} · {pedido.tipo === 'delivery' ? 'Entrega' : 'Retirada na loja'}
        </p>
      </header>

      {!cancelado && (
        <section className="loja__bloco">
          <h2 className="loja__bloco-titulo">Acompanhamento</h2>

          <ol className="loja__passos">
            {passos.map((passo, indice) => {
              const feito = indiceAtual >= 0 && indice <= indiceAtual
              const eAtual = indice === indiceAtual

              return (
                <li
                  key={passo.status}
                  className={`loja__passo-item ${feito ? 'loja__passo-item--feito' : ''} ${
                    eAtual ? 'loja__passo-item--atual' : ''
                  }`}
                >
                  <span className="loja__passo-marca" aria-hidden="true">
                    {feito ? '✓' : indice + 1}
                  </span>

                  <span className="loja__passo-texto">
                    <strong>{passo.rotulo}</strong>
                    <span>{passo.texto}</span>
                  </span>
                </li>
              )
            })}
          </ol>
        </section>
      )}

      <section className="loja__bloco">
        <h2 className="loja__bloco-titulo">Itens</h2>

        <ul className="loja__resumo-itens">
          {pedido.itens.map((item, indice) => (
            <li key={indice} className="loja__resumo-item">
              <span>
                {item.quantidade}× {item.nome}
                {item.observacao && (
                  <small className="loja__item-observacao">{item.observacao}</small>
                )}
              </span>
              <span>{formatarDinheiro(item.precoUnitario * item.quantidade)}</span>
            </li>
          ))}
        </ul>

        <div className="loja__resumo-divisor" />

        <div className="loja__resumo-linha">
          <span>Subtotal</span>
          <span>{formatarDinheiro(pedido.subtotal)}</span>
        </div>

        <div className="loja__resumo-linha">
          <span>Taxa de entrega</span>
          <span>
            {pedido.tipo === 'delivery' ? formatarDinheiro(pedido.taxaEntrega) : 'grátis'}
          </span>
        </div>

        <div className="loja__resumo-linha loja__resumo-linha--total">
          <span>Total</span>
          <strong>{formatarDinheiro(pedido.total)}</strong>
        </div>
      </section>

      <section className="loja__bloco">
        <h2 className="loja__bloco-titulo">
          {pedido.tipo === 'delivery' ? 'Entrega' : 'Retirada'}
        </h2>

        {pedido.tipo === 'delivery' ? (
          <div className="loja__dados">
            <p>
              {pedido.endereco.rua}, {pedido.endereco.numero}
            </p>
            {pedido.endereco.complemento && <p>{pedido.endereco.complemento}</p>}
            {pedido.bairroNome && <p>Bairro: {pedido.bairroNome}</p>}
            {pedido.endereco.referencia && (
              <p className="loja__nota">Referência: {pedido.endereco.referencia}</p>
            )}
          </div>
        ) : (
          <p>Retire no balcão da loja.</p>
        )}

        <p>
          Pagamento: {ROTULOS_PAGAMENTO[pedido.pagamento] || pedido.pagamento}
          {pedido.pagamento === 'dinheiro' && pedido.trocoPara > 0
            ? ` — troco para ${formatarDinheiro(pedido.trocoPara)}`
            : ''}
        </p>

        {pedido.observacao && <p className="loja__nota">Observação: {pedido.observacao}</p>}
      </section>

      <section className="loja__bloco loja__contato">
        <div className="loja__contato-loja">
          <span className="loja__contato-mark" aria-hidden="true">
            {loja.logo ? (
              <img src={loja.logo} alt="" />
            ) : (
              loja.nome.charAt(0).toUpperCase()
            )}
          </span>

          <span className="loja__contato-texto">
            <strong>{loja.nome}</strong>
            {loja.telefone && <span className="loja__nota">{loja.telefone}</span>}
          </span>
        </div>

        {whatsapp && (
          <a
            className="loja__botao loja__botao--secundario"
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
          >
            Falar com a loja
          </a>
        )}
      </section>

      {finalizado && (
        <section className="loja__bloco">
          <h2 className="loja__bloco-titulo">Pedir de novo</h2>

          <p className="loja__nota">
            Os itens voltam para o carrinho com o preço de hoje. Se algo saiu do
            cardápio, a gente avisa antes.
          </p>

          <div className="loja__repetir-acoes">
            <button className="loja__botao" type="button" onClick={repetir}>
              Repetir pedido
            </button>
          </div>

          {resultado && (
            <div className="loja__repetir">
              <strong>
                {resultado.adicionados > 0
                  ? `${resultado.adicionados} ${
                      resultado.adicionados === 1 ? 'item foi' : 'itens foram'
                    } para o carrinho`
                  : 'Nada entrou no carrinho'}
              </strong>

              {resultado.faltando.length > 0 && (
                <span className="loja__nota">
                  Fora do cardápio hoje: {resultado.faltando.join(', ')}.
                </span>
              )}

              <div className="loja__repetir-acoes">
                {quantidadeTotal > 0 && (
                  <Link
                    className="loja__botao loja__botao--pequeno"
                    to={`/${slug}?carrinho=1`}
                  >
                    Abrir carrinho
                  </Link>
                )}

                <button
                  className="loja__botao loja__botao--secundario loja__botao--pequeno"
                  type="button"
                  onClick={() => setResultado(null)}
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  )
}
