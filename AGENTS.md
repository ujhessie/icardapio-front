# Sistema Delivery — Guia do Projeto

Sistema de **cardápio digital + gestão de pedidos** para restaurantes, no modelo **multi-loja (SaaS)**.
Referência de mercado: Instadelivery — mas com menos recursos e mais rápido.

**Projeto no ar:** `https://icardapio.vercel.app` (site) e `https://icardapio-api.vercel.app/api` (API).

> O sistema são **dois repositórios** separados: `icardapio-api` (Express + Mongo) e
> `icardapio-front` (React + Vite). Este guia é o mesmo nos dois — ele descreve o sistema
> inteiro, não só metade dele.

**Fase atual (03/11/2026): layout e fluxo primeiro, parte pesada depois.**
O Jesse quer ver as telas e o caminho do usuário antes de gravar tudo no banco.
A regra vale até ele dizer "vira a chave". O que já é real continua real; o que
está marcado como protótipo não finge que funciona. **Pedidos e Horários já
viraram reais** — não sobrou nenhuma tela de protótipo.

> Este arquivo é o **contrato** do projeto. Se algo aqui conflitar com o que você lembra,
> vale o que está escrito aqui. Mudou uma decisão? Atualize este arquivo na mesma tarefa.

---

## 1. Fase atual — o que é real e o que é protótipo

| Área | Estado |
|---|---|
| Login, cadastro, superadmin e CRUD de lojas | real (API + banco) |
| Cardápio (categorias e produtos) | real (API + banco) |
| Bairros, taxa e tempo de entrega | real (API + banco) |
| Cardápio público, carrinho, checkout e acompanhamento | real (API + atualização por polling) |
| Pedidos no painel (quadro/kanban) | real (API + atualização por polling) |
| Horário de funcionamento (grade + datas especiais + interruptor) | real (API + banco) |
| Histórico do cliente ("Meus pedidos") | real (API + ids no `localStorage`) |

Regras da fase:

1. Protótipo vive na memória da página, leva a etiqueta "protótipo" na tela e não
   cria endpoint, model nem campo no banco. **Hoje não existe nenhuma tela de
   protótipo** — se criar uma, siga esta regra e apague ao virar real.
2. Transformar protótipo em real só com o Jesse mandando. Aí sim: model, rota,
   serviço, tela e doc, na mesma tarefa.
3. Toda tela segue o design system existente (`estilos/variaveis.css`): CSS puro,
   `system-ui`, destaque `#e85d04`, raio 10px, cards brancos com borda.
4. Toda tela tem URL, estado vazio, hover, foco visível e texto em português.

---

## 2. Stack

| Camada | Tecnologia |
|---|---|
| Front | React 18 + Vite (JSX, **JavaScript puro**) |
| Rotas do front | React Router |
| Estilo | **CSS puro** (arquivos `.css` por escopo) |
| Back | Node.js + Express |
| Banco | MongoDB Atlas + Mongoose |
| Tempo real | polling (3s no pedido, 5s no painel) |
| Autenticação | JWT + bcryptjs |
| Imagens (futuro) | Cloudinary |
| Deploy | Vercel (front estático + API serverless) + MongoDB Atlas |

Ambiente: Node 24, npm 11, Windows. Back em ESM (`"type": "module"`).

---

## 3. Como rodar

Cada projeto é independente e roda em um terminal.

```bash
# uma vez em cada pasta
npm install

# terminal 1 — API (http://localhost:4000/api)
cd "D:\Projetos Dev\icardapio-api"
npm run dev

# terminal 2 — front (http://localhost:5173)
cd "D:\Projetos Dev\icardapio-front"
npm run dev
```

| O quê | Endereço |
|---|---|
| Front | http://localhost:5173 |
| API | http://localhost:4000/api |
| Saúde da API | http://localhost:4000/api/saude |

Em desenvolvimento o front chama `/api` e o Vite repassa pra porta 4000 (proxy), então
**não precisa de `VITE_URL_API` na sua máquina**. Em produção o front aponta direto pra API
da Vercel, e quem libera isso é a variável `URL_FRONT` do lado da API (CORS).

Banco: credenciais em `icardapio-api/.env` (nunca versionado).
Superadmin: `npm run criar-superadmin` dentro de `icardapio-api`.

> **Atenção no PowerShell desta máquina:** o `npm` é bloqueado por execution policy.
> Use `cmd /c "npm run dev"`, `& npm.cmd run dev` ou abra o terminal no CMD.

---

## 4. Estrutura de pastas

Dois repositórios, duas pastas locais.

```
icardapio-api/                 ← repositório da API (Express + Mongo)
├── AGENTS.md                  ← este guia
├── README.md
├── vercel.json                ← rewrite e região da Vercel
├── api/index.js               ← porta de entrada da Vercel (serverless)
└── src/
    ├── server.js              ← HTTP + Socket.io + Express (só no seu PC)
    ├── app.js                 ← middlewares e montagem das rotas
    ├── config/                ← env.js, db.js (conexão com cache), constantes.js
    ├── models/                ← um arquivo por coleção
    ├── modules/               ← uma pasta por assunto (routes/controller/service)
    ├── middlewares/           ← autenticar, exigirSuperadmin, tratarErro
    ├── lib/                   ← socket.js, ApiError.js, asyncHandler.js, horario.js
    └── scripts/               ← criar-superadmin.js, seed.js
```

```
icardapio-front/               ← repositório do site (React + Vite)
├── AGENTS.md                  ← este guia (o mesmo dos dois)
├── README.md
├── vercel.json                ← rewrite de SPA (senão F5 em rota interna dá 404)
├── index.html
└── src/
    ├── main.jsx, App.jsx
    ├── estilos/               ← variaveis.css, global.css
    ├── rotas/                 ← rotas.jsx, RotaProtegida.jsx, RotaDaLoja.jsx
    ├── paginas/
    │   ├── publico/           ← cardápio, checkout, acompanhar, cadastro
    │   └── admin/             ← login, painel, pedidos, cardápio, horários, delivery
    ├── componentes/           ← comuns/, publico/, admin/
    ├── servicos/              ← api.js, tempoReal.js + um por recurso
    ├── contextos/             ← Auth, Carrinho, Loja
    ├── hooks/
    └── utils/
```

**Onde cada arquivo novo vai:**

| Estou criando... | Vai em |
|---|---|
| Rota nova da API | `back/src/modules/<assunto>/routes.js` |
| Regra de negócio | `service.js` do módulo — **nunca** no controller |
| Campo novo no banco | `back/src/models/` **e** `docs/modelo-de-dados.md` |
| Tela nova | `front/src/paginas/<publico ou admin>/` |
| Peça reutilizável | `front/src/componentes/` |
| Chamada de API | `front/src/servicos/` |
| Estado compartilhado | `front/src/contextos/` |
| Decisão de arquitetura | `docs/decisoes.md` + seção 9 daqui |

**Regra das pastas:** só crie pasta quando ela tiver **3 arquivos ou mais**.
Camada abstrata ("repositories", "entities", "helpers genéricos") só atrapalha.

---

## 5. Padrões de código

- **JavaScript puro.** Sem TypeScript, sem `any`, sem JSDoc gigante.
- `import`/`export` (ESM) em todos os arquivos.
- **Nomes em português**: variáveis, funções, arquivos, rotas, campos do banco.
- Componentes e models em `PascalCase` (`CardapioLoja.jsx`, `Pedido.js`).
- Funções e variáveis em `camelCase` (`buscarPedidos`, `taxaEntrega`).
- Constantes globais em `MAIUSCULAS_COM_UNDERLINE` (`STATUS_PEDIDO`).
- `async/await` sempre — nunca `.then()`.
- Erros do back: `throw new ApiError(404, 'Pedido não encontrado')` + `asyncHandler`.
- CSS: classes em `kebab-case`, cores e espaçamentos em variáveis no `:root`.
- Comentário só quando explica **por quê** — não repita o que o código já diz.

---

## 6. Modelo de dados (resumo)

Detalhes completos em [`docs/modelo-de-dados.md`](docs/modelo-de-dados.md).

| Coleção | Campos principais |
|---|---|
| **Loja** | nome, slug, telefone, logo, cor, aberta, `situacao` (`pendente` \| `ativa` \| `suspensa`) |
| **Usuario** | nome, email, senhaHash, papel (`superadmin` \| `dono` \| `atendente`), lojaId |
| **Categoria** | lojaId, nome, ordem, ativa |
| **Produto** | lojaId, categoriaId, nome, descricao, preco, imagem, disponivel, ordem |
| **Bairro** | lojaId, nome, taxaEntrega, tempoEstimado, ativo |
| **Pedido** | lojaId, numero, cliente, tipo, endereco, bairroId, taxaEntrega, itens[], totais, status, pagamento |

Status do pedido: `novo → aceito → preparando → pronto → saiu_entrega → entregue`
(e `cancelado` a qualquer momento antes de entregue).

---

## 7. Rotas da API (resumo)

Detalhes em [`docs/rotas-api.md`](docs/rotas-api.md). Todas começam com `/api`.

- `GET /api/saude` — status da API e do banco
- `POST /api/auth/login` — login do lojista
- `GET /api/auth/eu` — dados do usuário logado
- `POST /api/cadastro` — cadastro público (loja nasce `pendente`)
- `/api/lojas` — CRUD de lojas (superadmin)
- `/api/minha-loja` — dados da própria loja (dono/atendente)
- `/api/super/resumo` — panorama do superadmin
- `/api/cardapio` — categorias e produtos (dono/atendente)
- `/api/bairros` — bairros e taxas (dono/atendente)
- `/api/pedidos` — pedidos do painel (dono/atendente): `GET /` (filtros `status`, `hoje=1`, `arquivados=1`), `GET /resumo`, `GET /:id`, `PATCH /:id/status`, `PATCH /:id/arquivar`, `DELETE /:id`
- `/api/publico/:slug` — cardápio, criação e acompanhamento de pedido **sem login**

---

## 8. Regras de negócio que não podem ser quebradas

1. **`lojaId` sempre.** Toda consulta ao banco filtra por `lojaId`, exceto superadmin.
2. **`lojaId` nunca vem do body.** Ele vem do token JWT. Body com `lojaId` é ignorado.
3. **Preço congelado.** O item do pedido guarda `nome` e `precoUnitario` do momento da compra.
4. **Taxa de entrega vem do bairro**, calculada no back. O front nunca envia o valor da taxa.
5. **Status só avança** na ordem definida. `cancelado` não volta atrás.
6. **Slug da loja é único** e não muda depois de criado (é a URL pública do cliente).
7. **Número do pedido é sequencial por loja**, não global.
8. **Nenhuma senha em texto puro.** Sempre `bcryptjs`.
9. **Pedido só é criado se a loja estiver `aberta` e `ativa`.**
10. **Loja `pendente` ou `suspensa` não aparece no público** e não aceita pedido.
11. **`situacao` é do superadmin, `aberta` é do dono.** Nenhum dos dois mexe no outro.
12. **Cadastro público sempre nasce `pendente`** — não existe caminho que pule a aprovação.
13. **Preço e taxa em centavos no banco.** O front converte reais ↔ centavos; o back valida inteiro.
14. **Arquivar não apaga.** O pedido sai do quadro mas continua no banco e nos
    relatórios. Só pedido `entregue` ou `cancelado` pode ser arquivado — pedido em
    andamento não pode sumir da fila.
15. **Remover apaga de verdade e só vale para `cancelado`.** É faxina, não rotina:
    apagar pedido entregue furaria o faturamento.
16. **Pedido novo chega ao painel por polling** (`servicos/tempoReal.js`): a tela consulta a
    cada 5s e recarrega quando algo muda. A Vercel não mantém conexão aberta, e o polling
    sempre lê a verdade do banco — funciona mesmo com várias instâncias ao mesmo tempo.
17. **O cliente acompanha o pedido pelo mesmo canal**, consultando a cada 3s (15s quando o
    pedido já terminou), sem login — o id do pedido é o segredo, igual ao link.
    O que vai para o cliente é sempre `pedidoPublico()`, nunca o documento cru.

---

## 9. Decisões tomadas

Histórico completo em [`docs/decisoes.md`](docs/decisoes.md).

| Data | Decisão |
|---|---|
| 02/11/2026 | Front e back separados: Vite + React e Express (didático, sem CORS escondido) |
| 02/11/2026 | Multi-loja desde o início, com `lojaId` em todas as coleções |
| 02/11/2026 | MongoDB Atlas grátis desde o desenvolvimento (mesmo banco do futuro deploy) |
| 02/11/2026 | Login com email + senha, JWT e papel `superadmin` |
| 02/11/2026 | Tempo real com Socket.io (kanban e acompanhamento do cliente) |
| 02/11/2026 | MVP = fluxo completo mínimo, sem relatórios, cupom ou pagamento online |
| 02/11/2026 | JavaScript puro e CSS puro — sem TypeScript e sem framework de CSS |
| 02/11/2026 | Cadastro público com aprovação: loja nasce `pendente` e o superadmin libera |
| 02/11/2026 | Rotas da loja usam `exigirLoja`; superadmin fica fora do cardápio e bairros |
| 02/11/2026 | Cardápio público em uma resposta só (`GET /api/publico/:slug`) |
| 02/11/2026 | Carrinho no `localStorage`, separado por slug; preço recalculado no back |
| 02/11/2026 | Acompanhamento do pedido por polling de 20s até o Socket.io da fase 4 |
| 03/11/2026 | **Layout e fluxo primeiro**: Pedidos e Horários viram protótipo visual antes da API |
| 03/11/2026 | Protótipo não cria endpoint nem model; o que é real continua real |
| 03/11/2026 | Pedidos saiu do protótipo: painel lê a API, atualiza por Socket.io e ganhou arquivar/remover |
| 03/11/2026 | Arquivar é o botão principal (reversível, preserva relatório); remover fica só para cancelado |
| 03/11/2026 | Acompanhamento do cliente virou tempo real (Socket.io); polling de 20s só como rede de segurança |
| 03/11/2026 | Horários virou real: grade da semana + datas especiais no model `Loja`, regra em `lib/horario.js` |
| 03/11/2026 | O interruptor `aberta` é a última palavra — grade vazia significa "vale só o interruptor" (protege lojas antigas) |
| 03/11/2026 | `statusDaLoja` é duplicado de propósito: o back decide e recusa pedido; o front só recalcula para exibir ao vivo |
| 03/11/2026 | Histórico do cliente sem login: só os ids ficam no `localStorage`; dados e status vêm sempre frescos da API |
| 03/11/2026 | "Repetir pedido" joga itens no carrinho com preço de hoje e avisa o que saiu do cardápio — nunca cria pedido direto |
| 03/11/2026 | Cardápio com capa da loja, modal do produto e categorias fixas; barra compacta só nas telas internas |
| 04/11/2026 | Checkout em página única com resumo fixo (desktop) e barra de envio fixa (celular); dados do cliente lembrados no aparelho |
| 04/11/2026 | Acompanhamento com status grande, WhatsApp com o nº do pedido e "pedir de novo" no fim |
| 04/11/2026 | Nome do produto: **iCardápio** (`icardapio.vercel.app`) |
| 04/11/2026 | Deploy na Vercel: API vira função serverless (`api/index.js`) e o tempo real sai do Socket.io para polling |

---

## 10. Checklist do projeto

### Feito
- [x] Fase 0 — estrutura, Atlas, `/api/saude`, front base, docs e git
- [x] Fase 1 — models `Loja`/`Usuario`, login JWT, superadmin, CRUD de lojas, tela de login e painel
- [x] Fase 1.5 — cadastro público com aprovação, painel do superadmin e URL personalizada da loja
- [x] Fase 2 — CRUD de cardápio e bairros com taxa, com telas `/admin/cardapio` e `/admin/delivery`
- [x] Fase 3 — loja pública: cardápio, carrinho, checkout e acompanhamento do pedido
- [x] Fase 3.5 — protótipo visual de `/admin/pedidos` (quadro) e `/admin/horarios` (semana + datas especiais)
- [x] Fase 4.0 — `/admin/pedidos` com dados reais: quadro, filtro Hoje/Todos, arquivar/desarquivar e apagar cancelado, tudo ao vivo pelo Socket.io
- [x] Fase 4.1 — acompanhamento do cliente em tempo real: Socket.io na sala do pedido, status muda na tela em ~200ms; polling de 20s só como rede de segurança
- [x] Fase 4.2 — `/admin/horarios` com dados reais: grade da semana, datas especiais e interruptor de emergência, com a mesma regra no cardápio e no bloqueio de pedido
- [x] Fase 4.3 — "Meus pedidos" do cliente: histórico neste aparelho, status fresco da API e "repetir pedido" jogando no carrinho
- [x] Fase 4.4 — cardápio público redesenhado: capa da loja, lista em 2 colunas, modal do produto e categorias fixas
- [x] Fase 4.5 — checkout em página única (resumo fixo/barra no celular) e acompanhamento redesenhado com WhatsApp e repetir
- [x] Fase 4.6 — adaptação para deploy: API serverless na Vercel (`api/index.js`), conexão do Mongo reaproveitada e tempo real por polling

### Em andamento
- (nada — próxima tela a definir com o Jesse)

### Próximos passos
- [ ] Fase 5 — seed de demonstração, README final e revisão
- [x] Commit do trabalho acumulado (Pedidos + acompanhamento ao vivo + Horários + Meus pedidos)

---

## 11. O que NÃO fazer

- ❌ TypeScript, Tailwind, styled-components, Bootstrap — CSS puro e pronto.
- ❌ Lib nova sem justificar (uma linha de "por quê" basta) e sem aprovação.
- ❌ Commitar `.env`, senhas, tokens ou strings de conexão.
- ❌ Criar camada de abstração antes de ter 3 usos reais dela.
- ❌ Deixar `console.log` de depuração no código final.
- ❌ Usar `alert()` no front — feedback vai na tela.
- ❌ Quebrar a regra do `lojaId` — é o que sustenta o multi-loja.
- ❌ Reescrever arquivo inteiro para mudar 3 linhas.
- ❌ Transformar protótipo em real sem o Jesse autorizar.

---

## 12. Como o agente deve trabalhar aqui

1. **Ler este arquivo e o doc da área** antes de mexer (`docs/modelo-de-dados.md` para banco,
   `docs/rotas-api.md` para API).
2. **Uma fase por vez.** Não adiantar trabalho da fase seguinte sem o Jesse pedir.
3. **Atualizar o checklist (seção 10)** ao terminar algo — é o que evita alucinação na próxima sessão.
4. **Registrar decisão nova** em `docs/decisoes.md` e na seção 9.
5. **Manter este arquivo abaixo de 200 linhas.** Detalhe vai para `docs/`.
6. **Avisar quando algo do plano não fizer mais sentido** — sugerir, não executar sozinho.

---

## 13. Glossário

- **Loja** — um restaurante dentro do sistema. Tem slug próprio e dados isolados.
- **Slug** — apelido da loja na URL (`/pizzaria-do-ze`).
- **Superadmin** — você. Cria lojas e enxerga tudo.
- **JWT** — token que prova que o usuário está logado. Vai no header `Authorization`.
- **Kanban** — colunas de pedidos que se movem entre status.
- **Polling** — o navegador pergunta de tempos em tempos se algo mudou. É o que substitui o
  Socket.io em produção: a Vercel não mantém conexão aberta entre acessos.
- **Serverless** — o código só roda quando chega uma requisição; não existe processo ligado
  esperando. É assim que a API funciona na Vercel.
