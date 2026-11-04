import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCarrinho } from '../../contextos/CarrinhoContexto.jsx'
import { useLoja } from '../../contextos/LojaContexto.jsx'
import { publico } from '../../servicos/publico.js'
import { guardarDadosCliente, lerDadosCliente } from '../../utils/dadosCliente.js'
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

// Ordem em que o foco visita os campos: o primeiro erro ganha o cursor.
const ORDEM_CAMPOS = ['nome', 'telefone', 'bairroId', 'rua', 'numero', 'troco']

export default function Checkout() {
  const { slug } = useParams()
  const navegar = useNavigate()
  const { dados, status } = useLoja()
  const { itens, subtotal, limpar, quantidadeTotal } = useCarrinho()

  const { loja, bairros } = dados

  // Quem já pediu neste aparelho não digita tudo de novo. Bairro salvo que não
  // existe mais é descartado — o cardápio pode ter mudado desde a última compra.
  const [formulario, setFormulario] = useState(() => {
    const salvos = lerDadosCliente(slug)
    const bairroSalvo = bairros.some((item) => item._id === salvos.bairroId)
      ? salvos.bairroId
      : ''

    return {
      ...FORMULARIO_VAZIO,
      ...salvos,
      bairroId: bairroSalvo,
      tipo: bairros.length === 0 ? 'balcao' : salvos.tipo || 'delivery',
    }
  })

  const [errosCampos, setErrosCampos] = useState({})
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const erroRef = useRef(null)

  useEffect(() => {
    if (!enviado && quantidadeTotal === 0) {
      navegar(`/${slug}`, { replace: true })
    }
  }, [enviado, quantidadeTotal, navegar, slug])

  // Erro de negócio (loja fechou, API recusou) pode nascer longe do resumo.
  useEffect(() => {
    if (erro) erroRef.current?.scrollIntoView({ block: 'center' })
  }, [erro])

  const bairro = useMemo(
    () => bairros.find((item) => item._id === formulario.bairroId) || null,
    [bairros, formulario.bairroId],
  )

  const taxaEntrega = formulario.tipo === 'delivery' && bairro ? bairro.taxaEntrega : 0
  const total = subtotal + taxaEntrega

  const menorTaxa = bairros.length > 0
    ? Math.min(...bairros.map((item) => item.taxaEntrega))
    : null

  function alterar(campo) {
    return (evento) => {
      const valor = evento.target.value

      setFormulario((atual) => ({ ...atual, [campo]: valor }))
      setErrosCampos((atual) => {
        if (!atual[campo]) return atual

        const proximo = { ...atual }
        delete proximo[campo]
        return proximo
      })
    }
  }

  function alterarTipo(tipo) {
    // O endereço fica guardado mesmo na retirada: se o cliente voltar para
    // entrega, não precisa digitar tudo de novo.
    setFormulario((atual) => ({ ...atual, tipo }))
    setErrosCampos({})
  }

  function validar() {
    const problemas = {}
    const telefone = formulario.telefone.replace(/\D/g, '')

    if (!formulario.nome.trim()) problemas.nome = 'Informe seu nome.'
    if (!telefone) problemas.telefone = 'Informe um telefone para contato.'
    else if (telefone.length < 10) {
      problemas.telefone = 'Telefone incompleto: inclua o DDD.'
    }

    if (formulario.tipo === 'delivery') {
      if (!formulario.bairroId) problemas.bairroId = 'Escolha o bairro para entrega.'
      if (!formulario.rua.trim()) problemas.rua = 'Informe a rua.'
      if (!formulario.numero.trim()) problemas.numero = 'Informe o número.'
    }

    return problemas
  }

  function mostrarErro(campo, mensagem) {
    setErrosCampos({ [campo]: mensagem })

    const elemento = document.getElementById(`campo-${campo}`)
    elemento?.focus()
    elemento?.scrollIntoView({ block: 'center' })
  }

  async function enviar(evento) {
    evento.preventDefault()
    setErro('')

    if (!status.aberto) {
      setErro(`A loja não está aceitando pedidos agora. ${status.texto}`)
      return
    }

    const problemas = validar()

    if (Object.keys(problemas).length > 0) {
      setErrosCampos(problemas)

      const primeiro = ORDEM_CAMPOS.find((campo) => problemas[campo])
      const elemento = document.getElementById(`campo-${primeiro}`)
      elemento?.focus()
      elemento?.scrollIntoView({ block: 'center' })
      return
    }

    let trocoPara = 0

    if (formulario.pagamento === 'dinheiro' && formulario.troco.trim()) {
      trocoPara = paraCentavos(formulario.troco)

      if (!Number.isInteger(trocoPara)) {
        mostrarErro('troco', 'Valor inválido. Digite em reais, por exemplo: 100,00')
        return
      }
    }

    const corpo = {
      cliente: {
        nome: formulario.nome.trim(),
        telefone: formulario.telefone.trim(),
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

      // Só guarda depois que a loja aceitou: endereço digitado errado não vira
      // o padrão da próxima compra.
      guardarDadosCliente(slug, formulario)

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
      <div className="loja__checkout-principal">
        <header className="loja__checkout-topo">
          <Link className="loja__voltar" to={`/${slug}`}>
            ← Voltar ao cardápio
          </Link>

          <h1 className="loja__checkout-titulo">Confirmar pedido</h1>
          <p className="loja__checkout-sub">
            {loja.nome} · {status.texto}
          </p>
        </header>

        {!status.aberto && (
          <p className="loja__aviso">
            {status.texto}. Você pode montar o pedido, mas ele só será aceito quando a
            loja abrir.
          </p>
        )}

        <form
          id="formulario-checkout"
          className="loja__checkout-form"
          onSubmit={enviar}
          noValidate
        >
          <section className="loja__bloco">
            <h2 className="loja__bloco-titulo">Como você quer receber</h2>

            <div className="loja__tipos loja__tipos--grande">
              <label
                className={`loja__tipo loja__tipo--grande ${
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

                <span className="loja__tipo-corpo">
                  <strong>Entrega</strong>
                  <span>
                    {menorTaxa === null
                      ? 'a taxa é combinada com a loja'
                      : menorTaxa === 0
                        ? 'entrega grátis'
                        : `a partir de ${formatarDinheiro(menorTaxa)}`}
                  </span>
                </span>
              </label>

              <label
                className={`loja__tipo loja__tipo--grande ${
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

                <span className="loja__tipo-corpo">
                  <strong>Retirar na loja</strong>
                  <span>sem taxa de entrega</span>
                </span>
              </label>
            </div>
          </section>

          <section className="loja__bloco">
            <h2 className="loja__bloco-titulo">Seus dados</h2>

            <div className="loja__campos">
              <label
                className={`loja__campo ${errosCampos.nome ? 'loja__campo--erro' : ''}`}
              >
                <span>Nome</span>
                <input
                  id="campo-nome"
                  value={formulario.nome}
                  onChange={alterar('nome')}
                  autoComplete="name"
                  aria-invalid={errosCampos.nome ? 'true' : undefined}
                  aria-describedby={errosCampos.nome ? 'erro-nome' : undefined}
                />

                {errosCampos.nome && (
                  <span className="loja__campo-erro" id="erro-nome">
                    {errosCampos.nome}
                  </span>
                )}
              </label>

              <label
                className={`loja__campo ${
                  errosCampos.telefone ? 'loja__campo--erro' : ''
                }`}
              >
                <span>Telefone / WhatsApp</span>
                <input
                  id="campo-telefone"
                  type="tel"
                  inputMode="tel"
                  value={formulario.telefone}
                  onChange={alterar('telefone')}
                  autoComplete="tel"
                  placeholder="(11) 99999-9999"
                  aria-invalid={errosCampos.telefone ? 'true' : undefined}
                  aria-describedby={errosCampos.telefone ? 'erro-telefone' : undefined}
                />

                {errosCampos.telefone && (
                  <span className="loja__campo-erro" id="erro-telefone">
                    {errosCampos.telefone}
                  </span>
                )}
              </label>
            </div>

            <p className="loja__nota">
              A loja usa o telefone só para falar sobre este pedido.
            </p>
          </section>

          <section className="loja__bloco">
            <h2 className="loja__bloco-titulo">
              {formulario.tipo === 'delivery' ? 'Endereço de entrega' : 'Retirada'}
            </h2>

            {formulario.tipo === 'delivery' ? (
              <>
                {bairros.length === 0 ? (
                  <p className="loja__aviso loja__aviso--compacto">
                    A loja ainda não cadastrou bairros de entrega. Escolha retirar na
                    loja ou fale com a loja.
                  </p>
                ) : (
                  <label
                    className={`loja__campo ${
                      errosCampos.bairroId ? 'loja__campo--erro' : ''
                    }`}
                  >
                    <span>Bairro</span>
                    <select
                      id="campo-bairroId"
                      value={formulario.bairroId}
                      onChange={alterar('bairroId')}
                      aria-invalid={errosCampos.bairroId ? 'true' : undefined}
                      aria-describedby={
                        errosCampos.bairroId ? 'erro-bairroId' : undefined
                      }
                    >
                      <option value="">Selecione o bairro…</option>

                      {bairros.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.nome} —{' '}
                          {item.taxaEntrega === 0
                            ? 'grátis'
                            : formatarDinheiro(item.taxaEntrega)}
                          {item.tempoEstimado ? ` · ${item.tempoEstimado} min` : ''}
                        </option>
                      ))}
                    </select>

                    {errosCampos.bairroId && (
                      <span className="loja__campo-erro" id="erro-bairroId">
                        {errosCampos.bairroId}
                      </span>
                    )}
                  </label>
                )}

                <div className="loja__campos">
                  <label
                    className={`loja__campo loja__campo--rua ${
                      errosCampos.rua ? 'loja__campo--erro' : ''
                    }`}
                  >
                    <span>Rua</span>
                    <input
                      id="campo-rua"
                      value={formulario.rua}
                      onChange={alterar('rua')}
                      autoComplete="address-line1"
                      aria-invalid={errosCampos.rua ? 'true' : undefined}
                      aria-describedby={errosCampos.rua ? 'erro-rua' : undefined}
                    />

                    {errosCampos.rua && (
                      <span className="loja__campo-erro" id="erro-rua">
                        {errosCampos.rua}
                      </span>
                    )}
                  </label>

                  <label
                    className={`loja__campo ${
                      errosCampos.numero ? 'loja__campo--erro' : ''
                    }`}
                  >
                    <span>Número</span>
                    <input
                      id="campo-numero"
                      value={formulario.numero}
                      onChange={alterar('numero')}
                      inputMode="numeric"
                      aria-invalid={errosCampos.numero ? 'true' : undefined}
                      aria-describedby={errosCampos.numero ? 'erro-numero' : undefined}
                    />

                    {errosCampos.numero && (
                      <span className="loja__campo-erro" id="erro-numero">
                        {errosCampos.numero}
                      </span>
                    )}
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
            ) : (
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
              <label
                className={`loja__campo ${errosCampos.troco ? 'loja__campo--erro' : ''}`}
              >
                <span>Troco para (R$)</span>
                <input
                  id="campo-troco"
                  value={formulario.troco}
                  onChange={alterar('troco')}
                  inputMode="decimal"
                  placeholder="Opcional. Ex: 100,00"
                  aria-invalid={errosCampos.troco ? 'true' : undefined}
                  aria-describedby={errosCampos.troco ? 'erro-troco' : undefined}
                />

                {errosCampos.troco && (
                  <span className="loja__campo-erro" id="erro-troco">
                    {errosCampos.troco}
                  </span>
                )}
              </label>
            )}
          </section>

          <section className="loja__bloco">
            <h2 className="loja__bloco-titulo">Observação</h2>

            <label className="loja__campo">
              <span>Algo que a loja precisa saber?</span>
              <textarea
                value={formulario.observacao}
                onChange={alterar('observacao')}
                placeholder="Ex: tocar a campainha, deixar na portaria…"
                rows={3}
                maxLength={300}
              />
            </label>
          </section>
        </form>
      </div>

      <aside className="loja__resumo" aria-label="Resumo do pedido">
        <h2 className="loja__resumo-titulo">Seu pedido</h2>

        <ul className="loja__resumo-itens">
          {itens.map((item) => (
            <li key={item.linhaId} className="loja__resumo-item">
              <span>
                {item.quantidade}× {item.nome}
                {item.observacao && (
                  <small className="loja__item-observacao">{item.observacao}</small>
                )}
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
          <p className="loja__nota">Chega em cerca de {bairro.tempoEstimado} min.</p>
        )}

        <div className="loja__resumo-divisor" />

        <div className="loja__resumo-linha loja__resumo-linha--total">
          <span>Total</span>
          <strong>{formatarDinheiro(total)}</strong>
        </div>

        {erro && (
          <p className="loja__erro" id="erro-checkout" role="alert" ref={erroRef}>
            {erro}
          </p>
        )}

        <button
          className="loja__botao loja__botao--largo loja__resumo-enviar"
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

      <div className="loja__checkout-barra">
        <div className="loja__checkout-barra-total">
          <span>
            {quantidadeTotal} {quantidadeTotal === 1 ? 'item' : 'itens'}
          </span>
          <strong>{formatarDinheiro(total)}</strong>
        </div>

        <button
          className="loja__botao"
          type="submit"
          form="formulario-checkout"
          disabled={enviando || !status.aberto}
        >
          {enviando ? 'Enviando…' : 'Enviar pedido'}
        </button>
      </div>
    </main>
  )
}
