import { Route, Routes } from 'react-router-dom'
import StatusSistema from '../paginas/StatusSistema.jsx'

/**
 * Tabela de rotas do front.
 * Público: /:slug (cardápio), /:slug/pedido/:id (acompanhamento)
 * Painel:  /admin/...
 */
export default function Rotas() {
  return (
    <Routes>
      <Route path="/" element={<StatusSistema />} />
    </Routes>
  )
}
