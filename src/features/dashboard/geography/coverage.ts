import { geographyCapabilities } from "./geographyDomain";

/** Compatibility projection for existing visual components. Domain rules live in geographyDomain. */
export const demoCoverage = {
  drilldownEnabled: {
    regions: [...geographyCapabilities.drilldownRegions],
    states: [...geographyCapabilities.drilldownStates],
  },
  caseDataAvailableForMunicipalities: [...geographyCapabilities.coveredMunicipalities],
};
export const municipalities = [
  { cdMun: "3301009", nmMun: "Campos dos Goytacazes", casesTotal: 120 },
  { cdMun: "3302403", nmMun: "Macaé", casesTotal: 85 },
  { cdMun: "3302205", nmMun: "Itaperuna", casesTotal: 42 },
  { cdMun: "3305000", nmMun: "São João da Barra", casesTotal: 18 },
];
