# iCardápio — Site

Site e painel do **iCardápio**: cardápio digital e gestão de pedidos para restaurantes.
React + Vite, CSS puro.

- Site: https://icardapio.vercel.app
- API: https://icardapio-api.vercel.app/api

## Rodando na sua máquina

```bash
npm install
npm run dev                # http://localhost:5173
```

Em desenvolvimento o Vite repassa `/api` para `http://localhost:4000` (proxy), então
**não precisa de `VITE_URL_API`**. A API roda separada, no repositório `icardapio-api`.

## Deploy

Push no `main` → a Vercel faz o deploy sozinho.

Variável necessária na Vercel:

```
VITE_URL_API = https://icardapio-api.vercel.app/api
```

> O Vite **grava** essa variável no build. Trocou a URL da API? Precisa de um novo deploy.

## Estrutura rápida

- `src/paginas/publico/` — cardápio, checkout, acompanhamento, cadastro
- `src/paginas/admin/` — painel do lojista
- `src/servicos/` — chamadas da API (`api.js`, `tempoReal.js`)
- `src/componentes/` — comuns, público e admin

## Documentação

- [Arquitetura](docs/arquitetura.md)
- [Modelo de dados](docs/modelo-de-dados.md)
- [Rotas da API](docs/rotas-api.md)
- [Decisões](docs/decisoes.md)
- [Guia do projeto](AGENTS.md)
