import { useAuth } from '../../contextos/AuthContexto.jsx'

export default function CabecalhoPainel() {
  const { usuario, sair } = useAuth()

  return (
    <header className="painel__topo">
      <span className="painel__marca">Sistema Delivery</span>

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
