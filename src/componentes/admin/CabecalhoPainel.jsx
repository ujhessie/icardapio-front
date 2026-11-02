import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contextos/AuthContexto.jsx'

function classeDoLink({ isActive }) {
  return isActive ? 'painel__link painel__link--ativo' : 'painel__link'
}

export default function CabecalhoPainel() {
  const { usuario, sair } = useAuth()
  const daLoja = usuario.papel !== 'superadmin'

  return (
    <header className="painel__topo">
      <span className="painel__marca">Sistema Delivery</span>

      {daLoja && (
        <nav className="painel__nav">
          <NavLink to="/admin" end className={classeDoLink}>
            Painel
          </NavLink>
          <NavLink to="/admin/cardapio" className={classeDoLink}>
            Cardápio
          </NavLink>
          <NavLink to="/admin/delivery" className={classeDoLink}>
            Delivery
          </NavLink>
        </nav>
      )}

      <div className="painel__usuario">
        <span className="painel__nome">{usuario.nome}</span>
        <span className="painel__papel">{usuario.papel}</span>
        <button className="botao botao--secundario" type="button" onClick={sair}>
          Sair
        </button>
      </div>
    </header>
  )
}
