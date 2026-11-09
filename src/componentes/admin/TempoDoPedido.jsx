import useAgora from '../../hooks/useAgora.js'
import { formatarContagem, tempoNaEtapa, tempoNaTela } from '../../utils/tempos.js'
import './TempoDoPedido.css'

/*
 * Contadores do pedido: dois chips de contagem crescente.
 *
 * "há 12:30" é o tempo desde que o pedido chegou — só informativo, nunca fica
 * vermelho. "etapa 03:15" é o tempo no status atual: esse tem prazo (o de
 * Tempos de atendimento) e, quando estoura, fica vermelho e treme.
 *
 * O relógio mora aqui dentro, de propósito: cada cartão atualiza só o próprio
 * chip a cada segundo, em vez de obrigar a tela inteira a redesenhar.
 */
export default function TempoDoPedido({ pedido, tempos }) {
  const agora = useAgora()
  const naTela = tempoNaTela(pedido, agora)
  const naEtapa = tempoNaEtapa(pedido, tempos, agora)

  if (naTela === null && !naEtapa) return null

  const estado = !naEtapa
    ? ''
    : naEtapa.atrasado
      ? 'tempo--atrasado'
      : naEtapa.proporcao >= 0.7
        ? 'tempo--atencao'
        : 'tempo--ok'

  return (
    <span className="tempos">
      {naTela !== null && (
        <span
          className="tempo tempo--tela"
          title={`Pedido na tela há ${formatarContagem(naTela)}`}
        >
          <IconeRelogio />
          há {formatarContagem(naTela)}
        </span>
      )}

      {naEtapa && (
        <span
          className={`tempo tempo--etapa ${estado}`}
          title={`${naEtapa.rotulo} — prazo de ${naEtapa.minutos} min`}
        >
          <IconeRelogio />
          etapa {formatarContagem(naEtapa.passadoSeg)}
        </span>
      )}
    </span>
  )
}

function IconeRelogio() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
