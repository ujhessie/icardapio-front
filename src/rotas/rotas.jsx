import { Route, Routes } from 'react-router-dom'
import Login from '../paginas/admin/Login.jsx'
import Painel from '../paginas/admin/Painel.jsx'
import Cardapio from '../paginas/admin/Cardapio.jsx'
import Delivery from '../paginas/admin/Delivery.jsx'
import LayoutLoja from '../componentes/publico/LayoutLoja.jsx'
import Cadastro from '../paginas/publico/Cadastro.jsx'
import CardapioLoja from '../paginas/publico/CardapioLoja.jsx'
import Checkout from '../paginas/publico/Checkout.jsx'
import AcompanharPedido from '../paginas/publico/AcompanharPedido.jsx'
import StatusSistema from '../paginas/StatusSistema.jsx'
import RotaDaLoja from './RotaDaLoja.jsx'
import RotaProtegida from './RotaProtegida.jsx'

/**
 * Tabela de rotas do front.
 * Público: /, /cadastro, /admin/login e /:slug (cardápio da loja)
 * Painel:  /admin, /admin/cardapio e /admin/delivery (exigem login; as duas últimas são da loja)
 */
export default function Rotas() {
  return (
    <Routes>
      <Route path="/" element={<StatusSistema />} />
      <Route path="/cadastro" element={<Cadastro />} />
      <Route path="/admin/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <RotaProtegida>
            <Painel />
          </RotaProtegida>
        }
      />
      <Route
        path="/admin/cardapio"
        element={
          <RotaProtegida>
            <RotaDaLoja>
              <Cardapio />
            </RotaDaLoja>
          </RotaProtegida>
        }
      />
      <Route
        path="/admin/delivery"
        element={
          <RotaProtegida>
            <RotaDaLoja>
              <Delivery />
            </RotaDaLoja>
          </RotaProtegida>
        }
      />
      <Route path="/:slug" element={<LayoutLoja />}>
        <Route index element={<CardapioLoja />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="pedido/:pedidoId" element={<AcompanharPedido />} />
      </Route>
      <Route path="*" element={<p className="tela-carregando">Página não encontrada.</p>} />
    </Routes>
  )
}
