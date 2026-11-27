# CLAUDE.md — Diretrizes do projeto

Leia este arquivo como primeira ação em qualquer tarefa. Atualize-o ao final
de toda mudança relevante na arquitetura, decisões de stack ou convenções.
Se este arquivo não existir ainda, crie-o antes de prosseguir e pergunte ao
usuário sobre as convenções que faltam em vez de assumi-las.

## 1. Prioridade entre princípios

Quando dois princípios colidirem, siga esta ordem:

1. Segurança (OWASP) — nunca é sacrificada por simplicidade ou prazo.
2. KISS — prefira a solução mais simples que resolve o problema.
3. SOLID — aplique só quando o ganho de manutenibilidade for real; não
   force abstração para um caso de uso único.
4. Clean code — nomes claros, funções pequenas, baixo acoplamento.

Use o contexto do próprio código como base. Extrapole padrões novos apenas
quando o código existente não oferecer um exemplo aplicável.

## 2. Comunicação com o usuário

- Quando o escopo estiver vago, a observação não estiver coberta pelo pedido,
  ou uma adição parecer relevante, pergunte antes de assumir.
- Ao propor código vindo da solicitação do usuário, não confie cegamente:
  valide viabilidade, segurança e confiabilidade antes de finalizar o plano.
  Se encontrar um problema, explique o risco e sugira alternativa.
- Substitua emojis por ícones do pacote já instalado no projeto (ex: Tabler,
  Lucide — verifique qual está disponível antes de usar).

## 3. Testes

- Use specs/ com o framework de teste já configurado no projeto (verifique
  package.json / config antes de assumir Jest — pode ser Vitest, Pytest etc.)
  como base para critérios de aceite.
- Se não existir spec para a funcionalidade, planeje a criação da spec junto
  com a implementação, não depois.

## 4. Orquestração de modelos e agentes

- Use o modelo mais leve disponível (ex: Sonnet) para exploração, leitura de
  código e tarefas de baixa complexidade.
- Reserve o modelo mais robusto (ex: Opus) para planejamento extenso ou
  tarefas de alta complexidade/risco.
- Delegue a agentes quando a tarefa envolver múltiplas frentes paralelas.
- Otimize tokens ativamente: prefira grep/busca direcionada a ler arquivos
  inteiros, resuma contexto já explorado antes de repassá-lo, e evite reler
  arquivos sem necessidade.

## 5. Arquitetura de dados

- Aplique SSoT (Single Source of Truth) sempre que o escopo permitir:
  - Preferencialmente backend first, com payloads read-only no frontend.
  - Onde não for viável, use SSoT's locais centralizados (um único módulo/
    store responsável pelo dado, nunca duplicado).

## 6. Estilo de código

- Python: siga o Zen do Python quando o projeto for majoritariamente Python.
  Não force PEP 20 em stacks de outra linguagem.
- Comentários: antes de adicionar um comentário, pergunte-se — "isso é
  relevante para quem ler a codebase depois, ou é só uma observação pontual
  desta tarefa?" Se for pontual, descarte.

### 6.1. TypeScript

Quando o projeto utilizar TypeScript, trate o sistema de tipos como parte da
arquitetura — não apenas como documentação.

- `any` é proibido por padrão. Não utilize `any` para contornar erros de
  tipagem ou acelerar implementação.
- Quando o tipo for genuinamente desconhecido, prefira `unknown` e faça o
  narrowing/validação necessário antes do uso.
- Evite type assertions (`as`) quando uma inferência, type guard ou
  validação puder resolver o problema. Nunca use casts apenas para silenciar
  o compilador.
- Não use `@ts-ignore` ou `@ts-nocheck`. Se houver uma exceção inevitável,
  explique o motivo e prefira `@ts-expect-error` com justificativa.
- Evite duplicar definições de tipos para representar o mesmo domínio.
  Defina uma fonte canônica e derive os demais tipos quando possível.

### Modelos e domínio

- Crie models/types para entidades e conceitos relevantes do domínio.
- Não crie interfaces ou abstrações apenas por antecipação ("talvez
  precisemos disso depois"). Tipos devem representar necessidades reais do
  domínio, contratos ou fronteiras da aplicação.
- Diferencie claramente, quando aplicável:
  - Domain Model — representação das regras e conceitos do domínio.
  - DTO — contrato de entrada/saída entre fronteiras.
  - Persistence Model — representação específica do banco/ORM.
  - View/UI Model — representação necessária exclusivamente pela interface.
- Não reutilize automaticamente o model do banco como contrato público da
  API ou como estado da UI. Faça isso apenas quando as responsabilidades
  forem realmente idênticas.

### Schemas e validação

- TypeScript não valida dados em runtime. Todo dado que atravesse uma
  fronteira não confiável deve ser validado em runtime.
- Considere fronteiras externas:
  - requests HTTP;
  - query params e route params;
  - webhooks;
  - variáveis de ambiente;
  - respostas de APIs externas;
  - dados persistidos quando sua integridade não puder ser garantida.
- Use o mecanismo de schema/validação já adotado pelo projeto (ex: Zod,
  Valibot, Yup, class-validator). Não introduza uma nova biblioteca sem
  necessidade.
- Quando possível, derive tipos TypeScript dos schemas para evitar
  divergência entre validação runtime e tipagem estática.
- Schemas devem ser a fonte de verdade para contratos que exigem validação
  runtime.

### Inferência e simplicidade

- Prefira inferência quando o tipo for óbvio pelo contexto.
- Declare tipos explicitamente em APIs públicas, contratos, retornos
  complexos e pontos onde isso melhora a legibilidade.
- Não crie tipos excessivamente genéricos ou condicionais quando uma
  estrutura simples e explícita resolver o problema.
- Tipagem deve aumentar segurança e compreensão — não transformar código
  simples em metaprogramação.

## 7. Design / UI / UX

- Qualquer tarefa que envolva design, UI, UX ou alteração visual deve
  consultar a skill de design correspondente antes de implementar. Não pule
  essa etapa mesmo em ajustes aparentemente pequenos.

## 8. Fluxo Git

### Antes de começar qualquer tarefa

1. Verifique se a branch atual está atualizada em relação a dev.
2. O projeto não usa IDs de task. Não peça nem invente ID.

### Branches

- `main` recebe apenas releases via PR a partir de `dev`; `dev` é a base de
  integração. Novas branches saem de `dev`.
- Padrão: type/compact-name (ex: fix/render-bug)
- Nomes compactos, sem descrições longas.

### Commits e Pull Requests

- Formato: type(target): descrição curta
  (ex: fix(engine): corrigido bug de renderização no form)
- Título sempre compacto; detalhes específicos vão na descrição do commit/PR,
  não no título.
- Todo commit/PR é escrito em pt-br.
- Nunca inclua co-author ou menções como "Generated with Claude" em
  commits ou PRs — isso é proibido.

## 9. Manutenção deste arquivo

Ao final de qualquer mudança que afete:
- decisões arquiteturais,
- convenções de código,
- estrutura de pastas,
- ou stack/ferramentas usadas,

atualize este CLAUDE.md na mesma tarefa, não depois.

## 10. CSS, SCSS, Bootstrap e Tailwind

Antes de criar ou alterar estilos, identifique qual abordagem de estilização já é utilizada no projeto. Não introduza uma nova solução de CSS apenas por preferência pessoal.

### Regra geral

* Respeite a estratégia de estilização existente no projeto.
* Não misture Tailwind, Bootstrap, CSS Modules, SCSS ou styled-components arbitrariamente.
* Antes de criar estilos globais, verifique se o componente pode ser estilizado localmente.
* Evite duplicação de regras visuais. Se um padrão já existir, reutilize-o.
* Não use `!important`, exceto quando necessário para sobrescrever comportamento de bibliotecas externas e não houver alternativa arquitetural adequada.
* Evite valores mágicos repetidos para cores, espaçamentos, breakpoints, sombras ou tamanhos. Utilize tokens, variáveis ou a configuração do framework quando disponíveis.
* Prefira classes semânticas e reutilizáveis a seletores excessivamente dependentes da estrutura HTML.
* Não estilize elementos com base em tags (`div div div`, `button > span`, etc.) quando uma classe ou componente específico puder representar a intenção.
* Evite especificidade excessiva. Não crie CSS que exija uma cadeia maior de seletores para ser sobrescrito.

### Responsividade

* Toda alteração visual deve considerar os breakpoints e comportamentos responsivos já definidos pelo projeto.
* Não crie breakpoints arbitrários quando o projeto já possuir uma escala definida.
* Prefira uma abordagem consistente com o projeto (`mobile-first`, `desktop-first` etc.).
* Não use dimensões fixas quando o layout exigir adaptação ao conteúdo ou à viewport.
* Teste comportamentos em telas pequenas e grandes quando a alteração afetar layout, navegação ou componentes estruturais.

### Acessibilidade visual

* Não remova `outline` ou indicadores de foco sem fornecer uma alternativa acessível.
* Estados de `hover` não devem ser a única forma de comunicar uma ação ou estado.
* Garanta contraste adequado entre texto e fundo.
* Estados `disabled`, `loading`, `error`, `focus` e `active` devem seguir os padrões visuais existentes.
* Não comunique informações exclusivamente por cor.

---

### SCSS / Sass

Quando o projeto utilizar SCSS:

* Use variáveis, mixins e funções apenas quando reduzirem repetição ou centralizarem regras relevantes.
* Não crie mixins para abstrações utilizadas apenas uma vez.
* Evite nesting profundo. Como regra, mantenha o aninhamento no menor nível possível.
* Não replique estruturas inteiras do HTML dentro do SCSS.
* Prefira organização por componente ou domínio em vez de grandes arquivos globais monolíticos.
* Use variáveis SCSS apenas para valores que pertençam ao sistema de estilos e não sejam melhor representados por CSS Custom Properties.
* Quando um valor precisar ser alterado dinamicamente em runtime, prefira CSS Custom Properties (`--variavel`) em vez de variáveis SCSS.
* Evite `@extend` quando ele produzir seletores difíceis de prever ou acoplamento entre componentes.
* Não use arquivos SCSS globais como depósito de correções pontuais.

Exemplo a evitar:

```scss
.page {
  .container {
    .content {
      .card {
        .title {
        }
      }
    }
  }
}
```

Prefira estilos com baixo acoplamento à estrutura:

```scss
.card {
}

.card__title {
}
```

---

### Tailwind CSS

Quando o projeto utilizar Tailwind:

* Use as utilities do Tailwind como abordagem principal de estilização.
* Não crie CSS customizado para algo que já possua uma utility clara e consistente no Tailwind.
* Não introduza valores arbitrários repetidamente (`w-[347px]`, `mt-[13px]`, etc.) quando o design puder utilizar a escala existente.
* Se um valor arbitrário precisar ser reutilizado, avalie adicioná-lo à configuração/tokens do projeto.
* Não extraia componentes apenas porque uma sequência de classes está longa. Extraia quando houver reutilização, responsabilidade própria ou ganho real de legibilidade.
* Para padrões visuais reutilizados em múltiplos componentes, prefira abstrações compatíveis com a arquitetura do projeto: componentes, variantes ou utilities centralizadas.
* Não use `@apply` como substituto indiscriminado para escrever CSS tradicional.
* Preserve a consistência da escala de espaçamento, tipografia, cores, radius e breakpoints configurada no projeto.
* Antes de adicionar novas cores, tamanhos ou tokens à configuração, verifique se já existe um equivalente.

Classes devem continuar legíveis. Quando a complexidade visual tornar o JSX difícil de manter, considere separar variantes ou criar um componente dedicado — não apenas mover todas as classes para outro lugar.

---

### Bootstrap

Quando o projeto utilizar Bootstrap:

* Utilize primeiro os componentes, utilities e tokens fornecidos pela versão já instalada.
* Não recrie manualmente componentes que o Bootstrap já fornece sem necessidade.
* Não misture versões diferentes do Bootstrap.
* Antes de sobrescrever estilos do Bootstrap, verifique se existe uma variável Sass, CSS Custom Property ou API oficial de customização adequada.
* Evite sobrescrever componentes globalmente quando a alteração for específica de uma única tela ou componente.
* Não altere diretamente arquivos da biblioteca.
* Utilize o sistema de grid e breakpoints do Bootstrap de forma consistente com o restante do projeto.
* Ao customizar componentes, preserve estados de acessibilidade e comportamento nativo fornecidos pela biblioteca.

---

### Convivência entre tecnologias

Se o projeto possuir mais de uma solução de estilização:

* Não escolha automaticamente a tecnologia preferida pelo agente.
* Identifique qual solução é responsável pelo módulo que está sendo alterado.
* Novos componentes devem seguir o padrão predominante da área correspondente.
* Não migre CSS/SCSS/Bootstrap para Tailwind, ou vice-versa, dentro de uma task não destinada explicitamente à migração.
* Migrações de sistema de estilos devem possuir escopo explícito, estratégia incremental e critérios de compatibilidade.

---

### Qualidade e manutenção

Antes de considerar uma alteração visual concluída, verifique:

* existência de estilos duplicados;
* responsividade;
* estados interativos;
* foco e acessibilidade;
* regressões em componentes compartilhados;
* uso consistente dos tokens e convenções existentes;
* ausência de `!important` desnecessário;
* ausência de valores mágicos repetidos;
* compatibilidade com o sistema de estilos já adotado pelo projeto.

Se uma mudança visual alterar componentes compartilhados, avalie o impacto em todas as telas consumidoras antes de finalizar.

## 11. Banco de dados: expand/contract

Também chamado de *parallel change*. Toda alteração de banco mantém
retrocompatibilidade com a versão anterior do código e **não exige backfill**.
Cada fase é implantável sozinha.

### Fases

1. **Expand** — só adiciona: coluna/tabela/campo novo **nullable ou com
   default**, índice novo. Nunca renomeie, remova nem torne obrigatório o que
   já existe. O código antigo continua funcionando sem mudanças.
2. **Migrate** — o código passa a escrever no novo (e, se preciso, nos dois). A
   leitura tolera a ausência do novo: usa o default ou cai no campo antigo.
   Registros antigos são lidos assim, sem backfill obrigatório.
3. **Contract** — remover o antigo só num ticket posterior, quando nenhum
   leitor ou escritor depender dele, e com decisão explícita do usuário.
   **Esta task nunca faz o contract.**

### Regras

- Rename = adicionar o campo novo + escrever nos dois + remover o antigo num
  ticket futuro.
- Mudança de tipo = campo novo com o tipo novo; o antigo permanece.
- Proibido na mesma release: `DROP`, rename destrutivo, `NOT NULL` sem default
  sobre coluna com dados, mudança de tipo in-place.
- Migrations idempotentes e, quando possível, reversíveis.
- Constraint nova só em dado novo ou com default seguro; nunca assuma que os
  registros antigos já cumprem a regra.
- Se parecer impossível evitar um backfill, pare e pergunte ao usuário; não
  improvise.

### Antes de concluir

- O código da versão anterior continua funcionando com o schema novo?
- Registros antigos são lidos corretamente (default/fallback), sem script de
  dados?
- Nada foi removido, renomeado ou tornado obrigatório?
- Se algo ficou para o contract, está registrado como follow-up para um ticket
  futuro?

## 13. Stack do projeto

Monólito modular em TypeScript, entregue como PWA.

- Monorepo: pnpm workspaces, com pacote compartilhado de schemas e tipos.
- Front: React + Vite (PWA) e Tailwind CSS. Este é o único sistema de
  estilização do projeto.
- Back: NestJS, módulos por domínio (pedidos, mesas, cardápio, cobrança).
- Tempo real: WebSocket (Socket.IO).
- Banco: PostgreSQL + Prisma. Migrations seguem a seção 12.
- Validação: Zod, com tipos derivados dos schemas.
- Testes: Vitest (unitário e integração) e Playwright (E2E), com specs em `specs/`.
- Infra: Docker + PostgreSQL gerenciado.

Diretrizes de arquitetura:

- Multi-tenant desde o início: todo registro pertence a um `restaurant_id`.
- Autenticação por sessão com cookie `HttpOnly` e permissões por papel
  (garçom, cozinheiro, caixa, gerente/admin).
- O PWA deve enfileirar pedidos localmente quando offline e reenviá-los ao
  reconectar.
- Fora do MVP: NFC-e e Pix. Modelar a cobrança para aceitá-los depois.

Estrutura e convenções do scaffold:

- `apps/api` (NestJS, CommonJS), `apps/web` (React + Vite + Tailwind v4 + PWA) e
  `packages/shared` (schemas Zod e tipos derivados, buildado com tsup).
- TypeScript fixado em 5.9 (TS 7 não tem a compiler API que o tsup precisa).
- Prisma 7: `prisma.config.ts` lê o `.env` da raiz; o client é gerado em
  `apps/api/src/generated` (não versionado) e usa o adapter `pg`.
- Variáveis de ambiente validadas com Zod em `apps/api/src/env.ts`.
- Front: ícones com `lucide-react`; tokens de cor da marca em `@theme`
  (`apps/web/src/index.css`); navegação por hash (`#/atendente`, `#/cozinha`).
- Front consome a API: `api/client.ts` (fetch + Zod), `realtime/socket.ts`
  (Socket.IO) e `store/remote-store.ts` (estado do servidor, recarregado a cada
  reconexão). Stores de domínio em `orders/` e `restaurant/`. O Vite faz proxy de
  `/api` e `/socket.io` para a API (mesma origem, funciona no celular via LAN).
- API sob o prefixo `/api`; módulos `menu`, `orders`, `restaurant` e `realtime`
  (gateway Socket.IO). Eventos em `REALTIME_EVENTS` (`packages/shared`).
  O servidor é a fonte da verdade: valida mesa e itens e resolve nomes pelo
  cardápio.
- Autenticação: sessão em cookie `HttpOnly` + `SameSite=Lax` (`fs_session`),
  token aleatório guardado só como hash SHA-256 na tabela `sessions` (12 h).
  Senhas com scrypt (`auth/password.ts`). Guards globais: `OriginGuard`
  (anti-CSRF) e `AuthGuard` (sessão + `@Roles`; rotas abertas só com
  `@Public()`). Login com limite de tentativas em memória.
- Fila offline (`apps/web/src/offline/outbox.ts`): todo pedido do atendente
  passa pela fila local (localStorage por usuário) e é enviado na hora quando há
  rede. O `id` do pedido é gerado no cliente e o `POST /orders` é idempotente
  por esse `id` (reenvio devolve o pedido já criado). Falha de rede, 5xx, 401,
  408 e 429 mantêm o pedido pendente (reenvio ao reconectar e a cada 15 s);
  outras rejeições 4xx viram "falho", com o motivo, para o atendente decidir.
  Logout fica bloqueado com pedidos pendentes.
- Mesa aberta: o atendente abre a mesa com o nome do cliente (obrigatório, até 40
  caracteres) antes de enviar pedidos e a fecha manualmente. Tabela
  `table_sessions`; `orders.tableSessionId` é opcional (pedidos antigos ficam sem
  cliente, sem backfill). `openTableKey` (`restaurante:mesa`, nulo ao fechar) é
  `@unique` e garante uma sessão aberta por mesa. `POST /table-sessions` é
  idempotente pelo `id` do cliente; sem `tableSessionId`, `POST /orders` usa a mesa
  aberta e recusa se não houver. Evento `REALTIME_EVENTS.tableSessionsChanged`.
  A fila offline guarda dois tipos de entrada (`order` e `open_table`), enviados
  em ordem; entradas antigas sem `kind` são lidas como pedidos. Fechar mesa exige
  conexão e é bloqueado com pedidos da mesa na fila.
- Comandas: cada pessoa da mesa tem uma comanda (`guest_checks`, nome obrigatório
  até 40 caracteres). Abrir a mesa cria a primeira com o nome informado;
  `POST /table-sessions/:id/checks` adiciona outras (idempotente pelo `id` do
  cliente). `orders.checkId` é opcional: sem ele vale a única comanda aberta e, com
  mais de uma, o servidor exige `checkId`. Mesas abertas antes das comandas têm
  `checks` vazio e seus pedidos ficam sem comanda (nome vem da mesa), sem backfill.
  Fechar a comanda não encerra as outras; fechar a última fecha a mesa, e fechar a
  mesa fecha todas. A fila offline também guarda `add_check`; fechar comanda ou mesa
  exige conexão.
- Autor do pedido e aviso de pronto: `orders.createdById` (opcional, sem backfill)
  é gravado pelo servidor a partir da sessão, nunca do cliente; `Order` expõe
  `createdById` e `createdByName` (nulos nos pedidos antigos) e o histórico mostra o
  atendente. `orders/ready-notifications.ts` observa o store de pedidos e, quando um
  pedido criado pelo usuário logado muda para "pronto" depois de conhecido, empurra
  um aviso para `notifications/notices-store.ts` (regra pura em `orders/ready-rule.ts`).
  `NoticeToasts` mostra os avisos (10 s, dispensáveis, `aria-live`) nas telas do
  atendente. O evento em tempo real continua indo a todo o restaurante; o filtro por
  autor é no cliente.
- Entrega: o status `delivered` vem depois de `ready`. A cozinha avança só até
  "pronto" (`PATCH /orders/:id/advance`, `nextOrderStatus` termina em `ready`); a
  entrega é `PATCH /orders/:id/deliver`, de garçom e gerente, e o servidor só aceita
  de quem criou o pedido ou do gerente (pedidos antigos, sem autor, só do gerente).
  É idempotente. Pedido entregue some de "Pedidos enviados" e da coluna de prontos
  da cozinha e continua no histórico. Marcar como entregue exige conexão.
- Super admin e restaurantes: o papel `super_admin` (fora de `staffRoleSchema`, então a
  equipe de um restaurante nunca o cria) administra a plataforma e não opera dentro de
  nenhum restaurante. Ele fica ancorado no restaurante interno `PLATFORM_RESTAURANT_ID`
  (criado no bootstrap, escondido da lista), para `restaurantId` seguir obrigatório em
  `users`/`AuthUser`. O primeiro vem de `SEED_SUPER_ADMIN_*` no `.env`. `/platform/restaurants`
  (`@Roles('super_admin')`) lista, cria (restaurante vazio, sem cardápio, + primeiro
  gerente, senha só como hash), edita (nome e mesas) e desativa (`restaurants.active`,
  default true): desativar apaga as sessões, derruba os sockets, o login responde 403 e
  `SessionService.validate` recusa. Tela `#/plataforma`. O isolamento entre restaurantes
  vem de todo serviço filtrar pelo `restaurantId` do usuário logado e de uma sala de
  tempo real por restaurante; qualquer rota nova deve seguir isso. Única exceção: a equipe
  de cada restaurante, em `/platform/restaurants/:restaurantId/users` (listar, criar,
  ativar/desativar e editar nome, e-mail, papel e senha; `PlatformUsersController`, só
  `super_admin`; trocar papel ou senha encerra as sessões do usuário). Ali o restaurante vem da
  rota, validado por `PlatformService.assertManageable` (que recusa o restaurante interno),
  e reaproveita `UsersService`, com as mesmas regras (e-mail único, último gerente ativo,
  inclusive ao rebaixar). A edição é só do super admin; o gerente não edita perfis. O
  front reaproveita `TeamSection` (`basePath`) no botão "Equipe" de cada restaurante.
- Uso offline: `remote-store` guarda o último cardápio, mesas e pedidos por
  usuário (limpo no logout) e a identidade da sessão fica em cache para o app
  abrir sem rede; o service worker (vite-plugin-pwa) cuida da casca do app e
  ignora `/api` e `/socket.io`. O indicador de conexão usa `navigator.onLine`
  além do socket.
- Proxy: o Vite mantém o `Host` original (`changeOrigin: false`) porque o
  `OriginGuard` o compara com o `Origin`. Atrás de um proxy reverso em produção,
  preserve o `Host` ou liste a origem em `WEB_ORIGIN`.
- Papéis: `waiter` (cria pedidos), `cook` (avança pedidos) e `manager` (tudo,
  inclusive cardápio, mesas e equipe). Permissões de rota ficam nos
  controllers e as de tela em `apps/web/src/auth/permissions.ts`; o servidor é
  quem decide, a UI só esconde. O socket autentica pelo cookie no handshake.
- Todo serviço recebe o `restaurantId` do usuário logado; o restaurante padrão
  e o primeiro gerente (`SEED_MANAGER_*` no `.env`) são criados por
  `bootstrap.service.ts`.
- Telas: `#/atendente`, `#/cozinha` e `#/controle`. O controle tem três seções
  (`SubNav`): `#/controle/cardapio` (mesas e cardápio, padrão), `#/controle/equipe` e
  `#/controle/historico`. Só mesas e cardápio têm rascunho; enquanto houver alteração
  não salva, `navigation/unsaved-changes.ts` impede qualquer troca de URL.
  Layout: container único `max-w-7xl` (`components/layout.ts`); telas com seções
  (controle e atendente) usam `SectionLayout` + `SubNav sidebarOnDesktop` (menu
  lateral de 14rem a partir de `lg`, abas no topo no mobile). A cozinha não tem
  seções e só usa o container largo.
- Categorias do cardápio: no atendente e no controle, os pratos ficam recolhidos por
  categoria (`components/CategoryAccordion.tsx`, fechado por padrão, com badge opcional
  de contagem). Reutilize o componente em novas listas por categoria.
- Tamanhos de prato: `menu_items.sizes` (`String[]`, default vazio) lista os tamanhos de
  um prato; vazio = sem variação (pratos antigos, sem backfill). Sem preço por tamanho
  (cobrança está fora do MVP). `order_items.size` é opcional e é gravado pelo servidor:
  prato com tamanhos exige um tamanho válido (comparado sem caixa/acento, grafia do
  cardápio), prato sem tamanhos recusa. O pedido tem uma linha por prato e tamanho
  (`orders/order-lines.ts` no front); as telas exibem `orderItemLabel` (shared), ex.:
  "Batata frita (Grande)". No Controle os tamanhos são digitados separados por vírgula.
- Edição de prato: `PUT /menu/:id` (gerente) substitui nome, categoria e tamanhos; pedidos
  já feitos guardam o nome da época. No Controle a edição entra no rascunho (`edited`,
  badge "Editado") e só vai ao servidor em "Salvar"; editar de volta aos valores originais
  descarta a edição, e remover o prato vence a edição. O formulário de novo prato e o de
  edição são o mesmo componente (`screens/control/DishForm.tsx`). Pratos "Novo" ainda
  não salvos não são editáveis: descarte e inclua de novo.
- Observação do pedido: `orders.notes` (`String?`, nulo = sem observação e pedidos antigos,
  sem backfill) leva um recado do atendente para a cozinha. O limite é
  `ORDER_NOTES_MAX_LENGTH` (200, em `packages/shared`), aplicado no schema Zod com `trim`; o
  servidor grava vazio como nulo. O campo fica na seção "3. Observações" do atendente, vai
  na fila offline junto com o pedido e aparece destacado no card da cozinha, em "Pedidos
  enviados" e no histórico do Controle. É por pedido, não por item.
- Histórico por período: o histórico do Controle abre no dia de hoje e filtra por intervalo
  (`De`/`Até`, inputs `date` nativos, inclusivo; data vazia deixa a ponta aberta, "Todo o
  período" limpa as duas) e separa os pedidos por dia, do mais recente ao mais antigo. O dia é
  o do fuso do navegador. O filtro é no cliente, sobre os pedidos que o `orders-store` já tem
  (`GET /orders` devolve todos); a lógica pura está em `orders/history-period.ts`. Se o volume
  crescer, o próximo passo é filtrar no servidor.
- Contador de prontos: a aba "Pedidos enviados" (`AttendantTabs`) mostra um badge verde com os
  pedidos prontos que o usuário pode entregar; ao entregar, o pedido sai da contagem. A regra
  "quem pode entregar" fica em `orders/delivery-rule.ts` (`canDeliverOrder`,
  `countReadyToDeliver`), usada pelo botão de entregar e pelo contador: reutilize, não
  duplique. O badge âmbar de "aguardando envio" (fila offline) continua separado.
- Deploy: Google Cloud (Cloud Run + Cloud SQL PostgreSQL, região `southamerica-east1`).
  Uma imagem (`Dockerfile`, alvo `runtime`) serve a API e o front na mesma origem
  (`WEB_DIST_DIR`); o alvo `migrate` roda `prisma migrate deploy` como Cloud Run Job
  antes de cada release. Atrás do proxy, `TRUST_PROXY=1` (IP real no limite de login) e
  `WEB_ORIGIN` com a URL pública. Mantenha `--max-instances=1`: Socket.IO e o limitador de
  login estão em memória (escalar exige adaptador Redis e limitador compartilhado). Passo a
  passo em `docs/deploy-gcp.md`.
