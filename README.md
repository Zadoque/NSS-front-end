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

### Dados de demonstração

A única fixture fornecida pela especificação é **DENG / janeiro / 2026**:

| Município | Código IBGE | Casos sintéticos |
| --- | --- | ---: |
| Campos dos Goytacazes | 3301009 | 120 |
| Macaé | 3302403 | 85 |
| Itaperuna | 3302205 | 42 |
| São João da Barra | 3305000 | 18 |

Outros anos/meses retornam uma lista vazia, mostrada como **sem registros neste recorte**. Não foram inventadas outras doenças ou séries. A lista de doenças do mock contém apenas DENG; o seletor suporta a lista retornada pelo Java. Zero só é exibido quando um registro declara `casesTotal: 0`. Municípios sem cobertura são cinza. Não há totais estaduais, regionais ou nacionais.

## API Java

```env
VITE_USE_MOCKS=false
VITE_API_BASE_URL=http://localhost:8080
```

Reinicie o Vite após alterar o ambiente. Em produção essas variáveis são incorporadas no build. O adapter usa exclusivamente:

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

A documentação LaTeX não foi alterada. Instruções específicas: [COMPILACAO_NIX_NSS_FRONT_END.md](COMPILACAO_NIX_NSS_FRONT_END.md).

## Homepage e navegação da V1

`/` apresenta a missão institucional do NSS, iniciativa da UENF em fase inicial, seus objetivos futuros e as funcionalidades atuais em seções distintas. Informa a fonte inicial SINAN/PySUS da pipeline, a parceria em estabelecimento com a Prefeitura de Campos dos Goytacazes e a localização no Hospital Veterinário Darcy Ribeiro. O modo demo continua explicitamente sintético; objetivos de contingência, logística e integração de saúde humana, animal e ambiental não são anunciados como funcionalidades prontas.

**Explorar mapa** abre `/mapa`; **Página inicial** retorna à homepage. Uma navegação mínima com History API preserva links reais, cliques modificados e voltar/avançar do navegador, sem dependência adicional. Ao mudar de página, o título e o foco no heading são atualizados. O servidor de produção precisa redirecionar caminhos da SPA (incluindo `/mapa`) para `index.html`. Trocar de página reinicia a navegação e os filtros do dashboard; o cache TanStack Query permanece na aplicação.

`useMapNavigation` mantém um único objeto com nível e seleção. Região e estado são derivados desse objeto e do caminho fixo da V1. Mapa, ranking e seletores chamam `select`; breadcrumb e opções de retorno chamam `navigate`, que limpa a seleção. Assim, retornar ao Brasil também limpa estado e município. Regiões/estados sem drill-down continuam selecionáveis no mapa para consultar o aviso, e aparecem indisponíveis para navegação nos selects.

O seletor aparece acima do mapa em todas as larguras, com controles empilhados abaixo de 768 px e alvos de 48 px. Para os 92 municípios da geometria do RJ, foi adotada pesquisa sem distinção de acentos junto a um select nativo: preserva a interação de teclado, leitor de tela e seletor do sistema no celular, sem implementar um combobox personalizado. O texto de pesquisa é apenas um filtro de opções, nunca estado geográfico; a opção atualmente selecionada continua disponível durante a busca. Carregamento e falha da cartografia têm feedback e nova tentativa, usando o mesmo cache do mapa.

A geometria completa não amplia a cobertura: somente Sudeste/RJ permitem drill-down e somente os quatro municípios documentados possuem cobertura epidemiológica. Ausência de registros não equivale a zero. Contratos, transporte e responsabilidades de pipeline/backend permanecem inalterados.

Os testes adicionais cobrem homepage, histórico, seletores → mapa, mapa/ranking → seletores, breadcrumb, pesquisa sem acentos, teclado, municípios sem cobertura e ausência de overflow no smartphone.

Validação desta ampliação: `npm ci`, `npm run lint` e `npm run build` concluídos; suíte completa com **11 testes aprovados**. Neste ambiente NixOS, `npm test` precisou de execução fora do sandbox para abrir as portas 5173/5174 e de `CHROMIUM_PATH` apontando para o Chromium 152 instalado em `/nix/store` (o navegador padrão do Playwright não estava instalado). Nenhum backend externo foi necessário: os testes da API interceptam HTTP com respostas controladas.
