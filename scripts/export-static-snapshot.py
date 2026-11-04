"""Exporta somente agregados públicos. PostgreSQL é consultado em READ ONLY.
Uso: python3 scripts/export-static-snapshot.py --container nss-v1-db-1 --catalog /caminho/campos.tsv
Não exporta usuários, unidades, datas individuais, classificação ou nascimento.
"""
import argparse
import collections
import csv
import datetime
import hashlib
import json
import pathlib
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--container', required=True)
parser.add_argument('--catalog', type=pathlib.Path, required=True)
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parents[1]
municipalities = {'3301009': 'Campos dos Goytacazes', '3302205': 'Itaperuna', '3302403': 'Macaé', '3305000': 'São João da Barra'}
catalog = [{'code': code, 'name': name, 'type': 'MUNICIPALITY', 'municipalityCode': code, 'parentDistrictId': None} for code, name in municipalities.items()]
with args.catalog.open() as stream:
    for row in csv.DictReader(stream, delimiter='\t'):
        catalog.append({'code': row['territoryId'], 'name': row['name'], 'type': 'DISTRICT' if row['type'] == 'DISTRICT' else 'NEIGHBORHOOD', 'municipalityCode': row['municipalityCode'], 'parentDistrictId': row['parentDistrictId'] or None})
assert all(x['municipalityCode'] in municipalities for x in catalog)
catalog.sort(key=lambda x: x['code'])
def literal(value):
    return "'" + str(value).replace("'", "''") + "'"
scope = 'cd_mun IN (' + ','.join(map(literal, municipalities)) + ')'
columns = 'disease_codigo,ano,mes,cd_mun,cd_sexo,age_band,notification_district_id,notification_neighborhood_id,notification_territory_status'
queries = [f"SELECT coalesce(json_agg(g), '[]') FROM (SELECT {columns},sum(cases_total)::bigint AS count FROM analytics.fato_casos WHERE {scope} GROUP BY {columns} ORDER BY {columns}) g;",
           f"SELECT json_build_object('total',sum(cases_total),'rows',count(*)) FROM analytics.fato_casos WHERE {scope};",
           "SELECT to_json(max(published_at)) FROM analytics.pipeline_publications;"]
checks = []
# Oráculo SQL independente da agregação client-side, incluindo sexo, idade e ALL.
for disease in ['CHIK', 'DENG', 'FMAC', 'TOXC', 'TOXG', 'ZIKA']:
    for year in [2023, 2024, 2025, 2026, 'ALL']:
        for geography in ['MUNICIPALITY', 'DISTRICT', 'NEIGHBORHOOD']:
            for filtered in [False, True]:
                req = {'disease': disease, 'year': year, 'month': 1 if filtered else 'ALL', 'geography': geography}
                where = [scope, 'disease_codigo = ' + literal(disease), "cd_sexo IN ('M','F','I')"]
                if year != 'ALL': where.append('ano = ' + str(year))
                if filtered:
                    req.update(sex='F' if year in [2024, 2026] else 'M', ageBand='LT1' if year in [2023, 2025] else '20_39')
                    where += ['mes = 1', 'cd_sexo = ' + literal(req['sex']), 'age_band = ' + literal(req['ageBand'])]
                if geography != 'MUNICIPALITY':
                    req['municipalityCode'] = '3301009'
                    where.append("cd_mun = '3301009'")
                if geography == 'NEIGHBORHOOD':
                    req['districtCode'] = 'CG_DIST_SEDE'
                    where.append("notification_district_id = 'CG_DIST_SEDE'")
                entries = [x for x in catalog if x['type'] == geography and (geography != 'NEIGHBORHOOD' or x['parentDistrictId'] == 'CG_DIST_SEDE')]
                column = {'MUNICIPALITY':'cd_mun', 'DISTRICT':'notification_district_id', 'NEIGHBORHOOD':'notification_neighborhood_id'}[geography]
                mapped = column + ' IN (' + ','.join(literal(x['code']) for x in entries) + ')'
                if geography == 'DISTRICT': mapped += " AND notification_territory_status IN ('NOTIFICATION_DISTRICT_ONLY','NOTIFICATION_NEIGHBORHOOD')"
                if geography == 'NEIGHBORHOOD': mapped += " AND notification_territory_status = 'NOTIFICATION_NEIGHBORHOOD'"
                queries.append(f"WITH selected AS (SELECT * FROM analytics.fato_casos WHERE {' AND '.join(where)}), items AS (SELECT {column} AS code,sum(cases_total)::bigint AS count FROM selected WHERE {mapped} GROUP BY {column}) SELECT json_build_object('total',coalesce((SELECT sum(cases_total) FROM selected),0),'mapped',coalesce((SELECT sum(count) FROM items),0),'items',coalesce((SELECT json_agg(items) FROM items),'[]'));" )
                checks.append({'request':req})
command = ['docker','exec','-i',args.container,'sh','-ceu','exec psql -X -qAt -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"']
output = subprocess.check_output(command, input=('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;\n'+'\n'.join(queries)+'\nCOMMIT;').encode())
remaining = output.decode().strip()
results = []
while remaining:
    value, end = json.JSONDecoder().raw_decode(remaining)
    results.append(value)
    remaining = remaining[end:].lstrip()
rows, totals, published = results[:3]
assert sum(r['count'] for r in rows) == totals['total']
assert {r['cd_mun'] for r in rows} == set(municipalities)
for check, expected in zip(checks, results[3:], strict=True): check['expected'] = expected
target = root / 'data/static-snapshot'
target.mkdir(parents=True, exist_ok=True)
def encode(value): return json.dumps(value, ensure_ascii=False, separators=(',',':')).encode()
grouped = collections.defaultdict(list)
months = collections.defaultdict(set)
for r in rows:
    grouped[r['disease_codigo']].append([r['ano'],r['mes'],r['cd_mun'],r['cd_sexo'],r['age_band'],r['notification_district_id'],r['notification_neighborhood_id'],r['notification_territory_status'],r['count']])
    months[str(r['ano'])].add(r['mes'])
files = {}
for disease, data in sorted(grouped.items()):
    content = encode(data)
    digest = hashlib.sha256(content).hexdigest()
    filename = f'{disease.lower()}-{digest[:12]}.json'
    (target / filename).write_bytes(content)
    files[disease] = {'path':filename,'sha256':digest,'rows':len(data),'notifications':sum(x[-1] for x in data)}
manifest = {'schemaVersion':1,'exportedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourcePublishedAt':published,'source':'SINAN/PySUS → NSS Gold Serving → PostgreSQL analytics','perspective':'Local da unidade notificadora, não residência','totalNotifications':totals['total'],'sourceRows':totals['rows'],'snapshotRows':len(rows),'files':files,'catalog':catalog,'availableYears':sorted(map(int, months)),'availableMonthsByYear':{y:sorted(m) for y,m in sorted(months.items())}}
(target / 'manifest.json').write_bytes(encode(manifest))
# Descarta apenas versões antigas geradas por este exportador nesta pasta dedicada.
for previous in target.glob('*.json'):
    if previous.name != 'manifest.json' and previous.name not in {f['path'] for f in files.values()}:
        previous.unlink()
fixture = root / 'tests/builds/snapshot-oracle.json'
fixture.write_bytes(encode(checks))
print(json.dumps({'notifications':totals['total'],'snapshotRows':len(rows),'diseases':list(files),'sqlChecks':len(checks),'jsonBytes':sum(p.stat().st_size for p in target.glob('*.json'))}))
