import { useCallback, useEffect, useState } from 'react'
import { api } from '../servicos/api.js'
import './StatusSistema.css'

export default function StatusSistema() {
  const [saude, setSaude] = useState(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)

  const verificar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      setSaude(await api.saude())
    } catch (e) {
      setSaude(null)
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    verificar()
  }, [verificar])

  const apiOk = Boolean(saude?.api === 'online')
  const bancoOk = saude?.banco === 'conectado'

  return (
    <main className="status">
      <header className="status__topo">
        <span className="status__marca">Sistema Delivery</span>
        <h1 className="status__titulo">Base do projeto no ar</h1>
        <p className="status__descricao">
          Front, API e banco na mesma conversa. A próxima etapa é o login e o cadastro de lojas.
        </p>
      </header>

      <section className="status__cartao" aria-live="polite">
        {carregando && <p className="status__aviso">Verificando conexões…</p>}

        {!carregando && erro && (
          <div className="status__erro">
            <p>{erro}</p>
            <p className="status__dica">
              Confira se a API está rodando em <code>localhost:4000</code>.
            </p>
            <button className="botao" type="button" onClick={verificar}>
              Verificar de novo
            </button>
          </div>
        )}

        {!carregando && saude && (
          <dl className="status__lista">
            <Linha rotulo="API" valor={saude.api} ok={apiOk} />
            <Linha rotulo="Banco" valor={saude.banco} ok={bancoOk} />
            <Linha rotulo="Ambiente" valor={saude.ambiente} neutro />
            <Linha
              rotulo="Verificado às"
              valor={new Date(saude.horario).toLocaleTimeString('pt-BR')}
              neutro
            />
          </dl>
        )}
      </section>

      <footer className="status__rodape">
        <button className="botao botao--secundario" type="button" onClick={verificar}>
          Atualizar
        </button>
      </footer>
    </main>
  )
}

function Linha({ rotulo, valor, ok, neutro }) {
  const classe = neutro ? '' : ok ? ' status__valor--ok' : ' status__valor--erro'

  return (
    <div className="status__linha">
      <dt>{rotulo}</dt>
      <dd className={`status__valor${classe}`}>{valor}</dd>
    </div>
  )
}
