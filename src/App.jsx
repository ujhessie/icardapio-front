import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contextos/AuthContexto.jsx'
import Rotas from './rotas/rotas.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Rotas />
      </AuthProvider>
    </BrowserRouter>
  )
}
