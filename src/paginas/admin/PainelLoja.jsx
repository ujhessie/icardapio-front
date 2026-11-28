import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contextos/AuthContexto.jsx'
import { lojas as servicoLojas } from '../../servicos/lojas.js'
import { pedidos as servicoPedidos } from '../../servicos/pedidos.js'
import { formatarDinheiro } from '../../utils/dinheiro.js'
import './Painel.css'
import './Dashboard.css'

/*
 * Painel do lojista — a versão curta.
 *
 * Responde três coisas e só três: a loja está recebendo pedido, quanto entrou
 * hoje e quem está esperando. O resto (gráfico, atividade, ticket médio,
 * atalhos) saiu: a lateral e a barra do celular já levam a tudo, e número
 * demais faz o lojista não olhar para nenhum.
 *
 * Atualização por polling (15s), pausado com a aba escondida: lojista com o
 * painel aberto no celular em segundo plano não precisa gastar rede.
 */

const ATUALIZACAO_MS = 15000

// Quantos pedidos cabem na lista antes de virar "ver todos".
const VISIVEIS = 4

// Quem ainda precisa de alguém. Entregue e cancelado não entram: não há o que
// fazer com eles, e o histórico existe para isso.
const ESPERANDO = ['novo', 'aceito', 'preparando', 'pronto', 'saiu_entrega']

const SELO_DO_STATUS = {
  novo: { texto: 'Novo', classe: 'dash__selo--novo' },
  aceito: { texto: 'Aceito', classe: 'dash__selo--andamento' },
  preparando: { texto: 'Em preparo', classe: 'dash__selo--andamento' },
  pronto: { texto: 'Pronto', classe: 'dash__selo--pronto' },
  saiu_entrega: { texto: 'Saiu para entrega', classe: 'dash__selo--andamento' },
}

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

  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `há ${horas} h`

  return `há ${Math.floor(horas / 24)} d`
}

function saudacaoDoDia() {
  const hora = new Date().getHours()

  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

function resumoDosItens(pedido) {
  const total = pedido.itens.length
  const primeiro = pedido.itens[0]

  if (!primeiro) return 'Sem itens'
  if (total === 1) return `${primeiro.quantidade}× ${primeiro.nome}`

  return `${primeiro.quantidade}× ${primeiro.nome} + ${total - 1} item(ns)`
}

function LinhaPedido({ pedido }) {
  const selo = SELO_DO_STATUS[pedido.status] || SELO_DO_STATUS.novo

  return (
    <Link
      className="dash__linha"
      to={`/admin/pedidos/gerenciar?pedido=${pedido.numero}`}
      aria-label={`Abrir o pedido ${pedido.numero} de ${pedido.cliente.nome}`}
    >
      <span className="dash__linha-topo">
        <span className="dash__linha-numero">#{pedido.numero}</span>
        <span className={`dash__selo ${selo.classe}`}>{selo.texto}</span>
        <span className="dash__linha-cliente">{pedido.cliente.nome}</span>
        <span className="dash__linha-tempo">{tempoAtras(pedido.criadoEm)}</span>
      </span>

      <span className="dash__linha-base">
        <span className="dash__linha-detalhe">
          {resumoDosItens(pedido)}
          <span className="dash__linha-sep">·</span>
          {pedido.tipo === 'delivery' ? 'Delivery' : 'Balcão'}
          <span className="dash__linha-sep">·</span>
          {formatarDinheiro(pedido.total)}
        </span>

        <span className="dash__linha-acao">
          <span className="dash__linha-acao-texto">Ver pedido</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M5 12h13M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </span>
    </Link>
  )
}

export default function PainelLoja() {
  const { usuario } = useAuth()

  const [loja, setLoja] = useState(null)
  const [resumo, setResumo] = useState(null)
  const [pedidos, setPedidos] = useState([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [mexendoNoInterruptor, setMexendoNoInterruptor] = useState(false)

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

  const entregues = resumo?.entreguesHoje || 0
  const faturamento = resumo?.faturamentoHoje || 0
  const recebendo = loja?.aberta !== false

  // Quem espera há mais tempo aparece primeiro: é quem corre risco de esfriar.
  const esperando = pedidos
    .filter((pedido) => ESPERANDO.includes(pedido.status))
    .sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm))

  const naLista = esperando.slice(0, VISIVEIS)
  const restantes = esperando.length - naLista.length

  const primeiroNome = (usuario.nome || '').trim().split(' ')[0]
  const nomeNaSaudacao = primeiroNome
    ? primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1)
    : ''

  // O interruptor grava na hora, igual ao de Horários. Se a API recusar, volta.
  async function alternarRecebendo() {
    if (!loja || mexendoNoInterruptor) return

    const novo = !recebendo
    setLoja((atual) => ({ ...atual, aberta: novo }))
    setMexendoNoInterruptor(true)
    setErro('')

    try {
      await servicoLojas.atualizarMinha({ aberta: novo })
    } catch (e) {
      setLoja((atual) => ({ ...atual, aberta: !novo }))
      setErro(e.message)
    } finally {
      setMexendoNoInterruptor(false)
    }
  }

  return (
    <div className="dashboard">
      <header className="dash__topo">
        <div>
          <h1 className="dash__titulo">
            {saudacaoDoDia()}, {nomeNaSaudacao}!
          </h1>
          <p className="dash__subtitulo">
            {loja
              ? `${loja.nome} · ${recebendo ? 'recebendo pedidos' : 'fechada para pedidos'}`
              : 'Carregando sua loja…'}
          </p>
        </div>

        <button
          className={`dash__interruptor ${recebendo ? 'dash__interruptor--ligado' : ''}`}
          type="button"
          role="switch"
          aria-checked={recebendo}
          onClick={alternarRecebendo}
          disabled={!loja || mexendoNoInterruptor}
        >
          <span className="dash__interruptor-texto">
            {recebendo ? 'Recebendo pedidos' : 'Loja fechada'}
          </span>
          <span className="dash__interruptor-trilho" aria-hidden="true">
            <span className="dash__interruptor-bolinha" />
          </span>
        </button>
      </header>

      {erro && <p className="painel__aviso painel__aviso--erro">{erro}</p>}

      <section className="dash__dinheiro" aria-label="Faturamento de hoje">
        <strong className="dash__dinheiro-valor">{formatarDinheiro(faturamento)}</strong>
        <span className="dash__dinheiro-rotulo">Faturamento de hoje</span>
        <span className="dash__dinheiro-nota">
          {entregues === 0
            ? 'Nenhum pedido entregue ainda'
            : `${entregues} pedido${entregues > 1 ? 's' : ''} entregue${
                entregues > 1 ? 's' : ''
              } hoje`}
        </span>
      </section>

      <section className="dash__espera" aria-labelledby="dash-espera-titulo">
        <header className="dash__espera-topo">
          <h2 className="dash__espera-titulo" id="dash-espera-titulo">
            Pedidos esperando você
            {esperando.length > 0 && (
              <span className="dash__espera-contagem">{esperando.length}</span>
            )}
          </h2>

          <Link className="dash__link-topo" to="/admin/pedidos/gerenciar">
            {restantes > 0 ? `Ver todos os ${esperando.length}` : 'Abrir o quadro'}
          </Link>
        </header>

        {carregando && <p className="dash__vazio">Carregando pedidos…</p>}

        {!carregando && esperando.length === 0 && (
          <div className="dash__vazio-card">
            <span className="dash__vazio-icone" aria-hidden="true">
              <Icone>
                <path d="M18 8a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
                <path d="M10.5 19a2 2 0 0 0 3 0" />
              </Icone>
            </span>
            <strong>Nada esperando agora</strong>
            <span>Quando um cliente pedir, ele aparece aqui na hora — e o sino toca.</span>
          </div>
        )}

        {!carregando && naLista.length > 0 && (
          <div className="dash__linhas">
            {naLista.map((pedido) => (
              <LinhaPedido pedido={pedido} key={pedido._id} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
