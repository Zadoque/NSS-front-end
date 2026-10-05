# Assets territoriais de Campos dos Goytacazes

Status: **PHASE1_COMPLETE=YES** para a base territorial auditada, com lacunas explícitas de localidades sem polígono.

## Source inventory

As fontes oficiais foram consultadas em 05/10/2026 e baixadas por `scripts/build_ibge_territories.py`:

- IBGE, Malha de Distritos 2022, RJ: `https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2022/distritos/shp/UF/RJ_distritos_CD2022.zip`.
- IBGE, Arquivo geoespacial de Bairros 2022, RJ: `https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2022/bairros/shp/UF/RJ_bairros_CD2022.zip`.
- IBGE, Localidades do Brasil 2022, arquivos por UF: `https://geoftp.ibge.gov.br/organizacao_do_territorio/estrutura_territorial/localidades/Localidades_do_Brasil/2022/Localidades_UFs_shp.zip`.
- CIDAC 2019, `documentation/Perfil-dos-Bairros.pdf`, usado para nomes e hierarquia, não para geometria.

Campos reais inspecionados: distritos (`CD_MUN`, `CD_DIST`, `NM_DIST`), bairros (`CD_MUN`, `CD_DIST`, `CD_BAIRRO`, `NM_BAIRRO`) e localidades (`CD_MUN`, `CD_LOCALID`, `NM_LOCALID`, `CT_LOCALID`, `SCT_LOCALI`, latitude/longitude). Não foram presumidos nomes de colunas.

## District geometry

O download do IBGE contém 300 distritos no RJ e **14 em Campos**, todos com polígonos oficiais. O crosswalk explícito está em `data/reference/cidac-ibge-district-crosswalk.json`.

`DISTRICT_GEOMETRY=COMPLETE`.

O IBGE usa nomes administrativos mais específicos em quatro casos: `Campos dos Goytacazes` → Distrito Sede, `Santo Amaro de Campos` → Santo Amaro, `São Sebastião de Campos` → São Sebastião, `Tocos` → Tócos e `Vila Nova de Campos` → Vila Nova. Esses aliases estão codificados explicitamente; não há match por substring.

## Neighborhood geometry

O download contém 1.509 bairros no RJ e **78 em Campos**. Após restringir o pai distrital e exigir correspondência nominal exata ou normalizada, **73 polígonos** foram associados a IDs CIDAC/NSS. Os cinco polígonos IBGE restantes (`da Penha`, `Parque Carlos de Lacerda`, `Parque São Mateus`, `Parque Dr. Beda`, `Sumaré`) não foram atribuídos a uma localidade CIDAC por aproximação e não entram no GeoJSON canônico.

`public/maps/campos-neighborhoods.geojson` contém somente os 73 polígonos oficiais reconciliados. Não há buffers, Voronoi, convex hulls, bboxes ou polígonos desenhados a partir do PDF.

`NEIGHBORHOOD_GEOMETRY=PARTIAL_OFFICIAL`.

## CIDAC ↔ IBGE crosswalk

O catálogo CIDAC continua com **14 distritos e 209 localidades**. Cada localidade está classificada em `data/reference/cidac-ibge-territory-crosswalk.json` com `ibgeMatchType` e `geometryStatus`.

| Métrica | Valor |
|---|---:|
| CIDAC districts | 14 |
| CIDAC localities | 209 |
| IBGE district polygons in Campos | 14 |
| IBGE neighborhood polygons in Campos | 78 |
| CIDAC localities with official polygon | 73 |
| `EXACT` polygon matches | 71 |
| `NORMALIZED_EXACT` polygon matches | 2 |
| `MANUAL_VERIFIED` | 0 |
| `IBGE_LOCALITY_POINT_ONLY` | 45 |
| `NO_GEOMETRY` / `NO_MATCH` | 91 |

Matching determinístico remove acentos e pontuação somente para comparação. Fuzzy matching não promove nenhum resultado. Para polígonos, `CD_DIST` foi usado como restrição de pai. Pontos de localidades permanecem `POINT_ONLY`; ponto nunca é convertido em polígono.

## IBGE Localities reconciliation

Foram encontrados 134 registros pontuais de localidades de Campos no produto IBGE. 45 entradas CIDAC tiveram uma correspondência nominal exata não ambígua e foram marcadas `IBGE_LOCALITY_POINT_ONLY`. As demais ficaram `NO_GEOMETRY` quando não havia ponto nominal exato ou polígono reconciliável.

## GeoCampos/CIDAC investigation

O portal oficial `https://geo.campos.rj.gov.br/` foi inspecionado nas páginas Acervos, Mapas e Dados. O site expõe publicações, mapas e PDFs; não foi encontrado endpoint público `WFS`, `WMS`, `GeoServer`, `ArcGIS REST FeatureServer` ou download Shapefile/GeoPackage/GeoJSON de bairros/localidades. Os endpoints testados `/geoserver/`, `/geoserver/ows` e `/arcgis/rest/services` retornaram 404. O PDF do Perfil dos Bairros confirma o papel conceitual do CIDAC, mas não fornece vetor reutilizável.

## CRS e validação

As três fontes IBGE declararam SIRGAS 2000, EPSG:4674. O pipeline reprojeta para WGS84/EPSG:4326, compatível com GeoJSON web. Foram validados: 14 distritos, 73 polígonos reconciliados, IDs únicos, propriedades canônicas, `parentDistrictId`, município `3301009`, geometria não vazia e leitura independente dos GeoJSONs pelo GDAL. A fonte oficial possui Polygon/MultiPolygon; a mistura de tipos é preservada.

As áreas distritais vieram da mesma malha IBGE 2022 e cobrem o município por construção cartográfica da fonte. Auditoria com GDAL/GEOS em EPSG:31983 produziu: `sum_area=4,043,101,095.07693 m²`, `district_union_area=4,043,101,095.07678 m²` e `overlap_area_proxy=0.0001502 m²`; a diferença é numérica, sem overlap significativo. Distritos: 0 inválidos/0 vazios. Bairros reconciliados: 0 inválidos/0 vazios. Não foi aplicada simplificação adicional, portanto não há tolerância de simplificação a ocultar gaps/overlaps.

## Reproducibility

```sh
nix shell nixpkgs#gdal nixpkgs#unzip -c python3 scripts/build_ibge_territories.py
python3 scripts/generate_territories.py
```

Os downloads ficam em `data/raw/ibge-2022/`, ignorados pelo Git. URLs, data, CRS e SHA-256 estão em `data/reference/geospatial-sources.json`.

## Canonical IDs

Os IDs NSS `CG_DIST_*` e `CG_LOC_*` permanecem a identidade lógica. Códigos IBGE são referências externas e não substituem esses IDs.

## Residual gaps

- 91 localidades CIDAC permanecem sem geometria pública oficial reconciliada.
- 45 possuem ponto oficial IBGE, sem polígono.
- O portal municipal não ofereceu vetor público adicional durante a investigação.
- A camada V2 deve distinguir `POLYGON_OFFICIAL`, `POINT_ONLY` e `NO_GEOMETRY` de cobertura epidemiológica.
