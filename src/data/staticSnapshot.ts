import type { EpidemiologyRequest, EpidemiologyResponse } from '../types/epidemiology';

export type SnapshotRow = [number, number, string, string | null, string | null, string | null, string | null, string | null, number];
export type SnapshotManifest = {
  schemaVersion: number;
  exportedAt: string;
  sourcePublishedAt: string;
  files: Record<string, { path: string; sha256: string; rows: number; notifications: number }>;
  availableYears: number[];
  availableMonthsByYear: Record<string, number[]>;
  catalog: { code: string; name: string; type: string; municipalityCode: string; parentDistrictId: string | null }[];
};

export function aggregateSnapshot(manifest: SnapshotManifest, rows: SnapshotRow[], request: EpidemiologyRequest): EpidemiologyResponse {
  const { geography, municipalityCode, districtCode } = request;
  const response: EpidemiologyResponse = { metric: 'notifications', geography, filters: request, totalNotifications: null, coverage: { status: 'UNAVAILABLE', mappedNotificationsTotal: 0, unmappedNotificationsTotal: 0 }, items: [] };
  if (!['MUNICIPALITY','DISTRICT','NEIGHBORHOOD'].includes(geography) ||
      (geography !== 'MUNICIPALITY' && municipalityCode !== '3301009') ||
      (geography === 'NEIGHBORHOOD' && districtCode !== 'CG_DIST_SEDE')) return response;
  const entries = manifest.catalog.filter(x => x.type === geography && (!municipalityCode || x.municipalityCode === municipalityCode) && (geography !== 'NEIGHBORHOOD' || x.parentDistrictId === districtCode));
  if (!entries.length) return response;
  const counts = new Map(entries.map(x => [x.code, 0]));
  let total = 0, mapped = 0;
  for (const [year, month, municipality, sex, age, district, neighborhood, status, count] of rows) {
    if ((request.year !== 'ALL' && year !== request.year) || (request.month !== 'ALL' && month !== request.month) ||
        (municipalityCode && municipality !== municipalityCode) || (geography === 'NEIGHBORHOOD' && district !== districtCode) ||
        !['M','F','I'].includes(sex ?? '') || (request.sex && sex !== request.sex) || (request.ageBand && age !== request.ageBand)) continue;
    total += count;
    const code = geography === 'MUNICIPALITY' ? municipality : geography === 'DISTRICT' ? district : neighborhood;
    const validStatus = geography === 'MUNICIPALITY' || (geography === 'DISTRICT' ? ['NOTIFICATION_DISTRICT_ONLY','NOTIFICATION_NEIGHBORHOOD'].includes(status ?? '') : status === 'NOTIFICATION_NEIGHBORHOOD');
    if (code && counts.has(code) && validStatus) { counts.set(code, counts.get(code)! + count); mapped += count; }
  }
  response.totalNotifications = total;
  response.coverage = { status: total === mapped ? 'AVAILABLE' : 'PARTIAL', mappedNotificationsTotal: mapped, unmappedNotificationsTotal: total - mapped };
  response.items = entries.map(x => ({ code:x.code, name:x.name, notificationsTotal:counts.get(x.code)!, ...(x.parentDistrictId ? {parentDistrictId:x.parentDistrictId} : {}) })).sort((a,b) => a.code.localeCompare(b.code));
  return response;
}
