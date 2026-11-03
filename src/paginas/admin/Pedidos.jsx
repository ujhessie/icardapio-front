import { useCallback, useEffect, useRef, useState } from 'react'
import CabecalhoPainel from '../../componentes/admin/CabecalhoPainel.jsx'
import { lerToken } from '../../servicos/api.js'
import { pedidos as servicoPedidos } from '../../servicos/pedidos.js'
import { abrirCanalDaLoja } from '../../servicos/socket.js'
import { formatarDinheiro } from '../../utils/dinheiro.js'
import './Painel.css'

/*
 * Quadro de pedidos, agora com dados reais.
 *
 * A fila anda da esquerda para a direita e o status só avança — quem garante
 * isso é a API. O Socket.io mantém a tela atualizada: pedido novo do cliente
 * aparece aqui sozinho, sem recarregar.
 */

const COLUNAS = [
  { status: 'novo', titulo: 'Novo', acao: 'Aceitar pedido' },
  { status: 'aceito', titulo: 'Aceito', acao: 'Iniciar preparo' },
  { status: 'preparando', titulo: 'Preparando', acao: 'Marcar pronto' },
  { status: 'pronto', titulo: 'Pronto', acao: 'Saiu para entrega' },
  { status: 'saiu_entrega', titulo: 'Saiu para entrega', acao: 'Marcar entregue' },
  { status: 'entregue', titulo: 'Entregue', acao: null },
]

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

function idadeDoPedido(criadoEm) {
  return Math.max(0, Math.round((Date.now() - new Date(criadoEm).getTime()) / 60000))
}

function dataDoPedido(criadoEm) {
  return new Date(criadoEm).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function CartaoPedido({
  pedido,
  acao,
  confirmando,
  ocupado,
  onAvancar,
  onArquivar,
  onPedirConfirmacao,
  onDesistir,
  onConfirmar,
}) {
  const idade = idadeDoPedido(pedido.criadoEm)
  const terminado = pedido.status === 'entregue'
  const cancelado = pedido.status === 'cancelado'
  const finalizado = terminado || cancelado

  return (
    <article className={`pedido ${pedido.status === 'novo' ? 'pedido--novo' : ''}`}>
      <header className="pedido__topo">
        <span className="pedido__numero">#{pedido.numero}</span>
        <span className="pedido__hora">{horaDoPedido(pedido.criadoEm)}</span>
        <span className="etiqueta etiqueta--neutro pedido__tipo">
          {pedido.tipo === 'delivery' ? 'Delivery' : 'Balcão'}
        </span>
      </header>

      <p className="pedido__cliente">{pedido.cliente.nome}</p>
      <p className="pedido__telefone">{pedido.cliente.telefone}</p>

      <ul className="pedido__itens">
        {pedido.itens.map((item, indice) => (
          <li className="pedido__item" key={`${item.nome}-${indice}`}>
            <span className="pedido__item-quantidade">{item.quantidade}×</span>
            <span>
              {item.nome}
              {item.observacao && (
                <span className="pedido__item-observacao">“{item.observacao}”</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {pedido.tipo === 'delivery' && pedido.endereco?.rua && (
        <p className="pedido__endereco">
          {pedido.endereco.rua}, {pedido.endereco.numero} · {pedido.bairroNome}
          {pedido.endereco.referencia && (
            <span className="pedido__referencia">Referência: {pedido.endereco.referencia}</span>
          )}
        </p>
      )}

      <div className="pedido__rodape">
        <div className="pedido__pagamento-bloco">
          <span className="pedido__pagamento">
            {PAGAMENTO[pedido.pagamento] || pedido.pagamento}
          </span>
          {pedido.pagamento === 'dinheiro' && pedido.trocoPara > 0 && (
            <span className="pedido__troco">
              troco para {formatarDinheiro(pedido.trocoPara)}
            </span>
          )}
        </div>
        <strong className="pedido__total">{formatarDinheiro(pedido.total)}</strong>
      </div>

      {!cancelado && (
        <p className="pedido__idade">
          {idade < 1 ? 'chegou agora' : `há ${idade} min`}
        </p>
      )}

      {confirmando ? (
        <div className="pedido__confirmar">
          <span>{confirmando === 'remover' ? 'Apagar de vez?' : 'Cancelar pedido?'}</span>
          <button
            className="botao botao--perigo"
            type="button"
            disabled={ocupado}
            onClick={onConfirmar}
          >
            {confirmando === 'remover' ? 'Apagar' : 'Sim'}
          </button>
          <button
            className="botao botao--secundario"
            type="button"
            disabled={ocupado}
            onClick={onDesistir}
          >
            Não
          </button>
        </div>
      ) : (
        <>
          {acao && (
            <button
              className="botao pedido__avancar"
              type="button"
              disabled={ocupado}
              onClick={onAvancar}
            >
              {acao}
            </button>
          )}

          <div className="pedido__acoes">
            {terminado && (
              <button
                className="pedido__link-acao"
                type="button"
                disabled={ocupado}
                onClick={onArquivar}
              >
                Arquivar
              </button>
            )}

            {!finalizado && (
              <button
                className="pedido__link-acao pedido__link-acao--perigo"
                type="button"
                disabled={ocupado}
                onClick={() => onPedirConfirmacao('cancelar')}
              >
                Cancelar pedido
              </button>
            )}

            {cancelado && (
              <>
                <button
                  className="pedido__link-acao"
                  type="button"
                  disabled={ocupado}
                  onClick={onArquivar}
                >
                  Arquivar
                </button>
                <button
                  className="pedido__link-acao pedido__link-acao--perigo"
                  type="button"
                  disabled={ocupado}
                  onClick={() => onPedirConfirmacao('remover')}
                >
                  Apagar
                </button>
              </>
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

  // O handler do socket precisa sempre da versão nova de carregar().
  const carregarAtual = useRef(carregar)

  useEffect(() => {
    carregarAtual.current = carregar
  }, [carregar])

  useEffect(() => {
    setCarregando(true)
    carregar()
  }, [carregar])

  useEffect(() => {
    const token = lerToken()

    if (!token) return undefined

    const socket = abrirCanalDaLoja(token)
    const atualizar = () => carregarAtual.current()

    socket.on('connect', () => setAoVivo(true))
    socket.on('disconnect', () => setAoVivo(false))
    socket.on('pedido:novo', atualizar)
    socket.on('pedido:atualizado', atualizar)
    socket.on('pedido:removido', atualizar)

    return () => socket.disconnect()
  }, [])

  const numeros = {
    fila: (resumo?.novos || 0) + (resumo?.emAndamento || 0),
    entregues: resumo?.entreguesHoje || 0,
    faturamento: resumo?.faturamentoHoje || 0,
    ticket: resumo?.entreguesHoje
      ? resumo.faturamentoHoje / resumo.entreguesHoje
      : 0,
  }

  const cancelados = pedidos.filter((pedido) => pedido.status === 'cancelado')

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

  return (
    <div className="painel">
      <CabecalhoPainel />

      <main className="painel__conteudo painel__conteudo--quadro">
        <div className="painel__cabecalho">
          <div>
            <h1 className="painel__titulo">
              {arquivados ? 'Pedidos arquivados' : 'Pedidos'}
            </h1>
            <p className="painel__ajuda">
              {arquivados
                ? 'Saíram do quadro mas continuam valendo para relatórios e faturamento.'
                : 'A fila anda da esquerda para a direita. O cliente acompanha cada mudança.'}
            </p>
          </div>

          <div className="pedidos__filtros">
            <span className={`pedidos__aovivo ${aoVivo ? 'pedidos__aovivo--ligado' : ''}`}>
              {aoVivo ? 'ao vivo' : 'reconectando'}
            </span>

            <div className="pedidos__grupo pedidos__grupo--periodo" role="group" aria-label="Período">
              <button
                type="button"
                className={`pedidos__filtro ${periodo === 'hoje' ? 'pedidos__filtro--ativo' : ''}`}
                onClick={() => setPeriodo('hoje')}
              >
                Hoje
              </button>
              <button
                type="button"
                className={`pedidos__filtro ${periodo === 'todos' ? 'pedidos__filtro--ativo' : ''}`}
                onClick={() => setPeriodo('todos')}
              >
                Todos
              </button>
            </div>

            <div className="pedidos__grupo" role="group" aria-label="Visão">
              <button
                type="button"
                className={`pedidos__filtro ${!arquivados ? 'pedidos__filtro--ativo' : ''}`}
                onClick={() => setVisao('quadro')}
              >
                Quadro
              </button>
              <button
                type="button"
                className={`pedidos__filtro ${arquivados ? 'pedidos__filtro--ativo' : ''}`}
                onClick={() => setVisao('arquivados')}
              >
                Arquivados
              </button>
            </div>
          </div>
        </div>

        {erro && <p className="painel__aviso painel__aviso--erro">{erro}</p>}

        <div className="painel__numeros">
          <div className="painel__numero">
            <span className="painel__numero-valor">{numeros.fila}</span>
            <span className="painel__numero-rotulo">na fila agora</span>
          </div>
          <div className="painel__numero">
            <span className="painel__numero-valor">{numeros.entregues}</span>
            <span className="painel__numero-rotulo">entregues hoje</span>
          </div>
          <div className="painel__numero">
            <span className="painel__numero-valor">{formatarDinheiro(numeros.faturamento)}</span>
            <span className="painel__numero-rotulo">faturamento de hoje</span>
          </div>
          <div className="painel__numero">
            <span className="painel__numero-valor">{formatarDinheiro(numeros.ticket)}</span>
            <span className="painel__numero-rotulo">ticket médio</span>
          </div>
        </div>

        {carregando && <p className="painel__ajuda">Carregando pedidos…</p>}

        {!carregando && arquivados && (
          <section className="painel__secao">
            {pedidos.length === 0 && (
              <p className="painel__aviso">
                Nenhum pedido arquivado {periodo === 'hoje' ? 'hoje' : 'até agora'}.
              </p>
            )}

            {pedidos.length > 0 && (
              <ul className="painel__lista">
                {pedidos.map((pedido) => (
                  <li className="painel__item" key={pedido._id}>
                    <div className="painel__item-texto">
                      <strong>
                        #{pedido.numero} · {pedido.cliente.nome}
                      </strong>
                      <span className="painel__item-detalhe">
                        {dataDoPedido(pedido.criadoEm)} · {formatarDinheiro(pedido.total)} ·{' '}
                        {pedido.status === 'cancelado' ? 'cancelado' : 'entregue'}
                      </span>
                    </div>

                    <div className="painel__acoes-linha">
                      {confirmar?.id === pedido._id ? (
                        <>
                          <span className="pedido__confirmar-texto">Apagar de vez?</span>
                          <button
                            className="botao botao--perigo botao--pequeno"
                            type="button"
                            disabled={ocupado === pedido._id}
                            onClick={() => confirmarAcao(pedido)}
                          >
                            Apagar
                          </button>
                          <button
                            className="botao botao--secundario botao--pequeno"
                            type="button"
                            onClick={() => setConfirmar(null)}
                          >
                            Não
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="botao botao--secundario botao--pequeno"
                            type="button"
                            disabled={ocupado === pedido._id}
                            onClick={() =>
                              executar(pedido._id, () => servicoPedidos.desarquivar(pedido._id))
                            }
                          >
                            Desarquivar
                          </button>

                          {/* Apagar só vale para cancelado — a API recusa o resto. */}
                          {pedido.status === 'cancelado' && (
                            <button
                              className="botao botao--texto-perigo"
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
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {!carregando && !arquivados && (
          <>
            <div className="pedidos__quadro">
              {COLUNAS.map((coluna) => {
                const cartoes = pedidos.filter((pedido) => pedido.status === coluna.status)

                return (
                  <section className="pedidos__coluna" key={coluna.status}>
                    <header className="pedidos__coluna-topo">
                      <h2 className="pedidos__coluna-titulo">{coluna.titulo}</h2>
                      <span className="pedidos__coluna-contagem">{cartoes.length}</span>
                    </header>

                    {cartoes.length === 0 && <p className="pedidos__vazio">sem pedidos</p>}

                    {cartoes.map((pedido) => (
                      <CartaoPedido
                        key={pedido._id}
                        pedido={pedido}
                        acao={coluna.acao}
                        ocupado={ocupado === pedido._id}
                        confirmando={
                          confirmar?.id === pedido._id ? confirmar.acao : null
                        }
                        onAvancar={() => avancar(pedido)}
                        onArquivar={() =>
                          executar(pedido._id, () => servicoPedidos.arquivar(pedido._id))
                        }
                        onPedirConfirmacao={(acao) =>
                          setConfirmar({ id: pedido._id, acao })
                        }
                        onDesistir={() => setConfirmar(null)}
                        onConfirmar={() => confirmarAcao(pedido)}
                      />
                    ))}
                  </section>
                )
              })}
            </div>

            {cancelados.length > 0 && (
              <section className="painel__secao">
                <h2 className="painel__subtitulo">Cancelados</h2>
                <p className="painel__ajuda">
                  Não entregues, então não contam no faturamento. Arquivar guarda o
                  histórico; apagar só existe aqui, para faxina.
                </p>

                <div className="pedidos__cancelados">
                  {cancelados.map((pedido) => (
                    <CartaoPedido
                      key={pedido._id}
                      pedido={pedido}
                      acao={null}
                      ocupado={ocupado === pedido._id}
                      confirmando={
                        confirmar?.id === pedido._id ? confirmar.acao : null
                      }
                      onAvancar={() => {}}
                      onArquivar={() =>
                        executar(pedido._id, () => servicoPedidos.arquivar(pedido._id))
                      }
                      onPedirConfirmacao={(acao) =>
                        setConfirmar({ id: pedido._id, acao })
                      }
                      onDesistir={() => setConfirmar(null)}
                      onConfirmar={() => confirmarAcao(pedido)}
                    />
                  ))}
                </div>
              </section>
            )}

            {pedidos.length === 0 && (
              <section className="painel__secao">
                <p className="painel__aviso">
                  Nenhum pedido {periodo === 'hoje' ? 'hoje' : 'até agora'}. Quando um
                  cliente fechar o pedido, ele aparece aqui na hora.
                </p>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
