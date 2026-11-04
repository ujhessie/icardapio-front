# Modelo de dados

Banco: MongoDB (Atlas). ODM: Mongoose. Todas as coleções têm `criadoEm` e `atualizadoEm`
automáticos (`{ timestamps: true }`).

> **Preços e taxas são guardados em centavos** (`Number` inteiro). Ex.: R$ 25,90 = `2590`.
> Isso evita erro de arredondamento. O front formata para exibição.

---

## Loja

| Campo | Tipo | Regra |
|---|---|---|
| `nome` | String | obrigatório |
| `slug` | String | obrigatório, único, minúsculo, sem acento (`pizzaria-do-ze`) |
| `telefone` | String | usado no rodapé do cardápio |
| `endereco` | Objeto | `{ rua, numero, complemento, cidade, estado }` |
| `logo` | String | URL (Cloudinary no futuro) |
| `corPrimaria` | String | hex, padrão `#e85d04` |
| `aberta` | Boolean | o lojista liga/desliga o recebimento de pedidos (**interruptor de emergência: é a última palavra**) |
| `situacao` | String | `pendente` \| `ativa` \| `suspensa` — **só o superadmin altera** |
| `proximoNumero` | Number | contador sequencial de pedidos (inicia em 1) |
| `horarios` | Array | grade da semana: `[{ dia: 0-6, aberto, abre: "18:00", fecha: "23:00" }]`; vazio = vale só o interruptor |
| `datasEspeciais` | Array | `[{ data: "2026-12-25", motivo, fechado, abre, fecha }]`, no máximo 100 |

**Índices:** `slug` (único).

**Por que `proximoNumero`:** o número do pedido é sequencial por loja. Um `$inc` atômico
nesse campo evita dois pedidos com o mesmo número quando dois clientes pedem ao mesmo tempo.

**Por que `horarios` vazio é permitido:** as lojas que existiam antes dos horários não têm
grade cadastrada. Se vazio significasse "fechada", todas fechariam da noite para o dia.
Vazio = "ainda não tem grade", e aí só o interruptor decide.

**Fechar depois da meia-noite:** `abre: "18:00"` com `fecha: "02:00"` é válido. A regra em
`lib/horario.js` trata a janela que virou o dia (inclusive o plantão que começou ontem).

---

## Usuario

| Campo | Tipo | Regra |
|---|---|---|
| `nome` | String | obrigatório |
| `email` | String | obrigatório, único, minúsculo |
| `senhaHash` | String | bcryptjs, `select: false` |
| `papel` | String | `superadmin` \| `dono` \| `atendente` |
| `lojaId` | ObjectId | ref `Loja`; `null` para superadmin |
| `ativo` | Boolean | padrão `true` |

**Índices:** `email` (único), `{ lojaId, ativo }`.

---

## Categoria

| Campo | Tipo | Regra |
|---|---|---|
| `lojaId` | ObjectId | obrigatório, ref `Loja` |
| `nome` | String | ex.: "Pizzas", "Bebidas" |
| `ordem` | Number | posição no cardápio |
| `ativa` | Boolean | padrão `true` |

**Índices:** `{ lojaId, ordem }`.

---

## Produto

| Campo | Tipo | Regra |
|---|---|---|
| `lojaId` | ObjectId | obrigatório |
| `categoriaId` | ObjectId | obrigatório, ref `Categoria` |
| `nome` | String | obrigatório |
| `descricao` | String | opcional |
| `preco` | Number | **em centavos** |
| `imagem` | String | URL, opcional |
| `disponivel` | Boolean | padrão `true` (some do cardápio quando `false`) |
| `ordem` | Number | posição dentro da categoria |

**Índices:** `{ lojaId, categoriaId, ordem }`, `{ lojaId, disponivel }`.

---

## Bairro

| Campo | Tipo | Regra |
|---|---|---|
| `lojaId` | ObjectId | obrigatório |
| `nome` | String | ex.: "Centro" |
| `taxaEntrega` | Number | **em centavos**; `0` = grátis |
| `tempoEstimado` | Number | minutos, ex.: `40` |
| `ativo` | Boolean | padrão `true` |

**Índices:** `{ lojaId, nome }` (único).

---

## Pedido

| Campo | Tipo | Regra |
|---|---|---|
| `lojaId` | ObjectId | obrigatório |
| `numero` | Number | sequencial por loja |
| `cliente` | Objeto | `{ nome, telefone }` |
| `tipo` | String | `delivery` \| `balcao` |
| `endereco` | Objeto | só em delivery: `{ rua, numero, complemento, referencia }` |
| `bairroId` | ObjectId | só em delivery |
| `bairroNome` | String | **cópia** do nome no momento do pedido |
| `taxaEntrega` | Number | **cópia** da taxa do bairro, em centavos |
| `itens` | Array | `[{ produtoId, nome, precoUnitario, quantidade, observacao }]` |
| `subtotal` | Number | soma dos itens, em centavos |
| `total` | Number | `subtotal + taxaEntrega` |
| `status` | String | ver abaixo |
| `pagamento` | String | `dinheiro` \| `pix` \| `cartao` |
| `trocoPara` | Number | opcional, em centavos (só dinheiro) |
| `observacao` | String | observação geral do cliente |

**Status:** `novo` → `aceito` → `preparando` → `pronto` → `saiu_entrega` → `entregue`,
mais `cancelado`.

**Índices:** `{ lojaId, numero }` (único), `{ lojaId, status, criadoEm }`.

### Por que copiar dados no pedido

`nome`, `precoUnitario`, `bairroNome` e `taxaEntrega` são copiados no momento da compra.
Se o lojista mudar o preço da pizza amanhã, o pedido de ontem continua com o preço de ontem.
É histórico, não referência.

### Exemplo

```json
{
  "lojaId": "6730...",
  "numero": 42,
  "cliente": { "nome": "Jesse", "telefone": "11999999999" },
  "tipo": "delivery",
  "endereco": { "rua": "Rua das Flores", "numero": "120", "referencia": "Portão azul" },
  "bairroId": "6731...",
  "bairroNome": "Centro",
  "taxaEntrega": 500,
  "itens": [
    { "produtoId": "6732...", "nome": "Pizza Calabresa", "precoUnitario": 4590, "quantidade": 1, "observacao": "sem cebola" }
  ],
  "subtotal": 4590,
  "total": 5090,
  "status": "novo",
  "pagamento": "pix"
}
```
