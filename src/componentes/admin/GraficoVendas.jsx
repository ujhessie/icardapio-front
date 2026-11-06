import { useEffect, useState } from 'react'
import { pedidos as servicoPedidos } from '../../servicos/pedidos.js'
import { formatarDinheiro } from '../../utils/dinheiro.js'
import '../../paginas/admin/Dashboard.css'

/*
 * Gráfico de vendas do painel.
 *
 * Sem biblioteca: são barras em CSS, proporcionais ao maior dia do período.
 * O eixo é sempre faturamento do dia — a soma do período aparece no topo.
 * "Personalizado" fica desligado até existir um seletor de datas.
 */

const PERIODOS = [
  { dias: 7, rotulo: '7 dias' },
  { dias: 30, rotulo: '30 dias' },
]

export default function GraficoVendas() {
  const [dias, setDias] = useState(7)
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    setCarregando(true)

    servicoPedidos
      .estatisticas(dias)
      .then((resposta) => {
        if (!ativo) return
        setDados(resposta.estatisticas)
        setErro('')
      })
      .catch((e) => {
        if (ativo) setErro(e.message)
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })

    return () => {
      ativo = false
    }
  }, [dias])

  const serie = dados?.serie || []
  const maior = Math.max(1, ...serie.map((dia) => dia.faturamento))
  const vazio = !carregando && dados && dados.totalPedidos === 0

  // Em 30 dias os rótulos não cabem: mostra um a cada cinco.
  const mostrarRotulo = (indice) => dias === 7 || indice % 5 === 0

  return (
    <section className="dash__cartao dash__grafico">
      <header className="dash__cartao-topo">
        <h2 className="dash__cartao-titulo">
          <span className="dash__cartao-icone dash__cartao-icone--roxo" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 20V10M10 20V4M16 20v-7M2.5 20h19" strokeLinecap="round" />
            </svg>
          </span>
          Gráfico de Vendas
        </h2>

        <div className="dash__grafico-filtros" role="group" aria-label="Período do gráfico">
          {PERIODOS.map((periodo) => (
            <button
              key={periodo.dias}
              type="button"
              className={`dash__grafico-filtro ${
                dias === periodo.dias ? 'dash__grafico-filtro--ativo' : ''
              }`}
              onClick={() => setDias(periodo.dias)}
            >
              {periodo.rotulo}
            </button>
          ))}

          <button
            type="button"
            className="dash__grafico-filtro"
            disabled
            title="Em breve: escolher um intervalo de datas"
          >
            Personalizado
          </button>
        </div>
      </header>

      {erro && <p className="painel__aviso painel__aviso--erro">{erro}</p>}

      {carregando && !dados && <p className="dash__vazio">Carregando vendas…</p>}

      {dados && (
        <>
          <div className="dash__grafico-resumo">
            <strong>{formatarDinheiro(dados.totalFaturamento)}</strong>
            <span>
              {dados.totalPedidos}{' '}
              {dados.totalPedidos === 1 ? 'pedido entregue' : 'pedidos entregues'} nos
              últimos {dias} dias
            </span>
          </div>

          {vazio ? (
            <p className="dash__vazio">
              Nenhum pedido entregue neste período. Quando a primeira venda sair, ela
              aparece aqui.
            </p>
          ) : (
            <div
              className="dash__barras"
              role="img"
              aria-label={`Faturamento por dia nos últimos ${dias} dias`}
            >
              {serie.map((dia, indice) => (
                <div className="dash__barra-coluna" key={dia.data}>
                  <div className="dash__barra-area">
                    <div
                      className={`dash__barra ${
                        dia.faturamento > 0 ? 'dash__barra--cheia' : ''
                      }`}
                      style={{ height: `${Math.max(3, (dia.faturamento / maior) * 100)}%` }}
                      title={`${dia.diaSemana}, ${dia.rotulo}: ${formatarDinheiro(
                        dia.faturamento,
                      )} · ${dia.pedidos} ${dia.pedidos === 1 ? 'pedido' : 'pedidos'}`}
                    />
                  </div>

                  <span className="dash__barra-rotulo">
                    {mostrarRotulo(indice) ? dia.diaSemana : ''}
                  </span>
                  <span className="dash__barra-data">
                    {mostrarRotulo(indice) ? dia.rotulo : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
