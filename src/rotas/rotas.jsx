import { Route, Routes } from 'react-router-dom'
import Login from '../paginas/admin/Login.jsx'
import Painel from '../paginas/admin/Painel.jsx'
import Cardapio from '../paginas/admin/Cardapio.jsx'
import Delivery from '../paginas/admin/Delivery.jsx'
import Cadastro from '../paginas/publico/Cadastro.jsx'
import StatusSistema from '../paginas/StatusSistema.jsx'
import RotaDaLoja from './RotaDaLoja.jsx'
import RotaProtegida from './RotaProtegida.jsx'

/**
 * Tabela de rotas do front.
 * Público: /, /cadastro e /admin/login
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
      <Route path="*" element={<p className="tela-carregando">Página não encontrada.</p>} />
    </Routes>
  )
}
