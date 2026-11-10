import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contextos/AuthContexto.jsx'
import { guardarSom, prepararSom, somLigado, tocarAlerta, tocarSino } from '../../servicos/som.js'
import { abrirCanalDaLoja } from '../../servicos/tempoReal.js'
import './CascaPainel.css'

/*
 * Casca do painel: a moldura de todas as telas do lojista.
 *
 * Desktop = barra lateral fixa. Mobile = cabeçalho curto + barra inferior.
 * A ideia é que cada página cuide só do próprio conteúdo, e aqui fique tudo
 * que precisa estar em todas: marca, navegação, status do sistema e sair.
 *
 * Também é aqui que mora o sino: uma consulta só para a aba inteira, então o
 * alerta de pedido novo toca em qualquer tela do painel, não só no quadro.
 */

const MENU_LOJA = [
  { para: '/admin', fim: true, rotulo: 'Painel', icone: 'painel' },
  { para: '/admin/pedidos', rotulo: 'Pedidos', icone: 'pedidos' },
  { para: '/admin/cardapio', rotulo: 'Cardápio', icone: 'cardapio' },
  { para: '/admin/horarios', rotulo: 'Horários', icone: 'horarios' },
  { para: '/admin/delivery', rotulo: 'Delivery', icone: 'delivery' },
  { para: '/admin/configuracoes', rotulo: 'Configurações', icone: 'config' },
]

// Ainda não são páginas. Ficam visíveis para o lojista saber que vêm aí,
// mas sem clique — botão morto com cara de pronto é pior que ausência.
const MENU_EM_BREVE = [{ rotulo: 'Relatórios', icone: 'relatorios' }]

const MENU_PLATAFORMA = [{ para: '/admin', fim: true, rotulo: 'Plataforma', icone: 'painel' }]

// No celular cabem cinco: as ações do dia a dia + os ajustes.
const MENU_MOBILE = [
  { para: '/admin', fim: true, rotulo: 'Painel', icone: 'painel' },
  { para: '/admin/pedidos', rotulo: 'Pedidos', icone: 'pedidos' },
  { para: '/admin/cardapio', rotulo: 'Cardápio', icone: 'cardapio' },
  { para: '/admin/delivery', rotulo: 'Delivery', icone: 'delivery' },
  { para: '/admin/configuracoes', rotulo: 'Config.', icone: 'config' },
]

const ICONES = {
  painel: <path d="M4 10.6 12 4l8 6.6V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />,
  pedidos: (
    <>
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 9h6M9 13h6M9 17h3" />
    </>
  ),
  cardapio: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v18H6.5A2.5 2.5 0 0 1 4 18.5z" />
      <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v18h4.5A2.5 2.5 0 0 0 20 18.5z" />
    </>
  ),
  horarios: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  delivery: (
    <>
      <path d="M3 7h9v8H3z" />
      <path d="M12 10h3l3 3v2h-6z" />
      <circle cx="6.5" cy="17.5" r="1.6" />
      <circle cx="16.5" cy="17.5" r="1.6" />
    </>
  ),
  relatorios: <path d="M4 20V10M10 20V4M16 20v-7M2.5 20h19" />,
  config: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8v2.9M12 18.3v2.9M2.8 12h2.9M18.3 12h2.9M5.4 5.4l2 2M16.6 16.6l2 2M18.6 5.4l-2 2M7.4 16.6l-2 2" />
    </>
  ),
  sino: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6z" />
      <path d="M10 18.5a2 2 0 0 0 4 0" />
    </>
  ),
  sair: (
    <>
      <path d="M14 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8" />
      <path d="M17 8l4 4-4 4M21 12h-9" />
    </>
  ),
  busca: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </>
  ),
  som: (
    <>
      <path d="M4 9.5h3L11.5 5v14L7 14.5H4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a9 9 0 0 1 0 12" />
    </>
  ),
  mudo: (
    <>
      <path d="M4 9.5h3L11.5 5v14L7 14.5H4z" />
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    </>
  ),
}

function Icone({ nome }) {
  return (
    <svg
      className="casca__icone"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONES[nome]}
    </svg>
  )
}

function itemClasse({ isActive }) {
  return isActive ? 'casca__item casca__item--ativo' : 'casca__item'
}

// Alerta de pedido novo: 3 toques, um a cada 5 segundos.
const VEZES_DO_ALERTA = 3
const INTERVALO_DO_ALERTA_S = 5

export default function CascaPainel() {
  const { usuario, sair } = useAuth()
  const navegar = useNavigate()
  const daLoja = usuario.papel !== 'superadmin'

  const [novos, setNovos] = useState(0)
  // O selo "Sistema online" reflete a última consulta, não é enfeite: se a API
  // cair, ele avisa em vez de mentir que está tudo bem.
  const [online, setOnline] = useState(true)
  // Preferência do sino: fica salva no navegador, não na loja — quem atende de
  // manhã pode querer som e quem atende à noite não.
  const [som, setSom] = useState(() => somLigado())
  // Ids já conhecidos. Serve para o sino não tocar de novo a cada consulta:
  // só toca quando aparece um id que não estava na lista anterior.
  const conhecidos = useRef(null)
  // O pedido mais recente que chegou e ainda não foi atendido (clicado no
  // pop-up ou aberto na tela de pedidos). Guarda o objeto para o pop-up
  // mostrar número e cliente.
  const [pedidoPendente, setPedidoPendente] = useState(null)
  // Timer do repique: o sino toca em rajadas de 3 enquanto o pedido estiver
  // pendente e o usuário longe da tela de pedidos.
  const somTimer = useRef(null)

  const localizacao = useLocation()
  const estaNaTelaDePedidos = localizacao.pathname === '/admin/pedidos'

  // Para o som e limpa o pendente assim que o usuário entra na tela de pedidos.
  useEffect(() => {
    if (!estaNaTelaDePedidos) return undefined

    pararSom()
    setPedidoPendente(null)
  }, [estaNaTelaDePedidos])

  /*
   * Rajada de alerta: 3 toques, um a cada 5 s (0 s, 5 s e 10 s). Terminada a
   * rajada, espera mais um intervalo e repete — o pedido continua sem dono.
   * Sai do ar quando o pedido é atendido (pedidoPendente some), quando o som é
   * desligado ou quando o usuário abre a tela de pedidos.
   */
  useEffect(() => {
    if (!pedidoPendente || estaNaTelaDePedidos || !som) {
      pararSom()
      return undefined
    }

    function rajada() {
      tocarAlerta({ vezes: VEZES_DO_ALERTA, intervalo: INTERVALO_DO_ALERTA_S })
      somTimer.current = setTimeout(rajada, VEZES_DO_ALERTA * INTERVALO_DO_ALERTA_S * 1000)
    }

    rajada()

    return () => pararSom()
  }, [pedidoPendente, estaNaTelaDePedidos, som])

  function pararSom() {
    if (somTimer.current) {
      clearTimeout(somTimer.current)
      somTimer.current = null
    }
  }

  // Navegador só libera áudio depois de um gesto do usuário. O primeiro
  // clique/toque/tecla destrava — daí o sino pode tocar sozinho.
  useEffect(() => {
    if (!daLoja) return undefined

    function destravar() {
      prepararSom()
    }

    // Aba voltou ao primeiro plano: o navegador costuma suspender o áudio de
    // aba parada. Retomar aqui evita o "tocou uma vez e sumiu".
    function aoVoltar() {
      if (document.visibilityState === 'visible') prepararSom()
    }

    window.addEventListener('pointerdown', destravar, { once: true })
    window.addEventListener('keydown', destravar, { once: true })
    document.addEventListener('visibilitychange', aoVoltar)

    return () => {
      window.removeEventListener('pointerdown', destravar)
      window.removeEventListener('keydown', destravar)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [daLoja])

  /*
   * Um canal só para a aba inteira: conta os pedidos novos, marca online/offline
   * e dispara o sino. Assim o alerta funciona em qualquer tela do painel, não
   * só no quadro de pedidos.
   */
  useEffect(() => {
    if (!daLoja) return undefined

    const canal = abrirCanalDaLoja()

    function absorver(lista = [], podeTocar) {
      const pedidos = Array.isArray(lista) ? lista : []
      const anteriores = conhecidos.current

      /*
       * Pedido que pede atenção: o que acabou de chegar e o que o auto-aceite
       * já marcou como "aceito" — esse ainda precisa começar o preparo.
       */
      const pendentes = pedidos.filter(
        (pedido) =>
          pedido.status === 'novo' ||
          (pedido.aceitoAutomaticamente === true && pedido.status === 'aceito'),
      )

      setNovos(pendentes.length)

      // Chegou pedido novo = id que não existia antes. Na primeira leitura não
      // existe "antes": tudo que já estava aberto é histórico, não alerta.
      if (podeTocar && anteriores) {
        const chegou = pendentes.find((pedido) => !anteriores.has(pedido._id))

        if (chegou) {
          // O efeito abaixo cuida do sino: basta marcar o pedido pendente.
          setPedidoPendente(chegou)
        }
      }

      conhecidos.current = new Set(pedidos.map((pedido) => pedido._id))
    }

    const paradas = [
      canal.on('connect', () => setOnline(true)),
      canal.on('disconnect', () => setOnline(false)),
      canal.on('pedidos:iniciais', ({ pedidos }) => absorver(pedidos, false)),
      canal.on('pedido:atualizado', ({ pedidos }) => absorver(pedidos, true)),
    ]

    return () => {
      canal.disconnect()
      pararSom()
      for (const parar of paradas) parar()
    }
  }, [daLoja, som, estaNaTelaDePedidos])

  function atenderPedido() {
    setPedidoPendente(null)
    pararSom()
    navegar('/admin/pedidos')
  }

  function alternarSom() {
    const proximo = !som

    setSom(proximo)
    guardarSom(proximo)

    // Ligar o som sem nenhum retorno deixa a dúvida "funcionou?". Toca na hora.
    if (proximo) {
      prepararSom()
      tocarSino()
    }

    // Se já tem um pedido pendendo, o efeito do alerta retoma sozinho.
  }

  function sairAgora() {
    sair()
    navegar('/admin/login', { replace: true })
  }

  const menu = daLoja ? MENU_LOJA : MENU_PLATAFORMA
  const inicial = (usuario.nome || '?').trim().charAt(0).toUpperCase()

  return (
    <div className="casca">
      <aside className="casca__lateral">
        <Link className="casca__marca" to="/admin">
          <span className="casca__marca-icone" aria-hidden="true">
            iC
          </span>
          <span className="casca__marca-texto">
            iCardápio
            <span className="casca__marca-selo">painel</span>
          </span>
        </Link>

        <nav className="casca__menu" aria-label="Menu do painel">
          {menu.map((item) => (
            <NavLink key={item.para} to={item.para} end={item.fim} className={itemClasse}>
              <Icone nome={item.icone} />
              <span>{item.rotulo}</span>
            </NavLink>
          ))}

          {daLoja &&
            MENU_EM_BREVE.map((item) => (
              <span
                key={item.rotulo}
                className="casca__item casca__item--breve"
                aria-disabled="true"
                title="Em breve"
              >
                <Icone nome={item.icone} />
                <span>{item.rotulo}</span>
                <span className="casca__selo">em breve</span>
              </span>
            ))}
        </nav>

        <div className="casca__lateral-rodape">
          <div className="casca__usuario">
            <span className="casca__avatar" aria-hidden="true">
              {inicial}
            </span>

            <span className="casca__usuario-texto">
              <strong>{usuario.nome}</strong>
              <span>{daLoja ? 'Administrador' : 'Plataforma'}</span>
            </span>

            <button
              className="casca__sair-icone"
              type="button"
              onClick={sairAgora}
              aria-label="Sair"
              title="Sair"
            >
              <Icone nome="sair" />
            </button>
          </div>
        </div>
      </aside>

      <div className="casca__coluna">
        <header className="casca__topo">
          <Link className="casca__topo-marca" to="/admin">
            <span className="casca__marca-icone" aria-hidden="true">
              iC
            </span>
            <span className="casca__marca-texto">iCardápio</span>
          </Link>

          <label className="casca__busca">
            <Icone nome="busca" />
            <input type="search" placeholder="Buscar pedidos, clientes…" disabled />
            <span className="casca__busca-selo">em breve</span>
          </label>

          <div className="casca__topo-acoes">
            {daLoja && (
              <span className={`casca__online ${online ? '' : 'casca__online--fora'}`}>
                {online ? 'Sistema online' : 'Sem conexão'}
              </span>
            )}

            {daLoja && (
              <button
                className={`casca__som ${som ? '' : 'casca__som--mudo'}`}
                type="button"
                onClick={alternarSom}
                aria-pressed={som}
                aria-label={som ? 'Desligar o som de pedido novo' : 'Ligar o som de pedido novo'}
                title={som ? 'Som ligado: sino toca a cada pedido novo' : 'Som desligado'}
              >
                <Icone nome={som ? 'som' : 'mudo'} />
              </button>
            )}

            <Link className="casca__sino" to="/admin/pedidos" aria-label="Pedidos novos">
              <Icone nome="sino" />
              {novos > 0 && <span className="casca__sino-contagem">{novos}</span>}
            </Link>

            <button className="casca__sair" type="button" onClick={sairAgora}>
              <Icone nome="sair" />
              <span>Sair</span>
            </button>

            <span className="casca__avatar casca__avatar--topo" aria-hidden="true">
              {inicial}
            </span>
          </div>
        </header>

        <div className="casca__conteudo">
          <Outlet />
        </div>
      </div>

      {daLoja && (
        <nav className="casca__inferior" aria-label="Menu rápido">
          {MENU_MOBILE.map((item) => (
            <NavLink key={item.para} to={item.para} end={item.fim} className={itemClasse}>
              <Icone nome={item.icone} />
              <span>{item.rotulo}</span>
            </NavLink>
          ))}
        </nav>
      )}

      {/* Pop-up de pedido novo: aparece em qualquer tela do painel e só some
          quando o usuário abre a tela de pedidos ou fecha o aviso. */}
      {pedidoPendente && (
        <div className="casca__popup">
          <div className="casca__popup-card">
            <div className="casca__popup-titulo">
              {pedidoPendente.aceitoAutomaticamente
                ? 'Pedido aceito automaticamente.'
                : 'Novo pedido'}
            </div>
            <div className="casca__popup-dados">
              <strong>#{pedidoPendente.numero}</strong>
              <span>{pedidoPendente.cliente.nome}</span>
              {pedidoPendente.cliente.telefone && (
                <span>· {pedidoPendente.cliente.telefone}</span>
              )}
            </div>
            <div className="casca__popup-acoes">
              <button
                className="casca__popup-fechar"
                type="button"
                onClick={() => {
                  setPedidoPendente(null)
                  pararSom()
                }}
                aria-label="Fechar aviso"
              >
                ✕
              </button>
              <button
                className="casca__popup-ver"
                type="button"
                onClick={atenderPedido}
              >
                Ver pedidos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
