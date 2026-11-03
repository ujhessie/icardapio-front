import { useEffect, useState } from 'react'
import CabecalhoPainel from '../../componentes/admin/CabecalhoPainel.jsx'
import { lojas as servicoLojas } from '../../servicos/lojas.js'
import { statusDaLoja } from '../../utils/horario.js'
import './Painel.css'

/*
 * Horário de funcionamento, com dados reais.
 *
 * Duas coisas mandam na loja e elas não se confundem:
 * - o interruptor "recebendo" é a pausa de emergência do dono (salva na hora);
 * - a grade da semana e as datas especiais dizem o que o interruptor deixa passar
 *   (salvam no botão, de uma vez).
 *
 * A prévia usa a mesma função que o cardápio público (`statusDaLoja`), então o
 * que o dono vê aqui é literalmente o que o cliente vai ler.
 */

const NOMES_DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

// Semana de segunda a domingo, como o dono pensa.
const ORDEM_SEMANA = [1, 2, 3, 4, 5, 6, 0]

const NOVA_DATA_VAZIA = {
  data: '',
  motivo: '',
  fechado: true,
  abre: '18:00',
  fecha: '22:00',
}

function gradePadrao() {
  return ORDEM_SEMANA.map((dia) => ({
    dia,
    aberto: true,
    abre: '18:00',
    fecha: '23:00',
  }))
}

function completarGrade(grade) {
  return ORDEM_SEMANA.map((dia) => {
    const salvo = grade.find((item) => item.dia === dia)

    return salvo
      ? { ...salvo }
      : { dia, aberto: false, abre: '18:00', fecha: '23:00' }
  })
}

function formatarData(iso) {
  const [ano, mes, dia] = iso.split('-')

  return new Date(Number(ano), Number(mes) - 1, Number(dia)).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
  })
}

export default function Horarios() {
  const [loja, setLoja] = useState(null)
  const [dias, setDias] = useState([])
  const [especiais, setEspeciais] = useState([])
  const [recebendo, setRecebendo] = useState(true)
  const [semGrade, setSemGrade] = useState(false)
  const [novaData, setNovaData] = useState(NOVA_DATA_VAZIA)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [sujo, setSujo] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [aplicado, setAplicado] = useState(null)
  const [erro, setErro] = useState('')

  async function carregar() {
    setCarregando(true)

    try {
      const { loja: dados } = await servicoLojas.minha()
      const grade = dados.horarios || []

      setLoja(dados)
      setRecebendo(dados.aberta !== false)
      setEspeciais((dados.datasEspeciais || []).map((item) => ({ ...item })))
      // Grade vazia não é "loja sempre fechada": é loja que ainda vive só do
      // interruptor. Mostramos um ponto de partida para ele ajustar.
      setSemGrade(grade.length === 0)
      setDias(grade.length === 0 ? gradePadrao() : completarGrade(grade))
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

  // "salvo" e "aplicado" somem sozinhos, sem alert.
  useEffect(() => {
    if (!salvo && !aplicado) return undefined

    const timer = setTimeout(() => {
      setSalvo(false)
      setAplicado(null)
    }, 1800)

    return () => clearTimeout(timer)
  }, [salvo, aplicado])

  // Loja sem grade salva vive só do interruptor: antes de o dono mexer em nada,
  // a prévia mostra o que o cliente vê de verdade. Assim que ele edita, a prévia
  // passa a mostrar o rascunho (o que vai valer depois de salvar).
  const status = statusDaLoja({
    aberta: recebendo,
    horarios: semGrade && !sujo ? [] : dias,
    datasEspeciais: especiais,
  })
  const aceitando = recebendo && status.aberto
  const nomeLoja = loja?.nome || 'Sua loja'

  const tituloEstado = !recebendo
    ? 'Pedidos pausados'
    : status.aberto
      ? 'Aceitando pedidos'
      : 'Fora do horário'

  // Na prévia, o texto já vem em "título · detalhe": separar evita repetir
  // "Aberto agora" duas vezes na mesma linha.
  const [tituloPrevia, detalhePrevia] = status.texto.split(' · ')

  const textoEstado = recebendo
    ? status.texto
    : 'Você desligou o recebimento. Nada entra até religar.'

  function marcarSujo() {
    setSujo(true)
    setSalvo(false)
  }

  function alterarDia(dia, mudanca) {
    setDias((atual) => atual.map((item) => (item.dia === dia ? { ...item, ...mudanca } : item)))
    marcarSujo()
  }

  function aplicarHorario(referencia) {
    setDias((atual) =>
      atual.map((item) => ({ ...item, abre: referencia.abre, fecha: referencia.fecha })),
    )
    setAplicado(referencia.dia)
    marcarSujo()
  }

  function alternarFechadoEspecial(data) {
    setEspeciais((atual) =>
      atual.map((item) => {
        if (item.data !== data) return item

        // Reabrir uma data que estava fechada precisa de horário: sem isso a API
        // recusa ("precisa de horário de abertura e fechamento") e o dono levaria
        // um erro sem pé nem cabeça.
        if (item.fechado) {
          return {
            ...item,
            fechado: false,
            abre: item.abre || '18:00',
            fecha: item.fecha || '23:00',
          }
        }

        return { ...item, fechado: true, abre: '', fecha: '' }
      }),
    )
    marcarSujo()
  }

  function alterarHoraEspecial(data, mudanca) {
    setEspeciais((atual) =>
      atual.map((item) => (item.data === data ? { ...item, ...mudanca } : item)),
    )
    marcarSujo()
  }

  function removerEspecial(data) {
    setEspeciais((atual) => atual.filter((item) => item.data !== data))
    marcarSujo()
  }

  function adicionarEspecial(evento) {
    evento.preventDefault()

    if (!novaData.data || !novaData.motivo.trim()) return

    const item = {
      data: novaData.data,
      motivo: novaData.motivo.trim(),
      fechado: novaData.fechado,
      abre: novaData.fechado ? '' : novaData.abre,
      fecha: novaData.fechado ? '' : novaData.fecha,
    }

    setEspeciais((atual) =>
      [...atual.filter((existente) => existente.data !== item.data), item].sort((a, b) =>
        a.data.localeCompare(b.data),
      ),
    )
    setNovaData(NOVA_DATA_VAZIA)
    marcarSujo()
  }

  // O interruptor é a pausa do dono: vale na hora, sem botão de salvar.
  async function alternarRecebendo() {
    const novo = !recebendo
    setRecebendo(novo)
    setErro('')

    try {
      await servicoLojas.atualizarMinha({ aberta: novo })
    } catch (e) {
      setRecebendo(!novo)
      setErro(e.message)
    }
  }

  async function salvarHorarios() {
    setSalvando(true)
    setErro('')

    try {
      await servicoLojas.atualizarMinha({ horarios: dias, datasEspeciais: especiais })
      setSemGrade(false)
      setSujo(false)
      setSalvo(true)
    } catch (e) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="painel">
      <CabecalhoPainel />

      <main className="painel__conteudo">
        <div className="painel__cabecalho">
          <div>
            <h1 className="painel__titulo">Horários</h1>
            <p className="painel__ajuda">
              Quando a loja recebe pedidos. O cliente vê esse status no topo do cardápio — aberto,
              fechado ou fechado por causa de uma data especial.
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

            <button className="botao" type="button" onClick={salvarHorarios} disabled={salvando || !sujo}>
              {salvando ? 'Salvando…' : 'Salvar horários'}
            </button>
          </div>
        </div>

        {erro && <p className="painel__aviso painel__aviso--erro">{erro}</p>}

        {carregando && <p className="painel__ajuda">Carregando horários…</p>}

        {!carregando && (
          <>
            <section className="painel__secao horarios__estado">
              <div className="horarios__estado-texto">
                <span
                  className={`horarios__farol ${aceitando ? 'horarios__farol--aberta' : ''}`}
                  aria-hidden="true"
                />
                <div>
                  <h2 className="painel__subtitulo">{tituloEstado}</h2>
                  <p className="painel__ajuda">{textoEstado}</p>
                </div>
              </div>

              <div className="horarios__interruptor">
                <button
                  type="button"
                  role="switch"
                  aria-checked={recebendo}
                  aria-label="Receber pedidos"
                  className={`interruptor ${recebendo ? 'interruptor--ligado' : ''}`}
                  onClick={alternarRecebendo}
                >
                  <span className="interruptor__bolinha" aria-hidden="true" />
                </button>
                <span className="horarios__interruptor-rotulo">
                  {recebendo ? 'ligado' : 'pausado'}
                </span>
              </div>
            </section>

            <section className="painel__secao">
              <h2 className="painel__subtitulo">Semana</h2>
              <p className="painel__ajuda">
                Um horário por dia. O botão de aplicar repete o horário nos outros dias sem
                mexer no que está aberto ou fechado.
              </p>

              {semGrade && (
                <p className="painel__aviso">
                  Sua loja ainda não tem grade salva — hoje vale só o interruptor. A semana
                  abaixo é um ponto de partida: ao salvar, ela passa a valer de verdade.
                </p>
              )}

              <ul className="horarios__dias">
                {dias.map((dia) => (
                  <li
                    className={`horarios__dia ${dia.aberto ? '' : 'horarios__dia--fechado'}`}
                    key={dia.dia}
                  >
                    <div className="horarios__dia-nome">
                      <strong>{NOMES_DIAS[dia.dia]}</strong>
                      {/* Aberto: os próprios campos já mostram o horário. */}
                      {!dia.aberto && <span>fechado o dia todo</span>}
                    </div>

                    <div className="horarios__horas">
                      <input
                        type="time"
                        value={dia.abre}
                        disabled={!dia.aberto}
                        aria-label={`Abertura de ${NOMES_DIAS[dia.dia]}`}
                        onChange={(evento) => alterarDia(dia.dia, { abre: evento.target.value })}
                      />
                      <span>às</span>
                      <input
                        type="time"
                        value={dia.fecha}
                        disabled={!dia.aberto}
                        aria-label={`Fechamento de ${NOMES_DIAS[dia.dia]}`}
                        onChange={(evento) => alterarDia(dia.dia, { fecha: evento.target.value })}
                      />
                    </div>

                    <label className="horarios__check">
                      <input
                        type="checkbox"
                        checked={dia.aberto}
                        onChange={(evento) => alterarDia(dia.dia, { aberto: evento.target.checked })}
                      />
                      aberto
                    </label>

                    <button
                      className="botao botao--secundario botao--pequeno"
                      type="button"
                      onClick={() => aplicarHorario(dia)}
                      disabled={!dia.aberto}
                    >
                      {aplicado === dia.dia ? 'aplicado' : 'aplicar a todos'}
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="painel__secao">
              <h2 className="painel__subtitulo">Datas especiais</h2>
              <p className="painel__ajuda">
                Feriados, vésperas e eventos que furam a rotina da semana. A data vale só
                naquele dia, não em todo o dia da semana.
              </p>

              {especiais.length === 0 && (
                <p className="painel__aviso">Nenhuma data especial cadastrada.</p>
              )}

              {especiais.length > 0 && (
                <ul className="painel__lista">
                  {especiais.map((item) => (
                    <li className="painel__item" key={item.data}>
                      <div className="painel__item-texto">
                        <strong>{formatarData(item.data)}</strong>
                        <span className="painel__item-detalhe">
                          {item.motivo} ·{' '}
                          {item.fechado ? 'fechado o dia todo' : 'aberto neste dia'}
                        </span>
                      </div>

                      <div className="painel__acoes-linha">
                        {!item.fechado && (
                          <div className="horarios__especial-horas">
                            <input
                              type="time"
                              value={item.abre}
                              aria-label={`Abertura em ${item.motivo}`}
                              onChange={(evento) =>
                                alterarHoraEspecial(item.data, { abre: evento.target.value })
                              }
                            />
                            <span>às</span>
                            <input
                              type="time"
                              value={item.fecha}
                              aria-label={`Fechamento em ${item.motivo}`}
                              onChange={(evento) =>
                                alterarHoraEspecial(item.data, { fecha: evento.target.value })
                              }
                            />
                          </div>
                        )}

                        <button
                          className="botao botao--secundario botao--pequeno"
                          type="button"
                          onClick={() => alternarFechadoEspecial(item.data)}
                        >
                          {item.fechado ? 'Abrir neste dia' : 'Fechar neste dia'}
                        </button>
                        <button
                          className="botao botao--texto-perigo"
                          type="button"
                          onClick={() => removerEspecial(item.data)}
                        >
                          Remover
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <form className="painel__formulario" onSubmit={adicionarEspecial}>
                <label className="campo">
                  <span>Data</span>
                  <input
                    type="date"
                    value={novaData.data}
                    required
                    onChange={(evento) => setNovaData({ ...novaData, data: evento.target.value })}
                  />
                </label>

                <label className="campo">
                  <span>Motivo</span>
                  <input
                    value={novaData.motivo}
                    placeholder="Feriado, evento…"
                    required
                    onChange={(evento) => setNovaData({ ...novaData, motivo: evento.target.value })}
                  />
                </label>

                <label className="cardapio__checkbox campo--largo">
                  <input
                    type="checkbox"
                    checked={novaData.fechado}
                    onChange={(evento) =>
                      setNovaData({ ...novaData, fechado: evento.target.checked })
                    }
                  />
                  Fechado o dia todo
                </label>

                {!novaData.fechado && (
                  <>
                    <label className="campo">
                      <span>Abre</span>
                      <input
                        type="time"
                        value={novaData.abre}
                        onChange={(evento) =>
                          setNovaData({ ...novaData, abre: evento.target.value })
                        }
                      />
                    </label>

                    <label className="campo">
                      <span>Fecha</span>
                      <input
                        type="time"
                        value={novaData.fecha}
                        onChange={(evento) =>
                          setNovaData({ ...novaData, fecha: evento.target.value })
                        }
                      />
                    </label>
                  </>
                )}

                <div className="painel__acoes">
                  <button className="botao" type="submit">
                    Adicionar data
                  </button>
                </div>
              </form>
            </section>

            <section className="painel__secao">
              <h2 className="painel__subtitulo">Como o cliente vê</h2>
              <p className="painel__ajuda">
                O topo do cardápio público usa esta mesma regra. É a prévia do que está na
                tela agora — salve para valer.
              </p>

              <div className="previa-loja">
                <span className="previa-loja__monograma" aria-hidden="true">
                  {nomeLoja.charAt(0).toUpperCase()}
                </span>

                <div className="previa-loja__texto">
                  <strong className="previa-loja__nome">{nomeLoja}</strong>
                  <span
                    className={`previa-loja__status ${
                      status.aberto ? 'previa-loja__status--aberta' : ''
                    }`}
                  >
                    {tituloPrevia}
                  </span>
                  {detalhePrevia && <span className="previa-loja__hoje">{detalhePrevia}</span>}
                </div>

                {loja?.telefone && (
                  <span className="previa-loja__telefone">{loja.telefone}</span>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
