import { requisitar } from './api.js'

/*
 * Envio de imagem para o Cloudinary.
 *
 * A API devolve apenas uma assinatura (nada de secret no navegador) e o arquivo
 * vai daqui direto para o Cloudinary, com barra de progresso. O que volta para
 * o resto do app é só a URL final.
 */

export const LIMITE_MB = 5
export const LIMITE_BYTES = LIMITE_MB * 1024 * 1024

const FORMATOS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

// Erro de formato resolvido antes de gastar rede: o seletor de arquivo já
// filtra, mas arrastar e soltar ou trocar a extensão passa por aqui.
function conferirArquivo(arquivo) {
  if (!arquivo) {
    throw new Error('Nenhum arquivo escolhido.')
  }

  if (!FORMATOS.includes(arquivo.type)) {
    throw new Error('Formato não aceito. Use JPG, PNG, WebP ou AVIF.')
  }

  if (arquivo.size > LIMITE_BYTES) {
    const tamanho = (arquivo.size / 1024 / 1024).toFixed(1).replace('.', ',')
    throw new Error(`Imagem de ${tamanho} MB. O limite é ${LIMITE_MB} MB.`)
  }
}

function enviarComProgresso(url, corpo, aoProgredir) {
  return new Promise((resolve, reject) => {
    const pedido = new XMLHttpRequest()

    pedido.open('POST', url)

    pedido.upload.addEventListener('progress', (evento) => {
      if (!evento.lengthComputable || !aoProgredir) return
      aoProgredir(Math.min(99, Math.round((evento.loaded / evento.total) * 100)))
    })

    pedido.addEventListener('load', () => {
      let resposta = null

      try {
        resposta = JSON.parse(pedido.responseText)
      } catch {
        resposta = null
      }

      if (pedido.status >= 200 && pedido.status < 300 && resposta?.secure_url) {
        aoProgredir?.(100)
        resolve(resposta)
        return
      }

      reject(
        new Error(
          resposta?.error?.message ||
            'O Cloudinary recusou a imagem. Tente outro arquivo.',
        ),
      )
    })

    pedido.addEventListener('error', () =>
      reject(new Error('Não foi possível enviar a imagem. Verifique a conexão.')),
    )

    pedido.addEventListener('abort', () => reject(new Error('Envio cancelado.')))

    pedido.send(corpo)
  })
}

/**
 * Envia uma imagem e devolve `{ url, largura, altura }`.
 * `tipo` decide a pasta e o tratamento (produto, logo, capa) — quem escolhe é
 * a API, não o navegador.
 */
export async function enviarImagem(arquivo, { tipo, aoProgredir } = {}) {
  conferirArquivo(arquivo)

  const assinatura = await requisitar('/uploads/assinatura', {
    method: 'POST',
    corpo: { tipo },
  })

  const corpo = new FormData()
  corpo.append('file', arquivo)
  corpo.append('api_key', assinatura.apiKey)
  corpo.append('timestamp', String(assinatura.timestamp))
  corpo.append('folder', assinatura.folder)
  corpo.append('transformation', assinatura.transformation)
  corpo.append('signature', assinatura.signature)

  aoProgredir?.(0)

  const resposta = await enviarComProgresso(assinatura.enviarPara, corpo, aoProgredir)

  return {
    url: resposta.secure_url,
    largura: resposta.width,
    altura: resposta.height,
  }
}
