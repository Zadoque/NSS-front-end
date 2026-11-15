import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type MunicipalityFeature = {
  properties: { code_muni: string; name_muni: string; abbrev_state: string };
};

const catalog = JSON.parse(
  readFileSync(resolve(process.cwd(), "public/maps/national/municipalities.geojson"), "utf8"),
) as { features: MunicipalityFeature[] };
const municipalities = catalog.features.map(({ properties }) => ({
  code: String(properties.code_muni),
  name: properties.name_muni,
  uf: properties.abbrev_state,
}));
const accessToken = process.env.PLAYWRIGHT_ACCESS_TOKEN;

test.describe.configure({ mode: "parallel" });
test.setTimeout(120_000);

test.beforeAll(() => {
  if (!accessToken) {
    throw new Error("PLAYWRIGHT_ACCESS_TOKEN é obrigatório para a validação nacional integrada");
  }
  expect(municipalities).toHaveLength(5571);
});

for (const municipality of municipalities) {
  test(`município ${municipality.code} — ${municipality.name}/${municipality.uf}`, async ({ request }, testInfo) => {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const query = new URLSearchParams({ disease: "DENG", year: "2026", municipalityCode: municipality.code });
    const [districtsResponse, neighborhoodsResponse] = await Promise.all([
      request.get(`/api/v1/epidemiology/districts?${query}`, { headers }),
      request.get(`/api/v1/epidemiology/neighborhoods?${query}`, { headers }),
    ]);
    expect(districtsResponse.ok(), municipality.name).toBeTruthy();
    expect(neighborhoodsResponse.ok(), municipality.name).toBeTruthy();
    const districts = await districtsResponse.json();
    const neighborhoods = await neighborhoodsResponse.json();
    expect(districts.filters.municipalityCode).toBe(municipality.code);
    expect(neighborhoods.filters.municipalityCode).toBe(municipality.code);
    expect(Array.isArray(districts.items), municipality.name).toBeTruthy();
    expect(Array.isArray(neighborhoods.items), municipality.name).toBeTruthy();
    testInfo.annotations.push({
      type: "coverage",
      description: JSON.stringify({
        municipalityCode: municipality.code,
        municipality: municipality.name,
        uf: municipality.uf,
        districts: districts.items.length,
        neighborhoods: neighborhoods.items.length,
        districtCoverage: districts.coverage,
        neighborhoodCoverage: neighborhoods.coverage,
      }),
    });
  });
}
