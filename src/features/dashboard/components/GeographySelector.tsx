import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { loadMap } from "../../../data/maps";
import { demoCoverage } from "../../../data/coverage";
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
  const [search, setSearch] = useState("");
  const map = useQuery({
    queryKey: ["map", "RJ_MUNICIPALITIES"],
    queryFn: () => loadMap("RJ_MUNICIPALITIES"),
    staleTime: Infinity,
    enabled: state === "RJ",
  });
  const municipalities = (map.data?.features ?? [])
    .map(({ properties }) => ({
      code: String(properties?.code_muni),
      name: String(properties?.name_muni),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
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
        Use os controles ou o mapa. Navegação disponível pelo Sudeste e Rio de
        Janeiro.
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
                disabled={!demoCoverage.drilldownEnabled.regions.includes(code)}
              >
                {name}
                {code !== "SE" ? " · Navegação indisponível" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="state">Estado</label>
          <select
            id="state"
            disabled={region !== "SE"}
            value={state}
            onChange={(event) => {
              setSearch("");
              if (!event.target.value) navigate("SOUTHEAST_STATES");
              else
                select({
                  level: "state",
                  code: event.target.value,
                  name: "Rio de Janeiro",
                });
            }}
          >
            <option value="">Todos os estados</option>
            {region === "SE" &&
              states.map(([code, name]) => (
                <option
                  key={code}
                  value={code}
                  disabled={
                    !demoCoverage.drilldownEnabled.states.includes(code)
                  }
                >
                  {name}
                  {code !== "RJ" ? " · Navegação indisponível" : ""}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label htmlFor="municipality-search">Pesquisar município</label>
          <input
            id="municipality-search"
            type="search"
            disabled={state !== "RJ" || !map.isSuccess}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Digite parte do nome"
            aria-describedby="municipality-help"
          />
          <label htmlFor="municipality">Município</label>
          <select
            id="municipality"
            disabled={state !== "RJ" || !map.isSuccess}
            value={municipality}
            onChange={(event) => {
              const item = municipalities.find(
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
        {municipality === "3301009" && (
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
          : "Selecione Rio de Janeiro para pesquisar os municípios."}
      </p>
      {state === "RJ" && map.isError && (
        <button onClick={() => void map.refetch()}>
          Tentar carregar municípios novamente
        </button>
      )}
    </section>
  );
}
