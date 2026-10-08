# NSS Front-end

Dashboard cartográfica do Núcleo de Situação de Saúde (NSS/UENF). A fonte arquitetural é [documentation/main.tex](documentation/main.tex).

## Executar a demonstração

Requer Node.js compatível com Vite 8 (22.12+; validado com 26.8.1) e npm.

```sh
npm ci
cp .env.example .env
npm run dev
```

Abra o endereço indicado pelo Vite. O modo padrão é **DEMO**, com dados explicitamente sintéticos, sem backend. A cartografia é local e não requer Python em runtime.

Navegue pelo mapa: **Brasil → Sudeste → Rio de Janeiro**. Somente Sudeste e RJ permitem avançar. Use o breadcrumb ou **Voltar** para retornar. Cada polígono aceita clique, toque, foco, Enter e Space. No celular, abra **Filtros e informações**; feche pelo botão, Escape ou toque fora. Em larguras a partir de 1024 px o mesmo conteúdo aparece no painel lateral sticky.

### Dados da demonstração estática

O modo de desenvolvimento continua usando fixtures sintéticas. Já o build
`prod-mock` publica um snapshot real agregado, sem backend e sem atualização em
tempo real. O snapshot inclui seis agravos, de 2023 a 2026, nos quatro
municípios do escopo:

| Agravos | Período | Municípios | Notificações agregadas |
| --- | --- | --- | ---: |
| CHIK, DENG, FMAC, TOXC, TOXG e ZIKA | 2023–2026 | Campos dos Goytacazes, Macaé, Itaperuna e São João da Barra | 38.782 |

Para Campos dos Goytacazes, a demonstração permite o drill-down de município
para distritos e, no Distrito Sede, para bairros/localidades da unidade
notificadora. Os filtros de ano, mês, sexo e faixa etária são aplicados no
navegador sobre os agregados publicados. O território representa a unidade
notificadora, não a residência do paciente.

O snapshot preserva ausência de mapeamento como ausência explícita; ela não é
convertida em território válido nem em zero. Municípios sem cobertura no recorte
selecionado continuam identificados na interface. Não são publicados usuários,
credenciais ou linhas individuais do SINAN. A data da publicação e os hashes dos
arquivos estão em `data/static-snapshot/manifest.json`.

## API Java

### Build público independente: `prod-mock`

O build habitual `npm run build` continua usando API e autenticação reais,
mesmo quando flags de mock estiverem definidas. O terceiro modo é explícito:

```sh
npm run build:prod-mock
docker build -f Dockerfile.prod-mock -t nss-frontend:prod-mock .
```

O artefato estático da demonstração fica em **`dist/prod-mock/`**, separado do
build normal. Publique somente essa pasta. É um build otimizado de produção;
não use `npm run dev` ou `vite preview` como servidor público.
O build normal limpa `dist/`, portanto, quando precisar dos dois artefatos,
gere primeiro `npm run build` e depois `npm run build:prod-mock`.

`prod-mock` usa um snapshot real agregado independentemente de `VITE_USE_MOCKS`,
`VITE_DATA_SOURCE` ou da URL da API. A entrada pública não pede credenciais.
Primeiro acesso, recuperação de senha e administração não estão disponíveis,
inclusive por URL direta. Não há proteção de acesso real nessa demonstração.
Os mapas GeoJSON continuam sendo carregados da mesma origem.

A imagem separada usa `nginx.prod-mock.conf`, com CSP, cabeçalhos de segurança
e bloqueio de `/api` e `/actuator`. Não configure o proxy externo para encaminhar
essas rotas ao Java. O Compose e os serviços NixOS da stack completa precisam
de configuração independente antes de publicar somente esta imagem.
Não são necessários banco, Java, pipeline ou segredos desses serviços.

O snapshot inclui CHIK, DENG, FMAC, TOXC, TOXG e ZIKA de 2023 a 2026 nos quatro
municípios, com filtros reais de período, sexo e faixa etária. Inclui os distritos
de Campos e bairros/localidades da sede. É território da unidade notificadora,
não de residência. Mapeamento ausente não é convertido em território ou zero.
O modo de desenvolvimento continua com suas fixtures sintéticas, sem mudanças.

O snapshot atual representa 38.782 notificações em 6.020 combinações agregadas.
Foi extraído em 08/10/2026, com última publicação no banco em 07/10/2026. Não é
atualizado em tempo real. O manifest inclui data, catálogo e SHA-256 dos arquivos.
Arquivos são carregados sob demanda por agravo, sem compor o bundle JavaScript.
Os dados ficam em `data/static-snapshot`, fora de `public`: apenas o comando
`build:prod-mock` os copia para o artefato. O build habitual não os publica.

Para atualizar, com Docker e Python 3 disponíveis, use um container PostgreSQL
autorizado e o catálogo territorial do Java:

```sh
python3 scripts/export-static-snapshot.py --container nss-v1-db-1 --catalog ../Site-Sala-de-Situa-o-de-Saude-Java/src/main/resources/territories/campos.tsv
npm run test:builds
npm run build:prod-mock
```

O exportador usa transação repeatable-read/read-only e whitelist de municípios
e colunas. Gera também 180 resultados SQL de referência para testes. Mantém nulos,
sexo ignorado e a situação do mapeamento; elimina unidade, nascimento, semana,
classificação, evolução e identificadores internos, que não são filtros da UI.
Atualize e versione arquivos, manifest e oráculo juntos. A publicação foi
autorizada como snapshot público: inclusive contagens pequenas serão baixáveis.

Validação dos dois builds finais, sem backend (também executada no CI):

```sh
npm run test:builds
# NixOS: CHROMIUM_PATH=/caminho/para/chromium npm run test:builds
# Contra a stack Caddy já iniciada (somente a suíte UI):
NSS_BUILD_TEST_BASE_URL=http://127.0.0.1:8080 npm run test:builds -- snapshot-ui.spec.ts
```

Variáveis Vite são públicas e resolvidas durante o build. Nunca inclua segredos.
Arquivos `.env.*` locais são excluídos do Git e do contexto Docker, salvo
`.env.example`. Esta alteração não instala CD nem modifica o deployment.

### Configuração da API real

```env
VITE_USE_MOCKS=false
VITE_API_BASE_URL=http://localhost:8080
```

Reinicie o Vite após alterar o ambiente. Em produção essas variáveis são incorporadas no build. Com `VITE_USE_MOCKS=false`, o login usa `POST /api/v1/auth/login`, mantém o access JWT apenas em memória, usa o refresh HttpOnly em `POST /api/v1/auth/refresh`, envia `Authorization: Bearer` nas consultas e faz uma única renovação coordenada quando recebe `401`. Logout chama `POST /api/v1/auth/logout`. O frontend não armazena tokens em `localStorage` ou `sessionStorage`.

O adapter usa exclusivamente:

- `GET /api/v1/diseases` → `{ "items": ["DENG"] }`
- `GET /api/v1/epidemiology/municipalities?disease=DENG&year=2026&month=1` → resposta documentada em `main.tex`.

O Java precisa oferecer esses endpoints e autorizar a origem do front-end por CORS. Falhas HTTP, timeout e respostas inválidas aparecem como erro com opção de tentar novamente. Não existe fallback silencioso para dados sintéticos no modo real. A cobertura geográfica permanece limitada à V1.

`EpidemiologyDataSource` desacopla os componentes do mock/Java. TanStack Query mantém cache separado por doença/ano/mês. O join utiliza o código IBGE de sete dígitos. `src/api/http.ts` e `src/data/maps.ts` concentram Fetch; componentes visuais não chamam Fetch.

## Cartografia

```sh
python3.12 -m venv .venv
. .venv/bin/activate
python -m pip install -r scripts/requirements-maps.txt
python scripts/generate_maps.py
```

A geração requer rede para consultar o geobr. A aplicação já inclui os assets versionados:

- `public/maps/brazil-regions.geojson`: cinco regiões;
- `public/maps/southeast-states.geojson`: ES, MG, RJ e SP;
- `public/maps/rj-municipalities.geojson`: malha completa, 92 municípios.

Fonte: [geobr / Ipea](https://github.com/ipeaGIT/geobr), malhas IBGE de 2020, opção `simplified=True`. Não há simplificação adicional. A saída está em EPSG:4326, ordenada por código, sem atributos epidemiológicos. Preserva `code_region/name_region/abbrev_region`, `code_state/name_state/abbrev_state` ou `code_muni/name_muni/abbrev_state`, conforme a camada. O script valida contagem, códigos únicos e geometrias válidas antes de escrever cada arquivo.

No NixOS, wheels Python podem exigir bibliotecas nativas no ambiente. Isso afeta apenas a regeneração dos mapas; não é necessário alterar o ambiente para rodar a dashboard. Consulte o relatório de implementação para o ambiente usado nesta entrega.

## Validação

```sh
npm run build
npm run lint
npm test
```

Os testes usam Playwright. Instale seu Chromium com `npx playwright install chromium`, ou aponte `CHROMIUM_PATH` para um Chromium local compatível. A suíte cobre navegação, cobertura, filtros, Drawer, retorno e ausência de overflow em 375, 768, 1024 e 1440 px, além da validação do contrato e zero explícito.

Para servir o build: `npm run preview`. Para publicar, sirva `dist/` como aplicação estática.

### Imagem de produção

O `Dockerfile` produz o build Vite e o serve com Nginx. Na integração com Caddy, construa com `VITE_USE_MOCKS=false` e `VITE_API_BASE_URL` vazio, para que o navegador use a mesma origem e o Caddy encaminhe `/api/*` ao Java:

```sh
docker build --build-arg VITE_USE_MOCKS=false --build-arg VITE_API_BASE_URL= -t nss-frontend:local .
```

A documentação LaTeX não foi alterada. Instruções específicas: [COMPILACAO_NIX_NSS_FRONT_END.md](COMPILACAO_NIX_NSS_FRONT_END.md).

## Homepage e navegação da V1

`/` apresenta a missão institucional do NSS, iniciativa da UENF em fase inicial, seus objetivos futuros e as funcionalidades atuais em seções distintas. Informa a fonte inicial SINAN/PySUS da pipeline, a parceria em estabelecimento com a Prefeitura de Campos dos Goytacazes e a localização no Hospital Veterinário Darcy Ribeiro. O modo demo continua explicitamente sintético; objetivos de contingência, logística e integração de saúde humana, animal e ambiental não são anunciados como funcionalidades prontas.

**Explorar mapa** abre `/mapa`; **Página inicial** retorna à homepage. Uma navegação mínima com History API preserva links reais, cliques modificados e voltar/avançar do navegador, sem dependência adicional. Ao mudar de página, o título e o foco no heading são atualizados. O servidor de produção precisa redirecionar caminhos da SPA (incluindo `/mapa`) para `index.html`. Trocar de página reinicia a navegação e os filtros do dashboard; o cache TanStack Query permanece na aplicação.

`useMapNavigation` mantém um único objeto com nível e seleção. Região e estado são derivados desse objeto e do caminho fixo da V1. Mapa, ranking e seletores chamam `select`; breadcrumb e opções de retorno chamam `navigate`, que limpa a seleção. Assim, retornar ao Brasil também limpa estado e município. Regiões/estados sem drill-down continuam selecionáveis no mapa para consultar o aviso, e aparecem indisponíveis para navegação nos selects.

O seletor aparece acima do mapa em todas as larguras, com controles empilhados abaixo de 768 px e alvos de 48 px. Para os 92 municípios da geometria do RJ, foi adotada pesquisa sem distinção de acentos junto a um select nativo: preserva a interação de teclado, leitor de tela e seletor do sistema no celular, sem implementar um combobox personalizado. O texto de pesquisa é apenas um filtro de opções, nunca estado geográfico; a opção atualmente selecionada continua disponível durante a busca. Carregamento e falha da cartografia têm feedback e nova tentativa, usando o mesmo cache do mapa.

A geometria completa não amplia a cobertura: somente Sudeste/RJ permitem drill-down e somente os quatro municípios documentados possuem cobertura epidemiológica. Ausência de registros não equivale a zero. Contratos, transporte e responsabilidades de pipeline/backend permanecem inalterados.

Os testes adicionais cobrem homepage, histórico, seletores → mapa, mapa/ranking → seletores, breadcrumb, pesquisa sem acentos, teclado, municípios sem cobertura e ausência de overflow no smartphone.

Validação desta ampliação: `npm ci`, `npm run lint` e `npm run build` concluídos; suíte completa com **11 testes aprovados**. Neste ambiente NixOS, `npm test` precisou de execução fora do sandbox para abrir as portas 5173/5174 e de `CHROMIUM_PATH` apontando para o Chromium 152 instalado em `/nix/store` (o navegador padrão do Playwright não estava instalado). Nenhum backend externo foi necessário: os testes da API interceptam HTTP com respostas controladas.
