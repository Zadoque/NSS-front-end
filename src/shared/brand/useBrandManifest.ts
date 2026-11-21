import { useEffect, useState } from "react";
import { requestJson } from "../api/http";

type BrandManifest = { wordmark?: { text?: string } };
const FALLBACK: Required<BrandManifest> = { wordmark: { text: "NSS" } };

export function useBrandManifest() {
  const [manifest, setManifest] = useState<BrandManifest>(FALLBACK);
  useEffect(() => {
    let active = true;
    requestJson("/public/brand").then((value) => {
      if (active && value && typeof value === "object") setManifest(value as BrandManifest);
    }).catch(() => { /* typographic fallback remains authoritative */ });
    return () => { active = false; };
  }, []);
  return manifest;
}
