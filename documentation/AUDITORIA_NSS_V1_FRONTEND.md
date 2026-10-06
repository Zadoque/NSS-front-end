# Auditoria NSS Frontend V2 — System NSS 1.0

## 1. Metadata da auditoria

- data/hora: 2026-10-05T09:45:13-03:00
- branch: main
- HEAD: f1e88b4c83ff01365eccdb1d0effa0004803332b
- AUDIT_BRANCH=main
- AUDIT_HEAD=f1e88b4c83ff01365eccdb1d0effa0004803332b
- AUDIT_WORKTREE_CLEAN=true
- confirmação: a auditoria foi realizada sobre a branch main; git status --short estava vazio na abertura.

Comandos de inventário: git status --short; git branch --show-current; git rev-parse HEAD; git log -10 --oneline --decorate; git ls-tree -r --name-only HEAD; rg com todas as buscas solicitadas; find do repositório; nl/sed dos documentos.

Ferramentas: rg, git, find, sed, nl e date estão disponíveis. npm existe em /etc/profiles/per-user/dock/bin/npm, mas não há package.json, lockfile ou node_modules/ no CURRENT_MAIN. Não foram executados npm install, build, lint, typecheck, testes ou Playwright no CURRENT_MAIN. A implementação histórica tem validações registradas no relatório de baseline, citadas abaixo.

O repositório /home/dock/dev/NSS-deployment foi auditado somente em leitura: branch main, HEAD 179e396fd5e7a45334dd3123fe3263e095550d22, worktree limpo. Seus contratos contracts/api-v1.md, contracts/auth-v1.md e contracts/serving-v1.md e seu README foram incorporados como fonte disponível de NSS 1.0, abaixo do contrato do prompt e acima do código/documentação do frontend.

## 2. Veredito executivo

CONTRACT_SOLID = PARTIAL

FRONTEND_READY_FOR_IMPLEMENTATION = YES_WITH_BLOCKERS

CURRENT_MAIN_IMPLEMENTATION_PRESENT = NO

V1_IMPLEMENTATION_BASELINE_FOUND = YES

V1_REUSE_FEASIBLE = PARTIAL

FRONTEND_V2_REQUIRES_REWRITE = NO

O contrato NSS 1.0 é detalhado o suficiente para iniciar uma implementação fatiada: define a fronteira Java, autenticação, endpoints, notificações, filtros, cobertura e a hierarquia município → distrito → bairro/localidade. Ainda faltam decisões para tratá-lo como contrato de produção: total geral, schema de erros, identificadores cartográficos, bootstrap de sessão, semântica visual de PARTIAL e representação de NI/NA.

A main atual não é uma base frontend executável. Contém documentação V1, sem package.json, código React, tipos, DataSource, assets, testes ou build. Isso é um problema de estado/versionamento, não evidência de que a V1 seja tecnicamente descartável. A implementação V1 encontrada no histórico é uma baseline funcional e deve ser restaurada ou preservada por estratégia de branch/integração aprovada, depois estendida para o contrato NSS 1.0. A implementação só deve começar com os bloqueios P0/P1 registrados controlados.

## 3. Estado real da main

### Documentação

O HEAD contém somente README.md, AGENTS.md, COMPILACAO_NIX_NSS_FRONT_END.md e documentation/main.tex, conforme git ls-tree -r --name-only HEAD. O README chama main.tex de documentação arquitetural da V1 e lista React/TypeScript/Vite/Tailwind/TanStack Query, mock/API e ausência de acesso direto ao PostgreSQL/Python (README.md:5-16). AGENTS.md faz o mesmo e determina não implementar autenticação (AGENTS.md:3-16).

documentation/main.tex tem 797 linhas e descreve uma implementação futura. Há intenção reutilizável de mapa, GeoJSON estático, mobile-first, separação DataSource, join por código e distinção de cobertura; o contrato, porém, é antigo: exclui autenticação, sexo/idade, distritos/bairros e usa casesTotal.

### Implementação, testes, assets e tooling

Não existem src/, package.json, vite.config.*, tsconfig*, eslint*, public/, scripts/, tests/, e2e/, playwright.config.* ou lockfile. Não há componentes React, EpidemiologyDataSource, mockDataSource, apiDataSource, queries TanStack, cliente HTTP, rotas, mapa, filtros ou sessão para testar. Não há GeoJSON, JSON de UBS ou outros assets.

O histórico possui uma implementação V1 completa nos commits b284897, ad4b823, 2d9e40e e 91e402a, mas seus arquivos não estão no HEAD; não são estado atual da main. Eles são a V1_IMPLEMENTATION_BASELINE, não apenas contexto histórico. As referências a build/lint em main.tex:716,740,749-750 são plano/critério futuro para CURRENT_MAIN; a baseline possui validações registradas em documentation/V1_IMPLEMENTATION_REPORT.md.

### Quanto da arquitetura é V1 antiga

Praticamente toda a arquitetura registrada é V1. Os princípios de fronteira Java e assets cartográficos ainda são compatíveis. Conflitam diretamente com NSS 1.0: autenticação excluída (main.tex:111,698-707), filtros reduzidos (97-104,465-473), casesTotal (181,241,492,630), três níveis geográficos (449-463) e DataSource municipal-only (312-319).

## 4. Fontes normativas consideradas

1. Contrato NSS 1.0 fornecido no prompt, autoridade máxima.
2. AGENTS.md, especialmente linhas 3–16, auditado como objeto.
3. documentation/main.tex, lido integralmente; evidências principais nas linhas 93–111, 113–247, 249–329, 349–535, 538–696 e 698–795.
4. README.md:5-16.
5. COMPILACAO_NIX_NSS_FRONT_END.md:1-51.
6. /home/dock/dev/NSS-deployment/main em 179e396, incluindo README.md e contracts/api-v1.md, contracts/auth-v1.md e contracts/serving-v1.md.
7. Histórico Git do frontend, usado para identificar e auditar a V1_IMPLEMENTATION_BASELINE, sem atribuí-la ao CURRENT_MAIN.

O contrato do prompt continua sendo a autoridade máxima; os contratos de NSS-deployment confirmam e detalham a mesma direção. O deployment README:5-10, 32, 73-100, 149-163 confirma Frontend V2 na NSS 1.0, same-origin, auth, filtros e ausência de soma. api-v1.md:4-14, 21-120 define API, erros, doenças, filtros, cobertura e geografia.

## 5. Contrato NSS 1.0 reconstruído

O fluxo é SINAN/PySUS → Bronze → Silver → Gold Serving V1 → load.py → PostgreSQL → Java/Spring Boot → React. O frontend consulta somente Java em /api/v1; não acessa PostgreSQL, Parquet, PySUS, dados pessoais ou regras de transformação. GeoJSON territorial e UBS pública são assets estáticos permitidos.

Frontend V2 é evolução de interface dentro de NSS 1.0, não NSS 2.0. Home pode ser pública; /mapa exige login. O access JWT fica em memória, refresh é cookie HttpOnly/Secure administrado pelo browser, 401 dispara refresh controlado e falha leva a /login. Não há signup.

O contrato tem doenças dinâmicas, municípios, distritos e bairros/localidades. A resposta geográfica comum tem metric, geography, filters, coverage e items, com notificationsTotal. A perspectiva municipal é notificação; bairro/localidade é da unidade notificadora, não residência.

Filtros: doença, ano, mês, sexo e uma faixa etária. Sexo usa UI Todos/Masculino/Feminino, traduzida para ausência de sex, M, F. Idade usa faixas oficiais; NI fica incluído quando ageBand é omitido. Multi-select está fora do escopo.

A árvore é REGION → STATE → MUNICIPALITY → DISTRICT → NEIGHBORHOOD. Há quatro municípios com cobertura: Campos dos Goytacazes, São João da Barra, Macaé e Itaperuna. Só Campos tem drill-down intramunicipal, obrigatoriamente município → distrito → bairro/localidade. Os outros três retornam UNAVAILABLE para distritos/bairros. AVAILABLE + 0, UNAVAILABLE e PARTIAL são estados distintos. O frontend não soma nem reconstrói indicadores.

## 6. Matriz de rastreabilidade

| ID | Requisito NSS 1.0 | Estado no frontend | Evidência | Classificação | Severidade | Ação futura |
|---|---|---|---|---|---|---|
| TR-01 | React + Java, PostgreSQL atrás da API | PARTIAL | Fluxo em main.tex:113-135; código ausente | ARCHITECTURE_GAP | P1 | Criar app e cliente Java |
| TR-02 | Mesma origem /api | MISSING | main.tex:322-329 só mostra localhost | SECURITY_GAP | P0 | Base relativa em produção; proxy local |
| TR-03 | Login | CONFLICT | AGENTS.md:9; main.tex:111,698-707 | NORMATIVE_CONFLICT | P0 | Implementar auth sob contrato superior |
| TR-04 | Access em memória | MISSING | Não há aplicação | SECURITY_GAP | P0 | Criar sessão volátil |
| TR-05 | ProtectedRoute /mapa | MISSING | Não há rotas | IMPLEMENTATION_GAP | P0 | Proteger dashboard |
| TR-06 | Refresh/reload | MISSING | Auth postergada em main.tex:783 | SECURITY_GAP | P0 | Bootstrap /auth/refresh |
| TR-07 | Logout | MISSING | Não há cliente | SECURITY_GAP | P1 | Logout 204 e limpeza |
| TR-08 | 401, refresh único e retry | MISSING | Não há HTTP layer | SECURITY_GAP | P0 | Centralizar single-flight |
| TR-09 | Doenças dinâmicas | CONFLICT | main.tex:214-223 usa string/DENG | CONTRACT_GAP | P1 | Tipar code/name |
| TR-10 | Cinco filtros | CONFLICT | main.tex:97-104,465-473,707 | NORMATIVE_CONFLICT | P1 | Expandir tipos/UI |
| TR-11 | Sexo Todos/M/F | MISSING | Sem sex no repo | IMPLEMENTATION_GAP | P1 | Omitir em Todos |
| TR-12 | Faixas e NI | MISSING | Sem ageBand; idade excluída | DATA_SEMANTICS_GAP | P1 | Enum e single-select |
| TR-13 | notificationsTotal | CONFLICT | main.tex:181,241,492,630 usa cases | DATA_SEMANTICS_GAP | P0 | Alinhar DTO, labels e mapa |
| TR-14 | Envelope comum | MISSING | DTO antigo main.tex:230-245 | CONTRACT_GAP | P1 | DTO compartilhado |
| TR-15 | AVAILABLE/UNAVAILABLE/PARTIAL | PARTIAL | Distinção em main.tex:497-517; sem tipo | CONTRACT_GAP | P1 | Tipar status |
| TR-16 | Zero distinto de unavailable | PARTIAL | Regra main.tex:499-509; sem código | IMPLEMENTATION_GAP | P1 | Não materializar ausência como zero |
| TR-17 | Quatro municípios/notificação | PARTIAL | main.tex:197,415-428; ainda “casos” | DATA_SEMANTICS_GAP | P1 | Consumir cobertura correta |
| TR-18 | Campos → distritos → bairros | CONFLICT | MapLevel só tem três níveis | GEOGRAPHIC_GAP | P0 | Adicionar tipos/queries/assets |
| TR-19 | Outros 3 sem drill-down | MISSING | Não há contrato antigo para isso | GEOGRAPHIC_GAP | P1 | Exibir UNAVAILABLE |
| TR-20 | GeoJSON para 5 níveis | PARTIAL | Só 3 assets em main.tex:349-360 | GEOGRAPHIC_GAP | P1 | Definir códigos |
| TR-21 | UBS client-side separado | MISSING | Nenhum asset/tipo | ARCHITECTURE_GAP | P2 | JSON/GeoJSON público |
| TR-22 | Breadcrumb/back/persistência | PARTIAL | Só até RJ em main.tex:430-440 | ARCHITECTURE_GAP | P1 | Tipar e decidir persistência |
| TR-23 | Responsividade | PARTIAL | Intenção main.tex:538-607; sem código | IMPLEMENTATION_GAP | P1 | Mapa/Drawer/touch |
| TR-24 | Acessibilidade | PARTIAL | Intenção main.tex:609-626; sem código | ACCESSIBILITY_GAP | P1 | Foco, teclado, aria, texto |
| TR-25 | loading/errors/empty | PARTIAL | Só estados básicos main.tex:686-696 | CONTRACT_GAP | P1 | Schema e estados |
| TR-26 | Query keys/cache | MISSING | TanStack só citada em 253-265 | ARCHITECTURE_GAP | P1 | Keys completas |
| TR-27 | DataSource completo | CONFLICT | main.tex:312-319 só município | ARCHITECTURE_GAP | P0 | 4 operações geográficas |
| TR-28 | Mock igual à API/sintético | PARTIAL | main.tex:672-684, formato antigo | TEST_GAP | P1 | Fixture NSS 1.0 |
| TR-29 | Sem soma no cliente | PARTIAL | Proibição main.tex:511-517, total em 247 | NORMATIVE_CONFLICT | P1 | Backend fornece ou omitir |
| TR-30 | Sem segredos/dados pessoais | PARTIAL | Sem código; sessão não definida | SECURITY_GAP | P0 | Revisar env/log/storage |
| TR-31 | Unit/component/integration/E2E | MISSING | Nenhum teste; main.tex:716 | TEST_GAP | P1 | Criar matriz |
| TR-32 | Sem signup | COMPLIANT | main.tex:698-707 exclui cadastro | NON_BLOCKING_DEBT | P1 | Manter exclusão |

### Matriz complementar: CURRENT_MAIN x V1_IMPLEMENTATION_BASELINE

| Requisito | Current main | Baseline V1 | Delta V2 |
|---|---|---|---|
| React/TypeScript/Vite/Tailwind | MISSING | COMPLIANT; V1_IMPLEMENTATION_BASELINE @ 5b470f8, package.json e src | Reaproveitar fundação; manter dependências compatíveis |
| TanStack Query | MISSING | COMPLIANT; baseline @ f695d8b e src/features/dashboard/hooks/useEpidemiologyQuery.ts | Reaproveitar hooks e ampliar keys |
| Mapa React Simple Maps | MISSING | COMPLIANT; baseline @ 570d485, src/features/dashboard/components/GeographicMap.tsx | EXTEND para níveis novos |
| GeoJSON | MISSING | COMPLIANT; baseline @ 4497641, public/maps com 5/4/92 features | EXTEND com Campos districts/neighborhoods |
| DataSource | MISSING | PARTIAL; baseline @ f695d8b/ad4b823, dataSource/mockDataSource/apiDataSource | REFACTOR para envelope NSS 1.0 e 4 operações |
| Mock sintético | MISSING | PARTIAL; baseline @ f695d8b, DENG/janeiro/2026 e DEMO explícito | EXTEND mantendo formato idêntico à API |
| API client | MISSING | PARTIAL; baseline @ ad4b823, src/api/http.ts e adapter municipal | REFACTOR para auth, same-origin e contrato real |
| Filtros | MISSING | PARTIAL; baseline @ 8b8b60e, doença/ano/mês | EXTEND com sexo e ageBand; corrigir notificações |
| Navegação geográfica | MISSING | PARTIAL; baseline @ 570d485/b284897, região/estado/município e selector | EXTEND para district/neighborhood generalizados |
| Breadcrumb/back | MISSING | COMPLIANT no escopo V1; baseline @ 570d485, GeographyBreadcrumb.tsx | EXTEND sem segunda navegação para Campos |
| Responsive/Drawer | MISSING | COMPLIANT; baseline @ 8b8b60e, FilterDrawer/FilterPanel | REUSE_AS_IS estrutural; revisar conteúdo/estados |
| Acessibilidade | MISSING | PARTIAL/forte; baseline @ 570d485, foco, Enter/Space, aria e Drawer | EXTEND para níveis e auth; validar leitores de tela |
| Coverage | MISSING | PARTIAL; baseline src/data/coverage.ts distingue sem cobertura e zero, mas usa casos | REFACTOR para AVAILABLE/UNAVAILABLE/PARTIAL |
| Testes | MISSING | COMPLIANT para V1; baseline @ 91e402a, 7 Playwright PASS reportados | EXTEND com auth, contrato, distrito/bairro e E2E real |

## Baseline V1 e estratégia de evolução para V2

V1_BASELINE_COMMIT=b284897989e2f080ce358daa9e9b90f75b911bc4

Esse é o melhor ponto de referência porque é o commit mais recente da branch remota origin/feat/v1-geographic-dashboard e contém a implementação completa da V1, a Home institucional e selectors sincronizados. O relatório SOURCE = V1_IMPLEMENTATION_BASELINE em b284897:documentation/V1_IMPLEMENTATION_REPORT.md registra “V1 pronta para demonstração em modo DEMO”, além de npm run build PASS, npm run lint PASS e npm test PASS com 7 testes. O commit inclui a cadeia de fundação 5b470f8, contrato/mock f695d8b, cartografia 4497641, mapa/acessibilidade 570d485, layout 8b8b60e, adapter Java ad4b823, manutenção 2d9e40e e testes 91e402a.

| Elemento V1 | Commit/arquivo | Estado | Decisão V2 | Motivo |
|---|---|---|---|---|
| Fundação React/TS/Vite/Tailwind | SOURCE = V1_IMPLEMENTATION_BASELINE @ 5b470f8; package.json, tsconfig.json, vite.config.ts | COMPLIANT no baseline | REUSE_AS_IS | Stack coincide; apenas ajustar configuração de produção |
| Providers e composição da app | SOURCE = V1_IMPLEMENTATION_BASELINE @ b284897; src/app/App.tsx, src/main.tsx | PARTIAL | EXTEND | Roteamento manual existente precisa de sessão, Login e ProtectedRoute |
| GeographicMap | SOURCE = V1_IMPLEMENTATION_BASELINE @ 570d485/2d9e40e; src/features/dashboard/components/GeographicMap.tsx | PARTIAL | EXTEND | Renderer SVG, foco e join por código são válidos; nível e campo epidemiológico precisam evoluir |
| GeographyBreadcrumb | SOURCE = V1_IMPLEMENTATION_BASELINE @ 570d485; src/features/dashboard/components/GeographyBreadcrumb.tsx | COMPLIANT na V1 | EXTEND | Generalizar de 3 para 5 níveis e preservar distrito obrigatório |
| useMapNavigation | SOURCE = V1_IMPLEMENTATION_BASELINE @ f695d8b/2d9e40e; src/features/dashboard/hooks/useMapNavigation.ts | PARTIAL | REFACTOR | Mecanismo único é reutilizável, mas MapLevel e seleções terminam em município |
| GeographySelector | SOURCE = V1_IMPLEMENTATION_BASELINE @ b284897; src/features/dashboard/components/GeographySelector.tsx | PARTIAL | EXTEND | Selector e sincronização são úteis; não deve criar atalho município → bairro |
| GeoJSON e loader | SOURCE = V1_IMPLEMENTATION_BASELINE @ 4497641/2d9e40e; public/maps e src/data/maps.ts | PARTIAL | EXTEND | GeoJSON vetorial é válido; adicionar dois níveis e chaves canônicas |
| FilterPanel/FilterDrawer | SOURCE = V1_IMPLEMENTATION_BASELINE @ 8b8b60e/2d9e40e | COMPLIANT estrutural | EXTEND | Layout compartilhado, foco e Drawer são bons; adicionar sexo/idade/cobertura |
| MapLegend | SOURCE = V1_IMPLEMENTATION_BASELINE @ 487ce16; src/.../MapLegend.tsx | PARTIAL | REFACTOR | Separação navegação/escala é válida; trocar casos por notificações e incluir PARTIAL |
| MunicipalityRanking | SOURCE = V1_IMPLEMENTATION_BASELINE @ 570d485/2d9e40e | PARTIAL | EXTEND | Ordenação de itens pode ser preservada se aprovada; labels e total precisam contrato |
| DataSource e hooks | SOURCE = V1_IMPLEMENTATION_BASELINE @ f695d8b/ad4b823 | PARTIAL | REFACTOR | Abstração e TanStack Query devem sobreviver; DTO e operações precisam NSS 1.0 |
| Mock | SOURCE = V1_IMPLEMENTATION_BASELINE @ f695d8b; src/data/mockDataSource.ts | PARTIAL | EXTEND | Preservar fixture sintética e modo DEMO, aderir ao mesmo envelope real |
| API HTTP | SOURCE = V1_IMPLEMENTATION_BASELINE @ ad4b823; src/api/http.ts | PARTIAL | REFACTOR | Fetch centralizado é válido; precisa Bearer, refresh, erros e /api same-origin |
| Home institucional | SOURCE = V1_IMPLEMENTATION_BASELINE @ b284897; src/features/home/HomePage.tsx | COMPLIANT como identidade V1 | REUSE_AS_IS estrutural | Home pública é compatível; apenas links/estado de sessão podem evoluir |
| Testes Playwright | SOURCE = V1_IMPLEMENTATION_BASELINE @ 91e402a/b284897; tests/*.spec.ts | COMPLIANT no escopo V1 | EXTEND | Suíte deve ser mantida e ampliada, não descartada |

O baseline tem dívidas concretas: usa casesTotal, só três filtros, não tem auth, não possui district/neighborhood, usa VITE_API_BASE_URL com fallback localhost e o adapter espera diseases como strings. Essas dívidas justificam EXTEND/REFACTOR por elemento; não justificam rewrite geral. Não há componente que precise ser REPLACE com evidência forte. NEW fica reservado para auth/session, Login/ProtectedRoute, tipos de cobertura NSS 1.0 e assets intramunicipais.

## Análise da divergência HEAD atual x implementação V1

CURRENT_MAIN_HEAD=f1e88b4c83ff01365eccdb1d0effa0004803332b

V1_BASELINE_COMMIT=b284897989e2f080ce358daa9e9b90f75b911bc4

V1_BASELINE_LOCATION=branch remota origin/feat/v1-geographic-dashboard no commit b284897; sequência anterior iniciada em 5b470f8.

RELATIONSHIP=CURRENT_MAIN é ancestral direto do V1_BASELINE pela merge-base f1e88b4c83ff01365eccdb1d0effa0004803332b. origin/main aponta para CURRENT_MAIN; origin/feat/v1-geographic-dashboard aponta para o baseline. Não houve merge da implementação na main atual.

Evidências: git branch -a mostra main, origin/main e origin/feat/v1-geographic-dashboard; git log --left-right main...origin/feat/v1-geographic-dashboard mostra f1e88b4 à esquerda e b284897 com sua sequência de implementação à direita; git ls-tree b284897 contém package.json, src, public/maps, scripts e tests. git log --all --diff-filter=D não mostrou remoção desses diretórios da main. Portanto, não é possível afirmar que o código foi deletado por ser legado. A evidência aponta para divergência de branches/históricos: a main ficou no snapshot documental enquanto a branch de implementação avançou.

O deployment confirma a separação de repositórios em README.md:5, 32 e define Frontend V2 como parte da NSS 1.0 em README.md:9. Seus runbooks não indicam que a V1 de frontend deva ser descartada; ao contrário, deploy-v1.md:65 exige /api/v1 same-origin e :86 exige o fluxo Home → /mapa → login → dashboard → refresh → logout.

## 7. Conflitos normativos

### [NC-01] Autenticação excluída pela V1 antiga

- classificação: NORMATIVE_CONFLICT
- severidade: P0
- arquivo: AGENTS.md:9; documentation/main.tex:111,159,698-707,773-784
- evidência: AGENTS.md manda não implementar autenticação; main.tex exclui login/RBAC e posterga auth.
- contrato esperado: login, refresh, logout, access em memória, cookie HttpOnly, /mapa protegido e sem signup.
- estado atual: sem implementação; seguir literalmente a instrução local produziria conflito.
- impacto: dashboard pública ou sessão insegura.
- ação futura recomendada: contrato NSS 1.0 prevalece; atualizar instruções/documentação em rodada autorizada.

### [NC-02] casesTotal versus notificationsTotal

- classificação: DATA_SEMANTICS_GAP
- severidade: P0
- arquivo: documentation/main.tex:166-197,225-247,479-493,628-642
- evidência: schema, resposta, join e heatmap usam cases_total/casesTotal.
- contrato esperado: métrica notifications, campo notificationsTotal.
- estado atual: documento prescreve vocabulário não homologado.
- impacto: notificações podem ser comunicadas como casos confirmados.
- ação futura recomendada: alinhar tipos, mock, labels e visualização após validação epidemiológica.

### [NC-03] Filtros obrigatórios excluídos

- classificação: NORMATIVE_CONFLICT
- severidade: P1
- arquivo: documentation/main.tex:97-111,465-473,698-718
- evidência: V1 lista somente doença/ano/mês e exclui sexo/idade.
- contrato esperado: cinco filtros; multi-select de idade continua fora.
- estado atual: instrução antiga orienta omitir dois filtros.
- impacto: recortes NSS 1.0 não podem ser consultados.
- ação futura recomendada: refazer tipos, keys, UI e aceite.

### [NC-04] Geografia termina em município

- classificação: GEOGRAPHIC_GAP
- severidade: P0
- arquivo: documentation/main.tex:349-463,720-740
- evidência: três GeoJSONs e MapLevel até RJ_MUNICIPALITIES; GeographySelection até municipality.
- contrato esperado: Region → State → Municipality → District → Neighborhood, com Campos passando por distrito.
- estado atual: não há distrito/bairro.
- impacto: atalho territorial inválido.
- ação futura recomendada: modelar árvore completa sem hacks.

### [NC-05] localhost:8080 aparece como configuração geral

- classificação: SECURITY_GAP
- severidade: P0
- arquivo: documentation/main.tex:322-329
- evidência: única base URL documentada; não há separação dev/prod.
- contrato esperado: Caddy serve / e /api/* same-origin; localhost só dev.
- estado atual: nenhuma configuração executável.
- impacto: cookies, CORS, proxy e deployment podem falhar.
- ação futura recomendada: URL relativa em produção e proxy local explícito.

### [NC-06] Total calculado conflita com proibição de soma

- classificação: NORMATIVE_CONFLICT
- severidade: P1
- arquivo: documentation/main.tex:225-247,511-517
- evidência: endpoint permitiria calcular total, mas frontend não pode reconstruir agregados incompletos.
- contrato esperado: Java/PostgreSQL agregam; frontend não soma indicadores.
- estado atual: não distingue ordenar itens de calcular total.
- impacto: KPI/ranking pode fabricar indicador.
- ação futura recomendada: decidir total oficial e fornecê-lo na resposta, se necessário.

## 8. Auditoria de autenticação e sessão

Não existe autenticação implementada. main.tex:119 atribui auth ao Java, mas 111 e 698-707 excluem a experiência frontend. Para NSS 1.0, login deve postar email/senha em /auth/login; access fica somente em memória e vai no Bearer; refresh sem body usa cookie HttpOnly/Secure; reload chama refresh; logout aceita 204 e limpa estado; /mapa é protegido e Home pública; 401 tem uma única tentativa controlada de refresh e retry seguro; produção é same-origin; não há signup.

Nenhuma ocorrência de localStorage/sessionStorage existe hoje, mas falta uma camada que impeça uso futuro. O contrato ainda não define resposta de refresh sem cookie, single-flight para múltiplos 401, política de retry, rota original ou schema de erro. São lacunas P0/P1.

## 9. Auditoria do contrato HTTP e tipos TypeScript

O DTO antigo em main.tex:230-245 tem disease, year, month e items com cdUf/nmUf/cdMun/nmMun/casesTotal. Falta metric/geography/filters/coverage, distrito/bairro, sexo, idade e erros. O DataSource em main.tex:312-319 oferece apenas doenças como string[] e município.

O futuro DataSource deve ter listDiseases, getMunicipalities, getDistricts e getNeighborhoods, compartilhando tipos entre mock e API. Query keys devem conter filtros, nível, município e distrito. Todos omite sex/ageBand; NI permanece no total com ageBand ausente.

O deployment reduz algumas lacunas que existiam apenas no frontend: api-v1.md:134-138 define erro mínimo e códigos 400/401/403/404/409/500; auth-v1.md:43-53 define login/refresh/logout; serving-v1.md:32-48 define notifications_total, NA e NI. Ainda faltam no frontend os códigos territoriais concretos, status por item/global, ranking/ordenação, total fornecido pelo backend e comportamento para item sem polígono. O mock antigo em main.tex:672-684 é sintético, mas não adere ao envelope NSS 1.0 e nenhum mock atual existe no CURRENT_MAIN.

## 10. Auditoria geográfica

O desenho atual é Brasil → Sudeste → RJ → municípios (main.tex:380-440). No RJ, os quatro municípios com cobertura são Campos dos Goytacazes, São João da Barra, Macaé e Itaperuna; os demais são UNAVAILABLE, não zero. Campos deve ser Campos → DISTRITOS → BAIRROS/LOCALIDADES; nunca município → bairro. Os nomes conceituais de distritos não são IDs/geometrias. São João da Barra, Macaé e Itaperuna não têm drill-down e devem retornar UNAVAILABLE.

Diagrama recomendado:

\`\`\`text
Brasil
└── Sudeste
    └── Rio de Janeiro
        ├── Campos dos Goytacazes [AVAILABLE]
        │   └── Distrito
        │       └── Bairro/localidade [AVAILABLE/UNAVAILABLE/PARTIAL]
        ├── São João da Barra [AVAILABLE]
        │   └── Distrito/bairro [UNAVAILABLE]
        ├── Macaé [AVAILABLE]
        │   └── Distrito/bairro [UNAVAILABLE]
        └── Itaperuna [AVAILABLE]
            └── Distrito/bairro [UNAVAILABLE]
\`\`\`

Breadcrumb antigo (main.tex:430-440) só chega a RJ; deve representar distrito/bairro ou equivalente responsivo sem perder a hierarquia. selectedNeighborhood não é obrigatório se bairro não abrir outro nível; isso é UX.

Os GeoJSONs propostos em main.tex:349-360 são insuficientes. Serão necessários assets de regiões, estados, municípios, distritos/bairros de Campos e propriedades com códigos canônicos. UBS deve ser JSON/GeoJSON público separado.

## 11. Auditoria de filtros

- doença: vem de /diseases; Toxoplasmose só aparece se backend retornar; main.tex:214-223 só exemplifica DENG;
- ano e mês: existem no desenho antigo, mas períodos válidos ainda não foram definidos;
- sexo: Todos/Masculino/Feminino, traduzidos para ausência/M/F; ignorados entram em Todos;
- idade: LT1, 01_04, 05_09, 10_14, 15_19, 20_39, 40_59, 60_64, 65_69, 70_74, 75_79, 80_PLUS; NI técnico;
- sem ageBand inclui NI; sem sex inclui ignorados;
- multi-select está fora do escopo;
- persistência durante drill-down não está decidida. Recomenda-se preservar e colocar nas keys, mas é RECOMMENDATION.

## 12. Semântica epidemiológica e cobertura

O termo oficial é notificações, mas main.tex:171-194,630 usa casos; achado P0. AVAILABLE + 0 é zero real; UNAVAILABLE é falta de cobertura; PARTIAL é incompleta. Ausência nunca vira item zero. A apresentação de PARTIAL ainda precisa de decisão.

O frontend recebe agregados: não calcula idade/faixa, não interpreta NU_IDADE_N ou CLASSI_FIN, não faz join SINAN-CNES, não determina bairro, não acessa CEP/dados pessoais e não soma registros/faixas/municípios. Ordenar itens já agregados pode ser apresentação; somar para criar indicador não é permitido e deve ser confirmado.

## 13. Responsividade e acessibilidade

main.tex:538-607 define mobile-first, mapa 100%, Drawer, Escape, foco e layout 70/30. main.tex:609-626 define mouse/foco/clique/toque/Enter/Space. São requisitos documentados, não validados: não há componentes nem testes.

Gaps: nenhum teste de smartphone/tablet/desktop; nenhum contrato de altura/touch target/tooltip móvel; nenhum aria-label, estado de foco ou relação legenda-polígono; nenhum texto normativo para PARTIAL; nenhum formulário de login; nenhum estado acessível de refresh, 401, 403 ou 5xx. São P1 para pronto.

## 14. Testabilidade

Não foram criados testes. A implementação deve ter unit para serialização/omissão, DTOs, cobertura e breadcrumbs; component para Login, ProtectedRoute, filtros, legenda, tooltip, teclado, Drawer e estados; integration para DataSource, envelope, 401→refresh→retry, refresh falho e logout 204; Playwright/E2E para Home/login/reload/logout, filtros, Campos→distrito→bairro, municípios sem drill-down, responsividade e mock sem backend; e testes de contrato para DTOs, códigos GeoJSON e mocks idênticos à API.

## 15. Lacunas do próprio contrato NSS 1.0

1. Total geral: items[] não diz se há total oficial; P0 se painel/ranking exigir.
2. Ranking: não define se ordenar itens agregados é permitido.
3. PARTIAL: falta apresentação, legenda, tooltip e interação.
4. Sessão: faltam resposta sem cookie, concorrência, retry e rota original.
5. Erros: api-v1.md:134-138 já define schema mínimo e códigos 400/401/403/404/409/500; continua faltando no frontend a política de mapeamento para estados acessíveis e retry.
6. IDs: os contratos definem o grão e NI/NA, mas ainda faltam propriedades GeoJSON e equivalência dos códigos concretos de distrito/bairro/unidade.
7. Item sem polígono: falta comportamento para NI ou fora da malha.
8. NI/NA: Gold explica, API não define exposição.
9. Entrada Brasil/Sudeste/RJ: decisão de UX P2.
10. Persistência de filtros: não normatizada; P2.
11. Anos/meses: falta catálogo e semântica de período vazio; P1.
12. Doenças: falta ordenação/locale/lista vazia; P1.
13. Métrica: falta enum/versionamento; P2.
14. Same-origin/dev: falta proxy/CORS local; P1.
15. Cache: falta TTL, invalidação e offline; P2.
16. UBS: falta schema, atualização, precisão e atribuição; P2.

## 16. Perguntas humanas pendentes

1. Total geral no painel? BLOCKING = YES: Java deve fornecer ou a UI não soma.
2. Regra visual/textual de PARTIAL? BLOCKING = YES para aceite.
3. Códigos/propriedades canônicos distrito/bairro? BLOCKING = YES para join.
4. Como NI/NA aparecem? BLOCKING = YES para bairro.
5. Mantém Brasil → Sudeste → RJ? BLOCKING = NO: UX; tipos suportam ambos.
6. Filtros persistem ao navegar/voltar? BLOCKING = NO para fundação; YES para aceite.
7. Ordenar items para ranking é permitido? BLOCKING = YES se ranking continuar.
8. Quais anos/meses? BLOCKING = NO para tipos; YES para UX final.
9. Política de acessibilidade para SVG/mobile? BLOCKING = NO para API; YES para aceite.

Não delegar a uma LLM: interpretação epidemiológica, Toxoplasmose/CLASSI_FIN, códigos e geometrias oficiais, PARTIAL/NI/NA, totais, cookies/sessão de produção e aprovação de assets/UBS. A LLM pode implementar uma decisão registrada, não homologá-la.

## 17. Arquivos que provavelmente precisarão mudar

### Existentes

README.md, AGENTS.md e documentation/main.tex deverão ser alinhados ao Frontend V2 dentro de NSS 1.0 em rodada autorizada. COMPILACAO_NIX_NSS_FRONT_END.md só mudará se tooling/documentação exigir. Nenhum foi alterado nesta rodada.

### Novos esperados

Provavelmente serão criados package.json, lockfile, configurações Vite/TypeScript/ESLint/Tailwind/Playwright; src/main.tsx, app, rotas, auth, HTTP, sessão, tipos, DataSources, queries e componentes; public/maps/*, public/ubs/*, fixtures sintéticas, tests/* e e2e/*. São planos, não arquivos existentes ou autorização para criá-los agora.

## 18. Plano de desenvolvimento recomendado

- Slice A — baseline e contrato: preservar/restaurar a V1_IMPLEMENTATION_BASELINE por branch/integração aprovada; reconciliar documentação; decidir total, PARTIAL, IDs, NI/NA, erros e ranking; criar tipos NSS 1.0.
- Slice B — fundação: manter Vite/React/TypeScript/Tailwind/TanStack da baseline, ajustar rotas e same-origin/proxy.
- Slice C — auth/session: adicionar login, access em memória, refresh single-flight, retry, logout, ProtectedRoute e sem signup.
- Slice D — DataSource/mock: estender a abstração baseline para quatro operações, envelope igual à API, cobertura e dados sintéticos.
- Slice E — API/queries: serialização, omissões, keys, status HTTP e invalidação.
- Slice F — mapa: regiões, estados, RJ, quatro municípios e cobertura.
- Slice G — Campos/distritos: hierarquia, breadcrumbs, back, foco, toque e filtros.
- Slice H — bairros/UBS: assets canônicos, NI/NA, bairros e markers separados.
- Slice I — cobertura/UX: zero, unavailable, partial, loading, empty, erros e Drawer.
- Slice J — aceite: preservar os testes baseline e estendê-los com unit/component/integration/E2E, acessibilidade, responsividade, build/lint/typecheck.

## 19. Critérios de aceite do futuro desenvolvimento

- [ ] Produção usa /api/v1 same-origin; localhost é apenas dev.
- [ ] Home pública, /mapa protegido, sem signup.
- [ ] Access só em memória; refresh nunca em localStorage.
- [ ] Reload restaura sessão; 401 tem refresh controlado; falha leva a login.
- [ ] Logout chama backend e limpa sessão.
- [ ] Doenças dinâmicas; Toxoplasmose só se retornada.
- [ ] Doença/ano/mês/sexo/idade funcionam; Todos omite parâmetro; idade é single-select.
- [ ] DTOs usam notifications, notificationsTotal, envelope e coverage aprovados.
- [ ] Mock e API têm tipos/envelope idênticos e mock marcado como sintético.
- [ ] Zero, unavailable e partial são distintos em texto, legenda, tooltip e cor.
- [ ] Frontend não soma para fabricar indicador.
- [ ] Suporta Region → State → Municipality → District → Neighborhood.
- [ ] Campos sempre passa por distrito; outros três municípios não abrem drill-down.
- [ ] GeoJSON/API usam códigos canônicos; UBS é asset separado.
- [ ] Mouse, toque, teclado, foco, labels e erros são acessíveis.
- [ ] Funciona em smartphone, tablet e desktop.
- [ ] Existem testes unit/component/integration/contract/Playwright.
- [ ] lint, typecheck e build passam no ambiente documentado.

## 20. Achados classificados

### P0:

NC-01 autenticação; NC-02 casesTotal; NC-04 geografia; NC-05 localhost; TR-04/05/06/08 sessão; TR-27 DataSource; TR-30 segurança; decisões sobre total e IDs.

### P1:

NC-03 filtros; NC-06 total/soma; TR-07/09/10/11/12/14/15/16/17/18/19/20/22/23/24/25/26/28/29/31; erros HTTP, PARTIAL, bootstrap, códigos e NI/NA.

### P2:

UBS, entrada direta em RJ, persistência de filtros, catálogo de períodos, cache/TTL e motion.

### P3:

Refinamento visual, escala avançada, transições e proporção exata do painel, sem alterar semântica.

## 21. Conclusão

1. É seguro iniciar implementação? Sim, em slices e após controlar P0/P1; usando a V1_IMPLEMENTATION_BASELINE como ancestral técnico e o contrato NSS 1.0 como alvo normativo.
2. O que bloqueia? Total oficial, códigos/joins territoriais, PARTIAL, NI/NA e bootstrap/erros de sessão.
3. Primeira alteração na próxima rodada: preservar/restaurar a V1_IMPLEMENTATION_BASELINE por estratégia de branch aprovada, reconciliar a fonte normativa e os tipos NSS 1.0, e então adicionar sessão; não começar de casesTotal nem reescrever sem análise por componente.
4. Decisões não delegáveis à LLM: semântica epidemiológica, códigos oficiais, cobertura técnica, totais, segurança de produção e aprovação de assets/UBS.

### Validação final desta auditoria

Após a criação deste arquivo, foram executados:

\`\`\`text
git status --short
git diff --check
git diff -- documentation/AUDITORIA_NSS_V1_FRONTEND.md
\`\`\`

Resultado registrado:

- git status --short: somente ?? documentation/AUDITORIA_NSS_V1_FRONTEND.md;
- git diff --check: exit code 0, sem erros de whitespace;
- git diff -- documentation/AUDITORIA_NSS_V1_FRONTEND.md: sem saída, porque o relatório é arquivo não rastreado; o status identifica exclusivamente esse arquivo novo. A inspeção do conteúdo foi feita diretamente no arquivo criado;
- nenhum arquivo existente foi modificado, nenhum pacote foi instalado e nenhuma implementação foi criada.
