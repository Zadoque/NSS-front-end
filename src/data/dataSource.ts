import { mockDataSource } from "./mockDataSource";
import { apiDataSource } from "./apiDataSource";
import { staticDataSource } from "./staticDataSource";
const configuredSource = import.meta.env.VITE_DATA_SOURCE;
const useMocks = import.meta.env.VITE_USE_MOCKS;
// O build production continua exigindo API, independentemente de flags antigas.
// Apenas o modo explícito prod-mock permite demonstração no build otimizado.
export const isProdMock = import.meta.env.MODE === "prod-mock";
export const isDemo = isProdMock || (!import.meta.env.PROD &&
  (configuredSource ? configuredSource === "mock" : useMocks !== "false"));
export const dataSource = isProdMock ? staticDataSource : isDemo ? mockDataSource : apiDataSource;
