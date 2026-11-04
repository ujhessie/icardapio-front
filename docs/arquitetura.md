# Arquitetura

## Visão geral

Dois repositórios independentes que conversam por HTTP:

```
DESENVOLVIMENTO (sua máquina)
Navegador
├── http://localhost:5173  ──►  React (Vite)      icardapio-front
│                                  │  fetch /api/...  (proxy do Vite)
│                                  ▼
└── http://localhost:4000  ──►  Express + Socket.io   icardapio-api
                                   │
                                   ▼
                              MongoDB Atlas

PRODUÇÃO (Vercel)
icardapio.vercel.app  ──►  site estático (build do Vite)
        │  fetch direto, com CORS liberado por URL_FRONT
        ▼
icardapio-api.vercel.app  ──►  função serverless (api/index.js)
        │
        ▼
MongoDB Atlas
```

Em desenvolvimento o Vite faz **proxy** de `/api` para a porta 4000
(`icardapio-front/vite.config.js`). Assim o front chama caminhos relativos e não
precisa se preocupar com CORS. Em produção o front aponta direto para a API
(`VITE_URL_API`) e a API libera a origem do site (`URL_FRONT`).

## Camadas do back

```
server.js  → cria o servidor HTTP, pluga o Socket.io e chama o app
app.js     → middlewares (cors, json) + monta as rotas + tratador de erro
modules/   → cada assunto tem routes.js, controller.js e service.js
models/    → schemas do Mongoose
lib/       → utilitários pequenos (ApiError, asyncHandler, socket)
```

**Fluxo de uma requisição**

1. `routes.js` recebe a rota, aplica os middlewares de permissão.
2. `controller.js` lê `req` (body, params, query, `req.usuario`) e responde.
3. `service.js` tem a regra de negócio e fala com o banco.
4. Erro em qualquer ponto → `asyncHandler` captura → `tratarErro` devolve
   `{ erro: "mensagem" }` com o status certo.

**Regra:** controller não fala com model direto. Toda regra vive no service.

## Autenticação

- Login em `POST /api/auth/login` devolve um JWT com `{ id, papel, lojaId }`.
- O front guarda o token e envia em `Authorization: Bearer <token>`.
- `autenticar` valida o token e preenche `req.usuario`.
- `exigirSuperadmin` bloqueia quem não é superadmin.
- `exigirLoja` bloqueia quem não tem `lojaId` (superadmin) nas rotas da loja.
- O `lojaId` usado nas consultas **vem sempre do token**, nunca do corpo da requisição.

## Atualização da tela (sem F5)

Há dois caminhos no projeto, e quem manda é onde ele roda:

- **Servidor de verdade** (`src/server.js`, no seu PC ou numa VPS): o back sobe o Socket.io
  e emite `pedido:novo`, `pedido:atualizado` e `pedido:status` para as salas
  `loja:<lojaId>` e `pedido:<pedidoId>`. Os eventos saem **do service**, depois de salvar
  no banco — nunca do controller.
- **Serverless (Vercel)**: não existe conexão aberta, então o front usa **polling**
  (`src/servicos/tempoReal.js`): consulta a API a cada 3s no acompanhamento do cliente,
  15s quando o pedido já terminou e 5s no painel. Pausa com a aba escondida e só avisa
  quando a leitura muda.

Hoje o front usa **só polling** — é o que funciona nas duas hospedagens e não perde aviso
quando há várias instâncias atendendo. O código do Socket.io continua no back, pronto para
quando fizer sentido.

## Segurança

- Senhas com `bcryptjs` (nunca em texto puro).
- `.env` fora do git; `.env.example` só com o modelo.
- Rotas públicas (`/api/publico/:slug`) não exigem token, mas só enxergam uma loja.
- CORS liberado apenas para `URL_FRONT` em produção.
