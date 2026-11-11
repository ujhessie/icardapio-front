import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import TempoDoPedido from '../../componentes/admin/TempoDoPedido.jsx'
import { lerToken } from '../../servicos/api.js'
import { bairros as servicoBairros } from '../../servicos/bairros.js'
import { cardapio as servicoCardapio } from '../../servicos/cardapio.js'
import { lojas as servicoLojas } from '../../servicos/lojas.js'
import { pedidos as servicoPedidos } from '../../servicos/pedidos.js'
import { abrirCanalDaLoja, marcarPedidoLocal } from '../../servicos/tempoReal.js'
import { formatarDinheiro, paraCentavos } from '../../utils/dinheiro.js'
import { TEMPOS_PADRAO } from '../../utils/tempos.js'
import './Painel.css'
import './Pedidos.css'

/*
 * Quadro de pedidos.
 *
 * A fila anda da esquerda para a direita e o status só avança — quem garante
 * isso é a API. No desktop o lojista pode arrastar a ficha até a etapa
 * seguinte; no celular a mesma coisa é feita pelo botão do cartão.
 *
 * Cancelado não ocupa espaço no quadro: fica fechado no fim da tela, para
 * consulta, e no histórico (Arquivados) quando é arquivado.
 */

/*
 * Cores das etapas.
 *
 * Servem para o lojista achar a coluna de longe, sem ler: cada etapa tem a sua.
 * A ordem vai do quente (esperando) ao frio (terminado) de propósito — é a
 * leitura natural de quem chega no quadro e quer saber onde está o trabalho.
 */
const COLUNAS = [
  { status: 'novo', titulo: 'Novo', acao: 'Aceitar pedido', cor: '#c2410c' },
  { status: 'aceito', titulo: 'Aceito', acao: 'Iniciar preparo', cor: '#1d4ed8' },
  { status: 'preparando', titulo: 'Preparando', acao: 'Marcar pronto', cor: '#6d28d9' },
  { status: 'pronto', titulo: 'Pronto', acao: 'Saiu para entrega', cor: '#047857' },
  { status: 'saiu_entrega', titulo: 'Saiu para entrega', acao: 'Marcar entregue', cor: '#0369a1' },
  { status: 'entregue', titulo: 'Entregue', acao: null, cor: '#475569' },
]

// Ordem do atendimento: define até onde cada pedido pode ser arrastado.
const ORDEM = COLUNAS.map((coluna) => coluna.status)

// Fluxo de fábrica. A loja escolhe quais etapas aparecem em Configurações.
const FLUXO_PADRAO = { etapas: [...ORDEM], autoAceite: false }

/*
 * Colunas que o quadro vai mostrar.
 *
 * `alvo` é para onde o botão da coluna leva e `acao` é o texto dele. A última
 * coluna visível finaliza o pedido: se a loja escondeu "Entregue", "Pronto"
 * vira o fim da linha — sem isso o pedido ficaria preso no quadro para sempre.
 */
function colunasDa(etapas) {
  const visiveis = COLUNAS.filter((coluna) => etapas.includes(coluna.status))
  const lista = visiveis.length ? visiveis : COLUNAS

  return lista.map((coluna, indice) => {
    const proxima = lista[indice + 1]
    const ultima = !proxima
    const alvo = ultima ? (coluna.status === 'entregue' ? null : 'entregue') : proxima.status

    // Etapa escondida no meio do caminho: o texto diz para onde o pedido vai.
    const pulaEtapa =
      !ultima && ORDEM.indexOf(proxima.status) !== ORDEM.indexOf(coluna.status) + 1

    let acao = coluna.acao

    if (ultima) acao = alvo ? 'Finalizar pedido' : null
    else if (pulaEtapa) acao = `Mover para ${proxima.titulo}`

    return { ...coluna, acao, alvo }
  })
}

/*
 * Em que coluna um pedido aparece: a do próprio status. Se essa etapa estiver
 * escondida, ele cai na próxima etapa visível — pedido nenhum pode sumir.
 */
function colunaDoPedido(pedido, colunas) {
  const posicao = ORDEM.indexOf(pedido.status)

  return (
    colunas.find((coluna) => ORDEM.indexOf(coluna.status) >= posicao) ||
    colunas[colunas.length - 1]
  )
}

const PAGAMENTO = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao: 'Cartão',
}

// Busca sem frescura: "jose" acha "José", "#58" acha o 58.
function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/*
 * O que a busca procura: nome do cliente, número do pedido e código (_id).
 * O telefone entrou de brinde — é o que o lojista tem na mão quando o cliente
 * liga perguntando do pedido.
 */
function combinaBusca(pedido, termo) {
  const alvo = normalizar(termo)

  if (!alvo) return true

  const limpo = alvo.replace(/^#/, '')
  const numero = String(pedido.numero ?? '')
  const id = String(pedido._id ?? '').toLowerCase()
  const nome = normalizar(pedido.cliente?.nome)
  const telefone = String(pedido.cliente?.telefone ?? '').replace(/\D/g, '')
  const digitos = limpo.replace(/\D/g, '')

  if (nome.includes(alvo)) return true
  if (numero && numero.startsWith(limpo)) return true
  // Código só a partir de 4 dígitos: senão "1" chamaria meio banco.
  if (limpo.length >= 4 && id.endsWith(limpo)) return true
  if (digitos.length >= 4 && telefone.includes(digitos)) return true

  return false
}

// Mesa ainda é rara: o filtro só aparece quando existe pedido de mesa na tela.
// Delivery e Balcão ficam sempre — são os dois tipos que a loja usa todo dia.
const FILTROS_TIPO = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'delivery', rotulo: 'Delivery' },
  { valor: 'mesa', rotulo: 'Mesa' },
  { valor: 'balcao', rotulo: 'Balcão' },
]

const NOME_DO_TIPO = {
  delivery: 'Delivery',
  mesa: 'Mesa',
  balcao: 'Balcão',
}

function horaDoPedido(criadoEm) {
  return new Date(criadoEm).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function dataDoPedido(criadoEm) {
  return new Date(criadoEm).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function podeAvancarPara(pedido, status) {
  return ORDEM.indexOf(status) > ORDEM.indexOf(pedido.status)
}

// Voltar é só para etapa anterior de verdade: pedido que já está na frente
// não pode "voltar" para uma coluna que na prática é a mesma coisa.
function podeVoltarPara(pedido, status) {
  const alvo = ORDEM.indexOf(status)

  return alvo >= 0 && alvo < ORDEM.indexOf(pedido.status)
}

function Ficha({
  pedido,
  tempos,
  acao,
  anterior,
  confirmando,
  ocupado,
  arrastando,
  onAvancar,
  onVoltar,
  onEditar,
  onArquivar,
  onPedirConfirmacao,
  onDesistir,
  onConfirmar,
  onComecarArrasto,
  onTerminarArrasto,
}) {
  const telefoneLimpo = (pedido.cliente.telefone || '').replace(/\D/g, '')
  const observacao = pedido.observacao

  return (
    <article
      className={`ficha ${pedido.status === 'novo' ? 'ficha--novo' : ''} ${
        arrastando ? 'ficha--arrastando' : ''
      }`}
      draggable={!confirmando}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', pedido._id)
        e.dataTransfer.effectAllowed = 'move'
        onComecarArrasto(pedido._id)
      }}
      onDragEnd={onTerminarArrasto}
    >
      <header className="ficha__cabeca">
        <span className="ficha__numero">#{pedido.numero}</span>
        <span className="ficha__hora">{horaDoPedido(pedido.criadoEm)}</span>
        <span
          className={`ficha__origem ${
            pedido.tipo === 'delivery' ? 'ficha__origem--entrega' : ''
          }`}
        >
          {pedido.tipo === 'delivery'
            ? 'Delivery'
            : pedido.tipo === 'mesa' && pedido.mesa
              ? `Mesa ${pedido.mesa}`
              : 'Balcão'}
        </span>
      </header>

      <p className="ficha__cliente">{pedido.cliente.nome}</p>

      {/* O lojista atende pelo celular: o telefone tem que discar. */}
      {telefoneLimpo && (
        <a className="ficha__telefone" href={`tel:${telefoneLimpo}`}>
          {pedido.cliente.telefone}
        </a>
      )}

      <ul className="ficha__itens">
        {pedido.itens.map((item, indice) => (
          <li className="ficha__item" key={`${item.nome}-${indice}`}>
            <span className="ficha__item-qtd">{item.quantidade}×</span>
            <span>
              {item.nome}
              {item.observacao && <span className="ficha__obs">“{item.observacao}”</span>}
            </span>
          </li>
        ))}
      </ul>

      {pedido.tipo === 'delivery' && pedido.endereco?.rua && (
        <p className="ficha__endereco">
          {pedido.endereco.rua}, {pedido.endereco.numero} · {pedido.bairroNome}
          {pedido.endereco.referencia && (
            <span className="ficha__referencia">Referência: {pedido.endereco.referencia}</span>
          )}
        </p>
      )}

      {observacao && (
        <p className="ficha__endereco">
          <span className="ficha__referencia">Observação do cliente</span>
          {observacao}
        </p>
      )}

      {pedido.status !== 'entregue' && pedido.status !== 'cancelado' && (
        <div className="ficha__tempo">
          <TempoDoPedido pedido={pedido} tempos={tempos} />
        </div>
      )}

      <footer className="ficha__rodape">
        <div className="ficha__pagamento">
          <span className="ficha__pagamento-nome">
            {PAGAMENTO[pedido.pagamento] || pedido.pagamento}
          </span>
          {pedido.pagamento === 'dinheiro' && pedido.trocoPara > 0 && (
            <span className="ficha__troco">troco para {formatarDinheiro(pedido.trocoPara)}</span>
          )}
        </div>
        <strong className="ficha__total">{formatarDinheiro(pedido.total)}</strong>
      </footer>

      {confirmando ? (
        <div className={`ficha__confirmar ${confirmando === 'voltar' ? 'ficha__confirmar--neutro' : ''}`}>
          <span className="ficha__confirmar-texto">
            {confirmando === 'remover'
              ? 'Apagar de vez?'
              : confirmando === 'voltar'
                ? 'Você realmente quer voltar um status anterior?'
                : 'Cancelar este pedido?'}
          </span>
          <div className="ficha__confirmar-botoes">
            <button
              className="ficha__confirmar-nao"
              type="button"
              disabled={ocupado}
              onClick={onDesistir}
            >
              Não
            </button>
            <button
              className="ficha__confirmar-sim"
              type="button"
              disabled={ocupado}
              onClick={onConfirmar}
            >
              {confirmando === 'remover'
                ? 'Apagar'
                : confirmando === 'voltar'
                  ? 'Voltar etapa'
                  : 'Cancelar pedido'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {acao && (
            <button
              className="ficha__acao"
              type="button"
              disabled={ocupado}
              onClick={onAvancar}
            >
              {ocupado ? 'Salvando…' : acao}
            </button>
          )}

          <div className="ficha__links">
            {(pedido.status === 'entregue' || pedido.status === 'cancelado') && (
              <button
                className="ficha__link"
                type="button"
                disabled={ocupado}
                onClick={onArquivar}
              >
                Arquivar
              </button>
            )}

            {anterior && podeVoltarPara(pedido, anterior.status) && (
              <button
                className="ficha__link"
                type="button"
                disabled={ocupado}
                onClick={() => onPedirConfirmacao('voltar')}
              >
                Voltar etapa
              </button>
            )}

            {pedido.status !== 'entregue' && pedido.status !== 'cancelado' && (
              <button
                className="ficha__link ficha__link--perigo"
                type="button"
                disabled={ocupado}
                onClick={() => onPedirConfirmacao('cancelar')}
              >
                Cancelar pedido
              </button>
            )}

            {pedido.status !== 'entregue' && pedido.status !== 'cancelado' && (
              <button className="ficha__link" type="button" disabled={ocupado} onClick={onEditar}>
                Editar pedido
              </button>
            )}

            {pedido.status === 'cancelado' && (
              <button
                className="ficha__link ficha__link--perigo"
                type="button"
                disabled={ocupado}
                onClick={() => onPedirConfirmacao('remover')}
              >
                Apagar
              </button>
            )}
          </div>
        </>
      )}
    </article>
  )
}

/*
 * Lista de itens editável, usada nos dois modais (editar e novo pedido).
 *
 * O preço de cada linha já vem resolvido por quem chama: item que estava no
 * pedido mantém o preço da compra; item novo entra com o preço de hoje.
 */
function EditorDeItens({ itens, produtos, aoMudarQuantidade, aoRemover, aoAdicionar, minimo = 1 }) {
  const [escolhido, setEscolhido] = useState('')

  // Produto que saiu do cardápio continua no pedido, mas não entra novo.
  const disponiveis = produtos.filter((produto) => produto.disponivel !== false)

  function adicionar() {
    const produto = disponiveis.find((item) => String(item._id) === escolhido)

    if (!produto) return

    aoAdicionar(produto)
    setEscolhido('')
  }

  return (
    <>
      {itens.length === 0 && (
        <p className="editar__fixo">Nenhum item ainda. Escolha no cardápio abaixo.</p>
      )}

      {itens.length > 0 && (
        <ul className="editar__itens">
          {itens.map((item) => (
            <li className="editar__item" key={item.produtoId}>
              <div className="editar__item-dados">
                <strong>{item.nome}</strong>
                <span>{formatarDinheiro(item.precoUnitario)} cada</span>
              </div>

              <div className="editar__passo">
                <button
                  type="button"
                  onClick={() => aoMudarQuantidade(item.produtoId, -1)}
                  disabled={item.quantidade <= 1}
                  aria-label={`Diminuir ${item.nome}`}
                >
                  −
                </button>
                <span>{item.quantidade}</span>
                <button
                  type="button"
                  onClick={() => aoMudarQuantidade(item.produtoId, 1)}
                  disabled={item.quantidade >= 99}
                  aria-label={`Aumentar ${item.nome}`}
                >
                  +
                </button>
              </div>

              <span className="editar__item-total">
                {formatarDinheiro(item.precoUnitario * item.quantidade)}
              </span>

              <button
                className="editar__remover"
                type="button"
                disabled={itens.length <= minimo}
                onClick={() => aoRemover(item.produtoId)}
                aria-label={`Remover ${item.nome}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="editar__novo">
        <select
          value={escolhido}
          onChange={(evento) => setEscolhido(evento.target.value)}
          aria-label="Produto para adicionar"
        >
          <option value="">Adicionar item do cardápio…</option>
          {disponiveis.map((produto) => (
            <option key={produto._id} value={produto._id}>
              {produto.nome} — {formatarDinheiro(produto.preco)}
            </option>
          ))}
        </select>

        <button
          className="editar__adicionar"
          type="button"
          onClick={adicionar}
          disabled={!escolhido}
        >
          Adicionar
        </button>
      </div>
    </>
  )
}

/*
 * Editar pedido em andamento.
 *
 * O lojista corrige o que o cliente errou — nome, endereço, item trocado —
 * sem cancelar e refazer, que perderia o número e a posição na fila.
 *
 * Regra do preço: item que já estava no pedido mantém o preço da compra.
 * Produto novo entra com o preço de hoje. É a mesma regra que a API aplica,
 * aqui só mostramos a conta antes de salvar.
 */
function EditarPedido({ pedido, produtos, salvando, erro, onFechar, onSalvar }) {
  const caixa = useRef(null)

  const [form, setForm] = useState(() => ({
    nome: pedido.cliente?.nome || '',
    telefone: pedido.cliente?.telefone || '',
    rua: pedido.endereco?.rua || '',
    numero: pedido.endereco?.numero || '',
    complemento: pedido.endereco?.complemento || '',
    referencia: pedido.endereco?.referencia || '',
    observacao: pedido.observacao || '',
    itens: pedido.itens.map((item) => ({
      produtoId: String(item.produtoId),
      nome: item.nome,
      precoUnitario: item.precoUnitario,
      quantidade: item.quantidade,
    })),
  }))

  const [aviso, setAviso] = useState('')

  useEffect(() => {
    const elemento = caixa.current

    if (elemento && !elemento.open) elemento.showModal()
  }, [])

  const delivery = pedido.tipo === 'delivery'
  const taxa = pedido.taxaEntrega || 0
  const subtotal = form.itens.reduce(
    (soma, item) => soma + item.precoUnitario * item.quantidade,
    0,
  )

  function alterar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }))
  }

  function mudarQuantidade(produtoId, delta) {
    setForm((atual) => ({
      ...atual,
      itens: atual.itens.map((item) =>
        item.produtoId === produtoId
          ? { ...item, quantidade: Math.min(99, Math.max(1, item.quantidade + delta)) }
          : item,
      ),
    }))
  }

  function removerItem(produtoId) {
    // Um item é o mínimo: pedido vazio não existe.
    setForm((atual) =>
      atual.itens.length === 1
        ? atual
        : { ...atual, itens: atual.itens.filter((item) => item.produtoId !== produtoId) },
    )
  }

  function adicionarItem(produto) {
    setForm((atual) => {
      const jaTem = atual.itens.find((item) => item.produtoId === String(produto._id))

      if (jaTem) {
        return {
          ...atual,
          itens: atual.itens.map((item) =>
            item.produtoId === String(produto._id)
              ? { ...item, quantidade: Math.min(99, item.quantidade + 1) }
              : item,
          ),
        }
      }

      return {
        ...atual,
        itens: [
          ...atual.itens,
          {
            produtoId: String(produto._id),
            nome: produto.nome,
            precoUnitario: produto.preco,
            quantidade: 1,
          },
        ],
      }
    })
  }

  function enviar(evento) {
    evento.preventDefault()

    if (!form.nome.trim()) return setAviso('Informe o nome do cliente')
    if (!form.telefone.trim()) return setAviso('Informe o telefone do cliente')

    if (delivery && (!form.rua.trim() || !form.numero.trim())) {
      return setAviso('Informe a rua e o número da entrega')
    }

    setAviso('')

    const corpo = {
      cliente: { nome: form.nome.trim(), telefone: form.telefone.trim() },
      observacao: form.observacao,
      itens: form.itens.map((item) => ({
        produtoId: item.produtoId,
        quantidade: item.quantidade,
      })),
    }

    if (delivery) {
      corpo.endereco = {
        rua: form.rua.trim(),
        numero: form.numero.trim(),
        complemento: form.complemento,
        referencia: form.referencia,
      }
    }

    onSalvar(corpo)
  }

  const mensagem = aviso || erro

  return (
    <dialog
      className="editar"
      ref={caixa}
      onClose={onFechar}
      onCancel={(evento) => {
        // Enquanto salva, Esc não fecha: fecha sozinho quando a API responder.
        if (salvando) evento.preventDefault()
      }}
      onClick={(evento) => {
        // Clique no fundo (fora da caixa) fecha, como qualquer modal.
        if (evento.target === caixa.current) onFechar()
      }}
    >
      <form className="editar__caixa" onSubmit={enviar}>
        <header className="editar__topo">
          <div>
            <h2 className="editar__titulo">Editar pedido #{pedido.numero}</h2>
            <p className="editar__subtitulo">
              {delivery ? 'Delivery' : pedido.tipo === 'mesa' ? 'Mesa' : 'Balcão'} ·{' '}
              {form.itens.length} {form.itens.length === 1 ? 'item no pedido' : 'itens no pedido'}
            </p>
          </div>

          <button
            className="editar__fechar"
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
          >
            ✕
          </button>
        </header>

        <div className="editar__corpo">
          <fieldset className="editar__grupo">
            <legend className="editar__legenda">Cliente</legend>

            <div className="editar__linha">
              <label className="editar__campo">
                <span className="editar__rotulo">Nome</span>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(evento) => alterar('nome', evento.target.value)}
                  autoComplete="off"
                />
              </label>

              <label className="editar__campo">
                <span className="editar__rotulo">Telefone</span>
                <input
                  type="tel"
                  value={form.telefone}
                  onChange={(evento) => alterar('telefone', evento.target.value)}
                  autoComplete="off"
                />
              </label>
            </div>
          </fieldset>

          {delivery && (
            <fieldset className="editar__grupo">
              <legend className="editar__legenda">Endereço de entrega</legend>

              <div className="editar__linha editar__linha--endereco">
                <label className="editar__campo editar__campo--largo">
                  <span className="editar__rotulo">Rua</span>
                  <input
                    type="text"
                    value={form.rua}
                    onChange={(evento) => alterar('rua', evento.target.value)}
                    autoComplete="off"
                  />
                </label>

                <label className="editar__campo editar__campo--curto">
                  <span className="editar__rotulo">Número</span>
                  <input
                    type="text"
                    value={form.numero}
                    onChange={(evento) => alterar('numero', evento.target.value)}
                    autoComplete="off"
                  />
                </label>
              </div>

              <div className="editar__linha">
                <label className="editar__campo">
                  <span className="editar__rotulo">Complemento</span>
                  <input
                    type="text"
                    value={form.complemento}
                    onChange={(evento) => alterar('complemento', evento.target.value)}
                    autoComplete="off"
                  />
                </label>

                <label className="editar__campo">
                  <span className="editar__rotulo">Referência</span>
                  <input
                    type="text"
                    value={form.referencia}
                    onChange={(evento) => alterar('referencia', evento.target.value)}
                    autoComplete="off"
                  />
                </label>
              </div>

              {pedido.bairroNome && (
                <p className="editar__fixo">
                  Bairro: <strong>{pedido.bairroNome}</strong> · a taxa de entrega não muda por
                  aqui.
                </p>
              )}
            </fieldset>
          )}

          <fieldset className="editar__grupo">
            <legend className="editar__legenda">Itens</legend>

            <EditorDeItens
              itens={form.itens}
              produtos={produtos}
              aoMudarQuantidade={mudarQuantidade}
              aoRemover={removerItem}
              aoAdicionar={adicionarItem}
            />
          </fieldset>

          <fieldset className="editar__grupo">
            <legend className="editar__legenda">Observação</legend>

            <label className="editar__campo">
              <span className="editar__rotulo">Recado do pedido</span>
              <textarea
                rows={2}
                value={form.observacao}
                onChange={(evento) => alterar('observacao', evento.target.value)}
              />
            </label>
          </fieldset>

          <div className="editar__totais">
            <span>
              Subtotal <strong>{formatarDinheiro(subtotal)}</strong>
            </span>

            {delivery && (
              <span>
                Taxa de entrega <strong>{formatarDinheiro(taxa)}</strong>
              </span>
            )}

            <span className="editar__total">
              Total <strong>{formatarDinheiro(subtotal + taxa)}</strong>
            </span>
          </div>
        </div>

        <footer className="editar__rodape">
          {mensagem ? (
            <span className="editar__erro">{mensagem}</span>
          ) : (
            <span className="editar__dica">
              Item que já estava no pedido mantém o preço da compra.
            </span>
          )}

          <div className="editar__acoes">
            <button className="editar__cancelar" type="button" onClick={onFechar}>
              Cancelar
            </button>
            <button className="editar__salvar" type="submit" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  )
}

/*
 * Novo pedido pelo painel.
 *
 * O que chegou por telefone, WhatsApp ou na mesa. Antes o lojista anotava no
 * papel e lançava depois — ou não lançava e o pedido sumia do histórico.
 *
 * Aqui ele entra na mesma fila dos pedidos do cardápio: mesmo número, mesmo
 * quadro, mesma tela de acompanhamento.
 */
function CriarPedido({ produtos, bairros, salvando, erro, onFechar, onSalvar }) {
  const caixa = useRef(null)

  const [form, setForm] = useState({
    tipo: 'delivery',
    nome: '',
    telefone: '',
    rua: '',
    numero: '',
    complemento: '',
    referencia: '',
    bairroId: '',
    mesa: '',
    itens: [],
    pagamento: 'dinheiro',
    troco: '',
    observacao: '',
  })

  const [aviso, setAviso] = useState('')

  useEffect(() => {
    const elemento = caixa.current

    if (elemento && !elemento.open) elemento.showModal()
  }, [])

  const bairrosAtivos = bairros.filter((bairro) => bairro.ativo !== false)
  const bairro = bairrosAtivos.find((item) => String(item._id) === form.bairroId)
  const taxa = form.tipo === 'delivery' && bairro ? bairro.taxaEntrega : 0

  const subtotal = form.itens.reduce(
    (soma, item) => soma + item.precoUnitario * item.quantidade,
    0,
  )

  function alterar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }))
    setAviso('')
  }

  function mudarQuantidade(produtoId, delta) {
    setForm((atual) => ({
      ...atual,
      itens: atual.itens.map((item) =>
        item.produtoId === produtoId
          ? { ...item, quantidade: Math.min(99, Math.max(1, item.quantidade + delta)) }
          : item,
      ),
    }))
  }

  function removerItem(produtoId) {
    setForm((atual) => ({
      ...atual,
      itens: atual.itens.filter((item) => item.produtoId !== produtoId),
    }))
  }

  function adicionarItem(produto) {
    setForm((atual) => {
      const jaTem = atual.itens.find((item) => item.produtoId === String(produto._id))

      if (jaTem) {
        return {
          ...atual,
          itens: atual.itens.map((item) =>
            item.produtoId === String(produto._id)
              ? { ...item, quantidade: Math.min(99, item.quantidade + 1) }
              : item,
          ),
        }
      }

      return {
        ...atual,
        itens: [
          ...atual.itens,
          {
            produtoId: String(produto._id),
            nome: produto.nome,
            precoUnitario: produto.preco,
            quantidade: 1,
          },
        ],
      }
    })
    setAviso('')
  }

  function enviar(evento) {
    evento.preventDefault()

    if (!form.nome.trim()) return setAviso('Informe o nome do cliente')
    if (form.itens.length === 0) return setAviso('Adicione pelo menos um item')

    if (form.tipo === 'delivery') {
      if (!form.bairroId) return setAviso('Escolha o bairro da entrega')
      if (!form.rua.trim() || !form.numero.trim()) {
        return setAviso('Informe a rua e o número da entrega')
      }
    }

    if (form.tipo === 'mesa') {
      const mesa = Number(form.mesa)

      if (!Number.isInteger(mesa) || mesa < 1) return setAviso('Informe o número da mesa')
    }

    // Campo de troco é em reais; a API trabalha em centavos.
    let trocoPara = 0

    if (form.pagamento === 'dinheiro' && form.troco.trim()) {
      trocoPara = paraCentavos(form.troco)

      if (!Number.isFinite(trocoPara) || trocoPara <= 0) {
        return setAviso('Valor de troco inválido')
      }

      if (trocoPara < subtotal + taxa) {
        return setAviso('O troco é menor que o total do pedido')
      }
    }

    const corpo = {
      tipo: form.tipo,
      cliente: { nome: form.nome.trim(), telefone: form.telefone.trim() },
      itens: form.itens.map((item) => ({
        produtoId: item.produtoId,
        quantidade: item.quantidade,
      })),
      pagamento: form.pagamento,
      trocoPara,
      observacao: form.observacao,
    }

    if (form.tipo === 'delivery') {
      corpo.bairroId = form.bairroId
      corpo.endereco = {
        rua: form.rua.trim(),
        numero: form.numero.trim(),
        complemento: form.complemento,
        referencia: form.referencia,
      }
    }

    if (form.tipo === 'mesa') corpo.mesa = Number(form.mesa)

    setAviso('')
    onSalvar(corpo)
  }

  const mensagem = aviso || erro

  return (
    <dialog
      className="editar"
      ref={caixa}
      onClose={onFechar}
      onCancel={(evento) => {
        if (salvando) evento.preventDefault()
      }}
      onClick={(evento) => {
        if (evento.target === caixa.current) onFechar()
      }}
    >
      <form className="editar__caixa" onSubmit={enviar}>
        <header className="editar__topo">
          <div>
            <h2 className="editar__titulo">Novo pedido</h2>
            <p className="editar__subtitulo">
              Pedido que chegou por telefone, WhatsApp ou na mesa.
            </p>
          </div>

          <button className="editar__fechar" type="button" onClick={onFechar} aria-label="Fechar">
            ✕
          </button>
        </header>

        <div className="editar__corpo">
          <fieldset className="editar__grupo">
            <legend className="editar__legenda">Tipo do pedido</legend>

            <div className="editar__tipos" role="radiogroup" aria-label="Tipo do pedido">
              {[
                { valor: 'delivery', rotulo: 'Entrega' },
                { valor: 'mesa', rotulo: 'Mesa' },
                { valor: 'balcao', rotulo: 'Balcão' },
              ].map((opcao) => (
                <button
                  key={opcao.valor}
                  className={`editar__tipo ${
                    form.tipo === opcao.valor ? 'editar__tipo--ativo' : ''
                  }`}
                  type="button"
                  role="radio"
                  aria-checked={form.tipo === opcao.valor}
                  onClick={() => alterar('tipo', opcao.valor)}
                >
                  {opcao.rotulo}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="editar__grupo">
            <legend className="editar__legenda">Cliente</legend>

            <div className="editar__linha">
              <label className="editar__campo">
                <span className="editar__rotulo">Nome</span>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(evento) => alterar('nome', evento.target.value)}
                  autoComplete="off"
                />
              </label>

              <label className="editar__campo">
                <span className="editar__rotulo">Telefone (opcional)</span>
                <input
                  type="tel"
                  value={form.telefone}
                  onChange={(evento) => alterar('telefone', evento.target.value)}
                  autoComplete="off"
                />
              </label>
            </div>
          </fieldset>

          {form.tipo === 'delivery' && (
            <fieldset className="editar__grupo">
              <legend className="editar__legenda">Endereço de entrega</legend>

              <div className="editar__linha editar__linha--endereco">
                <label className="editar__campo editar__campo--largo">
                  <span className="editar__rotulo">Rua</span>
                  <input
                    type="text"
                    value={form.rua}
                    onChange={(evento) => alterar('rua', evento.target.value)}
                    autoComplete="off"
                  />
                </label>

                <label className="editar__campo editar__campo--curto">
                  <span className="editar__rotulo">Número</span>
                  <input
                    type="text"
                    value={form.numero}
                    onChange={(evento) => alterar('numero', evento.target.value)}
                    autoComplete="off"
                  />
                </label>
              </div>

              <div className="editar__linha">
                <label className="editar__campo">
                  <span className="editar__rotulo">Complemento</span>
                  <input
                    type="text"
                    value={form.complemento}
                    onChange={(evento) => alterar('complemento', evento.target.value)}
                    autoComplete="off"
                  />
                </label>

                <label className="editar__campo">
                  <span className="editar__rotulo">Referência</span>
                  <input
                    type="text"
                    value={form.referencia}
                    onChange={(evento) => alterar('referencia', evento.target.value)}
                    autoComplete="off"
                  />
                </label>
              </div>

              <label className="editar__campo">
                <span className="editar__rotulo">Bairro</span>
                <select
                  value={form.bairroId}
                  onChange={(evento) => alterar('bairroId', evento.target.value)}
                >
                  <option value="">Escolha o bairro…</option>
                  {bairrosAtivos.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.nome} — {formatarDinheiro(item.taxaEntrega)}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>
          )}

          {form.tipo === 'mesa' && (
            <fieldset className="editar__grupo">
              <legend className="editar__legenda">Mesa</legend>

              <label className="editar__campo editar__campo--curto">
                <span className="editar__rotulo">Número da mesa</span>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={form.mesa}
                  onChange={(evento) => alterar('mesa', evento.target.value)}
                />
              </label>
            </fieldset>
          )}

          <fieldset className="editar__grupo">
            <legend className="editar__legenda">Itens</legend>

            <EditorDeItens
              itens={form.itens}
              produtos={produtos}
              aoMudarQuantidade={mudarQuantidade}
              aoRemover={removerItem}
              aoAdicionar={adicionarItem}
              minimo={0}
            />
          </fieldset>

          <fieldset className="editar__grupo">
            <legend className="editar__legenda">Pagamento</legend>

            <div className="editar__linha">
              <label className="editar__campo">
                <span className="editar__rotulo">Forma</span>
                <select
                  value={form.pagamento}
                  onChange={(evento) => alterar('pagamento', evento.target.value)}
                >
                  <option value="dinheiro">Dinheiro</option>
                  <option value="pix">Pix</option>
                  <option value="cartao">Cartão</option>
                </select>
              </label>

              {form.pagamento === 'dinheiro' && (
                <label className="editar__campo">
                  <span className="editar__rotulo">Troco para (opcional)</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex.: 50,00"
                    value={form.troco}
                    onChange={(evento) => alterar('troco', evento.target.value)}
                  />
                </label>
              )}
            </div>
          </fieldset>

          <fieldset className="editar__grupo">
            <legend className="editar__legenda">Observação</legend>

            <label className="editar__campo">
              <span className="editar__rotulo">Recado do pedido</span>
              <textarea
                rows={2}
                value={form.observacao}
                onChange={(evento) => alterar('observacao', evento.target.value)}
              />
            </label>
          </fieldset>

          <div className="editar__totais">
            <span>
              Subtotal <strong>{formatarDinheiro(subtotal)}</strong>
            </span>

            {form.tipo === 'delivery' && (
              <span>
                Taxa de entrega <strong>{formatarDinheiro(taxa)}</strong>
              </span>
            )}

            <span className="editar__total">
              Total <strong>{formatarDinheiro(subtotal + taxa)}</strong>
            </span>
          </div>
        </div>

        <footer className="editar__rodape">
          {mensagem ? (
            <span className="editar__erro">{mensagem}</span>
          ) : (
            <span className="editar__dica">O pedido entra na fila como “Novo”.</span>
          )}

          <div className="editar__acoes">
            <button className="editar__cancelar" type="button" onClick={onFechar}>
              Cancelar
            </button>
            <button className="editar__salvar" type="submit" disabled={salvando}>
              {salvando ? 'Lançando…' : 'Lançar pedido'}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  )
}

export default function Pedidos() {
  // A tela cheia mora na casca — é ela que tem a barra lateral. Aqui só pedimos.
  const { telaCheia, alterarTelaCheia } = useOutletContext() || {}

  const [pedidos, setPedidos] = useState([])
  const [resumo, setResumo] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [aoVivo, setAoVivo] = useState(false)
  const [periodo, setPeriodo] = useState('hoje')
  const [visao, setVisao] = useState('quadro')
  const [ocupado, setOcupado] = useState(null)
  const [confirmar, setConfirmar] = useState(null)

  // Prazo de cada etapa, por loja. Enquanto não chega, vale o padrão: contador
  // nunca pode ser o motivo de o quadro não abrir.
  const [tempos, setTempos] = useState(TEMPOS_PADRAO)
  // Quais etapas esta loja mostra. Mesmo caso: até a resposta chegar, o fluxo
  // completo vale, senão o quadro abriria vazio.
  const [fluxo, setFluxo] = useState(FLUXO_PADRAO)

  // Ficha sendo arrastada e coluna sob o ponteiro.
  const [arrastandoId, setArrastandoId] = useState(null)
  const [colunaAlvo, setColunaAlvo] = useState(null)

  // Aba só existe no celular. null = segue a fila.
  const [abaEscolhida, setAbaEscolhida] = useState(null)

  // Busca e filtro do quadro. Não vão para a API: a fila já vem inteira na
  // memória, então filtrar aqui é instantâneo e não perde o tempo real.
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState('todos')

  // Edição de pedido. A lista de produtos só é buscada na primeira vez que o
  // lojista abre o modal — o quadro não precisa dela para abrir.
  const [editando, setEditando] = useState(null)
  const [produtos, setProdutos] = useState(null)
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const [erroEdicao, setErroEdicao] = useState('')

  // Novo pedido lançado no painel.
  const [criando, setCriando] = useState(false)
  const [bairros, setBairros] = useState([])
  const [salvandoCriacao, setSalvandoCriacao] = useState(false)
  const [erroCriacao, setErroCriacao] = useState('')

  const arquivados = visao === 'arquivados'

  const carregar = useCallback(async () => {
    try {
      const [lista, numeros] = await Promise.all([
        servicoPedidos.listar({ hoje: periodo === 'hoje', arquivados }),
        servicoPedidos.resumo(),
      ])

      setPedidos(lista.pedidos)
      setResumo(numeros.resumo)
      setErro('')
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [periodo, arquivados])

  // O canal precisa sempre da versão nova de carregar().
  const carregarAtual = useRef(carregar)

  useEffect(() => {
    carregarAtual.current = carregar
  }, [carregar])

  useEffect(() => {
    setCarregando(true)
    carregar()
  }, [carregar])

  useEffect(() => {
    let ativo = true

    servicoLojas
      .minha()
      .then(({ loja }) => {
        if (!ativo) return

        setTempos({ ...TEMPOS_PADRAO, ...(loja.tempos || {}) })

        const etapas = loja.fluxoPedidos?.etapas

        setFluxo({
          etapas: Array.isArray(etapas) && etapas.length ? etapas : FLUXO_PADRAO.etapas,
          autoAceite: loja.fluxoPedidos?.autoAceite === true,
        })
      })
      .catch(() => {
        // Sem os tempos da loja o contador usa o padrão.
      })

    return () => {
      ativo = false
    }
  }, [])

  useEffect(() => {
    const token = lerToken()

    if (!token) return undefined

    const canal = abrirCanalDaLoja()
    const atualizar = () => carregarAtual.current()

    canal.on('connect', () => setAoVivo(true))
    canal.on('disconnect', () => setAoVivo(false))
    canal.on('pedido:atualizado', atualizar)

    return () => canal.disconnect()
  }, [])

  const numeros = {
    fila: (resumo?.novos || 0) + (resumo?.emAndamento || 0),
    entregues: resumo?.entreguesHoje || 0,
    faturamento: resumo?.faturamentoHoje || 0,
    ticket: resumo?.entreguesHoje ? resumo.faturamentoHoje / resumo.entreguesHoje : 0,
  }

  const cancelados = pedidos.filter((pedido) => pedido.status === 'cancelado')

  // O quadro só trabalha com pedido em andamento: cancelado fica de fora.
  const noQuadro = pedidos.filter((pedido) => pedido.status !== 'cancelado')

  const colunas = useMemo(() => colunasDa(fluxo.etapas), [fluxo.etapas])

  // Filtro é de tela: o quadro mostra o que o lojista procura, sem esconder
  // pedido nenhum do banco. "Mesa" só entra quando existe pedido de mesa.
  const tiposNaTela = new Set(noQuadro.map((pedido) => pedido.tipo))

  const filtrando = busca.trim() !== '' || tipo !== 'todos'

  const visiveis = noQuadro.filter(
    (pedido) => (tipo === 'todos' || pedido.tipo === tipo) && combinaBusca(pedido, busca),
  )

  function totalDa(status) {
    return visiveis.filter((pedido) => colunaDoPedido(pedido, colunas).status === status).length
  }

  // No celular abre na primeira etapa que tem pedido esperando.
  const statusDaVez =
    colunas.find((coluna) => totalDa(coluna.status) > 0)?.status || colunas[0].status

  const abaAtiva = abaEscolhida ?? statusDaVez
  const colunaAtiva = colunas.find((coluna) => coluna.status === abaAtiva) || colunas[0]

  async function executar(id, acao) {
    setOcupado(id)
    setErro('')

    try {
      await acao()
      await carregar()
    } catch (e) {
      setErro(e.message)
    } finally {
      setOcupado(null)
      setConfirmar(null)
    }
  }

  function avancar(pedido, coluna) {
    // Pedido numa etapa escondida: primeiro ele alcança a coluna onde está.
    const alvo =
      ORDEM.indexOf(pedido.status) < ORDEM.indexOf(coluna.status) ? coluna.status : coluna.alvo

    if (!alvo) return

    executar(pedido._id, () => servicoPedidos.mudarStatus(pedido._id, alvo))
  }

  /* Arrastar e soltar: leva o pedido para a etapa onde a ficha caiu. Só vale
     para frente — voltar etapa é pelo botão, com confirmação. */
  function soltarNaColuna(evento, status) {
    evento.preventDefault()

    const id = evento.dataTransfer.getData('text/plain')
    const pedido = pedidos.find((item) => item._id === id)

    setColunaAlvo(null)
    setArrastandoId(null)

    if (!pedido || !podeAvancarPara(pedido, status)) return

    executar(pedido._id, () => servicoPedidos.mudarStatus(pedido._id, status))
  }

  function confirmarAcao(pedido) {
    const acao = confirmar?.acao

    if (acao === 'cancelar') {
      executar(pedido._id, () => servicoPedidos.mudarStatus(pedido._id, 'cancelado'))
      return
    }

    if (acao === 'remover') {
      executar(pedido._id, () => servicoPedidos.remover(pedido._id))
      return
    }

    if (acao === 'voltar') {
      const anterior = anteriorDe(colunaDoPedido(pedido, colunas))

      // A lista mudou entre o clique e a confirmação? Melhor não mexer.
      if (!anterior || !podeVoltarPara(pedido, anterior.status)) return

      executar(pedido._id, () => servicoPedidos.mudarStatus(pedido._id, anterior.status))
    }
  }

  // Coluna imediatamente à esquerda: é até onde o pedido pode voltar.
  function anteriorDe(coluna) {
    const indice = colunas.indexOf(coluna)

    return indice > 0 ? colunas[indice - 1] : null
  }

  async function abrirEdicao(pedido) {
    setEditando(pedido)
    setErroEdicao('')

    if (produtos !== null) return

    try {
      const resposta = await servicoCardapio.listarProdutos()

      setProdutos(resposta.produtos || [])
    } catch (e) {
      // Sem a lista de produtos ainda dá para corrigir cliente e endereço.
      setProdutos([])
      setErroEdicao(e.message)
    }
  }

  async function salvarEdicao(corpo) {
    if (!editando) return

    setSalvandoEdicao(true)
    setErroEdicao('')

    try {
      await servicoPedidos.editar(editando._id, corpo)
      setEditando(null)
      await carregar()
    } catch (e) {
      setErroEdicao(e.message)
    } finally {
      setSalvandoEdicao(false)
    }
  }

  /*
   * Abrir o "Novo pedido" precisa do cardápio e dos bairros. As duas listas
   * ficam em cache na tela: o segundo pedido do dia não espera requisição.
   */
  async function abrirCriacao() {
    setCriando(true)
    setErroCriacao('')

    try {
      const [listaProdutos, listaBairros] = await Promise.all([
        produtos !== null ? Promise.resolve({ produtos }) : servicoCardapio.listarProdutos(),
        servicoBairros.listar(),
      ])

      if (produtos === null) setProdutos(listaProdutos.produtos || [])

      setBairros(listaBairros.bairros || [])
    } catch (e) {
      setErroCriacao(e.message)
    }
  }

  async function salvarCriacao(corpo) {
    setSalvandoCriacao(true)
    setErroCriacao('')

    try {
      const resposta = await servicoPedidos.criar(corpo)

      // O sino é para pedido que chega de fora. Este o lojista acabou de lançar.
      marcarPedidoLocal(resposta?.pedido?._id)

      setCriando(false)
      await carregar()
    } catch (e) {
      setErroCriacao(e.message)
    } finally {
      setSalvandoCriacao(false)
    }
  }

  function ficha(pedido, coluna) {
    return (
      <Ficha
        key={pedido._id}
        pedido={pedido}
        tempos={tempos}
        acao={coluna?.acao || null}
        anterior={anteriorDe(coluna)}
        ocupado={ocupado === pedido._id}
        confirmando={confirmar?.id === pedido._id ? confirmar.acao : null}
        arrastando={arrastandoId === pedido._id}
        onAvancar={() => coluna && avancar(pedido, coluna)}
        onEditar={() => abrirEdicao(pedido)}
        onArquivar={() => executar(pedido._id, () => servicoPedidos.arquivar(pedido._id))}
        onPedirConfirmacao={(novaAcao) => setConfirmar({ id: pedido._id, acao: novaAcao })}
        onDesistir={() => setConfirmar(null)}
        onConfirmar={() => confirmarAcao(pedido)}
        onComecarArrasto={setArrastandoId}
        onTerminarArrasto={() => {
          setArrastandoId(null)
          setColunaAlvo(null)
        }}
      />
    )
  }

  return (
    <div className="tabuleiro">
      <header className="tabuleiro__topo">
        <div>
          <h1 className="tabuleiro__titulo">
            {arquivados ? 'Pedidos arquivados' : 'Pedidos'}
          </h1>
          <p className="tabuleiro__subtitulo">
            {arquivados
              ? 'Histórico do que saiu do quadro. Continua valendo para relatórios e faturamento.'
              : 'A fila corre da esquerda para a direita. '}
            {!arquivados && (
              <span className="tabuleiro__dica">Arraste a ficha para mudar a etapa.</span>
            )}
          </p>
        </div>

        <div className="tabuleiro__controles">
          <span className={`tabuleiro__sinal ${aoVivo ? 'tabuleiro__sinal--ligado' : ''}`}>
            {aoVivo ? 'ao vivo' : 'reconectando'}
          </span>

          <div className="segmento" role="group" aria-label="Período">
            <button
              type="button"
              className={`segmento__botao ${periodo === 'hoje' ? 'segmento__botao--ativo' : ''}`}
              onClick={() => setPeriodo('hoje')}
            >
              Hoje
            </button>
            <button
              type="button"
              className={`segmento__botao ${periodo === 'todos' ? 'segmento__botao--ativo' : ''}`}
              onClick={() => setPeriodo('todos')}
            >
              Todos
            </button>
          </div>

          <div className="segmento" role="group" aria-label="Visão">
            <button
              type="button"
              className={`segmento__botao ${!arquivados ? 'segmento__botao--ativo' : ''}`}
              onClick={() => setVisao('quadro')}
            >
              Quadro
            </button>
            <button
              type="button"
              className={`segmento__botao ${arquivados ? 'segmento__botao--ativo' : ''}`}
              onClick={() => setVisao('arquivados')}
            >
              Arquivados
            </button>
          </div>

          {!arquivados && (
            <button className="tabuleiro__novo" type="button" onClick={abrirCriacao}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              <span>Novo pedido</span>
            </button>
          )}

          {!arquivados && (
            <button
              className={`tabuleiro__cheia ${telaCheia ? 'tabuleiro__cheia--ativa' : ''}`}
              type="button"
              onClick={() => alterarTelaCheia?.()}
              aria-pressed={Boolean(telaCheia)}
              title={
                telaCheia
                  ? 'Sair da tela cheia (Esc)'
                  : 'Fechar a barra lateral e usar a tela toda'
              }
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                {telaCheia ? (
                  <path
                    d="M9 4H4v5M15 20h5v-5M20 9V4h-5M4 15v5h5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <path
                    d="M4 9V4h5M20 15v5h-5M15 4h5v5M9 20H4v-5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
              <span>{telaCheia ? 'Sair' : 'Tela cheia'}</span>
            </button>
          )}
        </div>
      </header>

      {erro && <p className="tabuleiro__erro">{erro}</p>}

      <div className="tabuleiro__resumo">
        <div className={`tabuleiro__numero ${numeros.fila > 0 ? 'tabuleiro__numero--destaque' : ''}`}>
          <span className="tabuleiro__numero-valor">{numeros.fila}</span>
          <span className="tabuleiro__numero-rotulo">na fila agora</span>
        </div>
        <div className="tabuleiro__numero">
          <span className="tabuleiro__numero-valor">{numeros.entregues}</span>
          <span className="tabuleiro__numero-rotulo">entregues hoje</span>
        </div>
        <div className="tabuleiro__numero">
          <span className="tabuleiro__numero-valor">{formatarDinheiro(numeros.faturamento)}</span>
          <span className="tabuleiro__numero-rotulo">faturamento de hoje</span>
        </div>
        <div className="tabuleiro__numero">
          <span className="tabuleiro__numero-valor">{formatarDinheiro(numeros.ticket)}</span>
          <span className="tabuleiro__numero-rotulo">ticket médio</span>
        </div>
      </div>

      {/* Busca e filtro. A fila já está inteira na memória: filtrar aqui é
          instantâneo e não atrapalha o tempo real. */}
      {!arquivados && (
        <section className="busca" aria-label="Buscar e filtrar pedidos">
          <label className="busca__campo">
            <svg
              className="busca__lupa"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.6-3.6" strokeLinecap="round" />
            </svg>

            <input
              type="search"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Buscar por nome, número ou código"
              aria-label="Buscar pedido por nome, número ou código"
            />

            {busca && (
              <button
                className="busca__limpar"
                type="button"
                onClick={() => setBusca('')}
                aria-label="Limpar busca"
              >
                ✕
              </button>
            )}
          </label>

          <div className="segmento busca__tipos" role="group" aria-label="Tipo de pedido">
            {FILTROS_TIPO.filter(
              (opcao) =>
                opcao.valor !== 'mesa' || tipo === 'mesa' || tiposNaTela.has('mesa'),
            ).map((opcao) => (
              <button
                key={opcao.valor}
                type="button"
                className={`segmento__botao ${tipo === opcao.valor ? 'segmento__botao--ativo' : ''}`}
                onClick={() => setTipo(opcao.valor)}
              >
                {opcao.rotulo}
              </button>
            ))}
          </div>

          {filtrando && (
            <p className="busca__resumo">
              <span>
                {visiveis.length} de {noQuadro.length}{' '}
                {noQuadro.length === 1 ? 'pedido' : 'pedidos'}
              </span>

              <button
                className="busca__limpar-tudo"
                type="button"
                onClick={() => {
                  setBusca('')
                  setTipo('todos')
                }}
              >
                limpar filtro
              </button>
            </p>
          )}
        </section>
      )}

      {carregando && <p className="tabuleiro__subtitulo">Carregando pedidos…</p>}

      {!carregando && arquivados && (
        <section className="historico">
          {pedidos.length === 0 && (
            <p className="tabuleiro__aviso-texto">
              Nenhum pedido arquivado {periodo === 'hoje' ? 'hoje' : 'até agora'}.
            </p>
          )}

          {pedidos.map((pedido) => (
            <div className="historico__linha" key={pedido._id}>
              <div className="historico__texto">
                <strong className="historico__titulo">
                  #{pedido.numero} · {pedido.cliente.nome}
                </strong>
                <span className="historico__detalhe">
                  {dataDoPedido(pedido.criadoEm)} · {formatarDinheiro(pedido.total)} ·{' '}
                  {pedido.status === 'cancelado' ? 'cancelado' : 'entregue'}
                </span>
              </div>

              <div className="historico__acoes">
                {confirmar?.id === pedido._id ? (
                  <>
                    <span className="ficha__confirmar-texto">Apagar de vez?</span>
                    <button
                      className="historico__botao historico__botao--perigo"
                      type="button"
                      disabled={ocupado === pedido._id}
                      onClick={() => confirmarAcao(pedido)}
                    >
                      Apagar
                    </button>
                    <button
                      className="historico__botao"
                      type="button"
                      onClick={() => setConfirmar(null)}
                    >
                      Não
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="historico__botao"
                      type="button"
                      disabled={ocupado === pedido._id}
                      onClick={() =>
                        executar(pedido._id, () => servicoPedidos.desarquivar(pedido._id))
                      }
                    >
                      Desarquivar
                    </button>

                    {pedido.status === 'cancelado' && (
                      <button
                        className="historico__botao historico__botao--perigo"
                        type="button"
                        disabled={ocupado === pedido._id}
                        onClick={() => setConfirmar({ id: pedido._id, acao: 'remover' })}
                      >
                        Apagar
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {!carregando && !arquivados && (
        <>
          {/* Desktop: seis prateleiras lado a lado, com arrastar e soltar. */}
          <div className="tabuleiro__quadro">
            {colunas.map((coluna, indice) => {
              const cartoes = visiveis.filter(
                (pedido) => colunaDoPedido(pedido, colunas).status === coluna.status,
              )
              const arrastado = pedidos.find((pedido) => pedido._id === arrastandoId)
              const aceita = arrastado ? podeAvancarPara(arrastado, coluna.status) : false

              const classeAlvo =
                colunaAlvo === coluna.status
                  ? aceita
                    ? 'prateleira--alvo'
                    : 'prateleira--bloqueada'
                  : ''

              return (
                <section
                  className={`prateleira ${classeAlvo}`}
                  key={coluna.status}
                  data-status={coluna.status}
                  style={{ '--cor-coluna': coluna.cor }}
                  onDragOver={(e) => {
                    if (!arrastandoId) return
                    e.preventDefault()
                    e.dataTransfer.dropEffect = aceita ? 'move' : 'none'
                    setColunaAlvo(coluna.status)
                  }}
                  onDragLeave={(e) => {
                    // Só limpa quando o ponteiro sai da coluna de verdade.
                    if (e.currentTarget.contains(e.relatedTarget)) return
                    setColunaAlvo(null)
                  }}
                  onDrop={(e) => soltarNaColuna(e, coluna.status)}
                >
                  <header className="prateleira__topo">
                    <h2 className="prateleira__nome">
                      <span className="prateleira__passo" aria-hidden="true">
                        {indice + 1}
                      </span>
                      {coluna.titulo}
                    </h2>
                    <span className="prateleira__contagem">{cartoes.length}</span>
                  </header>

                  <div className="prateleira__corpo">
                    {cartoes.length === 0 && (
                      <p className="prateleira__vazio">
                        {filtrando ? 'Nenhum pedido com esse filtro' : 'Nenhum pedido'}
                      </p>
                    )}

                    {cartoes.map((pedido) => ficha(pedido, coluna))}
                  </div>
                </section>
              )
            })}
          </div>

          {/* Celular: uma etapa por vez, escolhida nas abas. */}
          <div className="tabuleiro__movel">
            <div className="tabuleiro__abas" role="tablist" aria-label="Etapas do pedido">
              {colunas.map((coluna) => {
                const total = totalDa(coluna.status)

                return (
                  <button
                    key={coluna.status}
                    type="button"
                    role="tab"
                    aria-selected={abaAtiva === coluna.status}
                    className={`tabuleiro__aba ${
                      abaAtiva === coluna.status ? 'tabuleiro__aba--ativa' : ''
                    }`}
                    style={{ '--cor-coluna': coluna.cor }}
                    onClick={() => setAbaEscolhida(coluna.status)}
                  >
                    {coluna.titulo}
                    <span className="tabuleiro__aba-contagem">{total}</span>
                  </button>
                )
              })}
            </div>

            <section className="prateleira" style={{ '--cor-coluna': colunaAtiva.cor }}>
              <header className="prateleira__topo">
                <h2 className="prateleira__nome">
                  <span className="prateleira__passo" aria-hidden="true">
                    {colunas.indexOf(colunaAtiva) + 1}
                  </span>
                  {colunaAtiva.titulo}
                </h2>
                <span className="prateleira__contagem">{totalDa(colunaAtiva.status)}</span>
              </header>

              <div className="prateleira__corpo">
                {totalDa(colunaAtiva.status) === 0 && (
                  <p className="prateleira__vazio">
                    {filtrando
                      ? 'Nenhum pedido com esse filtro'
                      : `Nenhum pedido em “${colunaAtiva.titulo.toLowerCase()}”`}
                  </p>
                )}

                {visiveis
                  .filter((pedido) => colunaDoPedido(pedido, colunas).status === colunaAtiva.status)
                  .map((pedido) => ficha(pedido, colunaAtiva))}
              </div>
            </section>
          </div>

          {noQuadro.length === 0 && (
            <section className="tabuleiro__aviso">
              <p className="tabuleiro__aviso-titulo">
                Nenhum pedido {periodo === 'hoje' ? 'hoje' : 'até agora'}
              </p>
              <p className="tabuleiro__aviso-texto">
                Quando um cliente fechar um pedido, ele aparece aqui na hora.
              </p>
            </section>
          )}

          {cancelados.length > 0 && (
            <details className="tabuleiro__cancelados">
              <summary>
                Cancelados ({cancelados.length})
              </summary>

              <div className="tabuleiro__cancelados-lista">
                {cancelados.map((pedido) => ficha(pedido, null))}
              </div>
            </details>
          )}
        </>
      )}

      {editando && (
        <EditarPedido
          pedido={editando}
          produtos={produtos || []}
          salvando={salvandoEdicao}
          erro={erroEdicao}
          onFechar={() => {
            if (salvandoEdicao) return

            setEditando(null)
            setErroEdicao('')
          }}
          onSalvar={salvarEdicao}
        />
      )}

      {criando && (
        <CriarPedido
          produtos={produtos || []}
          bairros={bairros}
          salvando={salvandoCriacao}
          erro={erroCriacao}
          onFechar={() => {
            if (salvandoCriacao) return

            setCriando(false)
            setErroCriacao('')
          }}
          onSalvar={salvarCriacao}
        />
      )}
    </div>
  )
}
