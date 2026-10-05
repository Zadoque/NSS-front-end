"""Generate only V1 cartography, using geobr's simplified 2020 IBGE boundaries."""
import json
from pathlib import Path
import geobr

OUTPUT = Path(__file__).resolve().parents[1] / 'public' / 'maps'
YEAR = 2020

def export(frame, filename, code, name, expected):
    frame = frame.to_crs('EPSG:4326').copy()
    assert len(frame) == expected, (filename, len(frame))
    assert frame.geometry.is_valid.all() and not frame.geometry.is_empty.any()
    frame[code] = frame[code].astype(int).astype(str)
    assert frame[code].is_unique
    columns = [code, name, 'geometry']
    if 'abbrev_state' in frame:
        columns.insert(2, 'abbrev_state')
    if code == 'code_region':
        frame['abbrev_region'] = frame[code].map({'1': 'N', '2': 'NE', '3': 'SE', '4': 'S', '5': 'CO'})
        columns.insert(2, 'abbrev_region')
    data = json.loads(frame.sort_values(code)[columns].to_json(drop_id=True))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    path = OUTPUT / filename
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f'{filename}: {len(frame)} features, {path.stat().st_size} bytes')

if __name__ == '__main__':
    export(geobr.read_region(year=YEAR, simplified=True), 'brazil-regions.geojson', 'code_region', 'name_region', 5)
    states = geobr.read_state(year=YEAR, simplified=True)
    export(states[states.abbrev_state.isin(['ES', 'MG', 'RJ', 'SP'])], 'southeast-states.geojson', 'code_state', 'name_state', 4)
    export(geobr.read_municipality(code_muni='RJ', year=YEAR, simplified=True), 'rj-municipalities.geojson', 'code_muni', 'name_muni', 92)
