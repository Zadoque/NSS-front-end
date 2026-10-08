import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { aggregateSnapshot, type SnapshotManifest, type SnapshotRow } from '../../src/data/staticSnapshot';
import type { EpidemiologyRequest } from '../../src/types/epidemiology';
const root = new URL('../../data/static-snapshot/', import.meta.url);
const manifest: SnapshotManifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8'));
const oracle: { request: EpidemiologyRequest; expected: { total: number; mapped: number; items: {code:string;count:number}[] } }[] = JSON.parse(readFileSync(new URL('./snapshot-oracle.json', import.meta.url), 'utf8'));
for (const [disease,file] of Object.entries(manifest.files)) {
  test(`integridade do arquivo ${disease}`, () => {
    const content = readFileSync(new URL(file.path, root));
    expect(createHash('sha256').update(content).digest('hex')).toBe(file.sha256);
    const rows: SnapshotRow[] = JSON.parse(content.toString());
    expect(rows).toHaveLength(file.rows);
    expect(rows.reduce((sum,row) => sum + row[8],0)).toBe(file.notifications);
  });
}
for (const [index,check] of oracle.entries()) test(`SQL-${index + 1}: ${JSON.stringify(check.request)}`, () => {
  const rows = JSON.parse(readFileSync(new URL(manifest.files[check.request.disease].path, root), 'utf8'));
  const actual = aggregateSnapshot(manifest, rows, check.request);
  expect(actual.totalNotifications).toBe(check.expected.total);
  expect(actual.coverage.mappedNotificationsTotal).toBe(check.expected.mapped);
  expect(actual.coverage.unmappedNotificationsTotal).toBe(check.expected.total - check.expected.mapped);
  expect(actual.coverage.status).toBe(check.expected.total === check.expected.mapped ? 'AVAILABLE' : 'PARTIAL');
  const expected = new Map(check.expected.items.map(x => [x.code,x.count]));
  for (const item of actual.items) expect(item.notificationsTotal).toBe(expected.get(item.code) ?? 0);
  expect(actual.items.reduce((sum,x) => sum + x.notificationsTotal,0)).toBe(check.expected.mapped);
});
