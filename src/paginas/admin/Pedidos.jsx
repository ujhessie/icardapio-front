import { useCallback, useEffect, useRef, useState } from 'react'
import TempoDoPedido from '../../componentes/admin/TempoDoPedido.jsx'
import { lerToken } from '../../servicos/api.js'
import { lojas as servicoLojas } from '../../servicos/lojas.js'
import { pedidos as servicoPedidos } from '../../servicos/pedidos.js'
import { abrirCanalDaLoja } from '../../servicos/tempoReal.js'
import { formatarDinheiro } from '../../utils/dinheiro.js'
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

const COLUNAS = [
  { status: 'novo', titulo: 'Novo', acao: 'Aceitar pedido' },
  { status: 'aceito', titulo: 'Aceito', acao: 'Iniciar preparo' },
  { status: 'preparando', titulo: 'Preparando', acao: 'Marcar pronto' },
  { status: 'pronto', titulo: 'Pronto', acao: 'Saiu para entrega' },
  { status: 'saiu_entrega', titulo: 'Saiu para entrega', acao: 'Marcar entregue' },
  { status: 'entregue', titulo: 'Entregue', acao: null },
]

// Ordem do atendimento: define até onde cada pedido pode ser arrastado.
const ORDEM = COLUNAS.map((coluna) => coluna.status)

const PROXIMO_STATUS = {
  novo: 'aceito',
  aceito: 'preparando',
  preparando: 'pronto',
  pronto: 'saiu_entrega',
  saiu_entrega: 'entregue',
}

const PAGAMENTO = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao: 'Cartão',
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

function Ficha({
  pedido,
  tempos,
  acao,
  confirmando,
  ocupado,
  arrastando,
  onAvancar,
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
          {pedido.tipo === 'delivery' ? 'Delivery' : 'Balcão'}
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
        <div className="ficha__confirmar">
          <span className="ficha__confirmar-texto">
            {confirmando === 'remover' ? 'Apagar de vez?' : 'Cancelar este pedido?'}
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
              {confirmando === 'remover' ? 'Apagar' : 'Cancelar pedido'}
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

export default function Pedidos() {
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

  // Ficha sendo arrastada e coluna sob o ponteiro.
  const [arrastandoId, setArrastandoId] = useState(null)
  const [colunaAlvo, setColunaAlvo] = useState(null)

  // Aba só existe no celular. null = segue a fila.
  const [abaEscolhida, setAbaEscolhida] = useState(null)

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
        if (ativo) setTempos({ ...TEMPOS_PADRAO, ...(loja.tempos || {}) })
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

  function totalDa(status) {
    return noQuadro.filter((pedido) => pedido.status === status).length
  }

  // No celular abre na primeira etapa que tem pedido esperando.
  const statusDaVez =
    COLUNAS.find((coluna) => totalDa(coluna.status) > 0)?.status || 'novo'

  const abaAtiva = abaEscolhida ?? statusDaVez
  const colunaAtiva = COLUNAS.find((coluna) => coluna.status === abaAtiva) || COLUNAS[0]

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

  function avancar(pedido) {
    const proximo = PROXIMO_STATUS[pedido.status]

    if (!proximo) return

    executar(pedido._id, () => servicoPedidos.mudarStatus(pedido._id, proximo))
  }

  /* Arrastar e soltar: leva o pedido para a etapa onde a ficha caiu. Só vale
     para frente — voltar etapa não existe no atendimento. */
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
    }
  }

  function ficha(pedido, acao) {
    return (
      <Ficha
        key={pedido._id}
        pedido={pedido}
        tempos={tempos}
        acao={acao}
        ocupado={ocupado === pedido._id}
        confirmando={confirmar?.id === pedido._id ? confirmar.acao : null}
        arrastando={arrastandoId === pedido._id}
        onAvancar={() => avancar(pedido)}
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
            {COLUNAS.map((coluna, indice) => {
              const cartoes = noQuadro.filter((pedido) => pedido.status === coluna.status)
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
                      <p className="prateleira__vazio">Nenhum pedido</p>
                    )}

                    {cartoes.map((pedido) => ficha(pedido, coluna.acao))}
                  </div>
                </section>
              )
            })}
          </div>

          {/* Celular: uma etapa por vez, escolhida nas abas. */}
          <div className="tabuleiro__movel">
            <div className="tabuleiro__abas" role="tablist" aria-label="Etapas do pedido">
              {COLUNAS.map((coluna) => {
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
                    onClick={() => setAbaEscolhida(coluna.status)}
                  >
                    {coluna.titulo}
                    <span className="tabuleiro__aba-contagem">{total}</span>
                  </button>
                )
              })}
            </div>

            <section className="prateleira">
              <header className="prateleira__topo">
                <h2 className="prateleira__nome">
                  <span className="prateleira__passo" aria-hidden="true">
                    {ORDEM.indexOf(colunaAtiva.status) + 1}
                  </span>
                  {colunaAtiva.titulo}
                </h2>
                <span className="prateleira__contagem">{totalDa(colunaAtiva.status)}</span>
              </header>

              <div className="prateleira__corpo">
                {totalDa(colunaAtiva.status) === 0 && (
                  <p className="prateleira__vazio">
                    Nenhum pedido em “{colunaAtiva.titulo.toLowerCase()}”
                  </p>
                )}

                {noQuadro
                  .filter((pedido) => pedido.status === colunaAtiva.status)
                  .map((pedido) => ficha(pedido, colunaAtiva.acao))}
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
    </div>
  )
}
