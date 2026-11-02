export default function CampoUrl({ valor, aoMudar, obrigatorio = false }) {
  const limpo = valor.replace(/^-+|-+$/g, '')

  return (
    <label className="campo campo--largo">
      <span>URL da loja</span>

      <div className="campo__url">
        <span className="campo__url-prefixo">/</span>
        <input
          value={valor}
          onChange={aoMudar}
          placeholder="pizzaria-do-ze"
          minLength={3}
          maxLength={40}
          required={obrigatorio}
        />
      </div>

      <small className="campo__dica">Endereço público: /{limpo || '...'}</small>
    </label>
  )
}
