# Reconciliação CIDAC–IBGE — Campos dos Goytacazes

Fonte auditável: `data/reference/cidac-ibge-territory-crosswalk.json`. A tabela contém as 209 localidades CIDAC, sem redução do catálogo conceitual.

## Resumo por distrito

| Distrito | CIDAC localidades | Polígono oficial | Ponto-only | Sem geometria |
|---|---:|---:|---:|---:|
| Distrito Sede | 118 | 73 | 6 | 39 |
| Dores de Macabu | 8 | 0 | 3 | 5 |
| Ibitioca | 2 | 0 | 2 | 0 |
| Morangaba | 3 | 0 | 2 | 1 |
| Morro do Coco | 3 | 0 | 1 | 2 |
| Mussurepe | 11 | 0 | 2 | 9 |
| Santa Maria | 2 | 0 | 2 | 0 |
| Santo Amaro | 14 | 0 | 8 | 6 |
| Santo Eduardo | 6 | 0 | 5 | 1 |
| São Sebastião | 12 | 0 | 3 | 9 |
| Serrinha | 1 | 0 | 1 | 0 |
| Tócos | 7 | 0 | 0 | 7 |
| Travessão | 20 | 0 | 8 | 12 |
| Vila Nova | 2 | 0 | 2 | 0 |
| **Total** | **209** | **73** | **45** | **91** |

## Distritos

O cruzamento distrito → distrito é completo: 14/14 polígonos IBGE 2022 foram associados por tabela explícita. O IBGE fornece `CD_DIST`; o NSS mantém `CG_DIST_*`.

## Casos não exatos ou não promovidos

Os dois matches de polígono classificados como `NORMALIZED_EXACT` são `Ips` → `IPS` e `Parque Jóckey Club` → `Parque Jockey Club`; a diferença é apenas caixa/acentuação determinística.

Cinco bairros IBGE possuem polígonos oficiais, mas não receberam associação automática a uma entrada CIDAC: `da Penha`, `Parque Carlos de Lacerda`, `Parque São Mateus`, `Parque Dr. Beda` e `Sumaré`. Eles não entram no GeoJSON canônico porque atribuir qualquer um deles a uma localidade CIDAC seria semanticamente especulativo.

Os 45 `IBGE_LOCALITY_POINT_ONLY` são correspondências nominais únicas do produto Localidades do Brasil. O campo `notes` informa que o ponto não foi promovido a polígono.

As 91 entradas `NO_MATCH` permanecem no catálogo, com `geometryStatus=NO_GEOMETRY`. O JSON completo é a tabela detalhada auditável; nenhum fuzzy match foi aceito como verdade.

## Outputs

- `public/maps/campos-districts.geojson`: 14 polígonos oficiais.
- `public/maps/campos-neighborhoods.geojson`: 73 polígonos oficiais reconciliados.
- `data/reference/cidac-ibge-district-crosswalk.json`: crosswalk dos distritos.
- `data/reference/cidac-ibge-territory-crosswalk.json`: 209 classificações CIDAC.
- `data/reference/geospatial-sources.json`: URLs, CRS, data e checksums.
