import { Navigate, Route, Routes } from 'react-router-dom'
import CascaPainel from '../componentes/admin/CascaPainel.jsx'
import Login from '../paginas/admin/Login.jsx'
import Painel from '../paginas/admin/Painel.jsx'
import Pedidos from '../paginas/admin/Pedidos.jsx'
import Cardapio from '../paginas/admin/Cardapio.jsx'
import Delivery from '../paginas/admin/Delivery.jsx'
import Configuracoes from '../paginas/admin/Configuracoes.jsx'
import LayoutLoja from '../componentes/publico/LayoutLoja.jsx'
import Cadastro from '../paginas/publico/Cadastro.jsx'
import Landing from '../paginas/publico/Landing.jsx'
import CardapioLoja from '../paginas/publico/CardapioLoja.jsx'
import Checkout from '../paginas/publico/Checkout.jsx'
import AcompanharPedido from '../paginas/publico/AcompanharPedido.jsx'
import MeusPedidos from '../paginas/publico/MeusPedidos.jsx'
import StatusSistema from '../paginas/StatusSistema.jsx'
import RotaDaLoja from './RotaDaLoja.jsx'
import RotaProtegida from './RotaProtegida.jsx'

/**
 * Tabela de rotas do front.
 * Público: /, /cadastro, /admin/login e /:slug (cardápio da loja)
 * Painel:  /admin, /admin/pedidos (e /admin/pedidos/todos), /admin/cardapio,
 *          /admin/delivery e /admin/configuracoes (com as abas horarios e loja)
 *
 * O painel é uma rota-mãe com a casca (barra lateral / barra inferior) e as
 * páginas entram no Outlet dela — assim a moldura é uma só.
 */
export default function Rotas() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/status" element={<StatusSistema />} />
      <Route path="/cadastro" element={<Cadastro />} />
      <Route path="/admin/login" element={<Login />} />

      <Route
        path="/admin"
        element={
          <RotaProtegida>
            <CascaPainel />
          </RotaProtegida>
        }
      >
        <Route index element={<Painel />} />

        <Route
          path="pedidos"
          element={
            <RotaDaLoja>
              <Pedidos />
            </RotaDaLoja>
          }
        />

        {/* Histórico: mesma tela, outra visão. A rota é própria para o
            subitem da lateral acender e o link poder ser compartilhado. */}
        <Route
          path="pedidos/todos"
          element={
            <RotaDaLoja>
              <Pedidos />
            </RotaDaLoja>
          }
        />

        <Route
          path="cardapio"
          element={
            <RotaDaLoja>
              <Cardapio />
            </RotaDaLoja>
          }
        />

        <Route
          path="delivery"
          element={
            <RotaDaLoja>
              <Delivery />
            </RotaDaLoja>
          }
        />

        {/*
         * Configurações: uma rota por seção, com atalho na lateral. Não existe
         * tela própria de Configurações — o endereço cai na primeira.
         */}
        <Route
          path="configuracoes"
          element={<Navigate to="/admin/configuracoes/atendimento" replace />}
        />

        <Route
          path="configuracoes/atendimento"
          element={
            <RotaDaLoja>
              <Configuracoes />
            </RotaDaLoja>
          }
        />

        <Route
          path="configuracoes/horarios"
          element={
            <RotaDaLoja>
              <Configuracoes />
            </RotaDaLoja>
          }
        />

        <Route
          path="configuracoes/loja"
          element={
            <RotaDaLoja>
              <Configuracoes />
            </RotaDaLoja>
          }
        />

        {/* Endereço antigo: quem tinha o link salvo cai na aba certa. */}
        <Route path="horarios" element={<Navigate to="/admin/configuracoes/horarios" replace />} />
      </Route>

      <Route path="/:slug" element={<LayoutLoja />}>
        <Route index element={<CardapioLoja />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="pedidos" element={<MeusPedidos />} />
        <Route path="pedido/:pedidoId" element={<AcompanharPedido />} />
      </Route>

      <Route path="*" element={<p className="tela-carregando">Página não encontrada.</p>} />
    </Routes>
  )
}
