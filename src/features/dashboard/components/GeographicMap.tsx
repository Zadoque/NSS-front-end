import { useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection } from "geojson";
import { useQuery } from "@tanstack/react-query";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { ZoomableGroup } from "react-simple-maps/zoom";
import { loadHealthUnits, loadMap, loadMunicipalityMap, mapViews } from "../geography/maps";
import type { HealthUnitPoint } from "../geography/maps";
import type {
  GeographySelection,
  MapLevel,
  EpidemiologyItem,
} from "../domain/epidemiologyTypes";
import { caseColor } from "./MapLegend";
import { canDrillDown, isCoveredMunicipality, CAMPOS_MUNICIPALITY_CODE } from "../geography/geographyDomain";

const MAP_WIDTH = 800;
const MAP_HEIGHT = 540;
const LOCAL_MAP_LEVELS: MapLevel[] = [
  "CAMPOS_DISTRICTS", "CAMPOS_NEIGHBORHOODS", "MUNICIPALITY_DISTRICTS", "MUNICIPALITY_NEIGHBORHOODS",
];
const MAX_INDIVIDUAL_HEALTH_UNITS = 5_000;

type RenderedHealthUnit = {
  key: string;
  coordinates: [number, number];
  units: HealthUnitPoint[];
};

function clusterHealthUnits(units: HealthUnitPoint[], zoom: number): RenderedHealthUnit[] {
  if (units.length <= MAX_INDIVIDUAL_HEALTH_UNITS) {
    return units.map((unit) => ({ key: unit.c, coordinates: [unit.x, unit.y], units: [unit] }));
  }
  const west = Math.min(...units.map(({ x }) => x));
  const east = Math.max(...units.map(({ x }) => x));
  const south = Math.min(...units.map(({ y }) => y));
  const north = Math.max(...units.map(({ y }) => y));
  const gridSize = Math.round(64 * Math.max(1, zoom));
  const columns = gridSize;
  const rows = gridSize;
  const width = Math.max(east - west, 0.001);
  const height = Math.max(north - south, 0.001);
  const buckets = new Map<string, HealthUnitPoint[]>();
  units.forEach((unit) => {
    const column = Math.min(columns - 1, Math.floor(((unit.x - west) / width) * columns));
    const row = Math.min(rows - 1, Math.floor(((unit.y - south) / height) * rows));
    const key = `${column}:${row}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(unit);
    else buckets.set(key, [unit]);
  });
  return [...buckets.entries()].map(([key, grouped]) => ({
    key: `cluster:${key}`,
    coordinates: [
      grouped.reduce((sum, unit) => sum + unit.x, 0) / grouped.length,
      grouped.reduce((sum, unit) => sum + unit.y, 0) / grouped.length,
    ],
    units: grouped,
  }));
}

function geometryBounds(collection: FeatureCollection) {
  let west = Infinity, east = -Infinity, south = Infinity, north = -Infinity;
  const visit = (value: unknown) => {
    if (!Array.isArray(value)) return;
    if (typeof value[0] === "number" && typeof value[1] === "number") {
      west = Math.min(west, value[0]);
      east = Math.max(east, value[0]);
      south = Math.min(south, value[1]);
      north = Math.max(north, value[1]);
    } else {
      value.forEach(visit);
    }
  };
  collection.features.forEach(({ geometry }) => {
    if (geometry && "coordinates" in geometry) visit(geometry.coordinates);
    if (geometry?.type === "GeometryCollection") geometry.geometries.forEach((child) => {
      if ("coordinates" in child) visit(child.coordinates);
    });
  });
  return Number.isFinite(west) ? { west, east, south, north } : null;
}

function fitMap(collection: FeatureCollection, level: MapLevel) {
  const view = mapViews[level];
  const bounds = geometryBounds(collection);
  if (!bounds) return view;
  const { west, east, south, north } = bounds;
  const longitude = (west + east) / 2;
  if (!LOCAL_MAP_LEVELS.includes(level)) {
    return { center: [longitude, (south + north) / 2] as [number, number], scale: view.scale };
  }

  const radians = Math.PI / 180;
  const mercatorY = (latitude: number) => Math.asinh(Math.tan(latitude * radians));
  const lower = mercatorY(south);
  const upper = mercatorY(north);
  const latitude = Math.atan(Math.sinh((lower + upper) / 2)) / radians;
  const scale = Math.min(
    (MAP_WIDTH * 0.82) / ((east - west) * radians),
    (MAP_HEIGHT * 0.82) / (upper - lower),
    view.scale * 4,
  );
  return { center: [longitude, latitude] as [number, number], scale };
}

type Props = {
  level: MapLevel;
  selected: GeographySelection | null;
  items: EpidemiologyItem[];
  dataStatus: "loading" | "error" | "success";
  onSelect: (value: GeographySelection) => void;
  onBack?: () => void;
};
export function GeographicMap({
  level,
  selected,
  items,
  dataStatus,
  onSelect,
  onBack,
}: Props) {
  const [hint, setHint] = useState("");
  const [selectedHealthUnits, setSelectedHealthUnits] = useState<{
    mapKey: string;
    units: HealthUnitPoint[];
    visibleCount: number;
  } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<{
    key: string;
    center: [number, number];
    zoom: number;
    displayZoom: number;
  }>();
  const map = useQuery({
    queryKey: ["map", level, selected?.municipalityCode ?? selected?.code],
    queryFn: () => loadMap(level, level === "NATIONAL_STATES" && selected?.level === "region"
      ? selected.code
      : level === "NATIONAL_MUNICIPALITIES" && selected?.level === "state"
        ? selected.code
        : selected?.level === "municipality" ? selected.code : selected?.municipalityCode),
    staleTime: Infinity,
  });
  const municipalityCode = selected?.level === "municipality" ? selected.code : selected?.municipalityCode;
  const local = LOCAL_MAP_LEVELS.includes(level);
  const healthUnits = useQuery({
    queryKey: ["health-units", municipalityCode],
    queryFn: () => loadHealthUnits(municipalityCode ?? ""),
    enabled: LOCAL_MAP_LEVELS.includes(level) && Boolean(municipalityCode),
    staleTime: Infinity,
  });
  const municipalityMap = useQuery({
    queryKey: ["municipality-map", municipalityCode],
    queryFn: () => loadMunicipalityMap(municipalityCode ?? ""),
    enabled: local && Boolean(municipalityCode),
    staleTime: Infinity,
  });
  useEffect(() => {
    const updateFullscreenState = () =>
      setIsFullscreen(document.fullscreenElement === mapContainerRef.current);
    document.addEventListener("fullscreenchange", updateFullscreenState);
    return () => document.removeEventListener("fullscreenchange", updateFullscreenState);
  }, []);
  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", escape);
    };
  }, [expanded]);
  const district = selected?.level === "district" ? selected.code : selected?.districtCode;
  const mapData = useMemo(() => {
    if (level !== "MUNICIPALITY_NEIGHBORHOODS" || !district || !map.data) return map.data;
    return { ...map.data, features: map.data.features.filter(({ properties }) =>
      (properties?.parentDistrictId ?? (properties?.CD_DIST != null ? `IBGE_DIST_${properties.CD_DIST}` : undefined)) === district) };
  }, [district, level, map.data]);
  const view = mapViews[level];
  const localBaseMap = local ? municipalityMap.data : undefined;
  const dynamicBounds = local || level === "NATIONAL_STATES" || level === "NATIONAL_MUNICIPALITIES";
  const { center: mapCenter, scale } = useMemo(
    // Frame the selected district's neighborhood layer, not the whole municipality.
    () => dynamicBounds && (level === "MUNICIPALITY_NEIGHBORHOODS" ? mapData : (localBaseMap ?? mapData))
      ? fitMap((level === "MUNICIPALITY_NEIGHBORHOODS" ? mapData : (localBaseMap ?? mapData))!, level)
      : mapViews[level],
    [dynamicBounds, level, localBaseMap, mapData],
  );
  const mapKey = `${level}:${selected?.municipalityCode ?? selected?.code ?? ""}:${level === "MUNICIPALITY_NEIGHBORHOODS" ? district ?? "" : ""}`;
  const current = viewport?.key === mapKey
    ? viewport
    : { key: mapKey, center: mapCenter, zoom: 1, displayZoom: 1 };
  const visibleHealthUnits = useMemo(
    () => district ? (healthUnits.data ?? []).filter((unit) => unit.d === district) : healthUnits.data ?? [],
    [district, healthUnits.data],
  );
  const renderedHealthUnits = useMemo(
    () => clusterHealthUnits(visibleHealthUnits, current.displayZoom),
    [current.displayZoom, visibleHealthUnits],
  );
  const selectedClusterUnits = selectedHealthUnits?.mapKey === mapKey ? selectedHealthUnits.units : [];
  if (map.isPending || (local && municipalityMap.isPending))
    return (
      <div className={`geographic-map${expanded ? " map-expanded" : ""}`} ref={mapContainerRef}>
        <div className="map-placeholder" role="status">
          Carregando mapa…
        </div>
      </div>
    );
  if (map.isError || (local && municipalityMap.isError))
    return (
      <div className={`geographic-map${expanded ? " map-expanded" : ""}`} ref={mapContainerRef}>
        <div className="map-placeholder" role="alert">
          Não foi possível carregar o mapa.
          <button onClick={() => void map.refetch()}>Tentar novamente</button>
        </div>
      </div>
    );
  if (!mapData?.features?.length)
    return (
      <div className={`geographic-map${expanded ? " map-expanded" : ""}`} ref={mapContainerRef}>
        <div className="map-placeholder" role="status">
          {level === "MUNICIPALITY_NEIGHBORHOODS"
            ? "A geometria dos bairros ainda não está disponível para este município. O ranking e os dados oficiais continuam disponíveis abaixo."
            : "A geometria dos distritos ainda não está disponível para este município. O ranking e os dados oficiais continuam disponíveis abaixo."}
        </div>
      </div>
    );
  const byCode = new Map(items.map((item) => [item.code, item]));
  const visibleMaximum = Math.max(1, ...items.map((item) => item.notificationsTotal));
  const minZoom = local ? 0.5 : 1;
  const maxZoom = 3;
  const clampZoom = (value: number) => Math.max(minZoom, Math.min(maxZoom, value));
  const changeZoom = (value: number, center = current.center) => {
    const zoom = clampZoom(value);
    setViewport({ key: mapKey, center, zoom, displayZoom: zoom });
  };
  const zoomIn = () => changeZoom(current.displayZoom + 0.5);
  const zoomOut = () => changeZoom(current.displayZoom - 0.5);
  const resetZoom = () => changeZoom(1, mapCenter);
  const toggleFullscreen = async () => {
    const container = mapContainerRef.current;
    if (!container) return;

    if (expanded) {
      setExpanded(false);
      return;
    }
    if (document.fullscreenElement === container) {
      await document.exitFullscreen();
      return;
    }
    try {
      if (!container.requestFullscreen) throw new Error("Fullscreen unavailable");
      await container.requestFullscreen();
    } catch {
      // iOS and embedded browsers may not support native fullscreen.
      setExpanded(true);
    }
  };

  return (
    <div className={`geographic-map${expanded ? " map-expanded" : ""}`} ref={mapContainerRef}>
      <div className="map-controls" aria-label="Controles de zoom do mapa">
        {(isFullscreen || expanded) && onBack && (
          <button
            type="button"
            className="map-fullscreen-back"
            aria-label="Voltar na navegação do mapa"
            onClick={onBack}
          >
            ← Voltar
          </button>
        )}
        <button type="button" aria-label="Aumentar zoom" onClick={zoomIn}>+</button>
        <button type="button" aria-label="Diminuir zoom" onClick={zoomOut}>−</button>
        <button type="button" aria-label="Redefinir zoom" onClick={resetZoom}>⟳</button>
        <button
          type="button"
          className="map-fullscreen"
          aria-label={isFullscreen || expanded ? "Sair da tela cheia" : "Abrir mapa em tela cheia"}
          aria-pressed={isFullscreen || expanded}
          onClick={() => void toggleFullscreen()}
        >
          {isFullscreen || expanded ? "Sair da tela cheia" : "⛶ Tela cheia"}
        </button>
        <span>Zoom {Math.round(current.displayZoom * 100)}%</span>
      </div>
      <div
        className="map-viewport"
      >
        <ComposableMap
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          projection={["NATIONAL_STATES", "NATIONAL_MUNICIPALITIES"].includes(level) ? "geoEquirectangular" : "geoMercator"}
          projectionConfig={{ center: mapCenter, scale }}
          aria-label={`Mapa interativo: ${view.title}`}
        >
          <ZoomableGroup
            center={current.center}
            zoom={current.zoom}
            minZoom={minZoom}
            maxZoom={maxZoom}
            // D3 handles wheel deltas, trackpad pinch (ctrl+wheel), and the
            // distance between touch points independently of button steps.
            filterZoomEvent={(event) => {
              const pointer = event as MouseEvent;
              return (!pointer.ctrlKey || event.type === "wheel") && !pointer.button;
            }}
            onMove={({ zoom }) => setViewport((previous) => ({
              ...(previous?.key === mapKey ? previous : current),
              displayZoom: zoom ?? current.zoom,
            }))}
            onMoveEnd={({ coordinates, zoom }) => changeZoom(zoom ?? current.zoom, coordinates ?? current.center)}
          >
            {localBaseMap && (
              <Geographies geography={localBaseMap}>
                {({ geographies }) => geographies.map((geo) => (
                  <Geography
                    key={`municipality-base:${geo.rsmKey}`}
                    geography={geo}
                    fill="none"
                    stroke="#607d8b"
                    strokeWidth={1.25}
                    pointerEvents="none"
                  />
                ))}
              </Geographies>
            )}
            <Geographies geography={mapData}>
            {({ geographies }) =>
              geographies.map((geo) => {
              const p = geo.properties ?? {};
              const geography: GeographySelection =
                level === "BRAZIL_REGIONS"
                  ? {
                      level: "region",
                      code: String(p.abbrev_region),
                      name: String(p.name_region),
                    }
                  : level === "SOUTHEAST_STATES" || level === "NATIONAL_STATES"
                    ? {
                        level: "state",
                        code: String(p.code_state),
                        name: String(p.name_state),
                      }
                    : level === "RJ_MUNICIPALITIES" || level === "NATIONAL_MUNICIPALITIES"
                    ? {
                      level: "municipality",
                      code: String(p.code_muni),
                      name: String(p.name_muni),
                    }
                      : level === "CAMPOS_DISTRICTS" || level === "MUNICIPALITY_DISTRICTS"
                      ? { level: "district", code: String(p.territoryId), name: byCode.get(String(p.territoryId))?.name ?? String(p.name), municipalityCode: selected?.level === "municipality" ? selected.code : selected?.municipalityCode ?? CAMPOS_MUNICIPALITY_CODE }
                      : level === "MUNICIPALITY_NEIGHBORHOODS"
                        ? {
                            level: "neighborhood",
                            code: String(p.territoryId ?? (p.CD_BAIRRO != null ? `IBGE_BAIRRO_${String(p.CD_BAIRRO)}` : "")),
                            name: String(p.name ?? p.NM_BAIRRO ?? p.territoryId ?? "Bairro/localidade"),
                            municipalityCode: selected?.level === "municipality" ? selected.code : selected?.municipalityCode,
                            districtCode: p.parentDistrictId ?? (p.CD_DIST != null ? `IBGE_DIST_${String(p.CD_DIST)}` : undefined),
                          }
                        : { level: "neighborhood", code: String(p.territoryId), name: String(p.name), municipalityCode: CAMPOS_MUNICIPALITY_CODE, districtCode: String(p.parentDistrictId) };
              const navigable = ["NATIONAL_STATES", "NATIONAL_MUNICIPALITIES", "MUNICIPALITY_DISTRICTS", "MUNICIPALITY_NEIGHBORHOODS"].includes(level) || canDrillDown(geography);
              const territorial = geography.level === "district" || geography.level === "neighborhood";
              const covered = territorial
                ? Boolean(byCode.get(geography.code))
                :
                (geography.level === "municipality" && isCoveredMunicipality(geography.code)) ||
                Boolean(byCode.get(geography.code));
              const item = covered ? byCode.get(geography.code) : undefined;
              const detail = item
                ? `${item.notificationsTotal} notificações da unidade notificadora`
                : navigable
                ? "Toque ou pressione Enter para explorar"
                : !covered
                ? territorial
                  ? "Sem notificações mapeadas nesta geometria"
                  : "Sem notificações mapeadas neste território"
                  : dataStatus === "loading"
                    ? "Carregando dados"
                    : dataStatus === "error"
                      ? "Dados indisponíveis: erro na consulta"
                      : "Sem registros neste recorte";
              const label = `${geography.name} · ${detail}`;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  tabIndex={0}
                  role="button"
                  aria-label={label}
                  aria-pressed={selected?.code === geography.code}
                  className={
                    selected?.code === geography.code ? "geo selected" : "geo"
                  }
                  fill={
                    item
                      ? caseColor(item.notificationsTotal, visibleMaximum)
                      : covered
                        ? "#f6f0d8"
                        : navigable
                          ? "#b8d9d2"
                          : "#dce2e6"
                  }
                  fillOpacity={local ? 0.72 : 1}
                  stroke={local ? "#638693" : "#fff"}
                  strokeWidth={local ? 0.7 : 1}
                  onMouseEnter={() => setHint(label)}
                  onMouseLeave={() => setHint("")}
                  onFocus={() => setHint(label)}
                  onBlur={() => setHint("")}
                  onClick={() => onSelect(geography)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(geography);
                    }
                  }}
                >
                  <title>{label}</title>
                </Geography>
              );
              })
            }
            </Geographies>
            {renderedHealthUnits.map((point) => {
              const unit = point.units[0];
              const clustered = point.units.length > 1;
              const label = clustered
                ? `${point.units.length} estabelecimentos CNES nesta área`
                : `${unit.n} · CNES ${unit.c}${unit.b ? ` · Bairro informado: ${unit.b}` : ""}`;
              const activateCluster = () => {
                if (!clustered) return;
                setSelectedHealthUnits({ mapKey, units: point.units, visibleCount: 100 });
                changeZoom(current.displayZoom + 0.75, point.coordinates);
              };
              return (
                <Marker
                  key={point.key}
                  coordinates={point.coordinates}
                  data-cnes={clustered ? undefined : unit.c}
                  role={clustered ? "button" : "img"}
                  tabIndex={clustered ? 0 : undefined}
                  aria-label={label}
                  onMouseEnter={() => setHint(label)}
                  onMouseLeave={() => setHint("")}
                  onFocus={() => setHint(label)}
                  onBlur={() => setHint("")}
                  onClick={activateCluster}
                  onKeyDown={(event) => {
                    if (clustered && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault();
                      activateCluster();
                    }
                  }}
                >
                  <circle
                    r={clustered ? 3.5 : local && level === "MUNICIPALITY_NEIGHBORHOODS" ? 1.25 : local ? 1.8 : 3}
                    fill="#b42318"
                    fillOpacity={local && level === "MUNICIPALITY_NEIGHBORHOODS" ? 0.64 : 0.8}
                    stroke="#fff"
                    strokeWidth={local && level === "MUNICIPALITY_NEIGHBORHOODS" ? 0.35 : 0.6}
                  >
                    <title>{label}</title>
                  </circle>
                  {clustered && <text textAnchor="middle" y={1.5} fontSize={3.5} fill="#fff">{point.units.length}</text>}
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>
      </div>
      <p className="map-hint" aria-live="polite">
        {hint ||
          (selected
            ? selected.geometryAvailable === false
              ? `${selected.name}: sem polígono cartográfico; o ranking continua disponível.`
              : selected.name
            : "Selecione uma área no mapa para explorar.")}
      </p>
      {selected?.geometryAvailable === false && (
        <p className="mx-5 mb-3 rounded border border-[#e4c98a] bg-[#fff8e6] px-3 py-2 text-sm text-[#765b1f]" role="status">
          Este bairro aparece porque o nome veio na unidade notificadora, mas não há geometria oficial para desenhar. Nenhum ponto foi deslocado artificialmente para este polígono.
        </p>
      )}
      {LOCAL_MAP_LEVELS.includes(level) && visibleHealthUnits.length > 0 && (
        <p className="px-5 pb-2 text-center text-xs text-[#6b7f8c]">
          Pontos vermelhos: {visibleHealthUnits.length.toLocaleString("pt-BR")} estabelecimentos CNES com coordenadas válidas.
        </p>
      )}
      {selectedClusterUnits.length > 1 && (
        <section className="mx-5 mb-3 rounded border border-[#b7c8d2] bg-white p-3" aria-label="Estabelecimentos no agrupamento selecionado">
          <div className="mb-2 flex items-center justify-between gap-3">
            <strong>{selectedClusterUnits.length.toLocaleString("pt-BR")} estabelecimentos no agrupamento</strong>
            <button type="button" onClick={() => setSelectedHealthUnits(null)}>Fechar</button>
          </div>
          <ul className="max-h-48 overflow-y-auto text-sm">
            {selectedClusterUnits.slice(0, selectedHealthUnits?.visibleCount ?? 100).map((unit) => (
              <li key={unit.c}>{unit.n} · CNES {unit.c}{unit.b ? ` · ${unit.b}` : ""}</li>
            ))}
          </ul>
          {(selectedHealthUnits?.visibleCount ?? 0) < selectedClusterUnits.length && (
            <button
              type="button"
              className="mt-2"
              onClick={() => setSelectedHealthUnits((currentSelection) => currentSelection
                ? { ...currentSelection, visibleCount: currentSelection.visibleCount + 100 }
                : null)}
            >
              Mostrar mais 100
            </button>
          )}
        </section>
      )}
    </div>
  );
}
