/*
 * Ícones das redes do rodapé.
 *
 * São de linha, não a marca colorida: o rótulo ao lado já diz o nome da rede, e
 * ícone chapado de marca puxaria o olho para longe do endereço e do horário —
 * que é o que o cliente procura no pé do cardápio.
 */

function Desenho({ children, tamanho = 16 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamanho}
      height={tamanho}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function IconeRede({ tipo, tamanho = 16 }) {
  if (tipo === 'instagram') {
    return (
      <Desenho tamanho={tamanho}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
      </Desenho>
    )
  }

  if (tipo === 'facebook') {
    return (
      <Desenho tamanho={tamanho}>
        <circle cx="12" cy="12" r="9" />
        <path d="M14.6 7.8h-1.8a2 2 0 0 0-2 2V20" />
        <path d="M9.4 12.4h4.4" />
      </Desenho>
    )
  }

  if (tipo === 'tiktok') {
    return (
      <Desenho tamanho={tamanho}>
        <path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5" />
        <path d="M14 4c.4 2.3 2 3.9 4.3 4.2" />
      </Desenho>
    )
  }

  if (tipo === 'youtube') {
    return (
      <Desenho tamanho={tamanho}>
        <rect x="3" y="6" width="18" height="12" rx="4" />
        <path d="M11 9.6 15 12l-4 2.4z" />
      </Desenho>
    )
  }

  if (tipo === 'whatsapp') {
    return (
      <Desenho tamanho={tamanho}>
        <path d="M20 12a8 8 0 0 1-11.7 7.1L4 20.4l1.4-4.2A8 8 0 1 1 20 12z" />
        <path d="M9.3 8.3c.3-.3.7-.3 1 0l1 1c.3.3.3.7 0 1l-.6.6c.5 1.1 1.4 2 2.5 2.5l.6-.6c.3-.3.7-.3 1 0l1 1c.3.3.3.7 0 1l-.7.7c-.4.4-1 .6-1.6.4-2.7-.8-4.9-3-5.7-5.7-.2-.6 0-1.2.5-1.6z" />
      </Desenho>
    )
  }

  if (tipo === 'site') {
    return (
      <Desenho tamanho={tamanho}>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
      </Desenho>
    )
  }

  // "outro": link genérico, porque nem todo endereço é de rede social.
  return (
    <Desenho tamanho={tamanho}>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.7 1.7" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.7-1.7" />
    </Desenho>
  )
}
