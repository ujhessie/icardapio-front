import { Link, useParams } from 'react-router-dom'
import { IconeRede } from './IconeRede.jsx'
import {
  linhasDoEndereco,
  linkDoMapa,
  linkWhatsApp,
  semanaDeHorarios,
} from '../../utils/vitrine.js'

/*
 * Rodapé do cardápio público.
 *
 * Reúne o que o cliente procura depois de rolar a lista inteira: onde a loja
 * fica, que horas abre e como falar com ela. Só aparece o que a loja cadastrou
 * — sem endereço, o bloco diz que não há endereço em vez de mostrar um mapa
 * apontando para o meio do nada.
 */

const ROTULO_DA_REDE = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  whatsapp: 'WhatsApp',
  site: 'Site',
  outro: 'Link',
}

function rolarAoTopo() {
  const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches

  window.scrollTo({ top: 0, behavior: suave ? 'smooth' : 'auto' })
}

export default function RodapeLoja({ loja, status }) {
  const { slug } = useParams()

  const redes = (Array.isArray(loja.redesSociais) ? loja.redesSociais : []).filter(
    (rede) => rede?.url,
  )

  const linhas = linhasDoEndereco(loja.endereco)
  const mapa = linkDoMapa(loja.endereco, loja.nome)

  const whatsapp = linkWhatsApp(
    loja.telefone,
    `Olá! Vi o cardápio de ${loja.nome} e quero fazer um pedido.`,
  )

  const temHorarios =
    loja.mostrarHorarios !== false &&
    Array.isArray(loja.horarios) &&
    loja.horarios.length > 0

  const dias = temHorarios ? semanaDeHorarios(loja.horarios) : []

  return (
    <footer className="loja__rodape">
      <div className="loja__rodape-grade">
        <div className="loja__rodape-coluna loja__rodape-coluna--loja">
          <div className="loja__rodape-marca">
            {loja.logo ? (
              <img className="loja__rodape-logo" src={loja.logo} alt="" />
            ) : (
              <span className="loja__rodape-monograma" aria-hidden="true">
                {loja.nome.charAt(0).toUpperCase()}
              </span>
            )}

            <span className="loja__rodape-marca-texto">
              <strong>{loja.nome}</strong>
              <span>{status.texto}</span>
            </span>
          </div>

          {redes.length > 0 && (
            <ul className="loja__redes" aria-label="Redes sociais">
              {redes.map((rede, indice) => (
                <li key={`${rede.tipo}-${indice}`}>
                  <a
                    className="loja__rede"
                    href={rede.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <IconeRede tipo={rede.tipo} />
                    <span>{ROTULO_DA_REDE[rede.tipo] || 'Link'}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="loja__rodape-coluna">
          <h2 className="loja__rodape-titulo">Onde estamos</h2>

          {linhas.length > 0 ? (
            <>
              <address className="loja__endereco">
                {linhas.map((linha) => (
                  <span key={linha}>{linha}</span>
                ))}
              </address>

              {mapa && (
                <a
                  className="loja__rodape-acao"
                  href={mapa}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir no mapa
                </a>
              )}
            </>
          ) : (
            <p className="loja__rodape-vazio">
              O endereço ainda não foi cadastrado. Fale com a loja para saber onde retirar.
            </p>
          )}

          <div className="loja__rodape-atalhos">
            {whatsapp && (
              <a
                className="loja__rodape-acao"
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
              >
                Chamar no WhatsApp
              </a>
            )}

            <Link className="loja__rodape-acao" to={`/${slug}/pedidos`}>
              Meus pedidos
            </Link>
          </div>
        </div>

        {temHorarios && (
          <div className="loja__rodape-coluna">
            <h2 className="loja__rodape-titulo">Horários</h2>

            <ul className="loja__horarios">
              {dias.map((dia) => (
                <li
                  key={dia.dia}
                  className={`loja__horario ${dia.hoje ? 'loja__horario--hoje' : ''} ${
                    dia.texto === 'Fechado' ? 'loja__horario--fechado' : ''
                  }`}
                >
                  <span className="loja__horario-dia">
                    {dia.rotulo}
                    {dia.hoje && <span className="loja__horario-hoje">hoje</span>}
                  </span>

                  <span className="loja__horario-hora">{dia.texto}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="loja__rodape-base">
        <span className="loja__rodape-selo">Cardápio digital por iCardápio</span>

        <button className="loja__voltar-topo" type="button" onClick={rolarAoTopo}>
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 19V5" />
            <path d="m6 11 6-6 6 6" />
          </svg>
          Voltar ao topo
        </button>
      </div>
    </footer>
  )
}
