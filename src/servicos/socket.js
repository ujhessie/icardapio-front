import { io } from 'socket.io-client'

// Em desenvolvimento o front fala com o próprio Vite, que repassa /socket.io
// para a API. Em produção, se VITE_URL_API for absoluta, aponta direto.
const URL_API = import.meta.env.VITE_URL_API

const ENDERECO = URL_API && /^https?:/.test(URL_API)
  ? URL_API.replace(/\/api\/?$/, '')
  : undefined

/**
 * Abre o canal e entra na sala assim que conectar.
 * O "connect" também dispara na reconexão: sem isso, uma queda de rede deixaria
 * a tela aberta e muda para sempre.
 */
function abrirCanal(entrarNaSala) {
  const socket = io(ENDERECO, { transports: ['websocket', 'polling'] })

  socket.on('connect', () => entrarNaSala(socket))

  return socket
}

/**
 * Canal do painel: entra na sala da própria loja.
 * Quem valida o token é o servidor: sem token válido, a conexão não entra em
 * sala nenhuma e não recebe pedido de outra loja.
 */
export function abrirCanalDaLoja(token) {
  return abrirCanal((socket) => socket.emit('entrar:loja', token))
}

/**
 * Canal do cliente: entra na sala de um pedido só, pelo id.
 * Não tem login — o id do pedido é o segredo, igual ao link de acompanhamento.
 */
export function abrirCanalDoPedido(pedidoId) {
  return abrirCanal((socket) => socket.emit('entrar:pedido', pedidoId))
}
