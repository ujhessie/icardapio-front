import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useParams } from 'react-router-dom'
import { CarrinhoProvider } from '../../contextos/CarrinhoContexto.jsx'
import { LojaProvider, useLoja } from '../../contextos/LojaContexto.jsx'
import { publico } from '../../servicos/publico.js'
import { lerMeusPedidos } from '../../utils/meusPedidos.js'
import { linkWhatsApp } from '../../utils/vitrine.js'
import HeaderLoja from './HeaderLoja.jsx'
import RodapeLoja from './RodapeLoja.jsx'
import './Loja.css'

// Status que ainda vão dar trabalho para o cliente. `entregue` e `cancelado`
// são passado: contar como "em andamento" neles seria mentira.
const STATUS_EM_ANDAMENTO = ['novo', 'aceito', 'preparando', 'pronto', 'saiu_entrega']

// Reconsulta de vez em quando: o pedido muda de status no painel da loja e o
// cliente merece ver isso sem apertar F5.
const INTERVALO_PEDIDOS = 60000

function mesmaLista(anterior, atual) {
  return (
    anterior.length === atual.length &&
    anterior.every((pedido, i) => pedido._id === atual[i]._id && pedido.status === atual[i].status)
  )
}

export default function LayoutLoja() {
  const { slug } = useParams()

  return (
    <LojaProvider key={slug} slug={slug}>
      <CarrinhoProvider key={slug} slug={slug}>
        <ConteudoLoja />
      </CarrinhoProvider>
    </LojaProvider>
  )
}

function ConteudoLoja() {
  const { dados, carregando, erro, status } = useLoja()
  const { pathname } = useLocation()

  const [emAndamento, setEmAndamento] = useState([])

  const slug = dados?.loja?.slug

  // Pedidos deste aparelho: os ids ficam no navegador, o status vem da API.
  // Atualiza ao voltar para a aba e quando muda de tela (sair do checkout,
  // voltar do acompanhamento).
  useEffect(() => {
    if (!slug) return undefined

    let ativo = true

    async function carregar() {
      const ids = lerMeusPedidos(slug)

      if (ids.length === 0) {
        if (ativo) setEmAndamento((atual) => (atual.length === 0 ? atual : []))
        return
      }

      try {
        const { pedidos } = await publico.meusPedidos(slug, ids)

        if (!ativo) return

        const lista = pedidos.filter((pedido) => STATUS_EM_ANDAMENTO.includes(pedido.status))
        setEmAndamento((atual) => (mesmaLista(atual, lista) ? atual : lista))
      } catch {
        // A contagem é um atalho, não a tela de pedidos: rede fora do ar não
        // vira erro na cara do cliente. Ele continua comprando normalmente.
      }
    }

    carregar()

    const intervalo = setInterval(carregar, INTERVALO_PEDIDOS)
    window.addEventListener('focus', carregar)

    return () => {
      ativo = false
      clearInterval(intervalo)
      window.removeEventListener('focus', carregar)
    }
  }, [slug, pathname])

  if (carregando) {
    return <p className="loja__carregando">Abrindo o cardápio…</p>
  }

  if (erro) {
    return (
      <main className="loja__indisponivel">
        <h1>Loja não encontrada</h1>
        <p>Confira o endereço ou peça o link certo para a loja.</p>
        <Link to="/">Voltar ao início</Link>
      </main>
    )
  }

  const { loja } = dados

  const whatsapp = linkWhatsApp(
    loja.telefone,
    `Olá! Vi o cardápio de ${loja.nome} e quero fazer um pedido.`,
  )

  return (
    <div className="loja" style={{ '--loja-cor': loja.corPrimaria || '#e85d04' }}>
      <HeaderLoja
        loja={loja}
        status={status}
        linkWhatsApp={whatsapp || undefined}
        pedidosEmAndamento={emAndamento.length}
      />

      <Outlet />

      <RodapeLoja loja={loja} status={status} />
    </div>
  )
}
