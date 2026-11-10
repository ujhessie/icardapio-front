import { useEffect, useState } from 'react'
import CampoImagem from '../../componentes/admin/CampoImagem.jsx'
import { lojas as servicoLojas } from '../../servicos/lojas.js'
import { TEMPO_MAX, TEMPO_MIN, TEMPOS_PADRAO, tempoTotal } from '../../utils/tempos.js'
import './Configuracoes.css'
import './Painel.css'

/*
 * Configurações da loja.
 *
 * Duas coisas que o lojista ajusta sozinho:
 *
 * 1. Tempos de atendimento — o que o painel usa para avisar que um pedido está
 *    atrasado. Cada loja tem os seus: uma pizzaria não tem o ritmo de uma
 *    barbearia.
 * 2. Identidade — nome, logo, foto de capa e cor. É o que o cliente vê primeiro
 *    no cardápio.
 *
 * Os valores de tempo são guardados em minutos, por etapa, e o relógio de cada
 * etapa começa quando o pedido entra nela.
 */

const COR_PADRAO = '#e85d04'

const IDENTIDADE_VAZIA = {
  nome: '',
  logo: '',
  capa: '',
  corPrimaria: COR_PADRAO,
}

// Etapas que a loja pode mostrar ou esconder. A ordem aqui é a do atendimento —
// é ela que manda no quadro e na tela do cliente.
const ETAPAS_DO_FLUXO = [
  { status: 'novo', rotulo: 'Novo', ajuda: 'O pedido acabou de chegar.' },
  { status: 'aceito', rotulo: 'Aceito', ajuda: 'Você confirmou o pedido.' },
  { status: 'preparando', rotulo: 'Preparando', ajuda: 'Está sendo feito.' },
  { status: 'pronto', rotulo: 'Pronto', ajuda: 'Esperando sair.' },
  { status: 'saiu_entrega', rotulo: 'Saiu para entrega', ajuda: 'A caminho do cliente.' },
  { status: 'entregue', rotulo: 'Entregue', ajuda: 'Fim do atendimento.' },
]

const FLUXO_PADRAO = {
  etapas: ETAPAS_DO_FLUXO.map((etapa) => etapa.status),
  autoAceite: false,
  modoBalcao: 'cliente',
}

// O input de cor só aceita "#rrggbb": valor antigo ou digitado à mão cai no padrão.
function corValida(valor) {
  return /^#[0-9a-f]{6}$/i.test(valor || '') ? valor : COR_PADRAO
}

const CAMPOS = [
  {
    chave: 'aceitar',
    rotulo: 'Aceitar o pedido',
    ajuda: 'Do pedido chegar até você aceitar.',
  },
  {
    chave: 'preparar',
    rotulo: 'Iniciar o preparo',
    ajuda: 'Do aceite até começar a fazer.',
  },
  {
    chave: 'pronto',
    rotulo: 'Ficar pronto',
    ajuda: 'Do preparo até estar pronto para sair.',
  },
  {
    chave: 'entregar',
    rotulo: 'Entregar',
    ajuda: 'Do pronto até chegar no cliente. Conta a saída também.',
  },
]

function formatarDuracao(minutos) {
  const total = Number(minutos) || 0
  const horas = Math.floor(total / 60)
  const resto = total % 60

  if (!horas) return `${resto} min`
  if (!resto) return `${horas} h`

  return `${horas} h ${resto} min`
}

function comoTexto(tempos) {
  const base = { ...TEMPOS_PADRAO, ...(tempos || {}) }

  return Object.fromEntries(CAMPOS.map(({ chave }) => [chave, String(base[chave])]))
}

export default function Configuracoes() {
  const [loja, setLoja] = useState(null)
  const [valores, setValores] = useState(() => comoTexto(TEMPOS_PADRAO))
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [sujo, setSujo] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState('')

  const [identidade, setIdentidade] = useState(IDENTIDADE_VAZIA)
  const [identidadeSuja, setIdentidadeSuja] = useState(false)
  const [identidadeSalva, setIdentidadeSalva] = useState(false)
  const [salvandoIdentidade, setSalvandoIdentidade] = useState(false)
  const [erroIdentidade, setErroIdentidade] = useState('')
  // Upload em voo: salvar no meio perderia a imagem.
  const [envios, setEnvios] = useState({})

  const [fluxo, setFluxo] = useState(FLUXO_PADRAO)
  const [fluxoSujo, setFluxoSujo] = useState(false)
  const [fluxoSalvo, setFluxoSalvo] = useState(false)
  const [salvandoFluxo, setSalvandoFluxo] = useState(false)
  const [erroFluxo, setErroFluxo] = useState('')

  async function carregar() {
    setCarregando(true)

    try {
      const { loja: dados } = await servicoLojas.minha()

      setLoja(dados)
      setValores(comoTexto(dados.tempos))
      setIdentidade({
        nome: dados.nome || '',
        logo: dados.logo || '',
        capa: dados.capa || '',
        corPrimaria: corValida(dados.corPrimaria),
      })
      setFluxo({ ...FLUXO_PADRAO, ...(dados.fluxoPedidos || {}) })
      setSujo(false)
      setIdentidadeSuja(false)
      setFluxoSujo(false)
      setErro('')
      setErroIdentidade('')
      setErroFluxo('')
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  // "salvo" some sozinho, sem alert.
  useEffect(() => {
    if (!salvo) return undefined

    const timer = setTimeout(() => setSalvo(false), 1800)

    return () => clearTimeout(timer)
  }, [salvo])

  useEffect(() => {
    if (!identidadeSalva) return undefined

    const timer = setTimeout(() => setIdentidadeSalva(false), 1800)

    return () => clearTimeout(timer)
  }, [identidadeSalva])

  useEffect(() => {
    if (!fluxoSalvo) return undefined

    const timer = setTimeout(() => setFluxoSalvo(false), 1800)

    return () => clearTimeout(timer)
  }, [fluxoSalvo])

  function alterar(chave, valor) {
    setValores((atual) => ({ ...atual, [chave]: valor }))
    setSujo(true)
    setSalvo(false)
    setErro('')
  }

  function voltarAoPadrao() {
    setValores(comoTexto(TEMPOS_PADRAO))
    setSujo(true)
    setSalvo(false)
    setErro('')
  }

  function lerMinutos() {
    const numeros = {}

    for (const { chave, rotulo } of CAMPOS) {
      const valor = Number(valores[chave])

      if (!Number.isInteger(valor) || valor < TEMPO_MIN || valor > TEMPO_MAX) {
        throw new Error(
          `"${rotulo}" precisa ser um número inteiro de ${TEMPO_MIN} a ${TEMPO_MAX} minutos.`,
        )
      }

      numeros[chave] = valor
    }

    return numeros
  }

  async function salvar(evento) {
    evento.preventDefault()
    setErro('')

    let tempos

    try {
      tempos = lerMinutos()
    } catch (e) {
      setErro(e.message)
      return
    }

    setSalvando(true)

    try {
      const { loja: dados } = await servicoLojas.atualizarMinha({ tempos })

      setLoja(dados)
      setValores(comoTexto(dados.tempos))
      setSujo(false)
      setSalvo(true)
    } catch (e) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  const total = tempoTotal(
    Object.fromEntries(CAMPOS.map(({ chave, rotulo }) => [chave, Number(valores[chave]) || 0])),
  )

  /* ---------------- Fluxo de pedidos ---------------- */

  const ORDEM_DAS_ETAPAS = ETAPAS_DO_FLUXO.map((etapa) => etapa.status)

  function alterarFluxo(mudanca) {
    setFluxo(mudanca)
    setFluxoSujo(true)
    setFluxoSalvo(false)
    setErroFluxo('')
  }

  function alternarEtapa(status) {
    setFluxo((atual) => {
      const escolhidas = atual.etapas.includes(status)
        ? atual.etapas.filter((etapa) => etapa !== status)
        : [...atual.etapas, status]

      return {
        ...atual,
        // Sempre na ordem do atendimento, nunca na ordem dos cliques.
        etapas: ORDEM_DAS_ETAPAS.filter((etapa) => escolhidas.includes(etapa)),
      }
    })

    setFluxoSujo(true)
    setFluxoSalvo(false)
    setErroFluxo('')
  }

  function alternarAutoAceite() {
    alterarFluxo((atual) => ({ ...atual, autoAceite: !atual.autoAceite }))
  }

  const ultimaEtapa = ETAPAS_DO_FLUXO.find(
    (etapa) => etapa.status === fluxo.etapas[fluxo.etapas.length - 1],
  )

  async function salvarFluxo(evento) {
    evento.preventDefault()
    setErroFluxo('')

    if (fluxo.etapas.length === 0) {
      setErroFluxo('Escolha pelo menos uma etapa para o quadro.')
      return
    }

    setSalvandoFluxo(true)

    try {
      const { loja: dados } = await servicoLojas.atualizarMinha({ fluxoPedidos: fluxo })

      setLoja(dados)
      setFluxo({ ...FLUXO_PADRAO, ...(dados.fluxoPedidos || {}) })
      setFluxoSujo(false)
      setFluxoSalvo(true)
    } catch (e) {
      setErroFluxo(e.message)
    } finally {
      setSalvandoFluxo(false)
    }
  }

  /* ---------------- Identidade da loja ---------------- */

  function alterarIdentidade(campo, valor) {
    setIdentidade((atual) => ({ ...atual, [campo]: valor }))
    setIdentidadeSuja(true)
    setIdentidadeSalva(false)
    setErroIdentidade('')
  }

  async function salvarIdentidade(evento) {
    evento.preventDefault()
    setErroIdentidade('')

    const nome = identidade.nome.trim()

    if (nome.length < 2) {
      setErroIdentidade('Informe o nome da loja.')
      return
    }

    setSalvandoIdentidade(true)

    try {
      const { loja: dados } = await servicoLojas.atualizarMinha({
        nome,
        logo: identidade.logo,
        capa: identidade.capa,
        corPrimaria: corValida(identidade.corPrimaria),
      })

      setLoja(dados)
      setIdentidade({
        nome: dados.nome,
        logo: dados.logo || '',
        capa: dados.capa || '',
        corPrimaria: corValida(dados.corPrimaria),
      })
      setIdentidadeSuja(false)
      setIdentidadeSalva(true)
    } catch (e) {
      setErroIdentidade(e.message)
    } finally {
      setSalvandoIdentidade(false)
    }
  }

  const enviandoImagem = Object.values(envios).some(Boolean)

  return (
    <div className="painel">
      <main className="painel__conteudo">
        <div className="painel__cabecalho">
          <div>
            <h1 className="painel__titulo">Configurações</h1>
            <p className="painel__ajuda">
              Os prazos que o painel usa para avisar que um pedido está atrasado. Cada etapa
              tem o seu, e o contador começa quando o pedido entra nela.
            </p>
          </div>

          <div className="horarios__salvar">
            {sujo && <span className="horarios__pendente">alterações não salvas</span>}
            {salvo && !sujo && <span className="horarios__salvo">salvo</span>}

            <button
              className="botao botao--secundario"
              type="button"
              onClick={carregar}
              disabled={salvando || !sujo}
            >
              Descartar
            </button>

            <button className="botao" type="submit" form="form-tempos" disabled={salvando || !sujo}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>

        {erro && <p className="painel__aviso painel__aviso--erro">{erro}</p>}

        {carregando && <p className="painel__ajuda">Carregando configurações…</p>}

        {!carregando && (
          <>
            <section className="painel__secao">
              <h2 className="painel__subtitulo">Tempos de atendimento</h2>
              <p className="painel__ajuda">
                Em minutos. Passou do prazo, o pedido fica vermelho no quadro — não é bloqueio,
                é aviso para você correr.
              </p>

              <form id="form-tempos" className="config__tempos" onSubmit={salvar}>
                {CAMPOS.map(({ chave, rotulo, ajuda }) => (
                  <label className="config__campo" key={chave}>
                    <span className="config__campo-nome">{rotulo}</span>
                    <span className="config__campo-ajuda">{ajuda}</span>

                    <span className="config__entrada">
                      <input
                        type="number"
                        min={TEMPO_MIN}
                        max={TEMPO_MAX}
                        step="1"
                        inputMode="numeric"
                        value={valores[chave]}
                        aria-label={`${rotulo} em minutos`}
                        onChange={(evento) => alterar(chave, evento.target.value)}
                      />
                      <span>min</span>
                    </span>
                  </label>
                ))}
              </form>

              <div className="config__resumo">
                <span>
                  Um pedido de ponta a ponta: <strong>{formatarDuracao(total)}</strong>
                </span>

                <button
                  className="botao botao--secundario botao--pequeno"
                  type="button"
                  onClick={voltarAoPadrao}
                  disabled={salvando}
                >
                  Voltar ao padrão
                </button>
              </div>
            </section>

            <section className="painel__secao">
              <h2 className="painel__subtitulo">Fluxo de pedidos</h2>
              <p className="painel__ajuda">
                Quais etapas aparecem no quadro — e na tela de acompanhamento do cliente. Etapa
                desmarcada não desaparece do sistema: o pedido passa por ela sem parar.
              </p>

              {erroFluxo && <p className="painel__aviso painel__aviso--erro">{erroFluxo}</p>}

              <form className="fluxo" onSubmit={salvarFluxo}>
                <fieldset className="fluxo__grupo">
                  <legend className="config__campo-nome">Etapas visíveis</legend>

                  <div className="fluxo__etapas">
                    {ETAPAS_DO_FLUXO.map((etapa) => (
                      <label
                        className={`fluxo__etapa ${
                          fluxo.etapas.includes(etapa.status) ? 'fluxo__etapa--ativa' : ''
                        }`}
                        key={etapa.status}
                      >
                        <input
                          type="checkbox"
                          checked={fluxo.etapas.includes(etapa.status)}
                          onChange={() => alternarEtapa(etapa.status)}
                        />
                        <span className="fluxo__etapa-texto">
                          <strong>{etapa.rotulo}</strong>
                          <span className="config__campo-ajuda">{etapa.ajuda}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className="fluxo__auto">
                  <span className="fluxo__auto-texto">
                    <strong>Aceitar pedidos automaticamente</strong>
                    <span className="config__campo-ajuda">
                      O pedido que chega já entra como “Aceito”. Você só avança para o preparo.
                    </span>
                  </span>

                  <input
                    type="checkbox"
                    className="fluxo__interruptor"
                    checked={fluxo.autoAceite}
                    onChange={alternarAutoAceite}
                    aria-label="Aceitar pedidos automaticamente"
                  />
                </label>

                <div className="config__resumo">
                  <span>
                    {fluxo.etapas.length === 0 ? (
                      'Nenhuma etapa escolhida.'
                    ) : (
                      <>
                        A última etapa do quadro é <strong>{ultimaEtapa?.rotulo}</strong>: quem
                        chega nela finaliza o pedido.
                      </>
                    )}
                  </span>

                  <span className="fluxo__acoes">
                    {fluxoSujo && <span className="horarios__pendente">alterações não salvas</span>}
                    {fluxoSalvo && !fluxoSujo && <span className="horarios__salvo">salvo</span>}

                    <button
                      className="botao botao--pequeno"
                      type="submit"
                      disabled={salvandoFluxo || !fluxoSujo}
                    >
                      {salvandoFluxo ? 'Salvando…' : 'Salvar fluxo'}
                    </button>
                  </span>
                </div>
              </form>
            </section>

            <section className="painel__secao">
              <h2 className="painel__subtitulo">Identidade da loja</h2>
              <p className="painel__ajuda">
                Nome, logo, foto do topo e cor. É a primeira coisa que o cliente vê quando abre o
                cardápio.
              </p>

              {erroIdentidade && <p className="painel__aviso painel__aviso--erro">{erroIdentidade}</p>}

              <div className="identidade">
                <div className="identidade__previa">
                  <span className="identidade__previa-titulo">como o cliente vê</span>

                  <div
                    className="identidade__previa-capa"
                    style={
                      identidade.capa
                        ? { backgroundImage: `url("${identidade.capa}")` }
                        : { backgroundColor: corValida(identidade.corPrimaria) }
                    }
                  >
                    {!identidade.capa && (
                      <span className="identidade__previa-dica">
                        sem foto de capa — o topo fica na cor da loja
                      </span>
                    )}
                  </div>

                  <div className="identidade__previa-rodape">
                    <span
                      className="identidade__previa-logo"
                      style={{ backgroundColor: corValida(identidade.corPrimaria) }}
                    >
                      {identidade.logo ? (
                        <img src={identidade.logo} alt="" />
                      ) : (
                        (identidade.nome || 'Loja').charAt(0).toUpperCase()
                      )}
                    </span>

                    <span className="identidade__previa-texto">
                      <strong>{identidade.nome || 'Nome da loja'}</strong>
                      {loja?.slug && <code>/{loja.slug}</code>}
                    </span>
                  </div>
                </div>

                <form className="identidade__form" onSubmit={salvarIdentidade}>
                  <label className="campo">
                    <span>Nome da loja</span>
                    <input
                      value={identidade.nome}
                      onChange={(evento) => alterarIdentidade('nome', evento.target.value)}
                      placeholder="Ex: Pizzaria do Zé"
                      maxLength={60}
                      required
                    />
                  </label>

                  <div className="campo">
                    <span>Cor principal</span>

                    <div className="identidade__cor">
                      <input
                        type="color"
                        value={corValida(identidade.corPrimaria)}
                        onChange={(evento) => alterarIdentidade('corPrimaria', evento.target.value)}
                        aria-label="Cor principal da loja"
                      />
                      <code>{corValida(identidade.corPrimaria)}</code>

                      {corValida(identidade.corPrimaria) !== COR_PADRAO && (
                        <button
                          className="img__link-abrir"
                          type="button"
                          onClick={() => alterarIdentidade('corPrimaria', COR_PADRAO)}
                        >
                          voltar ao padrão
                        </button>
                      )}
                    </div>

                    <span className="identidade__dica">
                      Usada nos botões, no topo e no destaque do cardápio.
                    </span>
                  </div>

                  <CampoImagem
                    rotulo="Logo"
                    ajuda="De preferência quadrada e com fundo transparente (PNG). Aparece no topo do cardápio."
                    tipo="logo"
                    formato="logo"
                    valor={identidade.logo}
                    onMudar={(url) => alterarIdentidade('logo', url)}
                    aoEnviando={(ativo) => setEnvios((atual) => ({ ...atual, logo: ativo }))}
                    desabilitado={salvandoIdentidade}
                  />

                  <CampoImagem
                    rotulo="Foto de capa"
                    ajuda="A faixa do topo do cardápio. Foto larga (deitada) funciona melhor; o corte é automático."
                    tipo="capa"
                    formato="larga"
                    valor={identidade.capa}
                    onMudar={(url) => alterarIdentidade('capa', url)}
                    aoEnviando={(ativo) => setEnvios((atual) => ({ ...atual, capa: ativo }))}
                    desabilitado={salvandoIdentidade}
                  />

                  <div className="painel__acoes identidade__acoes">
                    {identidadeSuja && (
                      <span className="horarios__pendente">alterações não salvas</span>
                    )}
                    {identidadeSalva && !identidadeSuja && (
                      <span className="horarios__salvo">salvo</span>
                    )}

                    <button
                      className="botao"
                      type="submit"
                      disabled={salvandoIdentidade || enviandoImagem}
                    >
                      {enviandoImagem
                        ? 'Enviando a imagem…'
                        : salvandoIdentidade
                          ? 'Salvando…'
                          : 'Salvar identidade'}
                    </button>
                  </div>
                </form>
              </div>
            </section>

            <section className="painel__secao">
              <h2 className="painel__subtitulo">Alerta sonoro</h2>
              <p className="painel__ajuda">
                O sino toca no navegador sempre que entra pedido novo, em qualquer tela do
                painel. Para ligar ou desligar, use o botão de som no topo — a escolha fica
                salva neste aparelho, então cada um da equipe decide o seu.
              </p>

              {loja?.nome && (
                <p className="config__loja">
                  Configurações valendo para <strong>{loja.nome}</strong>.
                </p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
