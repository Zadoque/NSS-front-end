"""Generate lazy-loadable static CNES point files for the frontend map.

The source is the auditable CNES territory CSV produced by the pipeline. The
browser fetches only the selected municipality, so the national catalog does
not inflate the JavaScript bundle or require a database/API request.
"""
from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "public" / "maps" / "national" / "health-units"


def open_csv_source(path: Path):
    if path.suffix == ".gz":
        return gzip.open(path, "rt", encoding="utf-8", newline="")
    return path.open("r", encoding="utf-8", newline="")


def source_rows(path: Path):
    if path.suffix == ".parquet":
        try:
            import pyarrow.parquet as parquet
        except ImportError as error:
            raise RuntimeError("Parquet input requires pyarrow") from error
        source = parquet.ParquetFile(path)
        columns = [
            "cd_unidade", "nm_unidade", "cd_mun", "bairro_cnes",
            "latitude", "longitude", "notification_district_id",
        ]
        missing = set(columns).difference(source.schema_arrow.names)
        if missing:
            raise RuntimeError(f"CNES source missing columns: {', '.join(sorted(missing))}")
        for batch in source.iter_batches(columns=columns, batch_size=50_000):
            yield from batch.to_pylist()
        return

    with open_csv_source(path) as stream:
        reader = csv.DictReader(stream)
        required = {"cnes", "name", "municipalityCode", "latitude", "longitude", "coordinatesValid", "bairroCnes"}
        missing = required.difference(reader.fieldnames or [])
        if missing:
            raise RuntimeError(f"CNES source missing columns: {', '.join(sorted(missing))}")
        yield from reader


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )


def generate(source: Path, output: Path, snapshot: str) -> None:
    by_municipality: dict[str, list[dict[str, object]]] = defaultdict(list)
    rejected = 0
    digest = hashlib.sha256()

    with source.open("rb") as raw:
        for chunk in iter(lambda: raw.read(1024 * 1024), b""):
            digest.update(chunk)

    parquet_input = source.suffix == ".parquet"
    for row in source_rows(source):
        if not parquet_input and str(row["coordinatesValid"]).casefold() != "true":
            rejected += 1
            continue
        try:
            latitude = float(row["latitude"])
            longitude = float(row["longitude"])
        except (TypeError, ValueError):
            rejected += 1
            continue
        if not (-34 <= latitude <= 6 and -74 <= longitude <= -28):
            rejected += 1
            continue
        municipality = str(row["cd_mun"] if parquet_input else row["municipalityCode"]).strip()
        if len(municipality) != 7 or not municipality.isdigit():
            rejected += 1
            continue
        by_municipality[municipality].append({
            "c": str(row["cd_unidade"] if parquet_input else row["cnes"]).strip(),
            "n": str(row["nm_unidade"] if parquet_input else row["name"]).strip(),
            "b": str((row.get("bairro_cnes") if parquet_input else row["bairroCnes"]) or "").strip(),
            "d": str((row.get("notification_district_id") if parquet_input else row.get("ibgeDistrict") or row.get("osmDistrict")) or "").strip(),
            "x": round(longitude, 6),
            "y": round(latitude, 6),
        })

    output.mkdir(parents=True, exist_ok=True)
    for stale_file in output.glob("*.json"):
        stale_file.unlink()
    items = []
    total = 0
    for municipality, units in sorted(by_municipality.items()):
        units.sort(key=lambda item: str(item["c"]))
        write_json(output / f"{municipality}.json", {"items": units})
        items.append({"municipalityCode": municipality, "count": len(units), "path": f"health-units/{municipality}.json"})
        total += len(units)

    write_json(output / "index.json", {
        "catalogVersion": 1,
        "snapshot": snapshot,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": source.name,
        "sourceSha256": digest.hexdigest(),
        "municipalityCount": len(items),
        "healthUnitCount": total,
        "rejectedRowCount": rejected,
        "items": items,
    })
    print(f"CNES map catalog: {total} points in {len(items)} municipalities; {rejected} rows rejected")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path, help="CNES Silver Parquet or territory audit CSV/CSV.GZ")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--snapshot", required=True, help="source snapshot date or batch identifier")
    args = parser.parse_args()
    generate(args.source.resolve(), args.output.resolve(), args.snapshot)


if __name__ == "__main__":
    main()
