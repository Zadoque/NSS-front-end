import { mockDataSource } from "./mockDataSource";
import { apiDataSource } from "./apiDataSource";
const configuredSource = import.meta.env.VITE_DATA_SOURCE;
export const isDemo = configuredSource ? configuredSource === "mock" : !import.meta.env.PROD;
export const dataSource = isDemo ? mockDataSource : apiDataSource;
