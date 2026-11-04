"""Generate national IBGE map assets as lazy-loadable static files.

The generated directory is intentionally outside the Vite JavaScript bundle:
the application loads the municipality index first and fetches one
neighborhood GeoJSON only after a municipality has been selected.

Requirements (build environment): ogr2ogr. Raw
downloads are cached under data/raw/national-maps and are gitignored.
"""
from __future__ import annotations

import argparse
import gzip
import json
import shutil
import subprocess
import tempfile
import time
import urllib.request
import zipfile
from pathlib import Path

from concurrent.futures import ThreadPoolExecutor

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "national-maps"
OUTPUT = ROOT / "public" / "maps" / "national"
YEAR = 2022
LOCALITIES_URL = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios"
STATES_URL = "https://servicodados.ibge.gov.br/api/v1/localidades/estados"
STATE_MAP_URL = "https://servicodados.ibge.gov.br/api/v3/malhas/estados/{code}?formato=application/vnd.geo+json&qualidade=minima"
MUNICIPALITY_MAP_URL = "https://servicodados.ibge.gov.br/api/v3/malhas/municipios/{code}?formato=application/vnd.geo+json&qualidade=minima"
NEIGHBORHOOD_URL = (
    "https://geoftp.ibge.gov.br/organizacao_do_territorio/"
    "malhas_territoriais/malhas_de_setores_censitarios__divisoes_intramunicipais/"
    "censo_2022/bairros/shp/UF/{uf}_bairros_CD2022.zip"
)
DISTRICT_URL = (
    "https://geoftp.ibge.gov.br/organizacao_do_territorio/"
    "malhas_territoriais/malhas_de_setores_censitarios__divisoes_intramunicipais/"
    "censo_2022/distritos/shp/UF/{uf}_distritos_CD2022.zip"
)


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


def ring_area(ring: list[list[float]]) -> float:
    return sum((ring[index][0] - ring[index - 1][0]) * (ring[index][1] + ring[index - 1][1]) for index in range(1, len(ring)))


def rewind_geometry(geometry: dict | None) -> dict | None:
    """Use the clockwise exterior winding expected by d3-geo."""
    if not geometry:
        return geometry
    if geometry["type"] == "Polygon":
        rings = []
        for index, ring in enumerate(geometry["coordinates"]):
            wants_positive = index == 0
            if (ring_area(ring) > 0) != wants_positive:
                ring = list(reversed(ring))
            rings.append(ring)
        geometry["coordinates"] = rings
    elif geometry["type"] == "MultiPolygon":
        geometry["coordinates"] = [rewind_geometry({"type": "Polygon", "coordinates": polygon})["coordinates"] for polygon in geometry["coordinates"]]
    return geometry


def rewind_file(path: Path) -> None:
    data = json.loads(path.read_text(encoding="utf-8"))
    for feature in data.get("features", []):
        feature["geometry"] = rewind_geometry(feature.get("geometry"))
    write_json(path, data)


def download(url: str, target: Path) -> Path:
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        print(f"download {url}")
        urllib.request.urlretrieve(url, target)
    return target


def get_json(url: str) -> object:
    for attempt in range(4):
        try:
            request = urllib.request.Request(url, headers={"Accept-Encoding": "gzip"})
            with urllib.request.urlopen(request, timeout=60) as response:
                payload = response.read()
            if payload[:2] == b"\x1f\x8b":
                payload = gzip.decompress(payload)
            return json.loads(payload)
        except (OSError, json.JSONDecodeError):
            if attempt == 3:
                raise
            time.sleep(1 + attempt)


def municipalities() -> list[dict[str, str]]:
    catalog = get_json(LOCALITIES_URL)
    items = []
    for municipality in catalog:
        hierarchy = municipality.get("microrregiao") or municipality["regiao-imediata"]
        uf = hierarchy.get("mesorregiao", hierarchy.get("regiao-intermediaria"))["UF"]
        items.append({"code": str(municipality["id"]), "name": municipality["nome"], "uf": uf["sigla"]})
    items.sort(key=lambda item: item["code"])
    if len(items) < 5570 or len({item["code"] for item in items}) != len(items):
        raise RuntimeError(f"unexpected municipality catalog: {len(items)} rows")
    return items


def states() -> list[dict[str, str]]:
    catalog = get_json(STATES_URL)
    items = [
        {"code": str(item["id"]), "uf": item["sigla"], "name": item["nome"], "region": item["regiao"]["sigla"]}
        for item in catalog
    ]
    items.sort(key=lambda item: item["code"])
    if len(items) != 27:
        raise RuntimeError(f"unexpected state catalog: {len(items)} rows")
    return items


def export_states(items: list[dict[str, str]]) -> None:
    features = []
    for item in items:
        geojson = get_json(STATE_MAP_URL.format(code=item["code"]))
        if geojson.get("type") != "FeatureCollection" or len(geojson.get("features", [])) != 1:
            raise RuntimeError(f"invalid geometry response for state {item['code']}")
        feature = geojson["features"][0]
        feature["geometry"] = rewind_geometry(feature.get("geometry"))
        feature["properties"] = {
            "code_state": item["code"],
            "abbrev_state": item["uf"],
            "name_state": item["name"],
            "abbrev_region": item["region"],
        }
        features.append(feature)
        write_json(OUTPUT / "states" / f"{item['code']}.geojson", {"type": "FeatureCollection", "features": [feature]})
    write_json(OUTPUT / "states.geojson", {"type": "FeatureCollection", "features": features})


def export_municipality_state_overviews(items: list[dict[str, str]]) -> None:
    by_uf: dict[str, list[dict]] = {}
    for item in items:
        source = json.loads((OUTPUT / item["path"]).read_text(encoding="utf-8"))
        by_uf.setdefault(item["uf"], []).extend(source.get("features", []))
    for uf, features in by_uf.items():
        write_json(OUTPUT / "municipalities-by-state" / f"{uf}.geojson", {"type": "FeatureCollection", "features": features})


def export_municipalities(items: list[dict[str, str]]) -> list[dict[str, str]]:
    def export(item: dict[str, str]) -> dict[str, str]:
        code = item["code"]
        output = OUTPUT / "municipalities" / f"{code}.geojson"
        if output.exists():
            try:
                cached = json.loads(output.read_text(encoding="utf-8"))
                if cached.get("type") == "FeatureCollection" and len(cached.get("features", [])) == 1:
                    return {**item, "path": f"municipalities/{code}.geojson"}
            except (OSError, json.JSONDecodeError, AttributeError):
                pass
        try:
            geojson = get_json(MUNICIPALITY_MAP_URL.format(code=code))
        except OSError:
            write_json(output, {"type": "FeatureCollection", "features": []})
            return {**item, "path": f"municipalities/{code}.geojson", "geometryStatus": "UNAVAILABLE"}
        if geojson.get("type") != "FeatureCollection" or len(geojson.get("features", [])) != 1:
            raise RuntimeError(f"invalid geometry response for municipality {code}")
        feature = geojson["features"][0]
        if not feature.get("geometry"):
            raise RuntimeError(f"empty geometry for municipality {code}")
        feature["properties"] = {"code_muni": code, "name_muni": item["name"], "abbrev_state": item["uf"]}
        write_json(output, {"type": "FeatureCollection", "features": [feature]})
        return {**item, "path": f"municipalities/{code}.geojson"}
    with ThreadPoolExecutor(max_workers=16) as executor:
        return list(executor.map(export, items))


def export_municipality_overview(items: list[dict[str, str]]) -> None:
    features = []
    for item in items:
        path = OUTPUT / item["path"]
        data = json.loads(path.read_text(encoding="utf-8"))
        features.extend(data.get("features", []))
    write_json(OUTPUT / "municipalities.geojson", {"type": "FeatureCollection", "features": features})


def export_neighborhoods(municipality_items: list[dict[str, str]], keep_raw: bool) -> int:
    total = 0
    by_uf = {item["uf"]: [] for item in municipality_items}
    for item in municipality_items:
        by_uf[item["uf"]].append(item)
    for uf, items in sorted(by_uf.items()):
        try:
            archive = download(NEIGHBORHOOD_URL.format(uf=uf), RAW / f"{uf}_bairros_CD2022.zip")
        except OSError:
            for item in items:
                output = OUTPUT / "neighborhoods" / f"{item['code']}.geojson"
                write_json(output, {"type": "FeatureCollection", "features": []})
                item["neighborhoodsPath"] = f"neighborhoods/{item['code']}.geojson"
                item["neighborhoodCount"] = 0
                item["neighborhoodGeometryStatus"] = "UNAVAILABLE"
            print(f"{uf}: official neighborhood source unavailable")
            continue
        with tempfile.TemporaryDirectory(prefix=f"nss-{uf.lower()}-") as directory:
            with zipfile.ZipFile(archive) as source:
                source.extractall(directory)
            source_path = next(Path(directory).rglob("*.shp"))
            converted = Path(directory) / "neighborhoods.geojson"
            subprocess.run([
                "ogr2ogr", "-f", "GeoJSON", str(converted), str(source_path),
                "-t_srs", "EPSG:4326", "-select", "CD_MUN,CD_DIST,CD_BAIRRO,NM_BAIRRO",
            ], check=True, stdout=subprocess.DEVNULL)
            neighborhoods = json.loads(converted.read_text(encoding="utf-8"))
            by_municipality: dict[str, list[dict]] = {}
            for feature in neighborhoods.get("features", []):
                code = str(feature.get("properties", {}).get("CD_MUN", "")).zfill(7)
                by_municipality.setdefault(code, []).append(feature)
            for item in items:
                selected = by_municipality.get(item["code"], [])
                for feature in selected:
                    feature["geometry"] = rewind_geometry(feature.get("geometry"))
                output = OUTPUT / "neighborhoods" / f"{item['code']}.geojson"
                write_json(output, {"type": "FeatureCollection", "features": selected})
                item["neighborhoodsPath"] = f"neighborhoods/{item['code']}.geojson"
                item["neighborhoodCount"] = int(len(selected))
                item["neighborhoodGeometryStatus"] = "AVAILABLE"
                total += len(selected)
        print(f"{uf}: {len(items)} municipalities, {sum(i.get('neighborhoodCount', 0) for i in items)} neighborhoods")
    if not keep_raw:
        shutil.rmtree(RAW, ignore_errors=True)
    return total


def export_districts(municipality_items: list[dict[str, str]], keep_raw: bool) -> int:
    """Export official IBGE district polygons split by municipality."""
    total = 0
    by_uf = {item["uf"]: [] for item in municipality_items}
    for item in municipality_items:
        by_uf[item["uf"]].append(item)
    for uf, items in sorted(by_uf.items()):
        try:
            archive = download(DISTRICT_URL.format(uf=uf), RAW / f"{uf}_distritos_CD2022.zip")
        except OSError:
            raise RuntimeError(f"official district source unavailable for {uf}") from None
        with tempfile.TemporaryDirectory(prefix=f"nss-{uf.lower()}-districts-") as directory:
            with zipfile.ZipFile(archive) as source:
                source.extractall(directory)
            source_path = next(Path(directory).rglob("*.shp"))
            converted = Path(directory) / "districts.geojson"
            subprocess.run([
                "ogr2ogr", "-f", "GeoJSON", str(converted), str(source_path),
                "-t_srs", "EPSG:4326", "-select", "CD_MUN,CD_DIST,NM_DIST,NM_MUN",
            ], check=True, stdout=subprocess.DEVNULL)
            districts = json.loads(converted.read_text(encoding="utf-8"))
            by_municipality: dict[str, list[dict]] = {}
            for feature in districts.get("features", []):
                properties = feature.get("properties", {})
                code = str(properties.get("CD_MUN", "")).zfill(7)
                feature["geometry"] = rewind_geometry(feature.get("geometry"))
                feature["properties"] = {
                    "territoryId": f"IBGE_DIST_{properties.get('CD_DIST')}",
                    "name": properties.get("NM_DIST") or "Distrito",
                    "type": "DISTRICT",
                    "municipalityCode": code,
                    "ibgeCode": str(properties.get("CD_DIST")),
                }
                by_municipality.setdefault(code, []).append(feature)
            for item in items:
                selected = by_municipality.get(item["code"], [])
                write_json(OUTPUT / "districts" / f"{item['code']}.geojson", {"type": "FeatureCollection", "features": selected})
                total += len(selected)
        print(f"{uf}: {len(items)} municipalities, {total} districts exported")
    if not keep_raw:
        shutil.rmtree(RAW, ignore_errors=True)
    return total


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--municipalities-only", action="store_true")
    parser.add_argument("--states-only", action="store_true")
    parser.add_argument("--rewind-only", action="store_true")
    parser.add_argument("--keep-raw", action="store_true")
    args = parser.parse_args()
    if args.rewind_only:
        for path in OUTPUT.rglob("*.geojson"):
            rewind_file(path)
        return 0
    state_items = states()
    export_states(state_items)
    if args.states_only:
        return 0
    items = export_municipalities(municipalities())
    export_municipality_overview(items)
    export_municipality_state_overviews(items)
    district_count = None if args.municipalities_only else export_districts(items, args.keep_raw)
    neighborhood_count = None if args.municipalities_only else export_neighborhoods(items, args.keep_raw)
    write_json(OUTPUT / "municipalities.index.json", {"year": YEAR, "items": items})
    write_json(OUTPUT / "manifest.json", {
        "schemaVersion": 1,
        "source": "IBGE Malhas Territoriais 2022",
        "year": YEAR,
        "municipalityCount": len(items),
        "stateCount": len(state_items),
        "districtCount": district_count,
        "neighborhoodCount": neighborhood_count,
        "municipalitiesIndex": "municipalities.index.json",
    })
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
