import { useEffect, useState } from 'react'
import { lojas as servicoLojas } from '../../servicos/lojas.js'
import { TEMPO_MAX, TEMPO_MIN, TEMPOS_PADRAO, tempoTotal } from '../../utils/tempos.js'
import './Configuracoes.css'
import './Painel.css'

/*
 * Configurações da loja.
 *
 * Por enquanto só os tempos de atendimento — que é o que o painel usa para
 * avisar que um pedido está atrasado. Cada loja tem os seus: uma pizzaria não
 * tem o mesmo ritmo de uma barbearia.
 *
 * Os valores são guardados em minutos, por etapa, e o relógio de cada etapa
 * começa quando o pedido entra nela.
 */

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

  async function carregar() {
    setCarregando(true)

    try {
      const { loja: dados } = await servicoLojas.minha()

      setLoja(dados)
      setValores(comoTexto(dados.tempos))
      setSujo(false)
      setErro('')
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
