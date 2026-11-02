import { useAuth } from '../../contextos/AuthContexto.jsx'
import PainelLoja from './PainelLoja.jsx'
import PainelSuperadmin from './PainelSuperadmin.jsx'

// O painel muda conforme o papel: superadmin vê a plataforma, dono vê a loja.
export default function Painel() {
  const { usuario } = useAuth()

  return usuario.papel === 'superadmin' ? <PainelSuperadmin /> : <PainelLoja />
}
