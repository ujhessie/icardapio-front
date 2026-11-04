# Rotas da API

Base: `http://localhost:4000/api`
Formato de erro em todas as rotas: `{ "erro": "mensagem" }`

**Legenda de acesso:** `público` · `logado` (qualquer usuário) · `loja` (dono/atendente) ·
`superadmin`

---

## Sistema — fase 0 ✅

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/saude` | público | Status da API e da conexão com o banco |

---

## Autenticação — fase 1 ✅

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/auth/login` | público | `{ email, senha }` → `{ token, usuario }` |
| GET | `/auth/eu` | logado | Dados do usuário do token |

---

## Lojas — fase 1 ✅

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/lojas` | superadmin | Lista todas (filtro `?situacao=pendente`) |
| POST | `/lojas` | superadmin | Cria loja **já ativa** + usuário dono |
| GET | `/lojas/:id` | superadmin | Detalhe de uma loja |
| PATCH | `/lojas/:id` | superadmin | Atualiza dados da loja |
| PATCH | `/lojas/:id/situacao` | superadmin | `{ situacao }` → aprova, suspende ou reativa |
| GET | `/minha-loja` | loja | Dados da própria loja |
| PATCH | `/minha-loja` | loja | Nome, telefone, logo, cor, `aberta` |

---

## Cadastro público — fase 1.5 ✅

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/cadastro` | público | Cria loja `pendente` + dono e devolve `{ token, usuario, loja }` |

O dono já sai logado. A loja só fica visível ao público depois da aprovação do superadmin.

---

## Painel do superadmin — fase 1.5 ✅

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/super/resumo` | superadmin | Contadores por situação (total, ativas, pendentes, suspensas) |

---

## Usuários da loja — pendente (fase 3+)

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/usuarios` | loja | Equipe da loja |
| POST | `/usuarios` | loja | Cria atendente |
| PATCH | `/usuarios/:id` | loja | Edita nome, papel, `ativo` |
| PATCH | `/usuarios/:id/senha` | logado | Troca a própria senha |

---

## Cardápio — fase 2 ✅

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/cardapio/categorias` | loja | Lista categorias |
| POST | `/cardapio/categorias` | loja | Cria categoria |
| PATCH | `/cardapio/categorias/:id` | loja | Edita nome, ordem, ativa |
| DELETE | `/cardapio/categorias/:id` | loja | Remove (bloqueia se tiver produtos) |
| GET | `/cardapio/produtos` | loja | Lista produtos (filtro `?categoriaId=`) |
| POST | `/cardapio/produtos` | loja | Cria produto |
| PATCH | `/cardapio/produtos/:id` | loja | Edita produto |
| DELETE | `/cardapio/produtos/:id` | loja | Remove produto |

`preco` vai em centavos. Categoria de outra loja → 404.

---

## Bairros e taxas — fase 2 ✅

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/bairros` | loja | Lista bairros e taxas |
| POST | `/bairros` | loja | Cria bairro |
| PATCH | `/bairros/:id` | loja | Edita nome, taxa, tempo, ativo |
| DELETE | `/bairros/:id` | loja | Remove bairro |

`taxaEntrega` vai em centavos (`0` = grátis). Nome duplicado na mesma loja → 409.
Todas as rotas de cardápio e bairros usam `exigirLoja`: superadmin recebe 403.

---

## Pedidos (painel) — fase 4

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/pedidos` | loja | Lista (filtros `?status=`, `?data=`) |
| GET | `/pedidos/:id` | loja | Detalhe |
| PATCH | `/pedidos/:id/status` | loja | Move no kanban `{ status }` |
| GET | `/pedidos/resumo` | loja | Contadores do dashboard |

---

## Loja pública — fase 3 ✅ (+ horários e histórico na fase 4)

Sem login. O `:slug` identifica a loja.

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/publico/:slug` | público | Loja + categorias + produtos disponíveis + bairros ativos + status de horário |
| GET | `/publico/:slug/pedidos?ids=a,b,c` | público | Histórico do cliente: devolve os pedidos daquele `ids` (máx. 50) |
| POST | `/publico/:slug/pedidos` | público | Cria pedido |
| GET | `/publico/:slug/pedidos/:id` | público | Acompanha o pedido pelo id |

**Status de horário no cardápio:** a resposta traz `aberta` (interruptor do dono),
`abertoAgora` (interruptor **e** grade) e `statusTexto` (o que o cliente lê), além de
`horarios` e `datasEspeciais`. O front recalcula com a mesma regra enquanto a página
está aberta; quem decide de verdade é o back.

**Corpo do POST de pedido:**

```json
{
  "cliente": { "nome": "Jesse", "telefone": "11999999999" },
  "tipo": "delivery",
  "endereco": { "rua": "...", "numero": "...", "complemento": "...", "referencia": "..." },
  "bairroId": "...",
  "itens": [{ "produtoId": "...", "quantidade": 2, "observacao": "sem cebola" }],
  "pagamento": "pix",
  "trocoPara": 0,
  "observacao": ""
}
```

**Regras aplicadas no back:**

- Loja precisa estar `ativa`; senão a rota responde 404 (não revela loja pendente/suspensa).
- Pedido só é criado com a loja recebendo: interruptor ligado **e** dentro do horário. Fora disso → 400 com o motivo já escrito (`"Fechado · abre amanhã às 18h"`).
- Histórico (`?ids=`): só id válido e pedido **da própria loja** entram na resposta. O id do pedido é o segredo (o mesmo do link de acompanhamento).
- Produto e bairro são buscados **na loja do slug** — id de outra loja → 400.
- `preco`, `taxaEntrega` e `total` enviados pelo front são **ignorados**: o back recalcula do banco.
- O pedido guarda cópia de `nome` e `precoUnitario` de cada item (preço congelado).
- `trocoPara` só vale no dinheiro e, se informado, precisa ser ≥ total.
- O acompanhamento (`GET .../pedidos/:id`) continua funcionando mesmo se a loja fechar ou for suspensa depois da compra.

---

## Eventos Socket.io

| Evento | Direção | Sala | Quando |
|---|---|---|---|
| `pedido:novo` | servidor → painel | `loja:<lojaId>` | pedido criado |
| `pedido:atualizado` | servidor → painel | `loja:<lojaId>` | status alterado |
| `pedido:status` | servidor → cliente | `pedido:<pedidoId>` | status alterado |
