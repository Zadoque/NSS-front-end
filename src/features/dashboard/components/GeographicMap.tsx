import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { ZoomableGroup } from "react-simple-maps/zoom";
import { loadMap, mapViews } from "../../../data/maps";
import type {
  GeographySelection,
  MapLevel,
  EpidemiologyItem,
} from "../../../types/epidemiology";
import { demoCoverage } from "../../../data/coverage";
import { caseColor } from "./MapLegend";

type Props = {
  level: MapLevel;
  selected: GeographySelection | null;
  items: EpidemiologyItem[];
  dataStatus: "loading" | "error" | "success";
  onSelect: (value: GeographySelection) => void;
};
export function GeographicMap({
  level,
  selected,
  items,
  dataStatus,
  onSelect,
}: Props) {
  const [hint, setHint] = useState("");
  const initialZoom = level === "CAMPOS_NEIGHBORHOODS" ? 3.5 : 1;
  const [zoom, setZoom] = useState(initialZoom);
  const map = useQuery({
    queryKey: ["map", level],
    queryFn: () => loadMap(level),
    staleTime: Infinity,
  });
  const view = mapViews[level];
  if (map.isPending)
    return (
      <div className="map-placeholder" role="status">
        Carregando mapa…
      </div>
    );
  if (map.isError)
    return (
      <div className="map-placeholder" role="alert">
        Não foi possível carregar o mapa.
        <button onClick={() => void map.refetch()}>Tentar novamente</button>
      </div>
    );
  const byCode = new Map(items.map((item) => [item.code, item]));
  const minZoom = initialZoom;
  const maxZoom = initialZoom * 3;
  const zoomStep = initialZoom * 0.5;
  const zoomIn = () => setZoom((value) => Math.min(maxZoom, Number((value + zoomStep).toFixed(1))));
  const zoomOut = () => setZoom((value) => Math.max(minZoom, Number((value - zoomStep).toFixed(1))));
  const resetZoom = () => setZoom(initialZoom);
  return (
    <>
      <div className="map-controls" aria-label="Controles de zoom do mapa">
        <button type="button" aria-label="Aumentar zoom" onClick={zoomIn}>+</button>
        <button type="button" aria-label="Diminuir zoom" onClick={zoomOut}>−</button>
        <button type="button" aria-label="Redefinir zoom" onClick={resetZoom}>⟳</button>
        <span aria-live="polite">Zoom {Math.round((zoom / initialZoom) * 100)}%</span>
      </div>
      <ComposableMap
        width={800}
        height={540}
        projection="geoMercator"
        projectionConfig={{ center: view.center, scale: view.scale }}
        aria-label={`Mapa interativo: ${view.title}`}
      >
        <ZoomableGroup
          center={view.center}
          zoom={zoom}
          minZoom={minZoom}
          maxZoom={maxZoom}
          onMove={({ zoom: nextZoom }) => setZoom(Number((nextZoom ?? 1).toFixed(1)))}
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
                  : level === "SOUTHEAST_STATES"
                    ? {
                        level: "state",
                        code: String(p.abbrev_state),
                        name: String(p.name_state),
                      }
                    : level === "RJ_MUNICIPALITIES"
                    ? {
                      level: "municipality",
                      code: String(p.code_muni),
                      name: String(p.name_muni),
                    }
                    : level === "CAMPOS_DISTRICTS"
                      ? { level: "district", code: String(p.territoryId), name: String(p.name), municipalityCode: "3301009" }
                      : { level: "neighborhood", code: String(p.territoryId), name: String(p.name), municipalityCode: "3301009", districtCode: String(p.parentDistrictId) };
              const navigable =
                geography.level === "region"
                  ? demoCoverage.drilldownEnabled.regions.includes(
                      geography.code,
                    )
                  : geography.level === "state" &&
                    demoCoverage.drilldownEnabled.states.includes(
                      geography.code,
                    );
              const territorial = geography.level === "district" || geography.level === "neighborhood";
              const covered = territorial
                ? Boolean(byCode.get(geography.code))
                :
                geography.level === "municipality" &&
                demoCoverage.caseDataAvailableForMunicipalities.includes(
                  geography.code,
                );
              const item = covered ? byCode.get(geography.code) : undefined;
              const districtNeighborhoodUnavailable =
                geography.level === "district" && geography.code !== "CG_DIST_SEDE";
              const detail = districtNeighborhoodUnavailable
                ? "Detalhamento por bairro da notificação indisponível neste distrito"
                : navigable
                ? "Toque ou pressione Enter para explorar"
                : !covered
                ? territorial
                  ? "Sem notificações mapeadas nesta geometria"
                  : "Sem cobertura nesta V1"
                  : dataStatus === "loading"
                    ? "Carregando dados"
                    : dataStatus === "error"
                      ? "Dados indisponíveis: erro na consulta"
                      : item
                        ? `${item.notificationsTotal} notificações da unidade notificadora`
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
                      ? caseColor(item.notificationsTotal)
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
      <p className="map-hint" aria-live="polite">
        {hint ||
          (selected
            ? selected.name
            : "Selecione uma área no mapa para explorar.")}
      </p>
    </>
  );
}
