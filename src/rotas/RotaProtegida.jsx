import { Navigate } from 'react-router-dom'
import { useAuth } from '../contextos/AuthContexto.jsx'

export default function RotaProtegida({ children }) {
  const { usuario, carregando } = useAuth()

  if (carregando) {
    return <p className="tela-carregando">Carregando…</p>
  }

  if (!usuario) {
    return <Navigate to="/admin/login" replace />
  }

  return children
}
