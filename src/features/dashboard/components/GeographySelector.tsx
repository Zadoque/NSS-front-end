import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { loadMap, loadMunicipalityIndex } from "../geography/maps";
import { isDemo } from "../api/sources/dataSource";
import type { useMapNavigation } from "../hooks/useMapNavigation";
import { CAMPOS_MUNICIPALITY_CODE, geographyCapabilities, stateRegion } from "../geography/geographyDomain";

const regions = [
  ["N", "Norte"],
  ["NE", "Nordeste"],
  ["CO", "Centro-Oeste"],
  ["SE", "Sudeste"],
  ["S", "Sul"],
] as const;
const states = [
  ["ES", "Espírito Santo"],
  ["MG", "Minas Gerais"],
  ["RJ", "Rio de Janeiro"],
  ["SP", "São Paulo"],
];
const nationalStates = [
  ["11", "Rondônia"], ["12", "Acre"], ["13", "Amazonas"], ["14", "Roraima"], ["15", "Pará"], ["16", "Amapá"], ["17", "Tocantins"],
  ["21", "Maranhão"], ["22", "Piauí"], ["23", "Ceará"], ["24", "Rio Grande do Norte"], ["25", "Paraíba"], ["26", "Pernambuco"], ["27", "Alagoas"], ["28", "Sergipe"], ["29", "Bahia"],
  ["31", "Minas Gerais"], ["32", "Espírito Santo"], ["33", "Rio de Janeiro"], ["35", "São Paulo"], ["41", "Paraná"], ["42", "Santa Catarina"], ["43", "Rio Grande do Sul"],
  ["50", "Mato Grosso do Sul"], ["51", "Mato Grosso"], ["52", "Goiás"], ["53", "Distrito Federal"],
];
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
export function GeographySelector({
  navigation,
  districtItems = [],
}: {
  navigation: ReturnType<typeof useMapNavigation>;
  districtItems?: { code: string; name: string }[];
}) {
  const { region, state, mapLevel, selectedGeography, navigate, select } = navigation;
  const [search, setSearch] = useState("");
  const map = useQuery({
    queryKey: ["map", "RJ_MUNICIPALITIES"],
    queryFn: () => loadMap("RJ_MUNICIPALITIES"),
    staleTime: Infinity,
    enabled: state === "RJ" && ["RJ_MUNICIPALITIES", "CAMPOS_DISTRICTS", "CAMPOS_NEIGHBORHOODS", "MUNICIPALITY_DISTRICTS", "MUNICIPALITY_NEIGHBORHOODS"].includes(mapLevel),
  });
  const nationalIndex = useQuery({
    queryKey: ["municipality-index"],
    queryFn: loadMunicipalityIndex,
    staleTime: Infinity,
    enabled: !isDemo && mapLevel === "NATIONAL_MUNICIPALITIES" && Boolean(state),
  });
  const municipalities = mapLevel === "NATIONAL_MUNICIPALITIES"
    ? (nationalIndex.data ?? []).filter((item) => item.code.startsWith(state)).map((item) => ({ code: item.code, name: item.name }))
    : (map.data?.features ?? [])
    .map(({ properties }) => ({
      code: String(properties?.code_muni),
      name: String(properties?.name_muni),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const municipalityDataReady = mapLevel === "NATIONAL_MUNICIPALITIES" ? nationalIndex.isSuccess : map.isSuccess;
  const municipality =
    selectedGeography?.municipalityCode ??
    (selectedGeography?.level === "municipality" ? selectedGeography.code : "");
  const district =
    selectedGeography?.level === "district"
      ? selectedGeography.code
      : selectedGeography?.districtCode ?? "";
  const districtMapLevel = municipality === CAMPOS_MUNICIPALITY_CODE ? "CAMPOS_DISTRICTS" : "MUNICIPALITY_DISTRICTS";
  const districtMap = useQuery({ queryKey: ["map", districtMapLevel, municipality], queryFn: () => loadMap(districtMapLevel, municipality), staleTime: Infinity, enabled: Boolean(municipality) && ["MUNICIPALITY_DISTRICTS", "MUNICIPALITY_NEIGHBORHOODS"].includes(mapLevel) });
  const neighborhoodMap = useQuery({
    queryKey: ["map", "MUNICIPALITY_NEIGHBORHOODS", municipality],
    queryFn: () => municipality === CAMPOS_MUNICIPALITY_CODE ? loadMap("CAMPOS_NEIGHBORHOODS") : loadMap("MUNICIPALITY_NEIGHBORHOODS", municipality),
    staleTime: Infinity,
    enabled: Boolean(municipality && district && mapLevel !== "MUNICIPALITY_DISTRICTS"),
  });
  const districts = districtItems.length ? districtItems : (districtMap.data?.features ?? [])
      .map(({ properties }) => ({
      code: String(properties?.territoryId),
      name: String(properties?.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const neighborhoods = (neighborhoodMap.data?.features ?? [])
    .filter(({ properties }) => String(properties?.CD_DIST ?? properties?.parentDistrictId) === district.replace(/^IBGE_DIST_/, ""))
    .map(({ properties }) => ({
      code: properties?.CD_BAIRRO ? `IBGE_BAIRRO_${String(properties.CD_BAIRRO)}` : String(properties?.territoryId),
      name: String(properties?.NM_BAIRRO ?? properties?.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const matches = municipalities.filter((item) =>
    normalize(item.name).includes(normalize(search)),
  );
  // Keep the committed selection visible even while searching for the next municipality.
  const options = municipalities.filter(
    (item) => item.code === municipality || matches.includes(item),
  );
  return (
    <section
      className="card geography-selector"
      aria-labelledby="geography-title"
    >
      <h2 id="geography-title">Escolha o território</h2>
      <p>
        Use os controles ou o mapa. Cobertura Nacional em tempo integral.
      </p>
      <div className="geography-fields">
        <div>
          <label htmlFor="region">Região</label>
          <select
            id="region"
            value={region}
            onChange={(event) => {
              setSearch("");
              if (!event.target.value) navigate("BRAZIL_REGIONS");
              else
                select({
                  level: "region",
                  code: event.target.value,
                  name: regions.find(
                    (item) => item[0] === event.target.value,
                  )![1],
                });
            }}
          >
            <option value="">Brasil · Todas as regiões</option>
            {regions.map(([code, name]) => (
              <option
                key={code}
                value={code}
                disabled={!geographyCapabilities.drilldownRegions.includes(code)}
              >
                {name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="state">Estado</label>
          <select
            id="state"
            disabled={!region}
            value={state}
            onChange={(event) => {
              setSearch("");
              if (!event.target.value) navigate(region === "SE" ? "SOUTHEAST_STATES" : "NATIONAL_STATES");
              else
                select({
                  level: "state",
                  code: event.target.value,
                  name: (isDemo ? states : nationalStates).find((item) => item[0] === event.target.value)![1],
                });
            }}
          >
            <option value="">Todos os estados</option>
            {isDemo && region === "SE" &&
              states.map(([code, name]) => (
                <option
                  key={code}
                  value={code}
                  disabled={
                    !geographyCapabilities.drilldownStates.includes(code as "RJ")
                  }
                >
                  {name}
                    {isDemo && code !== "RJ" ? " · Navegação indisponível" : ""}
                </option>
              ))}
            {region === "SE" && !isDemo && nationalStates.filter(([code]) => stateRegion[code] === region).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
            {region !== "SE" && !isDemo && nationalStates.filter(([code]) => stateRegion[code] === region).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="municipality-search">Pesquisar município</label>
          <input
            id="municipality-search"
            type="search"
            disabled={!state || !municipalityDataReady}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Digite parte do nome"
            aria-describedby="municipality-help"
          />
          <label htmlFor="municipality">Município</label>
          <select
            id="municipality"
            disabled={!state || !municipalityDataReady}
            value={municipality}
            onChange={(event) => {
              const item = municipalities.find(
                (item) => item.code === event.target.value,
              );
              if (item) select({ level: "municipality", ...item });
              else navigate(mapLevel === "NATIONAL_MUNICIPALITIES" ? "NATIONAL_MUNICIPALITIES" : "RJ_MUNICIPALITIES");
            }}
          >
            <option value="">Todos os municípios</option>
            {options.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        {municipality && (
          <div>
            <label htmlFor="district">Distrito</label>
            <select
              id="district"
              disabled={!districtItems.length && !districtMap.isSuccess}
              value={district}
              onChange={(event) => {
                const item = districts.find((candidate) => candidate.code === event.target.value);
                if (item) {
                  select({ level: "district", ...item, municipalityCode: municipality });
                } else if (selectedGeography?.level !== "municipality") {
                  select({ level: "municipality", code: municipality, name: selectedGeography?.name ?? "Município selecionado" });
                }
              }}
            >
              <option value="">Todos os distritos</option>
              {districts.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
            </select>
            <p className="selector-help">
              {districtMap.isPending && !districtItems.length ? "Carregando distritos…" : "Distritos derivados do catálogo territorial IBGE/CNES."}
            </p>
          </div>
        )}
        {district && neighborhoodMap.data?.features?.length ? (
          <div>
            <label htmlFor="neighborhood">Bairro da notificação</label>
            <select
              id="neighborhood"
                disabled={!neighborhoodMap.isSuccess}
              value={selectedGeography?.level === "neighborhood" ? selectedGeography.code : ""}
              onChange={(event) => {
                const item = neighborhoods.find((candidate) => candidate.code === event.target.value);
                if (item) {
                  select({ level: "neighborhood", ...item, municipalityCode: municipality, districtCode: district });
                } else {
                  select({ level: "district", code: district, name: districts.find((item) => item.code === district)?.name ?? district, municipalityCode: municipality });
                }
              }}
            >
              <option value="">Todos os bairros da notificação</option>
              {neighborhoods.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
            </select>
            <p className="selector-help">
              {neighborhoodMap.isPending ? "Carregando bairros…" : "O bairro é derivado da unidade notificadora no CNES."}
            </p>
          </div>
        ) : null}
      </div>
      <p id="municipality-help" role="status">
        {state
          ? (mapLevel === "NATIONAL_MUNICIPALITIES" ? nationalIndex.isPending : map.isPending)
            ? "Carregando municípios…"
            : (mapLevel === "NATIONAL_MUNICIPALITIES" ? nationalIndex.isError : map.isError)
              ? "Não foi possível carregar os municípios."
              : `${matches.length} municípios encontrados. A pesquisa filtra opções; a seleção só muda ao escolher um município. Geometria disponível não significa cobertura de dados.`
          : "Selecione um estado para pesquisar os municípios."}
      </p>
      {state && (mapLevel === "NATIONAL_MUNICIPALITIES" ? nationalIndex.isError : map.isError) && (
        <button onClick={() => void (mapLevel === "NATIONAL_MUNICIPALITIES" ? nationalIndex.refetch() : map.refetch())}>
          Tentar carregar municípios novamente
        </button>
      )}
    </section>
  );
}
