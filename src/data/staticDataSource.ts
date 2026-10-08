import type { EpidemiologyDataSource } from '../types/epidemiology';
import { aggregateSnapshot, type SnapshotManifest, type SnapshotRow } from './staticSnapshot';
const base = `${import.meta.env.BASE_URL}snapshot/`;
let manifestPromise: Promise<SnapshotManifest> | undefined;
const cache = new Map<string, Promise<SnapshotRow[]>>();
async function read(path: string): Promise<unknown> {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(15_000), credentials: 'omit' });
  if (!response.ok) throw new Error('Não foi possível carregar o snapshot publicado.');
  return response.json();
}
function manifest() {
  return manifestPromise ??= read('manifest.json').then(value => {
    const m = value as SnapshotManifest;
    if (m.schemaVersion !== 1 || !m.files || !Array.isArray(m.catalog)) throw new Error('Snapshot incompatível.');
    return m;
  }).catch(error => { manifestPromise = undefined; throw error; });
}
export const staticDataSource: EpidemiologyDataSource = {
  async listDiseases() { return Object.keys((await manifest()).files).sort(); },
  async getMetadata() { return manifest(); },
  async getEpidemiology(request) {
    const m = await manifest();
    const file = m.files[request.disease];
    if (!file || !/^[a-z]+-[a-f0-9]{12}\.json$/.test(file.path)) throw new Error('Agravo ausente no snapshot.');
    if (!cache.has(file.path)) cache.set(file.path, read(file.path).then(value => {
      if (!Array.isArray(value) || value.length !== file.rows || !value.every(row => Array.isArray(row) && row.length === 9 && Number.isSafeInteger(row[8]) && row[8] >= 0)) throw new Error('Dados do snapshot inválidos.');
      return value as SnapshotRow[];
    }).catch(error => { cache.delete(file.path); throw error; }));
    return aggregateSnapshot(m, await cache.get(file.path)!, request);
  },
};
