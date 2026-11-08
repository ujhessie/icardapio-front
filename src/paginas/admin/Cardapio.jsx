import { useCallback, useEffect, useState } from 'react'
import CampoImagem from '../../componentes/admin/CampoImagem.jsx'
import { cardapio as servicoCardapio } from '../../servicos/cardapio.js'
import { formatarDinheiro, paraCentavos, paraReais } from '../../utils/dinheiro.js'
import './Painel.css'

const PRODUTO_VAZIO = {
  categoriaId: '',
  nome: '',
  descricao: '',
  preco: '',
  imagem: '',
  disponivel: true,
}

export default function Cardapio() {
  const [categorias, setCategorias] = useState([])
  const [produtos, setProdutos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [processando, setProcessando] = useState('')

  const [nomeCategoria, setNomeCategoria] = useState('')
  const [categoriaEditando, setCategoriaEditando] = useState(null)
  const [categoriaApagando, setCategoriaApagando] = useState('')

  const [formulario, setFormulario] = useState(PRODUTO_VAZIO)
  const [produtoEditandoId, setProdutoEditandoId] = useState('')
  const [produtoApagando, setProdutoApagando] = useState('')
  // Upload em voo: o formulário espera a foto chegar para não salvar sem ela.
  const [envios, setEnvios] = useState({})

  const carregar = useCallback(async () => {
    setCarregando(true)

    try {
      const [dadosCategorias, dadosProdutos] = await Promise.all([
        servicoCardapio.listarCategorias(),
        servicoCardapio.listarProdutos(),
      ])

      setCategorias(dadosCategorias.categorias)
      setProdutos(dadosProdutos.produtos)
      setErro('')
      setFormulario((atual) =>
        atual.categoriaId
          ? atual
          : { ...atual, categoriaId: dadosCategorias.categorias[0]?._id || '' },
      )
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

  /* ---------------- Categorias ---------------- */

  async function adicionarCategoria(evento) {
    evento.preventDefault()
    limparMensagens()
    setProcessando('categoria')

    try {
      await servicoCardapio.criarCategoria({ nome: nomeCategoria })
      setNomeCategoria('')
      setAviso('Categoria criada.')
      await carregar()
    } catch (e) {
      setErro(e.message)
    } finally {
      setProcessando('')
    }
  }

  async function salvarNomeCategoria(evento) {
    evento.preventDefault()
    limparMensagens()
    setProcessando(`categoria:${categoriaEditando.id}`)

    try {
      await servicoCardapio.atualizarCategoria(categoriaEditando.id, {
        nome: categoriaEditando.nome,
      })
      setCategoriaEditando(null)
      setAviso('Categoria renomeada.')
      await carregar()
    } catch (e) {
      setErro(e.message)
    } finally {
      setProcessando('')
    }
  }

  async function apagarCategoria(id) {
    limparMensagens()
    setProcessando(`categoria:${id}`)

    try {
      await servicoCardapio.removerCategoria(id)
      setCategoriaApagando('')

      if (formulario.categoriaId === id) {
        setFormulario({ ...formulario, categoriaId: '' })
      }

      setAviso('Categoria removida.')
      await carregar()
    } catch (e) {
      setErro(e.message)
    } finally {
      setProcessando('')
    }
  }

  /* ---------------- Produtos ---------------- */

  function alterar(campo) {
    return (evento) => setFormulario({ ...formulario, [campo]: evento.target.value })
  }

  function editarProduto(produto) {
    limparMensagens()
    setProdutoEditandoId(produto._id)
    setFormulario({
      categoriaId: produto.categoriaId,
      nome: produto.nome,
      descricao: produto.descricao || '',
      preco: paraReais(produto.preco),
      imagem: produto.imagem || '',
      disponivel: produto.disponivel,
    })
  }

  function cancelarEdicao() {
    setProdutoEditandoId('')
    setFormulario({ ...PRODUTO_VAZIO, categoriaId: categorias[0]?._id || '' })
  }

  async function salvarProduto(evento) {
    evento.preventDefault()
    limparMensagens()

    if (!formulario.categoriaId) {
      setErro('Crie uma categoria antes de cadastrar um produto.')
      return
    }

    const centavos = paraCentavos(formulario.preco)

    if (!Number.isInteger(centavos)) {
      setErro('Preço inválido. Digite em reais, por exemplo: 45,90')
      return
    }

    const corpo = {
      categoriaId: formulario.categoriaId,
      nome: formulario.nome,
      descricao: formulario.descricao,
      preco: centavos,
      imagem: formulario.imagem,
      disponivel: formulario.disponivel,
    }

    setProcessando('produto')

    try {
      if (produtoEditandoId) {
        await servicoCardapio.atualizarProduto(produtoEditandoId, corpo)
        setAviso('Produto atualizado.')
      } else {
        await servicoCardapio.criarProduto(corpo)
        setAviso('Produto criado.')
      }

      cancelarEdicao()
      await carregar()
    } catch (e) {
      setErro(e.message)
    } finally {
      setProcessando('')
    }
  }

  async function alternarDisponivel(produto) {
    limparMensagens()
    setProcessando(`produto:${produto._id}`)

    try {
      await servicoCardapio.atualizarProduto(produto._id, { disponivel: !produto.disponivel })
      await carregar()
    } catch (e) {
      setErro(e.message)
    } finally {
      setProcessando('')
    }
  }

  async function apagarProduto(id) {
    limparMensagens()
    setProcessando(`produto:${id}`)

    try {
      await servicoCardapio.removerProduto(id)
      setProdutoApagando('')
      setAviso('Produto removido.')
      await carregar()
    } catch (e) {
      setErro(e.message)
    } finally {
      setProcessando('')
    }
  }

  const enviandoImagem = Object.values(envios).some(Boolean)

  return (
    <div className="painel">
      <main className="painel__conteudo painel__conteudo--largo">
        <div className="painel__cabecalho">
          <h1 className="painel__titulo">Cardápio</h1>
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
          <h2 className="painel__subtitulo">Categorias</h2>
          <p className="painel__ajuda">
            As categorias organizam o cardápio: Pizzas, Bebidas, Sobremesas… O cliente vê nessa
            ordem.
          </p>

          <form className="cardapio__linha-form" onSubmit={adicionarCategoria}>
            <label className="campo">
              <span>Nova categoria</span>
              <input
                value={nomeCategoria}
                onChange={(evento) => setNomeCategoria(evento.target.value)}
                placeholder="Ex: Pizzas"
                required
              />
            </label>

            <button className="botao" type="submit" disabled={processando === 'categoria'}>
              Adicionar
            </button>
          </form>

          {carregando && <p className="painel__aviso">Carregando…</p>}

          {!carregando && categorias.length === 0 && (
            <p className="painel__aviso">Nenhuma categoria ainda. Crie a primeira acima.</p>
          )}

          {categorias.length > 0 && (
            <ul className="painel__lista">
              {categorias.map((categoria) => {
                const quantidade = produtos.filter(
                  (produto) => produto.categoriaId === categoria._id,
                ).length

                return (
                  <li key={categoria._id} className="painel__item">
                    {categoriaEditando?.id === categoria._id ? (
                      <form className="cardapio__edicao" onSubmit={salvarNomeCategoria}>
                        <input
                          value={categoriaEditando.nome}
                          onChange={(evento) =>
                            setCategoriaEditando({
                              ...categoriaEditando,
                              nome: evento.target.value,
                            })
                          }
                          autoFocus
                          required
                        />
                        <button
                          className="botao"
                          type="submit"
                          disabled={processando === `categoria:${categoria._id}`}
                        >
                          Salvar
                        </button>
                        <button
                          className="botao botao--secundario"
                          type="button"
                          onClick={() => setCategoriaEditando(null)}
                        >
                          Cancelar
                        </button>
                      </form>
                    ) : (
                      <>
                        <strong>{categoria.nome}</strong>

                        <div className="painel__acoes-linha">
                          <span className="painel__item-detalhe">
                            {quantidade} produto{quantidade === 1 ? '' : 's'}
                          </span>

                          <button
                            className="botao botao--secundario"
                            type="button"
                            onClick={() =>
                              setCategoriaEditando({ id: categoria._id, nome: categoria.nome })
                            }
                          >
                            Renomear
                          </button>

                          {categoriaApagando === categoria._id ? (
                            <>
                              <span className="painel__confirmar">Apagar?</span>
                              <button
                                className="botao botao--perigo"
                                type="button"
                                onClick={() => apagarCategoria(categoria._id)}
                                disabled={processando === `categoria:${categoria._id}`}
                              >
                                Sim
                              </button>
                              <button
                                className="botao botao--secundario"
                                type="button"
                                onClick={() => setCategoriaApagando('')}
                              >
                                Não
                              </button>
                            </>
                          ) : (
                            <button
                              className="botao botao--secundario"
                              type="button"
                              onClick={() => setCategoriaApagando(categoria._id)}
                            >
                              Apagar
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="painel__secao">
          <h2 className="painel__subtitulo">
            {produtoEditandoId ? 'Editar produto' : 'Novo produto'}
          </h2>
          <p className="painel__ajuda">
            Digite o preço em reais. O sistema guarda em centavos para não ter erro de
            arredondamento nas somas do pedido.
          </p>

          <form className="painel__formulario" onSubmit={salvarProduto}>
            <CampoImagem
              className="campo--largo"
              rotulo="Foto do produto"
              ajuda="É o que o cliente vê no cardápio. Foto quadrada, com o prato centralizado, funciona melhor."
              tipo="produto"
              formato="quadrada"
              valor={formulario.imagem}
              onMudar={(url) => setFormulario((atual) => ({ ...atual, imagem: url }))}
              aoEnviando={(ativo) => setEnvios((atual) => ({ ...atual, produto: ativo }))}
              desabilitado={processando === 'produto'}
            />

            <label className="campo">
              <span>Categoria</span>
              <select value={formulario.categoriaId} onChange={alterar('categoriaId')} required>
                <option value="">Selecione…</option>
                {categorias.map((categoria) => (
                  <option key={categoria._id} value={categoria._id}>
                    {categoria.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="campo">
              <span>Nome do produto</span>
              <input
                value={formulario.nome}
                onChange={alterar('nome')}
                placeholder="Ex: Pizza Calabresa"
                required
              />
            </label>

            <label className="campo">
              <span>Preço (R$)</span>
              <input
                value={formulario.preco}
                onChange={alterar('preco')}
                placeholder="45,90"
                inputMode="decimal"
                required
              />
            </label>

            <label className="campo">
              <span>Descrição</span>
              <input
                value={formulario.descricao}
                onChange={alterar('descricao')}
                placeholder="Ingredientes, tamanho…"
              />
            </label>

            <label className="cardapio__checkbox campo--largo">
              <input
                type="checkbox"
                checked={formulario.disponivel}
                onChange={(evento) =>
                  setFormulario({ ...formulario, disponivel: evento.target.checked })
                }
              />
              Disponível no cardápio
            </label>

            <div className="painel__acoes">
              {produtoEditandoId && (
                <button className="botao botao--secundario" type="button" onClick={cancelarEdicao}>
                  Cancelar edição
                </button>
              )}

              <button
                className="botao"
                type="submit"
                disabled={processando === 'produto' || enviandoImagem}
              >
                {enviandoImagem
                  ? 'Enviando a foto…'
                  : processando === 'produto'
                    ? 'Salvando…'
                    : produtoEditandoId
                      ? 'Salvar alterações'
                      : 'Adicionar produto'}
              </button>
            </div>
          </form>
        </section>

        <section className="painel__secao">
          <h2 className="painel__subtitulo">Produtos</h2>

          {!carregando && produtos.length === 0 && (
            <p className="painel__aviso">Nenhum produto cadastrado ainda.</p>
          )}

          {categorias.map((categoria) => {
            const itens = produtos.filter((produto) => produto.categoriaId === categoria._id)

            return (
              <div key={categoria._id} className="cardapio__grupo">
                <h3 className="cardapio__grupo-titulo">{categoria.nome}</h3>

                {itens.length === 0 && (
                  <p className="painel__aviso">Nenhum produto nesta categoria.</p>
                )}

                {itens.length > 0 && (
                  <ul className="painel__lista">
                    {itens.map((produto) => (
                      <li key={produto._id} className="painel__item">
                        <div className="cardapio__item">
                          <span className="cardapio__miniatura">
                            {produto.imagem ? (
                              <img src={produto.imagem} alt="" loading="lazy" />
                            ) : (
                              produto.nome.charAt(0).toUpperCase()
                            )}
                          </span>

                          <div className="painel__item-texto">
                            <strong>{produto.nome}</strong>
                            {produto.descricao && (
                              <span className="painel__item-detalhe">{produto.descricao}</span>
                            )}
                          </div>
                        </div>

                        <div className="painel__acoes-linha">
                          <span className="painel__valor">{formatarDinheiro(produto.preco)}</span>

                          <span
                            className={`etiqueta ${
                              produto.disponivel ? 'etiqueta--ok' : 'etiqueta--neutro'
                            }`}
                          >
                            {produto.disponivel ? 'disponível' : 'pausado'}
                          </span>

                          <button
                            className="botao botao--secundario"
                            type="button"
                            onClick={() => editarProduto(produto)}
                          >
                            Editar
                          </button>

                          <button
                            className="botao botao--secundario"
                            type="button"
                            onClick={() => alternarDisponivel(produto)}
                            disabled={processando === `produto:${produto._id}`}
                          >
                            {produto.disponivel ? 'Pausar' : 'Ativar'}
                          </button>

                          {produtoApagando === produto._id ? (
                            <>
                              <span className="painel__confirmar">Apagar?</span>
                              <button
                                className="botao botao--perigo"
                                type="button"
                                onClick={() => apagarProduto(produto._id)}
                                disabled={processando === `produto:${produto._id}`}
                              >
                                Sim
                              </button>
                              <button
                                className="botao botao--secundario"
                                type="button"
                                onClick={() => setProdutoApagando('')}
                              >
                                Não
                              </button>
                            </>
                          ) : (
                            <button
                              className="botao botao--secundario"
                              type="button"
                              onClick={() => setProdutoApagando(produto._id)}
                            >
                              Apagar
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </section>
      </main>
    </div>
  )
}
