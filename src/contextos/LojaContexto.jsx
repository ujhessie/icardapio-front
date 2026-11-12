import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { publico } from '../servicos/publico.js'
import { guardarCodigoBalcao, lerCodigoBalcao } from '../utils/balcao.js'
import { statusDaLoja } from '../utils/horario.js'

const Contexto = createContext(null)

// De quanto em quanto tempo a loja aberta confere se algo mudou no cardápio.
const RELEITURA_MS = 60000
// Voltar para a aba dispara dois eventos (visibilidade + foco): um só basta.
const INTERVALO_MINIMO_MS = 5000

/*
 * Carrega o cardápio público e compartilha com as telas filhas.
 *
 * Além da primeira carga, revalida sozinho:
 *
 * - a cada 60s, junto com o relógio que abre e fecha a loja;
 * - quando o cliente volta para a aba.
 *
 * Sem isso, quem estivesse com o cardápio aberto continuava vendo o status
 * antigo até apertar F5 — o lojista mudava o horário e o cliente não via.
 * A revalidação é silenciosa: nada pisca e, se a rede falhar, o que já está na
 * tela continua lá.
 */
export function LojaProvider({ slug, children }) {
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [agora, setAgora] = useState(() => new Date())
  const ultimaReleitura = useRef(0)

  const buscar = useCallback(async () => {
    const resposta = await publico.cardapio(slug, lerCodigoBalcao(slug))
    setDados(resposta)
    setErro('')
    ultimaReleitura.current = Date.now()
  }, [slug])

  const carregar = useCallback(async () => {
    setCarregando(true)

    try {
      await buscar()
    } catch (e) {
      setDados(null)
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [buscar])

  const revalidar = useCallback(async () => {
    if (Date.now() - ultimaReleitura.current < INTERVALO_MINIMO_MS) return

    try {
      await buscar()
    } catch {
      // Rede oscilou: mantém o cardápio que já está na tela.
    }
  }, [buscar])

  // O código do link do balcão chega na URL (?balcao=ABC123). Guardar antes da
  // primeira carga é o que faz o cardápio já abrir com a retirada liberada.
  useEffect(() => {
    const codigo = new URLSearchParams(window.location.search).get('balcao')

    if (codigo) guardarCodigoBalcao(slug, codigo)
  }, [slug])

  useEffect(() => {
    carregar()
  }, [carregar])

  // A loja abre e fecha com o relógio, e o cardápio se atualiza junto.
  useEffect(() => {
    const timer = setInterval(() => {
      setAgora(new Date())
      revalidar()
    }, RELEITURA_MS)

    return () => clearInterval(timer)
  }, [revalidar])

  // Aba escondida não gasta rede; ao voltar, o relógio e a loja se atualizam.
  useEffect(() => {
    function aoVoltar() {
      if (document.visibilityState !== 'visible') return

      setAgora(new Date())
      revalidar()
    }

    document.addEventListener('visibilitychange', aoVoltar)
    window.addEventListener('focus', aoVoltar)

    return () => {
      document.removeEventListener('visibilitychange', aoVoltar)
      window.removeEventListener('focus', aoVoltar)
    }
  }, [revalidar])

  // `status` é reativo; `loja.aberta` é só o interruptor do dono.
  const status = useMemo(
    () => (dados ? statusDaLoja(dados.loja, agora) : { aberto: false, texto: '' }),
    [dados, agora],
  )

  return (
    <Contexto.Provider value={{ dados, carregando, erro, recarregar: carregar, status }}>
      {children}
    </Contexto.Provider>
  )
}

export function useLoja() {
  const contexto = useContext(Contexto)

  if (!contexto) {
    throw new Error('useLoja precisa estar dentro de <LojaProvider>')
  }

  return contexto
}
