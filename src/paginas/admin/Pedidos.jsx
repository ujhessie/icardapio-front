import { useCallback, useEffect, useRef, useState } from 'react'
import TempoDoPedido from '../../componentes/admin/TempoDoPedido.jsx'
import { lerToken } from '../../servicos/api.js'
import { lojas as servicoLojas } from '../../servicos/lojas.js'
import { pedidos as servicoPedidos } from '../../servicos/pedidos.js'
import { abrirCanalDaLoja } from '../../servicos/tempoReal.js'
import { formatarDinheiro } from '../../utils/dinheiro.js'
import { TEMPOS_PADRAO } from '../../utils/tempos.js'
import './Painel.css'

/*
 * Quadro de pedidos.
 *
 * A fila anda da esquerda para a direita e o status só avança — quem garante
 * isso é a API. O canal de novidades mantém a tela atualizada sem recarregar.
 *
 * No celular o quadro de 6 colunas não cabe: em vez de rolar de lado, a tela
 * mostra as etapas como abas e só a coluna escolhida, um cartão por linha.
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
  tempos,
  acao,
  confirmando,
  ocupado,
  onAvancar,
  onArquivar,
  onPedirConfirmacao,
  onDesistir,
  onConfirmar,
}) {
  const terminado = pedido.status === 'entregue'
  const cancelado = pedido.status === 'cancelado'
  const finalizado = terminado || cancelado
  const telefoneLimpo = (pedido.cliente.telefone || '').replace(/\D/g, '')

  return (
    <article
      className={`pedido ${pedido.status === 'novo' ? 'pedido--novo' : ''} ${
        finalizado ? 'pedido--final' : ''
      }`}
    >
      <header className="pedido__topo">
        <span className="pedido__numero">#{pedido.numero}</span>
        <span className="pedido__hora">{horaDoPedido(pedido.criadoEm)}</span>
        <span className="etiqueta etiqueta--neutro pedido__tipo">
          {pedido.tipo === 'delivery' ? 'Delivery' : 'Balcão'}
        </span>
      </header>

      <p className="pedido__cliente">{pedido.cliente.nome}</p>

      {/* O lojista abre o pedido no celular: telefone tem que discar. */}
      {telefoneLimpo ? (
        <a className="pedido__telefone" href={`tel:${telefoneLimpo}`}>
          {pedido.cliente.telefone}
        </a>
      ) : (
        <p className="pedido__telefone">sem telefone</p>
      )}

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

      {!finalizado && (
        <div className="pedido__tempo">
          <TempoDoPedido pedido={pedido} tempos={tempos} />
        </div>
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
            {(terminado || cancelado) && (
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
              <button
                className="pedido__link-acao pedido__link-acao--perigo"
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

  // Prazo de cada etapa, por loja. Enquanto não chega, vale o padrão: um
  // contador nunca pode ser o motivo de o quadro não abrir.
  const [tempos, setTempos] = useState(TEMPOS_PADRAO)

  // Aba só existe no celular. null = segue a fila (primeira etapa com pedido).
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

  // O handler do canal precisa sempre da versão nova de carregar().
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
        // Sem os tempos da loja o contador usa o padrão. Não vale derrubar o
        // quadro por causa de um enfeite.
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

  function totalDa(status) {
    return pedidos.filter((pedido) => pedido.status === status).length
  }

  // No celular, abre na etapa que precisa de ação; se nada estiver parado,
  // abre na primeira da fila.
  const statusDaVez =
    COLUNAS.find((coluna) => totalDa(coluna.status) > 0 && coluna.status !== 'entregue')
      ?.status || 'novo'

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

  function cartao(pedido, acao) {
    return (
      <CartaoPedido
        key={pedido._id}
        pedido={pedido}
        tempos={tempos}
        acao={acao}
        ocupado={ocupado === pedido._id}
        confirmando={confirmar?.id === pedido._id ? confirmar.acao : null}
        onAvancar={() => avancar(pedido)}
        onArquivar={() => executar(pedido._id, () => servicoPedidos.arquivar(pedido._id))}
        onPedirConfirmacao={(novaAcao) => setConfirmar({ id: pedido._id, acao: novaAcao })}
        onDesistir={() => setConfirmar(null)}
        onConfirmar={() => confirmarAcao(pedido)}
      />
    )
  }

  return (
    <div className="painel">
      <main className="painel__conteudo painel__conteudo--quadro">
        <div className="painel__cabecalho">
          <div>
            <h1 className="painel__titulo">{arquivados ? 'Pedidos arquivados' : 'Pedidos'}</h1>
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

            <div
              className="pedidos__grupo pedidos__grupo--periodo"
              role="group"
              aria-label="Período"
            >
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
          <div className={`painel__numero ${numeros.fila > 0 ? 'painel__numero--destaque' : ''}`}>
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
            {/* Desktop: as seis colunas lado a lado. */}
            <div className="pedidos__quadro">
              {COLUNAS.map((coluna) => {
                const cartoes = pedidos.filter((pedido) => pedido.status === coluna.status)

                return (
                  <section
                    className={`pedidos__coluna ${
                      coluna.status === 'novo' && cartoes.length > 0
                        ? 'pedidos__coluna--chamando'
                        : ''
                    }`}
                    key={coluna.status}
                  >
                    <header className="pedidos__coluna-topo">
                      <h2 className="pedidos__coluna-titulo">
                        <span
                          className={`pedidos__coluna-ponto pedidos__coluna-ponto--${coluna.status}`}
                          aria-hidden="true"
                        />
                        {coluna.titulo}
                      </h2>
                      <span className="pedidos__coluna-contagem">{cartoes.length}</span>
                    </header>

                    {cartoes.length === 0 && <p className="pedidos__vazio">vazio</p>}

                    {cartoes.map((pedido) => cartao(pedido, coluna.acao))}
                  </section>
                )
              })}
            </div>

            {/* Celular: uma etapa por vez, escolhida nas abas. */}
            <div className="pedidos__movel">
              <div className="pedidos__abas" role="tablist" aria-label="Etapas do pedido">
                {COLUNAS.map((coluna) => {
                  const total = totalDa(coluna.status)

                  return (
                    <button
                      key={coluna.status}
                      type="button"
                      role="tab"
                      aria-selected={abaAtiva === coluna.status}
                      className={`pedidos__aba ${
                        abaAtiva === coluna.status ? 'pedidos__aba--ativa' : ''
                      } ${total > 0 ? 'pedidos__aba--cheia' : ''}`}
                      onClick={() => setAbaEscolhida(coluna.status)}
                    >
                      <span
                        className={`pedidos__coluna-ponto pedidos__coluna-ponto--${coluna.status}`}
                        aria-hidden="true"
                      />
                      {coluna.titulo}
                      <span className="pedidos__aba-contagem">{total}</span>
                    </button>
                  )
                })}
              </div>

              <section className="pedidos__coluna pedidos__coluna--movel">
                <header className="pedidos__coluna-topo">
                  <h2 className="pedidos__coluna-titulo">
                    <span
                      className={`pedidos__coluna-ponto pedidos__coluna-ponto--${colunaAtiva.status}`}
                      aria-hidden="true"
                    />
                    {colunaAtiva.titulo}
                  </h2>
                  <span className="pedidos__coluna-contagem">{totalDa(colunaAtiva.status)}</span>
                </header>

                {totalDa(colunaAtiva.status) === 0 && (
                  <p className="pedidos__vazio">
                    Nenhum pedido em “{colunaAtiva.titulo.toLowerCase()}” agora.
                  </p>
                )}

                {pedidos
                  .filter((pedido) => pedido.status === colunaAtiva.status)
                  .map((pedido) => cartao(pedido, colunaAtiva.acao))}
              </section>
            </div>

            {cancelados.length > 0 && (
              <section className="painel__secao">
                <h2 className="painel__subtitulo">Cancelados</h2>
                <p className="painel__ajuda">
                  Não entregues, então não contam no faturamento. Arquivar guarda o histórico;
                  apagar só existe aqui, para faxina.
                </p>

                <div className="pedidos__cancelados">
                  {cancelados.map((pedido) => cartao(pedido, null))}
                </div>
              </section>
            )}

            {pedidos.length === 0 && (
              <section className="painel__secao">
                <p className="painel__aviso">
                  Nenhum pedido {periodo === 'hoje' ? 'hoje' : 'até agora'}. Quando um cliente
                  fechar o pedido, ele aparece aqui na hora.
                </p>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
