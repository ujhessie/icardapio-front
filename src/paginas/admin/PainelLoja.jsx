import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import GraficoVendas from '../../componentes/admin/GraficoVendas.jsx'
import TempoDoPedido from '../../componentes/admin/TempoDoPedido.jsx'
import { useAuth } from '../../contextos/AuthContexto.jsx'
import { lojas as servicoLojas } from '../../servicos/lojas.js'
import { pedidos as servicoPedidos } from '../../servicos/pedidos.js'
import { formatarDinheiro } from '../../utils/dinheiro.js'
import './Painel.css'
import './Dashboard.css'

/*
 * Painel do lojista.
 *
 * Uma tela para responder as quatro perguntas do dia: quanto entrou, quantos
 * pedidos estão na fila, o que precisa de ação agora e como foram as vendas.
 * Tudo vem de dado real da API — nada de número decorativo.
 *
 * Atualização por polling (15s), pausado com a aba escondida: lojista com o
 * painel aberto no celular em segundo plano não precisa gastar rede.
 */

const ATUALIZACAO_MS = 15000

const ABAS = [
  { chave: 'todos', rotulo: 'Todos' },
  { chave: 'novos', rotulo: 'Novos' },
  { chave: 'andamento', rotulo: 'Em andamento' },
  { chave: 'prontos', rotulo: 'Prontos' },
  { chave: 'entregues', rotulo: 'Entregues' },
]

const ETAPAS = ['Novo', 'Preparando', 'Pronto', 'Entregue']

// Em que etapa da trilha cada status está.
const ETAPA_DO_STATUS = {
  novo: 0,
  aceito: 1,
  preparando: 1,
  pronto: 2,
  saiu_entrega: 2,
  entregue: 3,
  cancelado: -1,
}

const SELO_DO_STATUS = {
  novo: { texto: 'Novo', classe: 'dash__selo--novo' },
  aceito: { texto: 'Aceito', classe: 'dash__selo--andamento' },
  preparando: { texto: 'Em preparo', classe: 'dash__selo--andamento' },
  pronto: { texto: 'Pronto', classe: 'dash__selo--pronto' },
  saiu_entrega: { texto: 'Saiu para entrega', classe: 'dash__selo--andamento' },
  entregue: { texto: 'Entregue', classe: 'dash__selo--final' },
  cancelado: { texto: 'Cancelado', classe: 'dash__selo--final' },
}

const PONTO_DO_STATUS = {
  novo: 'novo',
  aceito: 'andamento',
  preparando: 'andamento',
  pronto: 'andamento',
  saiu_entrega: 'andamento',
  entregue: 'entregue',
  cancelado: 'cancelado',
}

const ACOES_DA_ATIVIDADE = {
  novo: 'pedido novo',
  aceito: 'foi aceito',
  preparando: 'entrou em preparo',
  pronto: 'ficou pronto',
  saiu_entrega: 'saiu para entrega',
  entregue: 'foi entregue',
  cancelado: 'foi cancelado',
}

const ATALHOS = [
  {
    para: '/admin/pedidos',
    rotulo: 'Ver pedidos',
    icone: 'pedidos',
    cor: 'laranja',
    svg: (
      <>
        <rect x="6" y="4" width="12" height="16" rx="2" />
        <path d="M9 9h6M9 13h6M9 17h3" />
      </>
    ),
  },
  {
    para: '/admin/cardapio',
    rotulo: 'Editar cardápio',
    icone: 'cardapio',
    cor: 'roxo',
    svg: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v18H6.5A2.5 2.5 0 0 1 4 18.5z" />
        <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v18h4.5A2.5 2.5 0 0 0 20 18.5z" />
      </>
    ),
  },
  {
    para: '/admin/horarios',
    rotulo: 'Horários',
    icone: 'horarios',
    cor: 'verde',
    svg: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </>
    ),
  },
  {
    para: '/admin/delivery',
    rotulo: 'Bairros e taxas',
    icone: 'delivery',
    cor: 'azul',
    svg: (
      <>
        <path d="M3 7h9v8H3z" />
        <path d="M12 10h3l3 3v2h-6z" />
        <circle cx="6.5" cy="17.5" r="1.6" />
        <circle cx="16.5" cy="17.5" r="1.6" />
      </>
    ),
  },
]

function Icone({ children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function horaCurta(data) {
  return new Date(data).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function tempoAtras(data) {
  const minutos = Math.max(0, Math.round((Date.now() - new Date(data).getTime()) / 60000))

  if (minutos < 1) return 'agora'
  if (minutos < 60) return `há ${minutos} min`

  const horas = Math.round(minutos / 60)
  if (horas < 24) return `há ${horas} h`

  return `há ${Math.round(horas / 24)} d`
}

function saudacaoDoDia() {
  const hora = new Date().getHours()

  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

function CartaoPedido({ pedido, tempos }) {
  const selo = SELO_DO_STATUS[pedido.status] || SELO_DO_STATUS.novo
  const etapaAtual = ETAPA_DO_STATUS[pedido.status] ?? 0
  const itens = pedido.itens.slice(0, 3)
  const restantes = pedido.itens.length - itens.length

  return (
    <article className="dash__pedido">
      <header className="dash__pedido-topo">
        <span className="dash__pedido-numero">#{pedido.numero}</span>
        <span className="dash__pedido-quando">{horaCurta(pedido.criadoEm)}</span>
        <TempoDoPedido pedido={pedido} tempos={tempos} />
        <span className={`dash__selo ${selo.classe}`}>{selo.texto}</span>
      </header>

      <div className="dash__pedido-corpo">
        <div className="dash__pedido-dados">
          <span className="dash__pedido-cliente">{pedido.cliente.nome}</span>
          <span className="dash__pedido-linha">
            {pedido.tipo === 'delivery' ? 'Delivery' : 'Balcão'}
            {pedido.tipo === 'delivery' && pedido.bairroNome ? ` · ${pedido.bairroNome}` : ''}
          </span>

          <div className="dash__pedido-itens">
            {itens.map((item, indice) => (
              <span className="dash__pedido-item" key={`${item.nome}-${indice}`}>
                <b>{item.quantidade}×</b>
                {item.nome}
              </span>
            ))}
            {restantes > 0 && (
              <span className="dash__pedido-item">+{restantes} item(ns)</span>
            )}
          </div>
        </div>

        <div className="dash__pedido-preco">
          <span>total</span>
          <strong>{formatarDinheiro(pedido.total)}</strong>
        </div>
      </div>

      {/* Trilha: onde o pedido está, sem precisar abrir o detalhe. */}
      <div className="dash__etapas">
        {ETAPAS.map((etapa, indice) => {
          const feita = etapaAtual >= indice && !pedido.status.startsWith('cancelado')
          const atual = etapaAtual === indice

          return (
            <div
              className={`dash__etapa ${feita ? 'dash__etapa--feita' : ''} ${
                atual ? 'dash__etapa--atual' : ''
              }`}
              key={etapa}
            >
              <span className="dash__etapa-ponto" aria-hidden="true" />
              {etapa}
            </div>
          )
        })}
      </div>
    </article>
  )
}

export default function PainelLoja() {
  const { usuario } = useAuth()

  const [loja, setLoja] = useState(null)
  const [resumo, setResumo] = useState(null)
  const [pedidos, setPedidos] = useState([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [aba, setAba] = useState('todos')
  const [copiado, setCopiado] = useState(false)

  // Polling precisa sempre da versão nova da função.
  const carregarAtual = useRef(null)

  const carregar = useCallback(async () => {
    try {
      const [numeros, lista] = await Promise.all([
        servicoPedidos.resumo(),
        servicoPedidos.listar({ hoje: true }),
      ])

      setResumo(numeros.resumo)
      setPedidos(lista.pedidos)
      setErro('')
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregarAtual.current = carregar
  }, [carregar])

  useEffect(() => {
    let ativo = true

    async function buscarLoja() {
      try {
        const dados = await servicoLojas.minha()
        if (ativo) setLoja(dados.loja)
      } catch (e) {
        if (ativo) setErro(e.message)
      }
    }

    buscarLoja()
    carregar()

    return () => {
      ativo = false
    }
  }, [carregar])

  // Atualiza sozinho, mas só com a tela à vista.
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) carregarAtual.current?.()
    }, ATUALIZACAO_MS)

    function aoVoltar() {
      if (!document.hidden) carregarAtual.current?.()
    }

    document.addEventListener('visibilitychange', aoVoltar)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [])

  const novos = resumo?.novos || 0
  const emAndamento = resumo?.emAndamento || 0
  const entregues = resumo?.entreguesHoje || 0
  const faturamento = resumo?.faturamentoHoje || 0
  const ticket = entregues > 0 ? faturamento / entregues : 0

  function pedidosDaAba() {
    if (aba === 'novos') return pedidos.filter((pedido) => pedido.status === 'novo')
    if (aba === 'andamento') {
      return pedidos.filter((pedido) =>
        ['aceito', 'preparando', 'saiu_entrega'].includes(pedido.status),
      )
    }
    if (aba === 'prontos') return pedidos.filter((pedido) => pedido.status === 'pronto')
    if (aba === 'entregues') return pedidos.filter((pedido) => pedido.status === 'entregue')
    return pedidos.filter((pedido) => pedido.status !== 'cancelado')
  }

  function totalDaAba(chave) {
    if (chave === 'novos') return pedidos.filter((p) => p.status === 'novo').length
    if (chave === 'andamento') {
      return pedidos.filter((p) => ['aceito', 'preparando', 'saiu_entrega'].includes(p.status))
        .length
    }
    if (chave === 'prontos') return pedidos.filter((p) => p.status === 'pronto').length
    if (chave === 'entregues') return pedidos.filter((p) => p.status === 'entregue').length
    return pedidos.filter((p) => p.status !== 'cancelado').length
  }

  const listaDaAba = pedidosDaAba().slice(0, 2)

  // Atividade: os pedidos que mexeram por último, como o banco registrou.
  const atividade = [...pedidos]
    .sort(
      (a, b) =>
        new Date(b.atualizadoEm || b.criadoEm) - new Date(a.atualizadoEm || a.criadoEm),
    )
    .slice(0, 5)

  const dataDeHoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })

  const primeiroNome = (usuario.nome || '').trim().split(' ')[0]
  const urlPublica = loja ? `${window.location.origin}/${loja.slug}` : ''

  return (
    <div className="dashboard">
      <header className="dash__topo">
        <div>
          <h1 className="dash__titulo">
            {saudacaoDoDia()}, {primeiroNome}!
          </h1>
          <p className="dash__subtitulo">
            {loja
              ? `${loja.nome} · ${loja.aberta ? 'recebendo pedidos' : 'fechada para pedidos'}`
              : 'Carregando sua loja…'}
          </p>

          {loja && (
            <div className="dash__link-loja">
              <button
                className="botao botao--secundario botao--pequeno"
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(urlPublica)
                  setCopiado(true)
                  setTimeout(() => setCopiado(false), 1500)
                }}
                disabled={!urlPublica}
                title="Copiar link do cardápio"
              >
                {copiado ? 'Copiado!' : 'Link da loja'}
              </button>
              <span className="dash__link-loja-url">{urlPublica}</span>
            </div>
          )}
        </div>

        <div className="dash__data">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <rect x="3.5" y="5" width="17" height="15" rx="2.5" strokeLinejoin="round" />
            <path d="M3.5 10h17M8 3v4M16 3v4" strokeLinecap="round" />
          </svg>
          <div>
            <strong>{dataDeHoje}</strong>
            <span>atualizado {horaCurta(Date.now())}</span>
          </div>
        </div>
      </header>

      {erro && <p className="painel__aviso painel__aviso--erro">{erro}</p>}

      <div className="dash__kpis">
        <div className="kpi kpi--laranja">
          <span className="kpi__icone" aria-hidden="true">
            <Icone>
              <path d="M12 3.5v17M8 7.5h6a3 3 0 0 1 0 6H8" />
            </Icone>
          </span>
          <div className="kpi__texto">
            <strong className="kpi__valor">{formatarDinheiro(faturamento)}</strong>
            <span className="kpi__rotulo">Faturamento hoje</span>
            <span className="kpi__nota">só pedidos entregues</span>
          </div>
        </div>

        <div className="kpi kpi--roxo">
          <span className="kpi__icone" aria-hidden="true">
            <Icone>
              <rect x="6" y="4" width="12" height="16" rx="2" />
              <path d="M9 9h6M9 13h6M9 17h3" />
            </Icone>
          </span>
          <div className="kpi__texto">
            <strong className="kpi__valor">{novos + emAndamento}</strong>
            <span className="kpi__rotulo">Na fila agora</span>
            <span className="kpi__nota">
              {novos} novos · {emAndamento} em andamento
            </span>
          </div>
        </div>

        <div className="kpi kpi--verde">
          <span className="kpi__icone" aria-hidden="true">
            <Icone>
              <path d="M4.5 12.5l5 5 10-11" />
            </Icone>
          </span>
          <div className="kpi__texto">
            <strong className="kpi__valor">{entregues}</strong>
            <span className="kpi__rotulo">Entregues hoje</span>
            <span className="kpi__nota">contam no faturamento</span>
          </div>
        </div>

        <div className="kpi kpi--azul">
          <span className="kpi__icone" aria-hidden="true">
            <Icone>
              <path d="M4 17V9M9.5 17V5M15 17v-6M20.5 17V7" />
            </Icone>
          </span>
          <div className="kpi__texto">
            <strong className="kpi__valor">{formatarDinheiro(ticket)}</strong>
            <span className="kpi__rotulo">Ticket médio</span>
            <span className="kpi__nota">por pedido entregue</span>
          </div>
        </div>
      </div>

      <div className="dash__grade">
        <section className="dash__cartao dash__pedidos">
          <header className="dash__cartao-topo">
            <h2 className="dash__cartao-titulo">
              <span className="dash__cartao-icone dash__cartao-icone--laranja" aria-hidden="true">
                <Icone>
                  <rect x="6" y="4" width="12" height="16" rx="2" />
                  <path d="M9 9h6M9 13h6M9 17h3" />
                </Icone>
              </span>
              Pedidos Recentes
            </h2>

            <Link className="dash__link-topo" to="/admin/pedidos">
              Ver quadro completo
            </Link>
          </header>

          <div className="dash__abas" role="tablist" aria-label="Filtrar pedidos">
            {ABAS.map((item) => (
              <button
                key={item.chave}
                type="button"
                role="tab"
                aria-selected={aba === item.chave}
                className={`dash__aba ${aba === item.chave ? 'dash__aba--ativa' : ''}`}
                onClick={() => setAba(item.chave)}
              >
                {item.rotulo}
                {totalDaAba(item.chave) > 0 && ` (${totalDaAba(item.chave)})`}
              </button>
            ))}
          </div>

          {carregando && <p className="dash__vazio">Carregando pedidos…</p>}

          {!carregando && pedidos.length === 0 && (
            <div className="dash__pedidos-vazio">
              <span className="dash__pedidos-vazio-icone" aria-hidden="true">
                <Icone>
                  <rect x="6" y="4" width="12" height="16" rx="2" />
                  <path d="M9 9h6M9 13h6M9 17h3" />
                </Icone>
              </span>
              <strong>Nenhum pedido hoje ainda</strong>
              <span>
                Assim que um cliente fechar o pedido, ele aparece aqui na hora — e o sino
                avisa.
              </span>
            </div>
          )}

          {!carregando && pedidos.length > 0 && listaDaAba.length === 0 && (
            <p className="dash__vazio">Nenhum pedido nesta etapa agora.</p>
          )}

          {listaDaAba.map((pedido) => (
            <CartaoPedido key={pedido._id} pedido={pedido} tempos={loja?.tempos} />
          ))}
        </section>

        <section className="dash__cartao dash__acoes">
          <header className="dash__cartao-topo">
            <h2 className="dash__cartao-titulo">
              <span className="dash__cartao-icone dash__cartao-icone--verde" aria-hidden="true">
                <Icone>
                  <path d="M13 3 5 14h6l-1 7 8-11h-6z" />
                </Icone>
              </span>
              Ações Rápidas
            </h2>
          </header>

          <div className="dash__atalhos">
            {ATALHOS.map((atalho) => (
              <Link className="dash__atalho" to={atalho.para} key={atalho.para}>
                <span
                  className={`dash__atalho-icone dash__atalho-icone--${atalho.cor}`}
                  aria-hidden="true"
                >
                  <Icone>{atalho.svg}</Icone>
                </span>
                {atalho.rotulo}
              </Link>
            ))}
          </div>
        </section>

        <GraficoVendas />

        <section className="dash__cartao dash__atividade">
          <header className="dash__cartao-topo">
            <h2 className="dash__cartao-titulo">
              <span className="dash__cartao-icone dash__cartao-icone--roxo" aria-hidden="true">
                <Icone>
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M12 7.5V12l3 2" />
                </Icone>
              </span>
              Atividade Recente
            </h2>
          </header>

          {atividade.length === 0 ? (
            <p className="dash__vazio">Sem movimento por enquanto.</p>
          ) : (
            <ul className="dash__atividade-lista">
              {atividade.map((pedido) => (
                <li className="dash__atividade-item" key={pedido._id}>
                  <span
                    className={`dash__atividade-ponto dash__atividade-ponto--${
                      PONTO_DO_STATUS[pedido.status] || 'novo'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="dash__atividade-texto">
                    <strong>
                      #{pedido.numero} {ACOES_DA_ATIVIDADE[pedido.status] || 'atualizado'}
                    </strong>
                    <span>
                      {pedido.cliente.nome} · {formatarDinheiro(pedido.total)}
                    </span>
                  </span>
                  <span className="dash__atividade-hora">
                    {tempoAtras(pedido.atualizadoEm || pedido.criadoEm)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dash__banner">
          <h2 className="dash__banner-titulo">Seu cardápio está no ar</h2>
          <p className="dash__banner-texto">
            Esse é o link que o cliente abre para ver os produtos e fazer o pedido. Cola na
            bio do Instagram, no WhatsApp e no Google.
          </p>

          {loja && (
            <a
              className="dash__banner-acao"
              href={urlPublica}
              target="_blank"
              rel="noreferrer"
            >
              Ver meu cardápio público
            </a>
          )}
        </section>
      </div>
    </div>
  )
}
