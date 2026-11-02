import { Route, Routes } from 'react-router-dom'
import Login from '../paginas/admin/Login.jsx'
import Painel from '../paginas/admin/Painel.jsx'
import StatusSistema from '../paginas/StatusSistema.jsx'
import RotaProtegida from './RotaProtegida.jsx'

/**
 * Tabela de rotas do front.
 * Público: / e /admin/login
 * Painel:  /admin (exige login)
 */
export default function Rotas() {
  return (
    <Routes>
      <Route path="/" element={<StatusSistema />} />
      <Route path="/admin/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <RotaProtegida>
            <Painel />
          </RotaProtegida>
        }
      />
      <Route path="*" element={<p className="tela-carregando">Página não encontrada.</p>} />
    </Routes>
  )
}
