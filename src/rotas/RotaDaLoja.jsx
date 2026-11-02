import { Navigate } from 'react-router-dom'
import { useAuth } from '../contextos/AuthContexto.jsx'

// Cardápio e delivery são telas da loja. Superadmin não tem loja,
// então volta para o painel da plataforma.
export default function RotaDaLoja({ children }) {
  const { usuario } = useAuth()

  if (usuario.papel === 'superadmin') {
    return <Navigate to="/admin" replace />
  }

  return children
}
