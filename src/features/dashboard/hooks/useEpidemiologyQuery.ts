import { useQuery } from "@tanstack/react-query";
import { dataSource } from "../api/sources/dataSource";
import type { EpidemiologyRequest } from "../domain/epidemiologyTypes";
export function useEpidemiologyQuery(request: EpidemiologyRequest) {
  return useQuery({
    queryKey: ["epidemiology", request],
    queryFn: () => dataSource.getEpidemiology(request),
    enabled: !!request.disease,
  });
}
export function useDiseases() {
  return useQuery({
    queryKey: ["diseases"],
    queryFn: () => dataSource.listDiseases(),
  });
}
export function useMetadata() {
  return useQuery({ queryKey: ["metadata"], queryFn: () => dataSource.getMetadata() });
}
