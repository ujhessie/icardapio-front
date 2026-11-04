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

      <header className="loja__pedido-cabecalho">
        <p className="loja__pedido-etiqueta">Neste aparelho</p>
        <h1 className="loja__pedido-numero">Meus pedidos</h1>
        <p className="loja__pedido-meta">
          Seus últimos pedidos ficam guardados aqui, com o status de agora.
        </p>
      </header>

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

      {carregando && <p className="loja__carregando">Buscando seus pedidos…</p>}

      {erro && <p className="loja__aviso loja__aviso--erro">{erro}</p>}

      {!carregando && !erro && pedidos.length === 0 && (
        <div className="loja__bloco">
          <h2 className="loja__bloco-titulo">Nada por aqui ainda</h2>
          <p className="loja__nota">
            Quando você fizer um pedido neste aparelho, ele aparece nesta lista — com o
            status atualizado e um botão para repetir.
          </p>

          <div className="loja__repetir-acoes">
            <Link className="loja__botao" to={`/${slug}`}>
              Ver o cardápio
            </Link>
          </div>
        </div>
      )}

      {pedidos.length > 0 && (
        <div className="loja__meus-lista">
          {pedidos.map((pedido) => {
            const status = STATUS[pedido.status] || {
              rotulo: pedido.status,
              grupo: 'andamento',
            }

            return (
              <article className="loja__cartao" key={pedido._id}>
                <header className="loja__cartao-topo">
                  <span className="loja__cartao-numero">#{pedido.numero}</span>
                  <span className={`loja__cartao-status loja__cartao-status--${status.grupo}`}>
                    {status.rotulo}
                  </span>
                </header>

                <p className="loja__cartao-info">
                  {dataCurta(pedido.criadoEm)} ·{' '}
                  {pedido.tipo === 'delivery' ? 'Entrega' : 'Retirada'} ·{' '}
                  {resumoItens(pedido.itens)}
                </p>

                <p className="loja__cartao-info">
                  Total <strong>{formatarDinheiro(pedido.total)}</strong>
                  {pedido.status === 'cancelado' && ' · não foi entregue'}
                </p>

                <div className="loja__cartao-acoes">
                  <Link
                    className="loja__botao loja__botao--secundario loja__botao--pequeno"
                    to={`/${slug}/pedido/${pedido._id}`}
                  >
                    Acompanhar
                  </Link>

                  <button
                    className="loja__botao loja__botao--pequeno"
                    type="button"
                    onClick={() => repetir(pedido)}
                  >
                    Repetir pedido
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </main>
  )
}
