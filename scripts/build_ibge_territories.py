"""Download, inspect and build the official IBGE 2022 Campos territory assets.

Requires ``ogr2ogr`` and ``unzip`` on PATH.  The raw downloads are deliberately
kept outside version control; every output is deterministic from the URLs and
the versioned CIDAC catalog.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
import unicodedata
import urllib.request
import zipfile
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "data/reference/cidac-campos-territories.json"
RAW_PATH = ROOT / "data/raw/ibge-2022"
REFERENCE_PATH = ROOT / "data/reference"
MAP_PATH = ROOT / "public/maps"
TODAY = date.today().isoformat()
MUNICIPALITY = "3301009"

SOURCES = {
    "ibge_districts_rj_2022": "https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2022/distritos/shp/UF/RJ_distritos_CD2022.zip",
    "ibge_neighborhoods_rj_2022": "https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2022/bairros/shp/UF/RJ_bairros_CD2022.zip",
    "ibge_localities_rj_2022": "https://geoftp.ibge.gov.br/organizacao_do_territorio/estrutura_territorial/localidades/Localidades_do_Brasil/2022/Localidades_UFs_shp.zip",
}
EXPECTED_SHA256 = {
    "ibge_districts_rj_2022": "5cfdbafdd5ca389da203098e484509f4fed88aa5c4e94098fa67ffd44d56cc42",
    "ibge_neighborhoods_rj_2022": "8eb963e547e8bc2e95b9a94fb5492f660d0828e4e5ec0211f4bb1f3ceae5546e",
    "ibge_localities_rj_2022": "f4af7774f1bf92636c8ff2bde61b515b8dd65b3d50eca66664f3ce77a0b7470c",
}


def normalized(value: str) -> str:
    value = unicodedata.normalize("NFKD", value or "")
    value = "".join(char for char in value if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", "", value.casefold())


def slug(value: str) -> str:
    value = unicodedata.normalize("NFKD", value or "")
    value = "".join(char for char in value if not unicodedata.combining(char))
    return re.sub(r"[^A-Z0-9]+", "_", value.upper()).strip("_")


def district_slug(name: str) -> str:
    return "SEDE" if name == "Distrito Sede" else slug(name)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download_sources() -> dict[str, Path]:
    RAW_PATH.mkdir(parents=True, exist_ok=True)
    result = {}
    for source_id, url in SOURCES.items():
        target = RAW_PATH / f"{source_id}.zip"
        if not target.exists():
            print(f"downloading {source_id}")
            urllib.request.urlretrieve(url, target)
        digest = sha256(target)
        if digest != EXPECTED_SHA256[source_id]:
            raise RuntimeError(f"checksum mismatch for {source_id}: {digest}")
        result[source_id] = target
    return result


def run(*args: str) -> None:
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL)


def export_source(raw: dict[str, Path], workspace: Path) -> dict[str, Path]:
    extracted = workspace / "extracted"
    extracted.mkdir()
    paths: dict[str, Path] = {}
    for source_id, archive in raw.items():
        destination = extracted / source_id
        destination.mkdir()
        with zipfile.ZipFile(archive) as source_zip:
            source_zip.extractall(destination)
    paths["districts"] = next((extracted / "ibge_districts_rj_2022").rglob("*.shp"))
    paths["neighborhoods"] = next((extracted / "ibge_neighborhoods_rj_2022").rglob("*.shp"))
    paths["localities"] = next((extracted / "ibge_localities_rj_2022" / "RJ").rglob("*.shp"))
    for name, source in paths.copy().items():
        target = workspace / f"{name}.geojson"
        select = {
            "districts": "CD_MUN,CD_DIST,NM_DIST,NM_MUN",
            "neighborhoods": "CD_MUN,CD_DIST,NM_DIST,CD_BAIRRO,NM_BAIRRO",
            "localities": "CD_MUN,CD_LOCALID,NM_LOCALID,CT_LOCALID,SCT_LOCALI,LAT_LOCALI,LONG_LOCAL",
        }[name]
        run("ogr2ogr", "-f", "GeoJSON", str(target), str(source), "-where", f"CD_MUN = '{MUNICIPALITY}'", "-t_srs", "EPSG:4326", "-select", select)
        paths[name] = target
    return paths


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")


def feature(properties: dict, source_feature: dict) -> dict:
    return {"type": "Feature", "properties": properties, "geometry": source_feature["geometry"]}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--keep-raw", action="store_true", help="keep downloads in data/raw (ignored by git)")
    args = parser.parse_args()
    raw = download_sources()
    catalog = load(CATALOG_PATH)
    localities = [locality for district in catalog["districts"] for locality in district["localities"]]
    locality_by_name = {}
    for locality in localities:
        locality_by_name.setdefault(normalized(locality["name"]), []).append(locality)
    district_by_name = {normalized(district["name"]): district for district in catalog["districts"]}
    district_by_name[normalized("Campos dos Goytacazes")] = next(d for d in catalog["districts"] if d["name"] == "Distrito Sede")
    district_by_name[normalized("Santo Amaro de Campos")] = next(d for d in catalog["districts"] if d["name"] == "Santo Amaro")
    district_by_name[normalized("São Sebastião de Campos")] = next(d for d in catalog["districts"] if d["name"] == "São Sebastião")
    district_by_name[normalized("Tocos")] = next(d for d in catalog["districts"] if d["name"] == "Tócos")
    district_by_name[normalized("Vila Nova de Campos")] = next(d for d in catalog["districts"] if d["name"] == "Vila Nova")

    with tempfile.TemporaryDirectory(prefix="nss-ibge-build-") as temporary:
        paths = export_source(raw, Path(temporary))
        districts = load(paths["districts"])["features"]
        neighborhoods = load(paths["neighborhoods"])["features"]
        locality_points = load(paths["localities"])["features"]

        district_crosswalk = []
        districts_out = []
        district_by_ibge = {}
        for source in sorted(districts, key=lambda item: item["properties"]["CD_DIST"]):
            props = source["properties"]
            cidac = district_by_name.get(normalized(props["NM_DIST"]))
            if cidac is None:
                raise RuntimeError(f"district without explicit CIDAC match: {props['NM_DIST']}")
            district_by_ibge[props["CD_DIST"]] = cidac
            district_crosswalk.append({"ibgeCode": props["CD_DIST"], "ibgeName": props["NM_DIST"], "cidacName": cidac["name"], "territoryId": cidac["territoryId"]})
            districts_out.append(feature({"territoryId": cidac["territoryId"], "name": cidac["name"], "type": "DISTRICT", "municipalityCode": MUNICIPALITY, "ibgeCode": props["CD_DIST"]}, source))
        if len(districts_out) != 14:
            raise RuntimeError(f"expected 14 Campos districts, got {len(districts_out)}")

        polygon_by_name = {}
        neighborhoods_out = []
        for source in sorted(neighborhoods, key=lambda item: item["properties"]["CD_BAIRRO"]):
            props = source["properties"]
            parent = district_by_ibge[props["CD_DIST"]]
            candidates = [item for item in locality_by_name.get(normalized(props["NM_BAIRRO"]), []) if item["parentDistrictId"] == parent["territoryId"]]
            if len(candidates) == 1:
                locality = candidates[0]
                match_type = "EXACT" if locality["name"] == props["NM_BAIRRO"] else "NORMALIZED_EXACT"
                polygon_by_name[(locality["territoryId"], parent["territoryId"])] = {"type": match_type, "source": source}
                neighborhoods_out.append(feature({"territoryId": locality["territoryId"], "name": locality["name"], "type": "NEIGHBORHOOD_OR_LOCALITY", "municipalityCode": MUNICIPALITY, "parentDistrictId": parent["territoryId"], "ibgeCode": props["CD_BAIRRO"], "ibgeName": props["NM_BAIRRO"], "geometryStatus": "POLYGON_OFFICIAL"}, source))

        crosswalk = []
        counts = {"EXACT": 0, "NORMALIZED_EXACT": 0, "MANUAL_VERIFIED": 0, "IBGE_LOCALITY_POINT_ONLY": 0, "NO_MATCH": 0}
        point_names = {}
        for source in locality_points:
            props = source["properties"]
            point_names.setdefault(normalized(props.get("NM_LOCALID", "")), []).append(source)
        for district in catalog["districts"]:
            for locality in district["localities"]:
                polygon = polygon_by_name.get((locality["territoryId"], district["territoryId"]))
                if polygon:
                    source = polygon["source"]["properties"]
                    match_type = polygon["type"]
                    crosswalk.append({"cidacTerritoryId": locality["territoryId"], "cidacName": locality["name"], "cidacDistrictId": district["territoryId"], "ibgeMatchType": match_type, "ibgeCode": source["CD_BAIRRO"], "ibgeName": source["NM_BAIRRO"], "geometryStatus": "POLYGON_OFFICIAL", "notes": "IBGE bairro polygon; parent district validated by CD_DIST."})
                    counts[match_type] += 1
                    continue
                points = point_names.get(normalized(locality["name"]), [])
                if len(points) == 1:
                    source = points[0]["properties"]
                    crosswalk.append({"cidacTerritoryId": locality["territoryId"], "cidacName": locality["name"], "cidacDistrictId": district["territoryId"], "ibgeMatchType": "IBGE_LOCALITY_POINT_ONLY", "ibgeCode": source.get("CD_LOCALID"), "ibgeName": source.get("NM_LOCALID"), "geometryStatus": "POINT_ONLY", "notes": "Exact locality-name match in IBGE Localidades do Brasil; point is not promoted to polygon."})
                    counts["IBGE_LOCALITY_POINT_ONLY"] += 1
                else:
                    crosswalk.append({"cidacTerritoryId": locality["territoryId"], "cidacName": locality["name"], "cidacDistrictId": district["territoryId"], "ibgeMatchType": "NO_MATCH", "ibgeCode": None, "ibgeName": None, "geometryStatus": "NO_GEOMETRY", "notes": "No unambiguous exact-name polygon or locality point found; no fuzzy promotion."})
                    counts["NO_MATCH"] += 1

        write(MAP_PATH / "campos-districts.geojson", {"type": "FeatureCollection", "features": districts_out})
        write(MAP_PATH / "campos-neighborhoods.geojson", {"type": "FeatureCollection", "features": neighborhoods_out})
        write(REFERENCE_PATH / "cidac-ibge-district-crosswalk.json", {"source": "IBGE Censo 2022 + CIDAC 2019", "items": district_crosswalk})
        write(REFERENCE_PATH / "cidac-ibge-territory-crosswalk.json", {"source": "IBGE Censo 2022 + IBGE Localidades do Brasil 2022 + CIDAC 2019", "items": crosswalk})
        manifest = {"generatedAt": TODAY, "sources": [{"id": source_id, "organization": "IBGE", "year": 2022, "sourceUrl": SOURCES[source_id], "sha256": sha256(path), "crsInput": "EPSG:4674", "crsOutput": "EPSG:4326"} for source_id, path in raw.items()]}
        write(REFERENCE_PATH / "geospatial-sources.json", manifest)
        print(json.dumps({"districtPolygons": len(districts_out), "ibgeNeighborhoodPolygonsInCampos": len(neighborhoods), "cidacNeighborhoodPolygons": len(neighborhoods_out), "cidacLocalities": len(localities), **counts}, indent=2))
    if not args.keep_raw:
        print(f"raw downloads retained in {RAW_PATH} (gitignored) for repeatability")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
