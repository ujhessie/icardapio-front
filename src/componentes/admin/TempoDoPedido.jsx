import useAgora from '../../hooks/useAgora.js'
import { formatarContagem, tempoDoPedido } from '../../utils/tempos.js'
import './TempoDoPedido.css'

/*
 * Contador da etapa atual do pedido.
 *
 * Neutro enquanto tem folga, âmbar quando o prazo está acabando (70%) e
 * vermelho quando estoura. O title explica a regra: "entregar · prazo 10 min".
 *
 * O relógio mora aqui dentro, de propósito: cada cartão atualiza só o próprio
 * chip a cada segundo, em vez de obrigar a tela inteira a redesenhar.
 */
export default function TempoDoPedido({ pedido, tempos }) {
  const agora = useAgora()
  const info = tempoDoPedido(pedido, tempos, agora)

  if (!info) return null

  const estado = info.atrasado
    ? 'tempo--atrasado'
    : info.proporcao >= 0.7
      ? 'tempo--atencao'
      : 'tempo--ok'

  const contagem = formatarContagem(info.restanteSeg)

  return (
    <span
      className={`tempo ${estado}`}
      title={`${info.rotulo} · prazo de ${info.minutos} min`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {info.atrasado ? `atrasado ${contagem}` : `faltam ${contagem}`}
    </span>
  )
}
