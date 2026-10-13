# Arquitetura alvo do frontend NSS

## 1. Objetivo e escopo

Este documento define a organização alvo exclusivamente do frontend e um plano
incremental para resolver quatro problemas identificados na auditoria:

1. regras territoriais repetidas entre componentes;
2. `App.tsx` acumulando roteamento, autenticação e autorização;
3. validação incompleta de dados recebidos da API;
4. `DashboardPage` acumulando domínio, estado de tela e composição visual.

O documento não altera o contrato do Java, a pipeline SINAN/PySUS, o snapshot
`prod-mock` ou a semântica epidemiológica. O snapshot estático do `prod-mock` é
uma capacidade intencional de publicação durante a validação da API.

## 1.1 Estratégia atual de desenvolvimento

O ponto de partida é o frontend que está sendo usado atualmente na branch
`prod-mock`. A evolução inicial deve melhorar organização, domínio, contratos e
testes usando os mesmos dados estáticos, as mesmas rotas e o mesmo formato de
integração já previsto para a API Java.

A futura branch de produção deverá trocar a fonte estática pela API real sem
exigir uma segunda implementação da interface. Pipeline e Java estão sendo
evoluídos em paralelo; este frontend não deve antecipar regras de negócio do
backend nem criar endpoints alternativos.

Playwright é o mecanismo de validação funcional principal. Cada etapa estrutural
deve preservar cobertura significativa dos fluxos de navegação, filtros,
estados de cobertura, autenticação, administração, rotas protegidas e execução
nos modos `prod-mock` e API. Testes unitários de domínio e schemas Zod
complementam o E2E, mas não substituem os fluxos reais de usuário.

Data da pesquisa: 2026-10-13.

## 2. Resumo da stack atual

| Área | Tecnologia atual | Uso observado |
|---|---|---|
| UI | React 19 + React DOM | páginas e componentes em `src/features` |
| Linguagem | TypeScript 6, modo `strict` | tipos, JSX e compilação sem emissão |
| Build/dev | Vite 8 + `@vitejs/plugin-react` | dev server, build SPA e modos `production`/`prod-mock` |
| CSS | Tailwind CSS 4 via plugin Vite + `src/index.css` | Tailwind importado, maior parte dos estilos em CSS global |
| Dados remotos | TanStack Query 5 | cache, loading, erro e retry em hooks do dashboard |
| Mapas | `react-simple-maps` + GeoJSON | mapa SVG interativo, zoom, fullscreen e navegação |
| HTTP | `fetch` próprio em `src/api/http.ts` | API Java, refresh após 401 e credenciais same-origin |
| Autenticação | clientes `realAuth` e `mockAuth` próprios | sessão em memória, refresh e modo DEMO |
| Testes | Playwright | E2E, builds, contratos interceptados e snapshot |
| Qualidade | ESLint + `typescript-eslint` + React Hooks | lint e regras de hooks |
| Publicação | Nginx/Docker | SPA estática e imagem separada `prod-mock` |

Dependências que não existem hoje e serão propostas: um roteador React
declarativo/data router e **Zod** para schemas runtime. Elas devem ser
adicionadas somente na etapa correspondente do plano, com validação de
compatibilidade com React 19/Vite 8.

## 3. Fontes consultadas e decisões extraídas

Foram consultadas fontes oficiais ou de referência técnica reconhecida:

1. [React — Thinking in React](https://react.dev/learn/thinking-in-react): decompor a UI por responsabilidades, manter estado mínimo e derivar valores em vez de duplicá-los.
2. [React — Hooks](https://react.dev/reference/react/hooks): separar estado local, reducer e contexto conforme o alcance real do estado.
3. [React — `createContext`](https://react.dev/reference/react/createContext): contexto serve para dados compartilhados em profundidade, não para transformar toda a aplicação em estado global.
4. [React Router — Routing](https://reactrouter.com/start/framework/routing): rotas devem mapear URL a módulos de rota e podem organizar layouts e grupos protegidos.
5. [React Router — Route Modules](https://reactrouter.com/start/framework/route-module): módulos de rota concentram componente, carregamento, ações e boundaries, além de favorecer code splitting.
6. [React Router — Custom Framework/Data Mode](https://reactrouter.com/start/data/custom): `createBrowserRouter` integra o data router a bundlers customizados como Vite.
7. [TanStack Query — Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys): toda variável usada pela query deve estar na chave serializável e determinística.
8. [Vite — Env Variables and Modes](https://vite.dev/guide/env-and-mode): `VITE_*` é público, valores são substituídos no build e modos são distintos de `NODE_ENV`.
9. [TypeScript — Basic Types](https://www.typescriptlang.org/docs/handbook/basic-types.html): dados externos devem começar como `unknown` e ser estreitados antes do uso.
10. [TypeScript — Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html): type guards e narrowing controlam com segurança a passagem de dados dinâmicos para tipos de domínio.
11. [Zod — Basic usage](https://zod.dev/basics): `parse`/`safeParse` validam dados em runtime e podem produzir o tipo inferido.
12. [OWASP — REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html): entradas e payloads externos não devem ser confiados; tipos, formato, faixa e conteúdo precisam ser validados.
13. [Testing Library — About queries](https://testing-library.com/docs/queries/about/): testes devem refletir como o usuário consulta e interage com a interface.
14. [web.dev — Code splitting](https://web.dev/learn/performance/code-split-javascript): `import()` permite separar código e reduzir o payload inicial.

### Síntese das decisões

- **Organização por feature**, com camadas internas pequenas, é preferível a
  uma grande pasta global de componentes, porque mantém regras e testes perto
  do caso de uso.
- **Roteamento declarativo/data router** é adequado para substituir o conjunto
  de condicionais de `App.tsx`; loaders/actions só devem ser usados quando
  agregarem valor, pois TanStack Query continuará sendo a fonte de cache dos
  dados epidemiológicos.
- **Contexto somente para sessão/configuração**, porque React re-renderiza
  consumidores quando o valor do contexto muda; filtros e navegação pertencem
  ao dashboard, não ao contexto global.
- **Schemas runtime Zod na borda** são necessários mesmo com TypeScript: tipos
  estáticos não verificam JSON recebido em tempo de execução. Os schemas Zod
  serão a fonte de parsing e os tipos de domínio continuarão separados dos
  DTOs HTTP.
- **Query keys devem ser construídas por feature**, incluindo doença, período,
  geografia e escopo territorial usados no request.
- **Code splitting é uma otimização posterior**, não motivo para misturar o
  snapshot SINAN do `prod-mock` com a implementação da API. Os modos continuam
  explicitamente separados.

## 4. Árvore de pastas escolhida

```text
src/
  app/
    App.tsx                    # composição raiz, sem regras de rota/negócio
    main.tsx                   # bootstrap React e providers
    config/
      runtime.ts               # modo, base pública e flags públicas tipadas
    providers/
      AppProviders.tsx         # QueryClient, AuthProvider e demais providers
    router/
      router.tsx               # árvore de rotas, layouts e boundaries
      guards.tsx               # RequireSession/RequirePermission

  features/
    auth/
      api/
        authApi.ts             # login, refresh, logout e recuperação
        authSchemas.ts         # DTOs de autenticação
      model/
        authClient.ts          # interface e implementação real/mock
        AuthProvider.tsx       # sessão observável para a árvore React
        authTypes.ts
      pages/
        LoginPage.tsx
        FirstAccessPage.tsx
        ForgotPasswordPage.tsx
        ResetPasswordPage.tsx
      components/

    dashboard/
      api/
        epidemiologyApi.ts     # operações da feature e adapters
        epidemiologySchemas.ts # response DTOs e erros
        queryKeys.ts
        useEpidemiologyQueries.ts
      domain/
        dashboardModel.ts      # request, cobertura e valores derivados
        dashboardTypes.ts
      geography/
        geographyDomain.ts     # regras de árvore, códigos e transições
        geographyTypes.ts
        geographyCatalog.ts
      pages/
        DashboardPage.tsx      # composição, sem regras de transporte
      components/
        map/
        filters/
        rankings/
        GeographyBreadcrumb.tsx
      hooks/
        useDashboardModel.ts
        useMapNavigation.ts

    admin-users/
      api/
        adminUsersApi.ts
        adminUsersSchemas.ts
        queryKeys.ts
      pages/
        AdminUsersPage.tsx
      components/

    home/
      pages/HomePage.tsx

  shared/
    api/
      httpClient.ts            # fetch, timeout, headers, refresh single-flight
      apiError.ts
    components/                # UI semântica reutilizável e sem domínio
    hooks/                     # hooks genéricos
    schemas/                   # schemas compartilhados apenas quando reais
    types/                     # tipos técnicos compartilhados
    styles/
      globals.css
      tokens.css

  data/
    maps/                      # loader e metadados cartográficos públicos
    sources/                   # mock/static/api, escolhidos na composição
    snapshots/                 # somente se o build precisar de import local

public/
  maps/
  snapshot/

tests/
  e2e/
  contracts/
  fixtures/
```

### Responsabilidades e limites

#### `app`

Inicializa a aplicação, providers, configuração pública e rotas. Não deve
conhecer `3301009`, `CG_DIST_SEDE`, endpoints epidemiológicos ou componentes
internos do mapa. `App.tsx` deve ficar pequeno: renderizar o shell e delegar ao
router.

#### `features/auth`

É dona do ciclo de sessão e das páginas de autenticação. O `AuthProvider`
expõe apenas estado/capacidades (`session`, `status`, `login`, `logout`), sem
expor detalhes de `fetch`. Guards consomem esse contrato, mas não implementam
login.

#### `features/dashboard/geography`

É a única dona da hierarquia territorial. Deve conter:

- tipos de níveis e seleção;
- catálogo e códigos oficiais;
- relação pai/filho;
- níveis com drill-down;
- transições `select`, `navigate` e `goBack`;
- construção do escopo `municipalityCode`/`districtCode`.

Mapa, seletor, breadcrumb, ranking e página apenas consomem funções desse
módulo. Nenhum deles deve repetir códigos ou decidir isoladamente que Campos
abre bairros.

#### `features/dashboard/api`

Converte request de domínio em parâmetros HTTP, valida respostas desconhecidas,
normaliza DTO para modelos internos e define query keys. Nenhum componente deve
chamar `fetch` ou fazer `as SomeResponse` sobre JSON.

#### `features/dashboard/domain`

Contém funções puras e testáveis para:

- montar o request epidemiológico;
- derivar `geography` a partir da seleção;
- interpretar `AVAILABLE`, `UNAVAILABLE` e `PARTIAL`;
- localizar o item selecionado;
- calcular mensagens e totais exibíveis sem somar dados indevidamente.

#### `features/dashboard/pages` e `components`

Pages fazem composição e conectam hooks a componentes. Components renderizam
props, eventos e estados visuais. A regra é: componentes não conhecem ambiente
Vite, adapters, endpoints, códigos territoriais nem sessão real.

#### `features/admin-users`

Concentra DTOs, queries, mutações e componentes de administração. Não deve
reutilizar tipos anônimos de `AdminUsersPage` nem acessar `getJson` diretamente.

#### `shared`

Contém somente abstrações realmente transversais. Não deve virar um depósito
para `coverage`, regras do dashboard ou componentes que só têm um consumidor.

#### `data`

Composição de fontes e assets. `api`, `mock` e `static` implementam a mesma
interface de dados; a decisão de fonte acontece em `app/config`/bootstrap. A
semântica territorial permanece no domínio da feature, não no mock.

## 5. Comparação com a organização atual

| Responsabilidade | Hoje | Problema | Destino |
|---|---|---|---|
| Roteamento | condicionais e `history.pushState` em `src/app/App.tsx` | rota, título, sessão e autorização misturados | `app/router` + guards |
| Sessão | `auth/realAuth.ts`, `mockAuth.ts` e decisões em `App` | UI conhece implementação e flags | `features/auth/model` + `AuthProvider` |
| HTTP | `src/api/http.ts`, chamadas diretas nas páginas | DTOs não têm uma fronteira por feature | `shared/api` + APIs de feature |
| Epidemiologia | `dataSource`, `apiDataSource`, `staticDataSource` | parsing e transporte parcialmente misturados | `dashboard/api` |
| Território | `coverage.ts`, `maps.ts`, `useMapNavigation`, mapa, selector e página | códigos e transições duplicados | `dashboard/geography` |
| Estado do dashboard | `DashboardPage.tsx` | 251 linhas com request, cobertura, textos e JSX | `useDashboardModel` + `dashboard/domain` |
| Tipos | `src/types/epidemiology.ts` | tipos de vários subdomínios em um arquivo | tipos por feature; shared só para tipos comuns |
| Cartografia | loader em `data/maps.ts`, assets públicos e JSON mock | responsabilidade territorial e asset pouco separadas | `data/maps` + domínio de geografia |
| Administração | página contém tipos, HTTP, paginação e mutações | difícil testar e reutilizar | `features/admin-users/api` + model/page |
| Estilos | 649 linhas em `src/index.css` | fronteiras de feature pouco visíveis | `shared/styles` + estilos por feature |

### Situação dos quatro problemas

1. **Regras territoriais:** o mesmo código aparece em `DashboardPage`,
   `GeographicMap`, `GeographySelector`, `useMapNavigation`, mocks e snapshot.
   A solução é uma única API de domínio territorial, não apenas mover
   constantes.
2. **`App.tsx`:** a solução é retirar decisão de rota e guard para um router,
   e sessão para provider. `App` continuará existindo, mas como composição.
3. **DTOs:** `unknown` deve entrar no schema no adapter; só modelos já
   validados podem chegar ao hook/página. O padrão atual de casts em
   `AdminUsersPage` deve ser removido.
4. **`DashboardPage`:** o hook/modelo deve devolver um view-model pronto para a
   página, preservando componentes de mapa, filtro e ranking como renderers.

## 6. Contratos internos propostos

### Domínio territorial

```ts
type GeographyLevel =
  | "region" | "state" | "municipality" | "district" | "neighborhood";

type GeographySelection = {
  level: GeographyLevel;
  code: string;
  name: string;
  parent?: { level: GeographyLevel; code: string };
};

type GeographyDomain = {
  root(): GeographySelection | null;
  select(selection: GeographySelection): NavigationState;
  navigate(level: MapLevel): NavigationState;
  goBack(state: NavigationState): NavigationState;
  scope(selection: GeographySelection | null): TerritoryScope;
};
```

Os componentes não receberão a responsabilidade de construir códigos de
Campos. O domínio fornecerá `scope` e estado de navegação já coerentes.

### API/DTO

```ts
async function getEpidemiology(request: EpidemiologyRequest) {
  const raw: unknown = await http.get(path, params);
  const dto = epidemiologyResponseSchema.parse(raw);
  return mapEpidemiologyDto(dto);
}
```

O schema valida status, filtros, itens, números não negativos, códigos únicos,
campos obrigatórios e diferenças entre `AVAILABLE`, `PARTIAL` e `UNAVAILABLE`.
O modelo de domínio não deve carregar campos específicos da resposta HTTP.

### Dashboard model

```ts
const model = useDashboardModel();
return <DashboardView model={model} />;
```

O model expõe `navigation`, `filters`, `queryState`, `selectionInfo`,
`availableYears`, handlers e permissões de renderização. A página não calcula
novamente esses valores.

## 7. Plano de implementação incremental

Cada etapa deve manter `npm run lint`, `npm run build` e a suíte Playwright
verdes. Não fazer uma migração big-bang.

### Etapa 0 — baseline e contratos

- congelar o comportamento atual com os testes existentes;
- registrar query keys, rotas, modos `development`, `production` e `prod-mock`;
- decidir e documentar a versão compatível do roteador e da biblioteca de
  schemas;
- criar testes de contrato para respostas válidas e inválidas.

**Saída:** baseline reproduzível e critérios de não regressão.

### Etapa 1 — fronteira de infraestrutura

- criar `shared/api/httpClient.ts` a partir de `src/api/http.ts`;
- manter timeout, headers, credentials, refresh single-flight e erros em um
  único lugar;
- adicionar `zod` e criar schemas para autenticação, epidemiologia e
  administração;
- substituir casts nos adapters por parse explícito;
- manter `dataSource` e `prod-mock` sem alteração semântica.

**Saída:** hooks e páginas recebem apenas modelos validados.

### Etapa 2 — domínio territorial

- criar `features/dashboard/geography`;
- migrar códigos, catálogo, drill-down e transições de
  `useMapNavigation`, `GeographicMap`, `GeographySelector` e `DashboardPage`;
- fazer mapa, selector, breadcrumb e rankings consumirem a mesma API;
- adicionar testes unitários das transições, principalmente Campos → distrito
  → bairro → retorno.

**Saída:** nenhuma regra de código territorial duplicada em componente.

### Etapa 3 — modelo do dashboard

- extrair funções puras de request, cobertura, seleção e mensagens;
- criar `useDashboardModel` usando os hooks TanStack Query da feature;
- mover query keys para `dashboard/api/queryKeys.ts`;
- reduzir `DashboardPage` a composição de layout e componentes;
- preservar a distinção semântica entre zero, indisponível e ausência de
  mapeamento.

**Saída:** página fina, model testável e query cache coerente.

### Etapa 4 — sessão, router e guards

- adicionar router declarativo/data router compatível com Vite;
- criar layouts público, autenticado e administrativo;
- criar `AuthProvider`, `RequireSession` e `RequirePermission`;
- mover título, redirects e estados de bootstrap para os módulos de rota;
- manter o access token em memória e o refresh HttpOnly conforme o contrato;
- preservar bloqueios especiais do `prod-mock` em uma política de runtime
  tipada, não em condicionais espalhadas.

**Saída:** `App.tsx` fica apenas como composição de providers/router.

### Etapa 5 — administração e estilos

- extrair `adminUsersApi`, schemas, query keys e mutações;
- retirar `getJson`/`requestJson` da página;
- separar estilos globais, tokens e estilos de feature;
- revisar acessibilidade e foco depois da troca de roteamento.

**Saída:** administração segue o mesmo padrão de fronteira da dashboard.

### Etapa 6 — endurecimento e limpeza

- remover arquivos legados e aliases temporários;
- revisar dependências e imports circulares;
- avaliar `import()` para páginas e fontes que realmente não precisam estar no
  payload inicial;
- executar análise de bundle, testes E2E nos três modos e auditoria final de
  `VITE_*` públicos;
- atualizar README e documentação de operação.

**Saída:** arquitetura alvo consolidada e mensurável.

## 8. Critérios de aceite arquitetural

- nenhum componente contém código territorial específico de Campos;
- nenhuma página faz cast direto de JSON para DTO;
- `App.tsx` não decide permissões nem chama endpoints;
- `DashboardPage` não monta query HTTP nem calcula regras de cobertura;
- cada query variável aparece em sua query key;
- `api`, `mock` e `static` retornam o mesmo modelo de domínio;
- `AVAILABLE`, `PARTIAL`, `UNAVAILABLE`, zero e ausência de registros continuam
  semanticamente distintos;
- `prod-mock` continua funcionando com snapshot SINAN estático e sem API;
- build normal continua apontando para a API Java;
- lint, TypeScript, contratos e Playwright passam em CI.

## 9. Decisão final

A árvore escolhida é **feature-first com camadas internas explícitas**, apoiada
por um núcleo pequeno de infraestrutura compartilhada. Não é recomendado migrar
para uma arquitetura genérica de Clean Architecture com muitas interfaces ou
para um estado global único: o projeto é uma SPA compacta, TanStack Query já
resolve estado remoto e o problema atual é fronteira de responsabilidades.

O primeiro trabalho de maior retorno é a Etapa 1, porque cria a fronteira de
DTOs que as demais etapas reutilizarão. Em seguida, a Etapa 2 elimina a maior
fonte de duplicação de regras; as Etapas 3 e 4 reduzem o acoplamento de página e
app. A ordem permite entregar melhorias pequenas e verificáveis sem interromper
o `prod-mock` usado na validação da API Java.

## 10. Planejamento pré-novas-telas

Nenhuma nova tela deve ser iniciada antes de concluir os gates abaixo. O
objetivo é organizar a fundação do frontend que já existe, sem ampliar o
escopo funcional nem criar rotas paralelas.

### Gate 0 — congelar o comportamento atual

1. Confirmar a branch de trabalho e registrar o commit-base.
2. Executar `npm run lint`, `npm run build` e Playwright nos modos disponíveis.
3. Catalogar rotas atuais, permissões, query keys, fontes de dados e estados de cobertura.
4. Transformar os fluxos críticos em testes de regressão: entrada pública, login DEMO, mapa, retorno, filtros, zero, indisponível, snapshot e logout.

Não iniciar a próxima etapa se o comportamento atual não estiver reproduzível ou se houver teste crítico intermitente sem causa registrada.

### Gate 1 — estabelecer a fronteira HTTP com Zod

1. Adicionar Zod como dependência de runtime.
2. Criar `shared/api/httpClient.ts` para transporte, timeout, headers, refresh coordenado e erros.
3. Criar schemas Zod para autenticação, epidemiologia e administração.
4. Fazer cada adapter receber `unknown`, executar `safeParse`/`parse` e mapear DTO validado para modelo de domínio.
5. Remover casts de resposta nas páginas.
6. Testar respostas válidas, campos ausentes, tipos incorretos, duplicidades, status de cobertura e erros HTTP.

Saída obrigatória: nenhuma tela chama `fetch` ou converte JSON com `as`.

### Gate 2 — centralizar o domínio territorial

1. Criar o módulo `features/dashboard/geography`.
2. Mover para ele níveis, códigos, catálogo, cobertura de drill-down e transições.
3. Fazer mapa, seletor, breadcrumb, ranking e página consumirem o mesmo `GeographyDomain`.
4. Remover códigos territoriais duplicados dos componentes e fontes mock/static.
5. Cobrir Brasil → Sudeste → RJ → Campos → distrito → bairro e todos os retornos com testes de domínio.

Saída obrigatória: componentes não decidem regras de negócio territorial.

### Gate 3 — reduzir `DashboardPage` a composição

1. Criar funções puras para request, escopo, cobertura, seleção e textos.
2. Criar `useDashboardModel` como único controlador da feature.
3. Consolidar query keys e hooks em `dashboard/api`.
4. Fazer `DashboardPage` renderizar um view-model e encaminhar eventos.
5. Manter mapa, filtros, rankings e drawer como componentes de apresentação.

Saída obrigatória: a página não monta request, consulta adapter nem conhece códigos específicos de Campos.

### Gate 4 — separar router, sessão e autorização

1. Adicionar o router escolhido e declarar as rotas existentes.
2. Criar layouts público, autenticado e administrativo.
3. Criar `AuthProvider`, `RequireSession` e `RequirePermission`.
4. Mover título, redirect, bootstrap de sessão e acesso negado para a camada de rota/guard.
5. Manter token em memória, refresh HttpOnly e a política especial do `prod-mock`.
6. Testar acesso direto, refresh da página, 401, logout, permissão e URLs indisponíveis no snapshot.

Saída obrigatória: `App.tsx` não contém árvore de condicionais por rota nem decisão de autorização.

### Gate 5 — padronizar administração e apresentação

1. Aplicar ao `admin-users` o mesmo padrão API → schema → model → page.
2. Separar CSS global, tokens e estilos de feature sem alterar o visual.
3. Revisar foco, teclado, leitores de tela e estados de erro/loading.
4. Remover aliases temporários, imports legados e duplicações identificadas.

Saída obrigatória: dashboard, autenticação e administração usam as mesmas fronteiras arquiteturais.

### Gate 6 — autorização para novas telas

Uma nova tela só pode ser planejada depois que todos os gates anteriores forem aceitos e estes itens estiverem comprovados:

- `npm run lint` e `npm run build` verdes;
- Playwright cobrindo os fluxos existentes nos modos `prod-mock` e API;
- testes de schemas Zod para contratos alterados;
- testes de domínio territorial verdes;
- ausência de casts de JSON nas páginas;
- rotas, guardas e permissões documentados;
- modelo de dados e query key da nova tela definidos antes do JSX;
- nenhuma regra territorial, HTTP ou autorização implementada dentro de componente visual.

### Ordem de execução resumida

```text
Regressão do estado atual
        ↓
HTTP + schemas Zod
        ↓
Domínio territorial único
        ↓
Dashboard model
        ↓
Router + sessão + guards
        ↓
Administração + estilos + acessibilidade
        ↓
Gate de autorização para novas telas
```

Esse planejamento mantém o `prod-mock` utilizável durante toda a organização, preserva as rotas que o Java fornecerá na produção e evita que novas telas consolidem novamente as responsabilidades que estão sendo removidas.
