import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCarrinho } from '../../contextos/CarrinhoContexto.jsx'
import { useLoja } from '../../contextos/LojaContexto.jsx'
import { publico } from '../../servicos/publico.js'
import { formatarDinheiro } from '../../utils/dinheiro.js'
import { lerMeusPedidos } from '../../utils/meusPedidos.js'
import { itensParaRepetir, mapaDeProdutos } from '../../utils/repetir.js'

/*
 * Histórico do cliente, sem login.
 *
 * Os ids dos pedidos ficam neste aparelho (localStorage), igual ao carrinho. O
 * resto vem sempre da API: assim um pedido de ontem aparece como "entregue"
 * hoje, e não congelado no status da hora da compra.
 */

const STATUS = {
  novo: { rotulo: 'Recebido', grupo: 'andamento' },
  aceito: { rotulo: 'Aceito', grupo: 'andamento' },
  preparando: { rotulo: 'Em preparo', grupo: 'andamento' },
  pronto: { rotulo: 'Pronto', grupo: 'andamento' },
  saiu_entrega: { rotulo: 'Saiu para entrega', grupo: 'andamento' },
  entregue: { rotulo: 'Entregue', grupo: 'entregue' },
  cancelado: { rotulo: 'Cancelado', grupo: 'cancelado' },
}

// Mesma sequência que o painel da loja usa. O cliente vê o mesmo caminho.
const ETAPAS = [
  { status: 'novo', rotulo: 'Recebido' },
  { status: 'aceito', rotulo: 'Aceito' },
  { status: 'preparando', rotulo: 'Em preparo' },
  { status: 'pronto', rotulo: 'Pronto' },
  { status: 'saiu_entrega', rotulo: 'Saiu' },
  { status: 'entregue', rotulo: 'Entregue' },
]

function dataCurta(criadoEm) {
  return new Date(criadoEm).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function resumoItens(itens) {
  const partes = itens.slice(0, 3).map((item) => `${item.quantidade}× ${item.nome}`)

  if (itens.length > 3) partes.push(`+${itens.length - 3}`)

  return partes.join(', ')
}

function CartaoPedido({ pedido, slug, onRepetir }) {
  const status = STATUS[pedido.status] || {
    rotulo: pedido.status,
    grupo: 'andamento',
  }

  const vivo = status.grupo === 'andamento'
  const indice = ETAPAS.findIndex((etapa) => etapa.status === pedido.status)
  const proxima = vivo && indice >= 0 ? ETAPAS[indice + 1] : null

  return (
    <article className={`loja__cartao ${vivo ? 'loja__cartao--vivo' : ''}`}>
      <header className="loja__cartao-topo">
        <div className="loja__cartao-identidade">
          <span className="loja__cartao-numero">#{pedido.numero}</span>
          <span className="loja__cartao-quando">{dataCurta(pedido.criadoEm)}</span>
        </div>

        <span className={`loja__cartao-status loja__cartao-status--${status.grupo}`}>
          {status.rotulo}
        </span>
      </header>

      {vivo && indice >= 0 && (
        <div className="loja__trilha-bloco">
          <div
            className="loja__trilha"
            role="img"
            aria-label={`Etapa ${indice + 1} de ${ETAPAS.length}: ${status.rotulo}`}
          >
            {ETAPAS.map((etapa, posicao) => (
              <span
                key={etapa.status}
                className={`loja__trilha-ponto ${
                  posicao <= indice ? 'loja__trilha-ponto--feito' : ''
                } ${posicao === indice ? 'loja__trilha-ponto--atual' : ''}`}
              />
            ))}
          </div>

          <p className="loja__trilha-legenda">
            {proxima
              ? `Depois: ${proxima.rotulo.toLowerCase()}`
              : 'Última etapa: a loja entrega o pedido.'}
          </p>
        </div>
      )}

      <p className="loja__cartao-itens">{resumoItens(pedido.itens)}</p>

      <div className="loja__cartao-rodape">
        <span className="loja__cartao-tipo">
          {pedido.tipo === 'delivery' ? 'Entrega' : 'Retirada na loja'}
        </span>

        <span className="loja__cartao-total">
          <span>Total</span>
          <strong>{formatarDinheiro(pedido.total)}</strong>
        </span>
      </div>

      {pedido.status === 'cancelado' && (
        <p className="loja__cartao-aviso">
          Este pedido foi cancelado e não foi cobrado.
        </p>
      )}

      <div className="loja__cartao-acoes">
        <Link
          className="loja__botao loja__botao--secundario loja__botao--pequeno"
          to={`/${slug}/pedido/${pedido._id}`}
        >
          {vivo ? 'Acompanhar' : 'Ver detalhes'}
        </Link>

        <button
          className="loja__botao loja__botao--pequeno"
          type="button"
          onClick={() => onRepetir(pedido)}
        >
          Repetir pedido
        </button>
      </div>
    </article>
  )
}

export default function MeusPedidos() {
  const { slug } = useParams()
  const navegar = useNavigate()
  const { dados } = useLoja()
  const { adicionarVarios, quantidadeTotal } = useCarrinho()

  const [ids] = useState(() => lerMeusPedidos(slug))
  const [pedidos, setPedidos] = useState([])
  const [carregando, setCarregando] = useState(ids.length > 0)
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState(null)

  useEffect(() => {
    if (ids.length === 0) return undefined

    let ativo = true

    publico
      .meusPedidos(slug, ids)
      .then((resposta) => {
        if (ativo) setPedidos(resposta.pedidos)
      })
      .catch((e) => {
        if (ativo) setErro(e.message)
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })

    return () => {
      ativo = false
    }
  }, [slug, ids])

  // Preço de hoje e o que saiu de linha: repetir não pode usar preço velho.
  const produtosAtuais = useMemo(() => mapaDeProdutos(dados), [dados])

  // O que ainda está acontecendo fica em cima, com a trilha do pedido. O que já
  // terminou desce e vira histórico — são 5 pedidos antigos por 1 em andamento.
  const emAndamento = pedidos.filter((pedido) =>
    ['novo', 'aceito', 'preparando', 'pronto', 'saiu_entrega'].includes(pedido.status),
  )
  const anteriores = pedidos.filter((pedido) =>
    ['entregue', 'cancelado'].includes(pedido.status),
  )

  function repetir(pedido) {
    const { itens, faltando } = itensParaRepetir(produtosAtuais, pedido)

    if (itens.length > 0) adicionarVarios(itens)

    setResultado({
      adicionados: itens.reduce((soma, item) => soma + item.quantidade, 0),
      faltando,
    })
  }

  return (
    <main className="loja__meus">
      <Link className="loja__voltar" to={`/${slug}`}>
        ← Voltar ao cardápio
      </Link>

      <header className="loja__meus-topo">
        <div>
          <p className="loja__pedido-etiqueta">Neste aparelho</p>
          <h1 className="loja__meus-titulo">Meus pedidos</h1>
        </div>

        {pedidos.length > 0 && !carregando && (
          <p className="loja__meus-contagem">
            {emAndamento.length > 0
              ? `${emAndamento.length} em andamento`
              : 'nenhum em andamento'}
            {anteriores.length > 0 && ` · ${anteriores.length} no histórico`}
          </p>
        )}
      </header>

      {resultado && (
        <div className="loja__repetir" role="status">
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
              <button
                className="loja__botao loja__botao--pequeno"
                type="button"
                onClick={() => navegar(`/${slug}?carrinho=1`)}
              >
                Abrir carrinho
              </button>
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

      {carregando && <p className="loja__carregando-loja">Buscando seus pedidos…</p>}

      {erro && <p className="loja__aviso loja__aviso--erro">{erro}</p>}

      {!carregando && !erro && pedidos.length === 0 && (
        <section className="loja__vazio-pedidos">
          <h2 className="loja__bloco-titulo">Nada por aqui ainda</h2>
          <p className="loja__nota">
            Quando você fizer um pedido neste aparelho, ele aparece nesta lista — com o
            status atualizado e um botão para repetir.
          </p>

          <Link className="loja__botao" to={`/${slug}`}>
            Ver o cardápio
          </Link>
        </section>
      )}

      {emAndamento.length > 0 && (
        <section className="loja__meus-secao">
          <h2 className="loja__meus-secao-titulo">Acontecendo agora</h2>

          <div className="loja__meus-lista">
            {emAndamento.map((pedido) => (
              <CartaoPedido
                key={pedido._id}
                pedido={pedido}
                slug={slug}
                onRepetir={repetir}
              />
            ))}
          </div>
        </section>
      )}

      {anteriores.length > 0 && (
        <section className="loja__meus-secao">
          <h2 className="loja__meus-secao-titulo">Histórico</h2>

          <div className="loja__meus-lista">
            {anteriores.map((pedido) => (
              <CartaoPedido
                key={pedido._id}
                pedido={pedido}
                slug={slug}
                onRepetir={repetir}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
