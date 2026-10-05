# Relatório de implementação da V1

Data: 15/09/2026. Branch: `feat/v1-geographic-dashboard`.

## Implementado

- Fundação React 19, TypeScript strict, Vite 8, Tailwind 4 e TanStack Query.
- Dashboard única NSS/UENF, mobile-first, com mapa SVG via React Simple Maps.
- Brasil com cinco regiões; somente Sudeste avança. Sudeste com ES/MG/RJ/SP; somente RJ avança.
- Malha completa dos 92 municípios do RJ e dados para os quatro municípios previstos.
- Seleção, hover, foco, clique, toque, Enter e Space; breadcrumb e retorno.
- Filtros doença/ano/mês; painel sticky a partir de 1024 px e Drawer abaixo desse breakpoint. Conteúdo compartilhado; fechamento por botão, Escape e toque fora, com controle nativo de foco e retorno ao botão.
- Join por código IBGE, heatmap discreto, legenda contextual e ranking dos quatro municípios cobertos.
- Distinção entre zero declarado, falta de registros e ausência de cobertura. Nenhum total estadual/regional/nacional.
- Estados loading/error/empty/no coverage/success e ações de tentar novamente.
- Interface `EpidemiologyDataSource`, mock sintético e adapter Java intercambiáveis por ambiente.
- Validação de respostas da API, timeout, erros HTTP, códigos de sete dígitos, contagens não negativas e rejeição de registros duplicados.
- README com execução, integração Java, geração cartográfica e testes.

## Não implementado / limitações remanescentes

- Integração com um backend Java real não foi homologada: os endpoints não foram disponibilizados nesta tarefa. O adapter foi validado por interceptação HTTP controlada no navegador.
- O mock contém apenas a fixture documentada DENG/janeiro/2026. Outros meses/anos retornam lista vazia. Outras doenças não foram inventadas: há apenas DENG no mock, enquanto o seletor suporta múltiplas doenças retornadas pelo Java (verificado em teste).
- Validação de navegador limitada ao Chromium; toque foi emulado. Não houve teste físico em celular ou homologação em Safari/Firefox/leitor de tela.
- Malhas de 2020, conforme ano fixado no gerador; não representam atualização cadastral posterior.

## Decisões técnicas

- `mapLevel`, seleção geográfica e filtros permanecem separados. Queries epidemiológicas incluem todos os filtros na chave; geometria tem cache próprio.
- Uma camada cartográfica reutilizável cobre os três níveis, sem criar componentes artificiais por camada.
- Projeção Mercator e presets por nível; nenhuma dependência de tiles ou serviço cartográfico em runtime.
- `dialog.showModal()` fornece modalidade e contenção de foco do Drawer.
- Escala municipal: zero, 1–40, 41–100 e acima de 100. Estados/regiões usam legenda de navegação, sem sugerir totais epidemiológicos.
- Os dados incompletos nunca são convertidos em zero. Município coberto sem registro tem aparência própria e mensagem explícita.
- A configuração padrão é DEMO; modo real não faz fallback para mock após falha.
- Fetch fica em módulos de dados/HTTP, fora dos componentes visuais.

## Divergências e ambiente

Não foi necessário alterar `documentation/main.tex`, o backend, o pipeline ou o escopo arquitetural. Os checkpoints de Brasil/Sudeste/RJ foram agrupados no commit da camada reutilizável; responsividade foi registrada separadamente.

A exigência de variar doenças no demo encontra apenas uma doença na fixture documentada. A solução preserva os dados fornecidos, sem inventar outra série. A troca de doença foi comprovada com resposta controlada no teste do adapter.

Python 3.14 instalado não foi adequado aos wheels geográficos. Foi usado Python 3.12 do Nix em `/tmp/nss-python312`, com geobr 2.0.0 e GeoPandas 1.1.2. Para bibliotecas nativas, o ambiente precisou de `libstdc++` e zlib via `LD_LIBRARY_PATH`. Não houve alteração do `home.nix` nem necessidade de rebuild. Caminhos do Nix store são locais e devem ser redescobertos em outro ambiente.

Durante os downloads ocorreram interrupções de rede e avisos HTTPS não verificado emitidos no ambiente Python. A geração terminou com código 0. Os assets foram depois reabertos e validados independentemente. Os testes também emitiram avisos informativos de `NO_COLOR/FORCE_COLOR`.

## Validação

- `npm run build`: **PASS**.
- `npm run lint`: **PASS**.
- `npm test` com `CHROMIUM_PATH` local: **PASS**, 7 testes.
- `git diff --check`: **PASS**.
- Cartografia: contagens 5/4/92, geometrias válidas, códigos únicos, presença dos quatro códigos cobertos e ausência de valores epidemiológicos nos GeoJSONs: **PASS**.
- Navegação por teclado e toque, filtro de mês/ano/doença, zero explícito, empty, loading, error, retry, ausência de fallback sintético, Drawer e retorno: **PASS**.
- Documentação LaTeX não foi alterada; não houve recompilação de PDF.

Os testes geram capturas em `/tmp/nss-{brazil,rj}-<largura>.png`, `/tmp/nss-drawer-<largura>.png` e `/tmp/nss-southeast-375.png`. São evidências locais temporárias; podem ser recriadas executando a suíte.

## Cartografia

Origem: geobr/Ipea, malhas IBGE de 2020, `simplified=True`. Nenhuma simplificação adicional. Exportação EPSG:4326, ordenada por código, em GeoJSON/SVG.

| Asset | Feições | Propriedades de identificação |
| --- | ---: | --- |
| `public/maps/brazil-regions.geojson` | 5 | `code_region`, `name_region`, `abbrev_region` |
| `public/maps/southeast-states.geojson` | 4 | `code_state`, `name_state`, `abbrev_state` |
| `public/maps/rj-municipalities.geojson` | 92 | `code_muni`, `name_muni`, `abbrev_state` |

Gerador: `scripts/generate_maps.py`. Dependências: `scripts/requirements-maps.txt`. Volume total aproximado: 3,74 MB sem compressão HTTP. Os arquivos ficam versionados; Python só é necessário para regenerá-los.

## Responsividade

Inspeção visual e automação em **375, 768, 1024 e 1440 px**, sem overflow horizontal. Em 375/768 px, mapa em largura total e painel fechado por padrão. Em 1024/1440 px, mapa e painel em duas colunas. O breakpoint de 1024 px preserva espaço de leitura do painel. Drawer adicionalmente avaliado em altura de 812 px com toque emulado.

## Commits

1. `5b470f8` — fundação Vite/React/TypeScript.
2. `f695d8b` — contrato epidemiológico, mock e estados de navegação.
3. `4497641` — cartografia geobr/IBGE.
4. `570d485` — navegação acessível, heatmap e ranking.
5. `8b8b60e` — dashboard responsiva, filtros compartilhados e Drawer.
6. `ad4b823` — adapter Java validado.
7. `2d9e40e` — formatação para manutenção.
8. `91e402a` — testes de navegação, responsividade e estados da API.

9. `487ce16` — legenda de navegação distinta da escala municipal.

O commit deste relatório e do README aparece em seguida no histórico.

## Estado para próxima etapa

**V1 pronta para demonstração em modo DEMO**, com as limitações declaradas acima. Execute `npm run dev` e mantenha `VITE_USE_MOCKS=true`. Para integração real, disponibilize o contrato Java documentado, configure CORS e mude as variáveis de ambiente.
