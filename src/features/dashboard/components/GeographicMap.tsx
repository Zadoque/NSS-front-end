import { useEffect, useRef, useState } from "react";
import type { FeatureCollection } from "geojson";
import { useQuery } from "@tanstack/react-query";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { ZoomableGroup } from "react-simple-maps/zoom";
import { loadMap, mapViews } from "../geography/maps";
import type {
  GeographySelection,
  MapLevel,
  EpidemiologyItem,
} from "../domain/epidemiologyTypes";
import { caseColor } from "./MapLegend";
import { canDrillDown, isCoveredMunicipality, CAMPOS_MUNICIPALITY_CODE } from "../geography/geographyDomain";

function geometryCenter(collection: FeatureCollection): [number, number] | null {
  const points: number[][] = [];
  const visit = (value: unknown) => {
    if (!Array.isArray(value)) return;
    if (typeof value[0] === "number" && typeof value[1] === "number") points.push(value as number[]);
    else value.forEach(visit);
  };
  collection.features.forEach((feature) => {
    const geometry = feature.geometry;
    if (geometry && "coordinates" in geometry) visit(geometry.coordinates);
    if (geometry?.type === "GeometryCollection") geometry.geometries.forEach((child) => {
      if ("coordinates" in child) visit(child.coordinates);
    });
  });
  if (!points.length) return null;
  return [points.reduce((sum, point) => sum + point[0], 0) / points.length, points.reduce((sum, point) => sum + point[1], 0) / points.length];
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const initialZoom = level === "CAMPOS_NEIGHBORHOODS" || level === "MUNICIPALITY_NEIGHBORHOODS" ? 3.5 : level === "MUNICIPALITY_DISTRICTS" ? 2 : 1;
  const [zoom, setZoom] = useState(initialZoom);
  const [displayZoom, setDisplayZoom] = useState(initialZoom);
  const [center, setCenter] = useState(mapViews[level].center);
  const [centerKey, setCenterKey] = useState("");
  const map = useQuery({
    queryKey: ["map", level, selected?.municipalityCode ?? selected?.code],
    queryFn: () => loadMap(level, level === "NATIONAL_STATES" && selected?.level === "region"
      ? selected.code
      : level === "NATIONAL_MUNICIPALITIES" && selected?.level === "state"
        ? selected.code
        : selected?.level === "municipality" ? selected.code : selected?.municipalityCode),
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
  const view = mapViews[level];
  const mapCenter = ["NATIONAL_STATES", "NATIONAL_MUNICIPALITIES", "MUNICIPALITY_DISTRICTS", "MUNICIPALITY_NEIGHBORHOODS"].includes(level)
    ? geometryCenter(map.data ?? { type: "FeatureCollection", features: [] }) ?? view.center
    : view.center;
  const mapKey = `${level}:${selected?.code ?? selected?.municipalityCode ?? ""}`;
  const mapViewportCenter = centerKey === mapKey ? center : mapCenter;
  if (map.isPending)
    return (
      <div className={`geographic-map${expanded ? " map-expanded" : ""}`} ref={mapContainerRef}>
        <div className="map-placeholder" role="status">
          Carregando mapa…
        </div>
      </div>
    );
  if (map.isError)
    return (
      <div className={`geographic-map${expanded ? " map-expanded" : ""}`} ref={mapContainerRef}>
        <div className="map-placeholder" role="alert">
          Não foi possível carregar o mapa.
          <button onClick={() => void map.refetch()}>Tentar novamente</button>
        </div>
      </div>
    );
  if (!map.data?.features?.length)
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
  const minZoom = initialZoom;
  const maxZoom = initialZoom * 3;
  const zoomStep = initialZoom * 0.5;
  const changeZoom = (value: number) => {
    const next = Math.max(minZoom, Math.min(maxZoom, value));
    setZoom(next);
    setDisplayZoom(next);
  };
  const zoomIn = () => changeZoom(displayZoom + zoomStep);
  const zoomOut = () => changeZoom(displayZoom - zoomStep);
  const resetZoom = () => {
    setCenterKey(mapKey);
    setCenter(mapCenter);
    changeZoom(initialZoom);
  };
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
        <span>Zoom {Math.round((displayZoom / initialZoom) * 100)}%</span>
      </div>
      <div
        className="map-viewport"
      >
        <ComposableMap
          width={800}
          height={540}
          projection={["NATIONAL_STATES", "NATIONAL_MUNICIPALITIES"].includes(level) ? "geoEquirectangular" : "geoMercator"}
          projectionConfig={{ center: mapCenter, scale: view.scale }}
          aria-label={`Mapa interativo: ${view.title}`}
        >
          <ZoomableGroup
            center={mapViewportCenter}
            zoom={zoom}
            minZoom={minZoom}
            maxZoom={maxZoom}
            // D3 handles wheel deltas, trackpad pinch (ctrl+wheel), and the
            // distance between touch points independently of button steps.
            filterZoomEvent={(event) => {
              const pointer = event as MouseEvent;
              return (!pointer.ctrlKey || event.type === "wheel") && !pointer.button;
            }}
            onMove={({ zoom: nextZoom }) => setDisplayZoom(nextZoom ?? minZoom)}
            onMoveEnd={({ coordinates, zoom: nextZoom }) => {
              if (coordinates) {
                setCenterKey(mapKey);
                setCenter(coordinates);
              }
              changeZoom(nextZoom ?? minZoom);
            }}
          >
            <Geographies geography={map.data}>
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
                  stroke="#fff"
                  strokeWidth={1}
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
          </ZoomableGroup>
        </ComposableMap>
      </div>
      <p className="map-hint" aria-live="polite">
        {hint ||
          (selected
            ? selected.name
            : "Selecione uma área no mapa para explorar.")}
      </p>
    </div>
  );
}
