import { useCallback, useEffect, useState } from 'react'
import CabecalhoPainel from '../../componentes/admin/CabecalhoPainel.jsx'
import { bairros as servicoBairros } from '../../servicos/bairros.js'
import { formatarDinheiro, paraCentavos, paraReais } from '../../utils/dinheiro.js'
import './Painel.css'

const BAIRRO_VAZIO = {
  nome: '',
  taxa: '',
  tempo: '',
  ativo: true,
}

export default function Delivery() {
  const [bairros, setBairros] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [processando, setProcessando] = useState('')

  const [formulario, setFormulario] = useState(BAIRRO_VAZIO)
  const [editandoId, setEditandoId] = useState('')
  const [apagandoId, setApagandoId] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)

    try {
      const dados = await servicoBairros.listar()
      setBairros(dados.bairros)
      setErro('')
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  function limparMensagens() {
    setErro('')
    setAviso('')
  }

  function alterar(campo) {
    return (evento) => setFormulario({ ...formulario, [campo]: evento.target.value })
  }

  function editar(bairro) {
    limparMensagens()
    setEditandoId(bairro._id)
    setFormulario({
      nome: bairro.nome,
      taxa: bairro.taxaEntrega ? paraReais(bairro.taxaEntrega) : '',
      tempo: bairro.tempoEstimado ? String(bairro.tempoEstimado) : '',
      ativo: bairro.ativo,
    })
  }

  function cancelarEdicao() {
    setEditandoId('')
    setFormulario(BAIRRO_VAZIO)
  }

  async function salvar(evento) {
    evento.preventDefault()
    limparMensagens()

    const taxa = formulario.taxa.trim() ? paraCentavos(formulario.taxa) : 0

    if (!Number.isInteger(taxa)) {
      setErro('Taxa inválida. Digite em reais, por exemplo: 5,00')
      return
    }

    const tempo = formulario.tempo.trim() ? Number(formulario.tempo) : 0

    if (!Number.isInteger(tempo) || tempo < 0) {
      setErro('Tempo estimado inválido. Use minutos, por exemplo: 30')
      return
    }

    const corpo = {
      nome: formulario.nome,
      taxaEntrega: taxa,
      tempoEstimado: tempo,
      ativo: formulario.ativo,
    }

    setProcessando('bairro')

    try {
      if (editandoId) {
        await servicoBairros.atualizar(editandoId, corpo)
        setAviso('Bairro atualizado.')
      } else {
        await servicoBairros.criar(corpo)
        setAviso('Bairro adicionado.')
      }

      cancelarEdicao()
      await carregar()
    } catch (e) {
      setErro(e.message)
    } finally {
      setProcessando('')
    }
  }

  async function alternarAtivo(bairro) {
    limparMensagens()
    setProcessando(bairro._id)

    try {
      await servicoBairros.atualizar(bairro._id, { ativo: !bairro.ativo })
      await carregar()
    } catch (e) {
      setErro(e.message)
    } finally {
      setProcessando('')
    }
  }

  async function apagar(id) {
    limparMensagens()
    setProcessando(id)

    try {
      await servicoBairros.remover(id)
      setApagandoId('')
      setAviso('Bairro removido.')
      await carregar()
    } catch (e) {
      setErro(e.message)
    } finally {
      setProcessando('')
    }
  }

  return (
    <div className="painel">
      <CabecalhoPainel />

      <main className="painel__conteudo painel__conteudo--largo">
        <div className="painel__cabecalho">
          <h1 className="painel__titulo">Delivery</h1>
          <button
            className="botao botao--secundario"
            type="button"
            onClick={carregar}
            disabled={carregando}
          >
            {carregando ? 'Atualizando…' : 'Atualizar'}
          </button>
        </div>

        {erro && <p className="painel__erro">{erro}</p>}
        {aviso && <p className="painel__sucesso">{aviso}</p>}

        <section className="painel__secao">
          <h2 className="painel__subtitulo">{editandoId ? 'Editar bairro' : 'Novo bairro'}</h2>
          <p className="painel__ajuda">
            A taxa é calculada no servidor a partir do bairro que o cliente escolher. Taxa zero
            significa entrega grátis. Bairro desativado some do checkout.
          </p>

          <form className="painel__formulario" onSubmit={salvar}>
            <label className="campo">
              <span>Bairro</span>
              <input
                value={formulario.nome}
                onChange={alterar('nome')}
                placeholder="Ex: Centro"
                required
              />
            </label>

            <label className="campo">
              <span>Taxa de entrega (R$)</span>
              <input
                value={formulario.taxa}
                onChange={alterar('taxa')}
                placeholder="5,00 — vazio = grátis"
                inputMode="decimal"
              />
            </label>

            <label className="campo">
              <span>Tempo estimado (min)</span>
              <input
                type="number"
                min="0"
                step="5"
                value={formulario.tempo}
                onChange={alterar('tempo')}
                placeholder="30"
              />
            </label>

            <label className="cardapio__checkbox">
              <input
                type="checkbox"
                checked={formulario.ativo}
                onChange={(evento) =>
                  setFormulario({ ...formulario, ativo: evento.target.checked })
                }
              />
              Atendido
            </label>

            <div className="painel__acoes">
              {editandoId && (
                <button className="botao botao--secundario" type="button" onClick={cancelarEdicao}>
                  Cancelar edição
                </button>
              )}

              <button className="botao" type="submit" disabled={processando === 'bairro'}>
                {processando === 'bairro'
                  ? 'Salvando…'
                  : editandoId
                    ? 'Salvar alterações'
                    : 'Adicionar bairro'}
              </button>
            </div>
          </form>
        </section>

        <section className="painel__secao">
          <h2 className="painel__subtitulo">Bairros atendidos</h2>

          {carregando && <p className="painel__aviso">Carregando…</p>}

          {!carregando && bairros.length === 0 && (
            <p className="painel__aviso">
              Nenhum bairro cadastrado. Sem bairro, o cliente não consegue fechar pedido de
              delivery.
            </p>
          )}

          {bairros.length > 0 && (
            <ul className="painel__lista">
              {bairros.map((bairro) => (
                <li key={bairro._id} className="painel__item">
                  <div className="painel__item-texto">
                    <strong>{bairro.nome}</strong>
                    <span className="painel__item-detalhe">
                      {bairro.tempoEstimado
                        ? `${bairro.tempoEstimado} min`
                        : 'tempo não informado'}
                    </span>
                  </div>

                  <div className="painel__acoes-linha">
                    <span className="painel__valor">
                      {bairro.taxaEntrega === 0 ? 'grátis' : formatarDinheiro(bairro.taxaEntrega)}
                    </span>

                    <span
                      className={`etiqueta ${
                        bairro.ativo ? 'etiqueta--ok' : 'etiqueta--neutro'
                      }`}
                    >
                      {bairro.ativo ? 'ativo' : 'inativo'}
                    </span>

                    <button
                      className="botao botao--secundario"
                      type="button"
                      onClick={() => editar(bairro)}
                    >
                      Editar
                    </button>

                    <button
                      className="botao botao--secundario"
                      type="button"
                      onClick={() => alternarAtivo(bairro)}
                      disabled={processando === bairro._id}
                    >
                      {bairro.ativo ? 'Desativar' : 'Ativar'}
                    </button>

                    {apagandoId === bairro._id ? (
                      <>
                        <span className="painel__confirmar">Apagar?</span>
                        <button
                          className="botao botao--perigo"
                          type="button"
                          onClick={() => apagar(bairro._id)}
                          disabled={processando === bairro._id}
                        >
                          Sim
                        </button>
                        <button
                          className="botao botao--secundario"
                          type="button"
                          onClick={() => setApagandoId('')}
                        >
                          Não
                        </button>
                      </>
                    ) : (
                      <button
                        className="botao botao--secundario"
                        type="button"
                        onClick={() => setApagandoId(bairro._id)}
                      >
                        Apagar
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
