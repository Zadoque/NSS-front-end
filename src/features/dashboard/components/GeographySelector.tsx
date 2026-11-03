import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { loadMap, loadMunicipalityIndex } from "../../../data/maps";
import { demoCoverage } from "../../../data/coverage";
import { isDemo } from "../../../data/dataSource";
import type { useMapNavigation } from "../hooks/useMapNavigation";

const regions = [
  ["N", "Norte"],
  ["NE", "Nordeste"],
  ["CO", "Centro-Oeste"],
  ["SE", "Sudeste"],
  ["S", "Sul"],
];
const states = [
  ["ES", "Espírito Santo"],
  ["MG", "Minas Gerais"],
  ["RJ", "Rio de Janeiro"],
  ["SP", "São Paulo"],
];
const nationalStates = [
  ["11", "Rondônia"], ["12", "Acre"], ["13", "Amazonas"], ["14", "Roraima"], ["15", "Pará"], ["16", "Amapá"], ["17", "Tocantins"],
  ["21", "Maranhão"], ["22", "Piauí"], ["23", "Ceará"], ["24", "Rio Grande do Norte"], ["25", "Paraíba"], ["26", "Pernambuco"], ["27", "Alagoas"], ["28", "Sergipe"], ["29", "Bahia"],
  ["31", "Minas Gerais"], ["32", "Espírito Santo"], ["33", "Rio de Janeiro"], ["35", "São Paulo"], ["41", "Paraná"], ["42", "Santa Catarina"], ["43", "Rio Grande do Sul"], ["50", "Mato Grosso do Sul"], ["51", "Mato Grosso"], ["52", "Goiás"], ["53", "Distrito Federal"],
];
const stateAbbreviations: Record<string, string> = { "11":"RO", "12":"AC", "13":"AM", "14":"RR", "15":"PA", "16":"AP", "17":"TO", "21":"MA", "22":"PI", "23":"CE", "24":"RN", "25":"PB", "26":"PE", "27":"AL", "28":"SE", "29":"BA", "31":"MG", "32":"ES", "33":"RJ", "35":"SP", "41":"PR", "42":"SC", "43":"RS", "50":"MS", "51":"MT", "52":"GO", "53":"DF" };
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
export function GeographySelector({
  navigation,
}: {
  navigation: ReturnType<typeof useMapNavigation>;
}) {
  const { region, state, selectedGeography, navigate, select } = navigation;
  const nationalMode = navigation.mapLevel === "NATIONAL_MUNICIPALITIES" || navigation.mapLevel === "MUNICIPALITY_NEIGHBORHOODS";
  const nationalHierarchy = navigation.mapLevel === "NATIONAL_STATES" || nationalMode;
  const stateOptions = navigation.mapLevel === "SOUTHEAST_STATES" ? states : nationalStates;
  const [search, setSearch] = useState("");
  const map = useQuery({
    queryKey: ["map", "RJ_MUNICIPALITIES"],
    queryFn: () => loadMap("RJ_MUNICIPALITIES"),
    staleTime: Infinity,
    enabled: state === "RJ",
  });
  const nationalIndex = useQuery({ queryKey: ["national-municipality-index"], queryFn: loadMunicipalityIndex, enabled: !isDemo || nationalMode, staleTime: Infinity });
  const municipalities = (map.data?.features ?? [])
    .map(({ properties }) => ({
      code: String(properties?.code_muni),
      name: String(properties?.name_muni),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const nationalMunicipalities = (nationalIndex.data ?? []).map((item) => ({ code: item.code, name: item.name, uf: item.uf }));
  const availableMunicipalities = nationalMode ? nationalMunicipalities.filter((item) => !state || item.uf === stateAbbreviations[state]) : state === "RJ" && map.isSuccess ? municipalities : isDemo ? municipalities : nationalMunicipalities;
  const municipality =
    selectedGeography?.municipalityCode ??
    (selectedGeography?.level === "municipality" ? selectedGeography.code : "");
  const district =
    selectedGeography?.level === "district"
      ? selectedGeography.code
      : selectedGeography?.districtCode ?? "";
  const districtMap = useQuery({
    queryKey: ["map", "CAMPOS_DISTRICTS"],
    queryFn: () => loadMap("CAMPOS_DISTRICTS"),
    staleTime: Infinity,
    enabled: municipality === "3301009",
  });
  const neighborhoodMap = useQuery({
    queryKey: ["map", "CAMPOS_NEIGHBORHOODS", district],
    queryFn: () => loadMap("CAMPOS_NEIGHBORHOODS"),
    staleTime: Infinity,
    enabled: district === "CG_DIST_SEDE",
  });
  const districts = (districtMap.data?.features ?? [])
    .map(({ properties }) => ({
      code: String(properties?.territoryId),
      name: String(properties?.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const neighborhoods = (neighborhoodMap.data?.features ?? [])
    .filter(({ properties }) => String(properties?.parentDistrictId) === "CG_DIST_SEDE")
    .map(({ properties }) => ({
      code: String(properties?.territoryId),
      name: String(properties?.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const matches = availableMunicipalities.filter((item) =>
    normalize(item.name).includes(normalize(search)),
  );
  // Keep the committed selection visible even while searching for the next municipality.
  const options = availableMunicipalities.filter(
    (item) => item.code === municipality || matches.includes(item),
  );
  return (
    <section
      className="card geography-selector"
      aria-labelledby="geography-title"
    >
      <h2 id="geography-title">Escolha o território</h2>
      <p>
        Use os controles ou o mapa. {isDemo ? "A demonstração está limitada ao Sudeste e ao Rio de Janeiro." : "A cartografia nacional é carregada sob demanda."}
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
                disabled={false}
              >
                {name}
                {isDemo && !nationalHierarchy && code !== "SE" ? " · Navegação indisponível" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="state">Estado</label>
          <select
            id="state"
            disabled={isDemo ? !nationalHierarchy && region !== "SE" : !region}
            value={state}
            onChange={(event) => {
              setSearch("");
              if (!event.target.value) navigate(nationalHierarchy ? "NATIONAL_STATES" : "SOUTHEAST_STATES");
              else
                select({
                  level: "state",
                  code: event.target.value,
                  name: stateOptions.find((item) => item[0] === event.target.value)?.[1] ?? event.target.value,
                });
            }}
          >
            <option value="">Todos os estados</option>
            {(isDemo ? region === "SE" || nationalHierarchy : Boolean(region)) &&
              stateOptions.map(([code, name]) => (
                <option
                  key={code}
                  value={code}
                  disabled={
                    isDemo && !nationalHierarchy && !demoCoverage.drilldownEnabled.states.includes(code)
                  }
                >
                  {name}
                  {isDemo && !nationalHierarchy && code !== "RJ" ? " · Navegação indisponível" : ""}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label htmlFor="municipality-search">Pesquisar município</label>
          <input
            id="municipality-search"
            type="search"
            disabled={nationalMode ? nationalIndex.isPending : isDemo ? state !== "RJ" || !map.isSuccess : nationalIndex.isPending}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Digite parte do nome"
            aria-describedby="municipality-help"
          />
          <label htmlFor="municipality">Município</label>
          <select
            id="municipality"
            disabled={nationalMode ? nationalIndex.isPending : isDemo ? state !== "RJ" || !map.isSuccess : nationalIndex.isPending}
            value={municipality}
            onChange={(event) => {
              const item = availableMunicipalities.find(
                (item) => item.code === event.target.value,
              );
              if (item) select({ level: "municipality", ...item });
              else navigate("RJ_MUNICIPALITIES");
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
        {(isDemo || navigation.mapLevel === "CAMPOS_DISTRICTS" || navigation.mapLevel === "CAMPOS_NEIGHBORHOODS") && municipality === "3301009" && (
          <div>
            <label htmlFor="district">Distrito</label>
            <select
              id="district"
              disabled={!districtMap.isSuccess}
              value={district}
              onChange={(event) => {
                const item = districts.find((candidate) => candidate.code === event.target.value);
                if (item) {
                  select({ level: "district", ...item, municipalityCode: "3301009" });
                } else if (selectedGeography?.level !== "municipality") {
                  select({ level: "municipality", code: "3301009", name: "Campos dos Goytacazes" });
                }
              }}
            >
              <option value="">Todos os distritos</option>
              {districts.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
            </select>
            <p className="selector-help">
              {districtMap.isPending ? "Carregando distritos…" : "Campos possui detalhamento distrital."}
            </p>
          </div>
        )}
        {district === "CG_DIST_SEDE" && (
          <div>
            <label htmlFor="neighborhood">Bairro da notificação</label>
            <select
              id="neighborhood"
              disabled={!neighborhoodMap.isSuccess}
              value={selectedGeography?.level === "neighborhood" ? selectedGeography.code : ""}
              onChange={(event) => {
                const item = neighborhoods.find((candidate) => candidate.code === event.target.value);
                if (item) {
                  select({ level: "neighborhood", ...item, municipalityCode: "3301009", districtCode: "CG_DIST_SEDE" });
                } else {
                  select({ level: "district", code: "CG_DIST_SEDE", name: "Distrito Sede", municipalityCode: "3301009" });
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
        )}
      </div>
      <p id="municipality-help" role="status">
        {state === "RJ"
          ? map.isPending
            ? "Carregando municípios…"
            : map.isError
              ? "Não foi possível carregar os municípios."
              : `${matches.length} municípios encontrados. A pesquisa filtra opções; a seleção só muda ao escolher um município. Geometria disponível não significa cobertura de dados.`
          : nationalMode
            ? "Selecione um município para consultar os bairros."
            : "Selecione um estado para pesquisar os municípios."}
      </p>
      {state === "RJ" && map.isError && (
        <button onClick={() => void map.refetch()}>
          Tentar carregar municípios novamente
        </button>
      )}
    </section>
  );
}
