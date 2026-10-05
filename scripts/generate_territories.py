"""Validate the CIDAC territory catalog and optionally normalize trusted vectors.

The CIDAC PDF is a nomenclature/hierarchy source, not a vector source. Therefore
the default command validates and reports the canonical catalog only. A trusted
vector source must be supplied explicitly before production GeoJSON is emitted.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "data/reference/cidac-campos-territories.json"


def slug(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^A-Z0-9]+", "_", ascii_value.upper()).strip("_")


def district_slug(name: str) -> str:
    # The CIDAC index calls this unit "Distrito Sede"; the stable NSS ID uses
    # the municipality's conventional short label SEDE.
    return "SEDE" if name == "Distrito Sede" else slug(name)


def fail(message: str) -> None:
    raise ValueError(message)


def validate(catalog: dict) -> tuple[int, dict[str, int]]:
    if catalog.get("municipalityCode") != "3301009":
        fail("municipalityCode must be Campos dos Goytacazes (3301009)")
    districts = catalog.get("districts")
    if not isinstance(districts, list) or len(districts) != 14:
        fail(f"expected exactly 14 districts, got {len(districts) if isinstance(districts, list) else 0}")

    district_ids: set[str] = set()
    territory_ids: set[str] = set()
    names_by_parent: dict[str, set[str]] = {}
    counts: dict[str, int] = {}
    expected_district_prefix = "CG_DIST_"
    expected_locality_prefix = "CG_LOC_"

    for district in districts:
        district_id = district.get("territoryId")
        district_name = district.get("name")
        localities = district.get("localities")
        if not isinstance(district_id, str) or not district_id.startswith(expected_district_prefix):
            fail(f"invalid district ID: {district_id!r}")
        if district_id in district_ids or district_id in territory_ids:
            fail(f"duplicate territory ID: {district_id}")
        if district.get("type") != "DISTRICT":
            fail(f"district {district_id} has invalid type")
        if district_id != f"CG_DIST_{district_slug(district_name)}":
            fail(f"district ID is not deterministic for {district_name!r}")
        if not isinstance(localities, list) or not localities:
            fail(f"district {district_id} has no localities")
        district_ids.add(district_id)
        territory_ids.add(district_id)
        names_by_parent[district_id] = set()
        counts[district_name] = len(localities)

        for locality in localities:
            locality_name = locality.get("name") if isinstance(locality, dict) else locality
            if not isinstance(locality_name, str) or not locality_name.strip():
                fail(f"empty locality in {district_id}")
            if not isinstance(locality, dict):
                fail(f"locality {locality_name!r} must be an object with a canonical ID")
            if locality.get("type") != "NEIGHBORHOOD_OR_LOCALITY":
                fail(f"locality {locality_name!r} has invalid type")
            if locality.get("parentDistrictId") != district_id:
                fail(f"locality {locality_name!r} has invalid parentDistrictId")
            if locality_name in names_by_parent[district_id]:
                fail(f"duplicate locality name in {district_id}: {locality_name}")
            locality_id = f"{expected_locality_prefix}{district_slug(district_name)}_{slug(locality_name)}"
            if locality.get("territoryId") != locality_id:
                fail(f"locality ID is not deterministic for {locality_name!r}")
            if locality_id in territory_ids:
                fail(f"duplicate locality ID: {locality_id}")
            names_by_parent[district_id].add(locality_name)
            territory_ids.add(locality_id)

    all_names: dict[str, str] = {}
    for parent, names in names_by_parent.items():
        for name in names:
            previous = all_names.get(name)
            if previous and previous != parent:
                # The source can legitimately repeat a name in different districts;
                # report it explicitly rather than using names as logical keys.
                print(f"warning: repeated display name {name!r}: {previous}, {parent}", file=sys.stderr)
            all_names[name] = parent

    total = sum(counts.values())
    if total != len(territory_ids) - len(district_ids):
        fail("locality count does not match generated IDs")
    return total, counts


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog", type=Path, default=CATALOG)
    parser.add_argument("--trusted-geojson", type=Path, help="Reserved for a trusted CRS-aware vector source")
    args = parser.parse_args()
    catalog = json.loads(args.catalog.read_text(encoding="utf-8"))
    total, counts = validate(catalog)
    print(f"catalog: {args.catalog}")
    print(f"districts: {len(counts)}")
    print(f"localities: {total}")
    for name, count in counts.items():
        print(f"- {name}: {count}")
    if args.trusted_geojson:
        fail("production GeoJSON generation is blocked until a trusted vector source is documented")
    print("geometry: not generated by catalog validator; run scripts/build_ibge_territories.py for official IBGE assets")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"validation failed: {error}", file=sys.stderr)
        raise SystemExit(1)
