import { useBrandManifest } from "./useBrandManifest";

export function BrandMark() {
  const manifest = useBrandManifest();
  return <div className="brand-mark" role="img" aria-label="NSS">{manifest.wordmark?.text || "NSS"}</div>;
}
