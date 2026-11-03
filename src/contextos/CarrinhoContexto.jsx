import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const Contexto = createContext(null)
const PREFIXO = 'sistema-delivery:carrinho:'

// O carrinho é por loja: trocar de slug não mistura pedidos.
function lerCarrinho(slug) {
  try {
    const salvo = JSON.parse(localStorage.getItem(PREFIXO + slug) || '[]')

    if (!Array.isArray(salvo)) return []

    return salvo.filter(
      (item) =>
        item &&
        typeof item.linhaId === 'string' &&
        typeof item.produtoId === 'string' &&
        typeof item.nome === 'string' &&
        Number.isInteger(item.preco) &&
        Number.isInteger(item.quantidade) &&
        item.quantidade > 0,
    )
  } catch {
    return []
  }
}

export function CarrinhoProvider({ slug, children }) {
  const [itens, setItens] = useState(() => lerCarrinho(slug))

  useEffect(() => {
    localStorage.setItem(PREFIXO + slug, JSON.stringify(itens))
  }, [slug, itens])

  function adicionar(produto) {
    setItens((atuais) => {
      const existente = atuais.find(
        (item) => item.produtoId === produto._id && item.observacao === '',
      )

      if (existente) {
        return atuais.map((item) =>
          item.linhaId === existente.linhaId
            ? { ...item, quantidade: Math.min(99, item.quantidade + 1) }
            : item,
        )
      }

      return [
        ...atuais,
        {
          linhaId: `${produto._id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          produtoId: produto._id,
          nome: produto.nome,
          preco: produto.preco,
          imagem: produto.imagem || '',
          quantidade: 1,
          observacao: '',
        },
      ]
    })
  }

  // "Repetir pedido": entra com quantidade e observação de uma vez, sem passar
  // pelo +1. O preço é o de agora, não o da compra antiga.
  function adicionarVarios(novos) {
    setItens((atuais) => {
      const resultado = atuais.map((item) => ({ ...item }))

      for (const novo of novos) {
        const observacao = novo.observacao || ''
        const existente = resultado.find(
          (item) => item.produtoId === novo.produto._id && item.observacao === observacao,
        )

        if (existente) {
          existente.quantidade = Math.min(99, existente.quantidade + novo.quantidade)
          continue
        }

        resultado.push({
          linhaId: `${novo.produto._id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          produtoId: novo.produto._id,
          nome: novo.produto.nome,
          preco: novo.produto.preco,
          imagem: novo.produto.imagem || '',
          quantidade: Math.min(99, novo.quantidade),
          observacao,
        })
      }

      return resultado
    })
  }

  function alterarQuantidade(linhaId, quantidade) {
    setItens((atuais) =>
      atuais
        .map((item) =>
          item.linhaId === linhaId
            ? { ...item, quantidade: Math.max(0, Math.min(99, Number(quantidade) || 0)) }
            : item,
        )
        .filter((item) => item.quantidade > 0),
    )
  }

  function alterarObservacao(linhaId, observacao) {
    setItens((atuais) =>
      atuais.map((item) => (item.linhaId === linhaId ? { ...item, observacao } : item)),
    )
  }

  function remover(linhaId) {
    setItens((atuais) => atuais.filter((item) => item.linhaId !== linhaId))
  }

  function limpar() {
    setItens([])
  }

  const quantidadeTotal = useMemo(
    () => itens.reduce((soma, item) => soma + item.quantidade, 0),
    [itens],
  )

  const subtotal = useMemo(
    () => itens.reduce((soma, item) => soma + item.preco * item.quantidade, 0),
    [itens],
  )

  return (
    <Contexto.Provider
      value={{
        itens,
        adicionar,
        adicionarVarios,
        alterarQuantidade,
        alterarObservacao,
        remover,
        limpar,
        quantidadeTotal,
        subtotal,
      }}
    >
      {children}
    </Contexto.Provider>
  )
}

export function useCarrinho() {
  const contexto = useContext(Contexto)

  if (!contexto) {
    throw new Error('useCarrinho precisa estar dentro de <CarrinhoProvider>')
  }

  return contexto
}
