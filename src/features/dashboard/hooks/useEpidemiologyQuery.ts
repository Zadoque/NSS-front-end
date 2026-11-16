import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useSyncExternalStore } from "react";
import { dataSource } from "../api/sources/dataSource";
import { realAuth } from "../../auth/model/realAuth";
import { operationalDay } from "../cache/operationalDay";
import type { EpidemiologyRequest } from "../domain/epidemiologyTypes";

function useDashboardScope() {
  const session = useSyncExternalStore(realAuth.subscribe, realAuth.getSession);
  const epoch = useSyncExternalStore(realAuth.subscribe, realAuth.getEpoch);
  const [, updateOnFocus] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const scheduleBoundary = () => {
      clearTimeout(timer);
      const now = Date.now();
      const day = operationalDay(new Date(now));
      let lower = now;
      let upper = now + 27 * 60 * 60 * 1000;
      while (upper - lower > 1) {
        const middle = Math.floor((lower + upper) / 2);
        if (operationalDay(new Date(middle)) === day) lower = middle;
        else upper = middle;
      }
      timer = setTimeout(() => { updateOnFocus((value) => value + 1); scheduleBoundary(); }, upper - now + 1);
    };
    const update = () => { updateOnFocus((value) => value + 1); scheduleBoundary(); };
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    scheduleBoundary();
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return [session?.id ?? "anonymous", epoch, operationalDay()] as const;
}

export function useEpidemiologyQuery(request: EpidemiologyRequest, enabled = true) {
  const scope = useDashboardScope();
  return useQuery({
    queryKey: ["epidemiology", ...scope, request],
    queryFn: () => dataSource.getEpidemiology(request),
    enabled: enabled && !!request.disease,
  });
}
export function useDiseases() {
  const scope = useDashboardScope();
  return useQuery({
    queryKey: ["diseases", ...scope],
    queryFn: () => dataSource.listDiseases(),
  });
}
export function useMetadata() {
  const scope = useDashboardScope();
  return useQuery({ queryKey: ["metadata", ...scope], queryFn: () => dataSource.getMetadata() });
}
