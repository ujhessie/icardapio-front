import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { publico } from '../../servicos/publico.js'
import { abrirCanalDoPedido } from '../../servicos/socket.js'
import { formatarDinheiro } from '../../utils/dinheiro.js'
import { guardarMeuPedido } from '../../utils/meusPedidos.js'

const PASSOS = [
  { status: 'novo', rotulo: 'Pedido recebido', texto: 'A loja recebeu seu pedido.' },
  { status: 'aceito', rotulo: 'Aceito', texto: 'A loja confirmou o pedido.' },
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

  const [pedido, setPedido] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [aoVivo, setAoVivo] = useState(false)

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

  // Tempo real: a loja muda o status e esta tela muda no mesmo instante,
  // sem o cliente precisar atualizar nada.
  useEffect(() => {
    const socket = abrirCanalDoPedido(pedidoId)

    socket.on('connect', () => setAoVivo(true))
    socket.on('disconnect', () => setAoVivo(false))

    socket.on('pedido:status', ({ pedido: atualizado }) => {
      setPedido(atualizado)
      setErro('')
      setCarregando(false)
    })

    socket.on('pedido:removido', () => {
      setPedido(null)
      setErro('Este pedido não está mais disponível. Fale com a loja.')
    })

    return () => socket.disconnect()
  }, [pedidoId])

  // Rede de segurança: se o canal cair (celular dormindo, internet ruim), a
  // tela ainda se atualiza sozinha. Com o canal ligado o intervalo é folgado.
  useEffect(() => {
    const timer = setInterval(carregar, aoVivo ? 120000 : 20000)
    return () => clearInterval(timer)
  }, [carregar, aoVivo])

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

  const passos =
    pedido.tipo === 'balcao'
      ? PASSOS.filter((passo) => passo.status !== 'saiu_entrega')
      : PASSOS

  const indiceAtual = passos.findIndex((passo) => passo.status === pedido.status)
  const cancelado = pedido.status === 'cancelado'
  const criadoEm = new Date(pedido.criadoEm).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

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

      <header className="loja__pedido-cabecalho">
        <p className="loja__pedido-etiqueta">Pedido</p>
        <h1 className="loja__pedido-numero">#{pedido.numero}</h1>
        <p className="loja__pedido-meta">
          Feito em {criadoEm} · {pedido.tipo === 'delivery' ? 'Entrega' : 'Retirada na loja'}
        </p>
      </header>

      {cancelado ? (
        <p className="loja__aviso loja__aviso--erro">
          Este pedido foi cancelado. Fale com a loja se tiver alguma dúvida.
        </p>
      ) : (
        <ol className="loja__passos">
          {passos.map((passo, indice) => {
            const feito = indiceAtual >= 0 && indice <= indiceAtual
            const atual = indice === indiceAtual

            return (
              <li
                key={passo.status}
                className={`loja__passo-item ${feito ? 'loja__passo-item--feito' : ''} ${
                  atual ? 'loja__passo-item--atual' : ''
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
      )}

      {/* Pedido entregue ou cancelado não muda mais: o aviso vira ruído. */}
      {!cancelado && pedido.status !== 'entregue' && (
        <p className={`loja__aovivo ${aoVivo ? 'loja__aovivo--ligado' : ''}`}>
          {aoVivo ? 'Atualizando em tempo real' : 'Reconectando…'}
        </p>
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
    </main>
  )
}
