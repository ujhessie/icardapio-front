import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCarrinho } from '../../contextos/CarrinhoContexto.jsx'
import { useLoja } from '../../contextos/LojaContexto.jsx'
import { publico } from '../../servicos/publico.js'
import { formatarDinheiro, paraCentavos } from '../../utils/dinheiro.js'
import { guardarMeuPedido } from '../../utils/meusPedidos.js'

const FORMULARIO_VAZIO = {
  nome: '',
  telefone: '',
  tipo: 'delivery',
  bairroId: '',
  rua: '',
  numero: '',
  complemento: '',
  referencia: '',
  pagamento: 'pix',
  troco: '',
  observacao: '',
}

const PAGAMENTOS = [
  { valor: 'pix', rotulo: 'Pix' },
  { valor: 'cartao', rotulo: 'Cartão' },
  { valor: 'dinheiro', rotulo: 'Dinheiro' },
]

export default function Checkout() {
  const { slug } = useParams()
  const navegar = useNavigate()
  const { dados, status } = useLoja()
  const { itens, subtotal, limpar, quantidadeTotal } = useCarrinho()

  const [formulario, setFormulario] = useState(FORMULARIO_VAZIO)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const { loja, bairros } = dados

  useEffect(() => {
    if (!enviado && quantidadeTotal === 0) {
      navegar(`/${slug}`, { replace: true })
    }
  }, [enviado, quantidadeTotal, navegar, slug])

  const bairro = useMemo(
    () => bairros.find((item) => item._id === formulario.bairroId) || null,
    [bairros, formulario.bairroId],
  )

  const taxaEntrega = formulario.tipo === 'delivery' && bairro ? bairro.taxaEntrega : 0
  const total = subtotal + taxaEntrega

  function alterar(campo) {
    return (evento) => setFormulario({ ...formulario, [campo]: evento.target.value })
  }

  function alterarTipo(tipo) {
    setFormulario({
      ...formulario,
      tipo,
      bairroId: tipo === 'balcao' ? '' : formulario.bairroId,
    })
  }

  async function enviar(evento) {
    evento.preventDefault()
    setErro('')

    if (!status.aberto) {
      setErro(`A loja não está aceitando pedidos agora. ${status.texto}`)
      return
    }

    if (formulario.tipo === 'delivery' && !formulario.bairroId) {
      setErro('Escolha o bairro para entrega.')
      return
    }

    let trocoPara = 0

    if (formulario.pagamento === 'dinheiro' && formulario.troco.trim()) {
      trocoPara = paraCentavos(formulario.troco)

      if (!Number.isInteger(trocoPara)) {
        setErro('Valor de troco inválido. Digite em reais, por exemplo: 100,00')
        return
      }
    }

    const corpo = {
      cliente: {
        nome: formulario.nome,
        telefone: formulario.telefone,
      },
      tipo: formulario.tipo,
      itens: itens.map((item) => ({
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        observacao: item.observacao,
      })),
      pagamento: formulario.pagamento,
      trocoPara,
      observacao: formulario.observacao,
    }

    if (formulario.tipo === 'delivery') {
      corpo.bairroId = formulario.bairroId
      corpo.endereco = {
        rua: formulario.rua,
        numero: formulario.numero,
        complemento: formulario.complemento,
        referencia: formulario.referencia,
      }
    }

    setEnviando(true)

    try {
      const resposta = await publico.criarPedido(slug, corpo)
      setEnviado(true)
      guardarMeuPedido(slug, resposta.pedido._id)
      limpar()
      navegar(`/${slug}/pedido/${resposta.pedido._id}`, { replace: true })
    } catch (e) {
      setErro(e.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="loja__checkout">
      <div>
        <Link className="loja__voltar" to={`/${slug}`}>
          ← Voltar ao cardápio
        </Link>

        {!status.aberto && (
          <p className="loja__aviso">
            {status.texto}. Você pode montar o pedido, mas ele só será aceito quando a
            loja abrir.
          </p>
        )}

        <form id="formulario-checkout" className="loja__checkout-form" onSubmit={enviar}>
          <section className="loja__bloco">
            <h2 className="loja__bloco-titulo">Seus dados</h2>

            <div className="loja__campos">
              <label className="loja__campo">
                <span>Nome</span>
                <input
                  value={formulario.nome}
                  onChange={alterar('nome')}
                  autoComplete="name"
                  required
                />
              </label>

              <label className="loja__campo">
                <span>Telefone / WhatsApp</span>
                <input
                  type="tel"
                  inputMode="tel"
                  value={formulario.telefone}
                  onChange={alterar('telefone')}
                  autoComplete="tel"
                  placeholder="(11) 99999-9999"
                  required
                />
              </label>
            </div>
          </section>

          <section className="loja__bloco">
            <h2 className="loja__bloco-titulo">Como você quer receber</h2>

            <div className="loja__tipos">
              <label
                className={`loja__tipo ${
                  formulario.tipo === 'delivery' ? 'loja__tipo--ativo' : ''
                }`}
              >
                <input
                  type="radio"
                  name="tipo"
                  value="delivery"
                  checked={formulario.tipo === 'delivery'}
                  onChange={() => alterarTipo('delivery')}
                />
                Entrega
              </label>

              <label
                className={`loja__tipo ${
                  formulario.tipo === 'balcao' ? 'loja__tipo--ativo' : ''
                }`}
              >
                <input
                  type="radio"
                  name="tipo"
                  value="balcao"
                  checked={formulario.tipo === 'balcao'}
                  onChange={() => alterarTipo('balcao')}
                />
                Retirar na loja
              </label>
            </div>

            {formulario.tipo === 'delivery' && (
              <>
                {bairros.length === 0 ? (
                  <p className="loja__aviso loja__aviso--compacto">
                    A loja ainda não cadastrou bairros de entrega. Escolha retirar na loja.
                  </p>
                ) : (
                  <label className="loja__campo">
                    <span>Bairro</span>
                    <select
                      value={formulario.bairroId}
                      onChange={alterar('bairroId')}
                      required
                    >
                      <option value="">Selecione o bairro…</option>
                      {bairros.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.nome} — {item.taxaEntrega === 0
                            ? 'grátis'
                            : formatarDinheiro(item.taxaEntrega)}
                          {item.tempoEstimado ? ` · ${item.tempoEstimado} min` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="loja__campos">
                  <label className="loja__campo loja__campo--rua">
                    <span>Rua</span>
                    <input
                      value={formulario.rua}
                      onChange={alterar('rua')}
                      autoComplete="address-line1"
                      required
                    />
                  </label>

                  <label className="loja__campo">
                    <span>Número</span>
                    <input
                      value={formulario.numero}
                      onChange={alterar('numero')}
                      inputMode="numeric"
                      required
                    />
                  </label>

                  <label className="loja__campo">
                    <span>Complemento</span>
                    <input
                      value={formulario.complemento}
                      onChange={alterar('complemento')}
                      placeholder="Apto, bloco…"
                    />
                  </label>

                  <label className="loja__campo loja__campo--largo">
                    <span>Ponto de referência</span>
                    <input
                      value={formulario.referencia}
                      onChange={alterar('referencia')}
                      placeholder="Portão azul, perto da praça…"
                    />
                  </label>
                </div>
              </>
            )}

            {formulario.tipo === 'balcao' && (
              <p className="loja__nota">
                {loja.endereco?.rua
                  ? `Retire em ${loja.endereco.rua}, ${loja.endereco.numero}${
                      loja.endereco.complemento ? ` — ${loja.endereco.complemento}` : ''
                    }.`
                  : 'Retire no balcão da loja. O endereço pode ser confirmado pelo telefone.'}
              </p>
            )}
          </section>

          <section className="loja__bloco">
            <h2 className="loja__bloco-titulo">Pagamento</h2>

            <div className="loja__pagamentos">
              {PAGAMENTOS.map((opcao) => (
                <label
                  key={opcao.valor}
                  className={`loja__tipo ${
                    formulario.pagamento === opcao.valor ? 'loja__tipo--ativo' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="pagamento"
                    value={opcao.valor}
                    checked={formulario.pagamento === opcao.valor}
                    onChange={() =>
                      setFormulario({ ...formulario, pagamento: opcao.valor })
                    }
                  />
                  {opcao.rotulo}
                </label>
              ))}
            </div>

            {formulario.pagamento === 'dinheiro' && (
              <label className="loja__campo">
                <span>Troco para (R$)</span>
                <input
                  value={formulario.troco}
                  onChange={alterar('troco')}
                  inputMode="decimal"
                  placeholder="Opcional. Ex: 100,00"
                />
              </label>
            )}

            <label className="loja__campo">
              <span>Observação do pedido</span>
              <textarea
                value={formulario.observacao}
                onChange={alterar('observacao')}
                placeholder="Algo que a loja precisa saber?"
                rows={3}
                maxLength={300}
              />
            </label>
          </section>

          {erro && (
            <p className="loja__erro" role="alert">
              {erro}
            </p>
          )}
        </form>
      </div>

      <aside className="loja__resumo">
        <h2 className="loja__resumo-titulo">Resumo</h2>

        <ul className="loja__resumo-itens">
          {itens.map((item) => (
            <li key={item.linhaId} className="loja__resumo-item">
              <span>
                {item.quantidade}× {item.nome}
              </span>
              <span>{formatarDinheiro(item.preco * item.quantidade)}</span>
            </li>
          ))}
        </ul>

        <div className="loja__resumo-divisor" />

        <div className="loja__resumo-linha">
          <span>Subtotal</span>
          <span>{formatarDinheiro(subtotal)}</span>
        </div>

        <div className="loja__resumo-linha">
          <span>{formulario.tipo === 'delivery' ? 'Taxa de entrega' : 'Retirada'}</span>
          <span>
            {formulario.tipo === 'delivery'
              ? bairro
                ? formatarDinheiro(taxaEntrega)
                : 'escolha o bairro'
              : 'grátis'}
          </span>
        </div>

        {formulario.tipo === 'delivery' && bairro?.tempoEstimado > 0 && (
          <p className="loja__nota">Tempo estimado: cerca de {bairro.tempoEstimado} min.</p>
        )}

        <div className="loja__resumo-divisor" />

        <div className="loja__resumo-linha loja__resumo-linha--total">
          <span>Total</span>
          <strong>{formatarDinheiro(total)}</strong>
        </div>

        <button
          className="loja__botao loja__botao--largo"
          type="submit"
          form="formulario-checkout"
          disabled={enviando || !status.aberto}
        >
          {enviando ? 'Enviando…' : 'Enviar pedido'}
        </button>

        <p className="loja__nota">
          Ao enviar, a loja recebe o pedido e confirma pelo telefone se precisar.
        </p>
      </aside>
    </main>
  )
}
