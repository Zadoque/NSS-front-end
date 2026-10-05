import { mockDataSource } from "./mockDataSource";
import { apiDataSource } from "./apiDataSource";
const configuredSource = import.meta.env.VITE_DATA_SOURCE;
const useMocks = import.meta.env.VITE_USE_MOCKS;
// Mock é permitido em desenvolvimento/teste. Em produção, API é obrigatória
// mesmo que uma variável antiga de demonstração tenha sido deixada configurada.
export const isDemo = !import.meta.env.PROD &&
  (configuredSource ? configuredSource === "mock" : useMocks !== "false");
export const dataSource = isDemo ? mockDataSource : apiDataSource;
