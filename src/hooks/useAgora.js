import { useEffect, useState } from 'react'

/*
 * Relógio da tela: devolve o "agora" em milissegundos e atualiza sozinho.
 *
 * Existe para os contadores de pedido. Pausa com a aba escondida (contador de
 * tela escondida não serve para ninguém) e volta certo ao aparecer, porque o
 * valor é sempre lido do relógio, não somado.
 */
export default function useAgora(ativo = true, intervalo = 1000) {
  const [agora, setAgora] = useState(() => Date.now())

  useEffect(() => {
    if (!ativo) return undefined

    // Voltar para a aba: acerta na hora em vez de esperar o próximo tique.
    function acertar() {
      if (!document.hidden) setAgora(Date.now())
    }

    const timer = setInterval(acertar, intervalo)
    document.addEventListener('visibilitychange', acertar)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', acertar)
    }
  }, [ativo, intervalo])

  return agora
}
