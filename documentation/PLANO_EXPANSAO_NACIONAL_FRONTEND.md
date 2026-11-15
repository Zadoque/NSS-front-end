# Plano de expansão nacional do frontend

## Diagnóstico dos endpoints Java

O backend já expõe o recorte nacional nos seguintes endpoints:

- `GET /api/v1/epidemiology/region`
- `GET /api/v1/epidemiology/state`
- `GET /api/v1/epidemiology/municipalities`
- `GET /api/v1/epidemiology/districts`
- `GET /api/v1/epidemiology/neighborhoods`
- `GET /api/v1/diseases` e `GET /api/v1/metadata`

Regiões, UFs e municípios usam a dimensão `analytics.dim_municipio`. A
consulta municipal pode, portanto, cobrir o Brasil inteiro sem uma lista
hard-coded no frontend. Já distritos e bairros dependem do catálogo resolvido
para cada município: o `DatabaseTerritoryCatalog` só retorna identificadores
presentes nos fatos publicados, e o `FileTerritoryCatalog` ainda carrega
`territories/campos.tsv`. Isso é suficiente para a semântica de cobertura, mas
não é um catálogo cartográfico nacional. O mapa não deve inferir bairro a
partir de um nome retornado pela API.

## Decisão de entrega cartográfica

Não colocar a malha nacional no bundle JS nem em um único GeoJSON. A primeira
etapa usa arquivos estáticos públicos, servidos pelo nginx/CDN do frontend:

```text
public/maps/national/
  manifest.json
  municipalities.index.json
  municipalities/3301009.geojson
  neighborhoods/3301009.geojson
  health-units/index.json
  health-units/3301009.json
```

O índice é carregado na entrada do mapa. A geometria de município só é buscada
quando necessário e a geometria de bairros somente depois da seleção do
município. O cache do navegador pode manter os arquivos já acessados. O
gerador (`scripts/generate_national_maps.py`) usa a API de malhas simplificadas
de municípios e as malhas oficiais de bairros do IBGE Censo 2022.

Essa estratégia é preferível a importar tudo pelo Vite: mantém o primeiro
carregamento pequeno, permite cache independente e evita reconstruir o bundle
quando um asset cartográfico muda. Para produção, habilitar gzip/Brotli,
`Cache-Control: public, immutable` para arquivos versionados e publicar uma
pasta com hash ou um manifest com versão.

O servidor Java continua sendo a fonte dos dados epidemiológicos e da
cobertura. O servidor do frontend apenas entrega cartografia pública; não deve
duplicar totais ou fazer agregações.

Os estabelecimentos CNES com coordenadas válidas também são publicados como
catálogo estático particionado por município. Essa camada é cadastral e não
contém notificações epidemiológicas, usuários ou pacientes. O navegador busca
somente o arquivo do município selecionado. Municípios com mais de 5.000 pontos
são agrupados visualmente para evitar dezenas de milhares de elementos SVG; o
arquivo de origem permanece completo. O `health-units/index.json` registra
batch, SHA-256, contagens aceitas e rejeitadas.

O modo `VITE_USE_MOCKS=true` também usa essa cartografia nacional. Nesse modo,
os totais continuam sintéticos e limitados à fixture existente, mas a
geometria municipal e a geometria de bairros podem ser visualizadas sem
backend. O fluxo específico Sudeste → Rio de Janeiro → Campos permanece para
compatibilidade da demonstração.

## Resultado da primeira geração

Com as fontes IBGE disponíveis nesta execução foram gerados 5.571 arquivos de
município e 5.571 arquivos de bairros, com 17.575 polígonos de bairros. Os
municípios de DF e TO ficaram com `neighborhoodGeometryStatus: UNAVAILABLE`
porque não há arquivo `UF/*_bairros_CD2022.zip` correspondente no diretório
oficial consultado; isso não deve ser apresentado como zero notificações.
Boa Esperança do Norte (5101837) também permanece sem polígono municipal porque
a API de malhas ainda não fornece sua geometria, embora o município esteja no
catálogo.

## Fases de implementação

1. Gerar e validar o índice nacional e os municípios; validar todos os códigos
   IBGE retornados (atualmente 5.571) e geometria válida.
2. Gerar bairros por município, registrar contagens e casos sem geometria no
   manifest, sem promover localidades ou nomes fuzzy.
3. Alterar o loader do mapa para resolver `municipalityCode`/`districtCode` e
   buscar os assets sob demanda; remover as decisões de Campos do componente.
4. Substituir `demoCoverage` por cobertura retornada pela API, preservando a
   diferença entre `AVAILABLE`, `PARTIAL` e `UNAVAILABLE`.
5. Alinhar o catálogo Java nacional: uma dimensão territorial versionada ou
   uma tabela de referência IBGE/CIDAC por município. O endpoint de bairro deve
   retornar somente territórios que tenham correspondência explícita com a
   geometria e com a semântica de notificação.
6. Testar navegação Brasil → UF → município → bairro, cache, falha de asset,
   município sem bairros publicados e respostas grandes.

## Execução

No ambiente de build com `geopandas` e `geobr` instalados:

```bash
python scripts/generate_national_maps.py --municipalities-only
python scripts/generate_national_maps.py --keep-raw
```

O catálogo CNES deve ser gerado a partir do Parquet Silver aprovado. A imagem
da pipeline já contém `pyarrow`; o comando abaixo apenas lê o volume e grava os
artefatos no frontend:

```bash
docker run --rm --user "$(id -u):$(id -g)" \
  -v "$PWD:/work" \
  -v nss-v1_pipeline_data:/data:ro \
  --entrypoint python nss-pipeline:local \
  /work/scripts/generate_cnes_map_catalog.py \
  /data/silver/cnes/batch_id=20261114T214010Z/data.parquet \
  --output /work/public/maps/national/health-units \
  --snapshot 20261114T214010Z
```

Troque o batch explicitamente ao promover um novo snapshot; não use um caminho
`latest`, para que a geração seja reproduzível.

Os downloads brutos ficam em `data/raw/national-maps/`, que não deve ser
versionado. A publicação dos GeoJSONs deve ocorrer como artefato estático do
servidor/CDN, não como import estático TypeScript.
