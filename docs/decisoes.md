# Decisões do projeto (ADR curto)

Cada decisão registra **o contexto**, **a escolha** e **a consequência**.
Se uma decisão mudar, não apague: adicione uma nova entrada dizendo o que substituiu.

---

## 001 — Front e back separados (02/11/2026)

**Contexto:** poderíamos fazer tudo em Next.js ou separar React e Express.
**Decisão:** Vite + React no front e Express no back, em pastas diferentes.
**Consequência:** mais didático e independente para deploy; exige CORS configurado e dois
processos rodando em desenvolvimento (resolvido pelo `npm run dev` com `concurrently`).

---

## 002 — Multi-loja desde o início (02/11/2026)

**Contexto:** o produto é vendido para vários restaurantes pequenos.
**Decisão:** todo documento carrega `lojaId`; cada loja tem `slug` próprio.
**Consequência:** dá para atender N restaurantes no mesmo sistema sem reescrever nada.
Custo: toda consulta precisa filtrar por `lojaId` — sem exceção.

---

## 003 — MongoDB Atlas desde o desenvolvimento (02/11/2026)

**Contexto:** instalar MongoDB local exigiria migração de dados depois.
**Decisão:** usar o Atlas (plano grátis) já no desenvolvimento.
**Consequência:** mesmo banco do deploy, zero migração. Contra: precisa de internet para rodar.

---

## 004 — Preços em centavos (02/11/2026)

**Contexto:** `float` em JavaScript gera erro de arredondamento (`0.1 + 0.2 = 0.30000000000004`).
**Decisão:** guardar preços e taxas como `Number` inteiro em centavos. Formatar só na tela.
**Consequência:** somas confiáveis. Custo: converter (`/ 100`) na exibição e (`* 100`) na entrada.

---

## 005 — JWT + bcryptjs, com papel superadmin (02/11/2026)

**Contexto:** o painel precisa de acesso seguro e separado por loja.
**Decisão:** login por email/senha, token JWT com `{ id, papel, lojaId }`, senhas com bcryptjs.
**Consequência:** `lojaId` vem sempre do token, nunca do corpo da requisição.
`bcryptjs` (não `bcrypt`) porque não precisa compilar nada no Windows.

---

## 006 — Socket.io para tempo real (02/11/2026)

**Contexto:** pedidos precisam aparecer na hora no painel.
**Decisão:** Socket.io com salas `loja:<lojaId>` e `pedido:<pedidoId>`.
**Consequência:** atualização instantânea sem polling. Custo: uma dependência a mais e
atenção ao emitir eventos **depois** de salvar no banco.

---

## 007 — JavaScript e CSS puros (02/11/2026)

**Contexto:** objetivo é ter o sistema funcionando rápido e simples de entender.
**Decisão:** sem TypeScript, sem Tailwind, sem biblioteca de componentes.
**Consequência:** menos configuração e menos mágica. Estilização profissional vem depois.

---

## 008 — Módulos por assunto no back (02/11/2026)

**Contexto:** pastas por tipo (`controllers/`, `services/`) espalham uma funcionalidade em 3 lugares.
**Decisão:** `modules/<assunto>/{routes,controller,service}.js`.
**Consequência:** para mexer em pedidos, você abre uma pasta só. Adicionar módulo novo não
toca em código existente.

---

## 009 — Número de pedido com `$inc` na loja (02/11/2026)

**Contexto:** contar pedidos com `countDocuments` cria número duplicado em pedidos simultâneos.
**Decisão:** campo `proximoNumero` na `Loja`, incrementado atomicamente com `$inc`.
**Consequência:** números únicos mesmo com dois clientes pedindo no mesmo segundo.

---

## 010 — Cadastro público com aprovação (02/11/2026)

**Contexto:** o produto é vendido para várias lojas e não dá para preencher um formulário por
cliente. Mas liberar qualquer cadastro direto no ar abre porta para loja fantasma.
**Decisão:** `POST /api/cadastro` é público e cria a loja como `pendente`; o superadmin aprova
em `PATCH /api/lojas/:id/situacao`. Loja `pendente` ou `suspensa` não aparece no cardápio
público nem aceita pedido.
**Consequência:** escala o cadastro sem perder o controle. O dono já sai logado e vê
"sua loja está em análise" até a aprovação.

---

## 011 — `exigirLoja` nas rotas da loja (02/11/2026)

**Contexto:** o token do superadmin é válido, mas ele não tem `lojaId`. Sem checagem, uma
consulta `{ lojaId: undefined }` no Mongo vira "qualquer loja" e fura o isolamento.
**Decisão:** middleware `exigirLoja` em cardápio e bairros: sem `lojaId` no token → 403.
**Consequência:** superadmin usa só `/api/lojas` e `/api/super`. Nenhuma consulta da loja
roda sem `lojaId`, nem por acidente.

---

## 012 — Cardápio público em uma única resposta (02/11/2026)

**Contexto:** o cliente precisa de loja, categorias, produtos e bairros para montar o pedido.
Fazer quatro chamadas atrasa a primeira tela no celular.
**Decisão:** `GET /api/publico/:slug` devolve tudo junto. Categoria sem produto disponível
não aparece na resposta.
**Consequência:** uma chamada só, tela abre rápido. Custo: a resposta cresce com o cardápio
(aceitável no tamanho de uma loja pequena).

---

## 013 — Carrinho no navegador, separado por slug (02/11/2026)

**Contexto:** obrigar login para montar o carrinho afasta o cliente.
**Decisão:** carrinho em `localStorage` na chave `sistema-delivery:carrinho:<slug>`.
O front guarda `produtoId`, `nome` e `preco` só para exibir; o back ignora esses valores e
recalcula tudo pelo banco na hora de criar o pedido.
**Consequência:** cliente monta o pedido sem cadastro e não mistura lojas diferentes.
Preço exibido pode ficar velho se o lojista mudar no meio do caminho — o pedido usa o preço
atual do banco e o back recusa produto indisponível com mensagem clara.

---

## 014 — Acompanhamento por polling até a fase 4 (02/11/2026)

**Contexto:** a tela do cliente precisa mostrar o status mudando, mas o Socket.io entra
só na fase 4, junto com o kanban.
**Decisão:** `GET /api/publico/:slug/pedidos/:id` a cada 20 segundos na tela de
acompanhamento.
**Consequência:** funciona sem dependência nova e sem sala por pedido. Quando o Socket.io
entrar, o polling sai e o evento `pedido:status` assume.

---

## 015 — Horário de funcionamento: interruptor manda, grade obedece (03/11/2026)

**Contexto:** a loja precisava abrir e fechar sozinha pelo relógio, mas o dono também
precisa de um freio de mão (faltou ingrediente, acabou o gás) sem mexer na grade.
**Decisão:** a grade da semana e as datas especiais vivem na `Loja` (`horarios`,
`datasEspeciais`) e o `aberta` continua sendo o interruptor. A regra mora em
`lib/horario.js` (`statusDaLoja`); o interruptor desligado vence qualquer horário.
Grade vazia = "ainda não tem grade": vale só o interruptor.
**Consequência:** nenhuma loja antiga fecha sozinha no dia do deploy. O cardápio mostra o
status e o back recusa pedido fora do horário com o motivo escrito. O front tem uma cópia da
regra (`utils/horario.js`) só para atualizar o selo sem recarregar a página — se as duas
divergirem, quem está certo é o back.

---

## 016 — "Meus pedidos" sem login (03/11/2026)

**Contexto:** "ver meus pedidos e repetir" é o que faz o cliente voltar, mas login no meio
da fome derruba a conversão.
**Decisão:** o aparelho guarda só os **ids** dos pedidos em
`sistema-delivery:pedidos:<slug>` (máx. 20). O resto vem da API (`GET /publico/:slug/pedidos?ids=`).
"Repetir pedido" joga os itens no carrinho com o **preço de hoje** e avisa o que saiu do
cardápio — nunca cria pedido sozinho.
**Consequência:** nenhum cadastro no caminho. Custo: o histórico não acompanha o cliente
entre aparelhos (decisão consciente) e o id do pedido é o segredo — por isso a rota só
devolve pedido da própria loja.

---

## 017 — Cardápio público redesenhado (03/11/2026)

**Contexto:** o cardápio usava a mesma barra fina das telas internas e uma lista vertical sem
foto. É a primeira coisa que o cliente vê — e a que mais parecia "sistema", não "restaurante".
**Decisão:** o cardápio ganhou capa própria na cor da loja (nome, status ao vivo, tempo e taxa
mínimos reais), lista em duas colunas no desktop e uma no celular, ficha do produto em modal
(quantidade + observação) e barra de categorias fixa com a seção atual destacada. A barra
compacta continua só nas telas internas (checkout, acompanhamento, meus pedidos). Sem foto
real, o produto usa a inicial na cor da loja; o Cloudinary entra depois sem mexer no layout.
**Consequência:** CSS puro, sem dependência nova. A categoria ativa usa scroll +
`requestAnimationFrame` (sem IntersectionObserver) e tudo respeita `prefers-reduced-motion`.
O "Adicionar" do card é secundário (contorno) para não repetir a cor da loja em todo item;
adicionar direto continua valendo, e o modal resolve quantidade/observação. Capa só mostra
dado real: sem bairro cadastrado, o chip de entrega/taxa não aparece.

---

## 018 — Checkout em página única e acompanhamento com status grande (04/11/2026)

**Contexto:** no celular o resumo do checkout ficava no fim da página e o cliente rolava tudo
para achar "Enviar pedido"; erro de formulário só aparecia no rodapé. No acompanhamento o
status era mais um item da lista, e não havia atalho para falar com a loja nem para repetir.
**Decisão:** checkout em página única, com resumo fixo na lateral no desktop e barra fixa no
rodapé no celular (itens, total e envio sempre à mão). Validação por campo, com foco no
primeiro erro. Nome, telefone e endereço ficam em `sistema-delivery:dadoscliente:<slug>` e
voltam preenchidos na próxima compra — gravados só depois que a loja aceita o pedido.
O acompanhamento ganhou status grande, selo ao vivo, `aria-live`, botão "Falar com a loja"
(WhatsApp com o nº do pedido) e "Pedir de novo" quando o pedido termina.
**Consequência:** nenhuma dependência nova e nenhuma mudança na API. A regra de repetir saiu de
`MeusPedidos` e virou `utils/repetir.js`, usada pelas duas telas. Guardar o endereço no
aparelho é decisão consciente: é só o endereço de entrega, editável, e não vira cadastro.

---

## 019 — Vercel: API serverless e polling no lugar do Socket.io (04/11/2026)

**Contexto:** chegou a hora de colocar o iCardápio no ar. A Vercel é barata e familiar, mas roda
**funções**: não existe processo escutando porta, nada sobrevive entre uma requisição e outra, e
várias instâncias podem atender o mesmo cliente ao mesmo tempo.
**Decisão:** a API ganhou uma porta de entrada própria (`api/index.js`), que conecta no banco e
entrega a requisição para o mesmo Express de sempre — `src/app.js` não mudou uma linha. A conexão
do Mongo é guardada no `globalThis` e reaproveitada enquanto a instância estiver quente, senão
cada acesso abriria uma conexão nova e estouraria o Atlas. O tempo real saiu do Socket.io:
`servicos/tempoReal.js` consulta a API (3s no pedido, 15s quando ele já terminou, 5s no painel),
pausa com a aba escondida e só avisa quando a leitura muda.
**Consequência:** perde-se a sensação de "pipocou na hora" — até ~3s de atraso — e ganha-se
confiabilidade, porque o polling lê sempre o banco e não depende de qual instância atendeu.
O `socket.io-client` saiu do bundle (304 kB → 264 kB). `src/server.js` e `src/lib/socket.js`
continuam no projeto: rodando local (`npm run dev`), o servidor segue exatamente como era.

---

## 020 — Dois repositórios separados (04/11/2026)

**Contexto:** com o deploy aprovado, o Jesse quis voltar ao formato que já conhece: um
repositório para o front e outro para a API, cada um com seu projeto na Vercel.
**Decisão:** o monorepo virou dois repositórios — `icardapio-api` e `icardapio-front` —,
cada um com o conteúdo da sua pasta na raiz. O histórico foi recortado com `git subtree split`,
então nenhum commit se perdeu e nenhum arquivo precisou ser copiado. O `AGENTS.md` e a pasta
`docs/` foram copiados para os dois: cada repositório precisa se explicar sozinho quando o
Jesse estiver trabalhando só nele.
**Consequência:** push em cada `main` faz o deploy do projeto correspondente na Vercel, sem
passar pelo painel. Custo aceito: o guia existe em dois lugares e precisa ser atualizado nos
dois quando mudar — melhor que ter metade do contexto faltando.

---

## 021 — Quadro de pedidos redesenhado, com arrastar e soltar (07/11/2026)

**Contexto:** o quadro era a tela mais usada do painel e a mais fraca: cartão pequeno, letra
miúda, seis colunas espremidas e nenhum jeito de mover o pedido sem caçar o botão certo. Duas
tentativas anteriores foram reprovadas, e uma delas mutilou o `Painel.css` — derrubou Horários.
**Decisão:** a tela ganhou arquivo próprio (`Pedidos.css`) com prefixos exclusivos
(`tabuleiro__`, `prateleira__`, `ficha__`, `historico__`), e o `Painel.css` não é mais tocado: as
classes antigas `pedidos__`/`pedido__` ficam órfãs, sem efeito. As seis etapas ficam numa fileira
só, cada uma como um cartão com número (1–6) e contagem, com a rolagem horizontal **presa no
quadro** (a página nunca rola de lado). Arrastar a ficha muda a etapa e **só avança**: a coluna
que não aceita o pedido esmaece em vez de fingir que aceita, e a API garante a mesma regra.
Cancelado sai do quadro e vive numa gaveta `<details>` fechada no fim da tela. No celular e no
tablet (≤1024px) o quadro vira abas com contagem e uma etapa por vez, com cartão e botão maiores.
Cancelar e apagar confirmam dentro do próprio cartão (nunca `alert()`), e o contador de etapa usa
os tempos da loja (`5/5/30/10` como padrão).
**Consequência:** o visual novo não disputa CSS com as outras telas, então Horários, dashboard e
Configurações continuam como estavam. A API precisou ir no mesmo deploy: pedido em aberto passou
a aparecer sempre na lista (antes sumia na virada do dia), os `marcos` dão o tempo certo de cada
etapa e `/pedidos/estatisticas` alimenta o painel. No toque não existe arrastar — lá quem manda é
o botão do cartão.

