import { useEffect, useMemo, useState } from "react";
import { getJson, requestJson } from "../../../shared/api/http";

type Clinic = { id: string; name: string; cityIbge?: string };
type Draft = {
  clinicId: string; notificationDate: string; speciesCode: string; sexCode: "M" | "F" | "i";
  castrationCode: string; ageValue: string; ageUnit: "YEARS" | "MONTHS" | "UNKNOWN";
  ageUnknownReason: string; breedName: string; mixedBreed: boolean;
  residenceMunicipalityIbge: string; residenceTerritoryCode: string; residenceTerritorySource: string;
  sourceDeclaration: boolean;
};
const initial: Draft = { clinicId: "", notificationDate: "", speciesCode: "", sexCode: "i", castrationCode: "", ageValue: "", ageUnit: "UNKNOWN", ageUnknownReason: "", breedName: "", mixedBreed: false, residenceMunicipalityIbge: "", residenceTerritoryCode: "", residenceTerritorySource: "", sourceDeclaration: false };
const steps = ["Clínica", "Notificação", "Animal", "Idade", "Residência", "Revisão"];

export function VeterinaryNotificationPage({ onBack }: { onBack: () => void }) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [step, setStep] = useState(0);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    getJson("/clinics?page=0&size=60").then((value) => {
      const items = (value as { items?: unknown[] }).items ?? [];
      setClinics(items.filter((item): item is Clinic => typeof item === "object" && item !== null && typeof (item as Clinic).id === "string"));
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível carregar as clínicas."));
  }, []);
  const selectedClinic = useMemo(() => clinics.find((clinic) => clinic.id === draft.clinicId), [clinics, draft.clinicId]);
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const next = () => { setError(null); if (step === 0 && !draft.clinicId) return setError("Selecione a clínica."); if (step === 1 && (!draft.speciesCode || !draft.castrationCode)) return setError("Informe espécie e castração."); if (step === 5 && !draft.sourceDeclaration) return setError("Confirme a declaração da fonte."); setStep((current) => Math.min(5, current + 1)); };
  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const result = await requestJson("/animal/notifications", { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ ...draft, speciesCode: Number(draft.speciesCode), castrationCode: Number(draft.castrationCode), ageValue: draft.ageValue ? Number(draft.ageValue) : null }) });
      setSuccess(`Notificação registrada: ${(result as { protocol?: string }).protocol ?? "protocolo gerado"}.`); setDraft(initial); setStep(0);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível enviar a notificação."); }
    finally { setBusy(false); }
  };
  return <main className="vet-page">
    <div className="page-intro"><button className="map-back" type="button" onClick={onBack}>← Voltar ao mapa</button><div className="section-label">VIGILÂNCIA ANIMAL</div><h1>Nova notificação veterinária</h1><p>Preencha as seis etapas. O rascunho permanece somente nesta sessão e não é persistido no navegador.</p></div>
    <nav className="vet-steps" aria-label="Etapas da notificação">{steps.map((label, index) => <span key={label} aria-current={index === step ? "step" : undefined} className={index === step ? "active" : ""}>{index + 1}. {label}</span>)}</nav>
    <section className="card vet-card">
      {step === 0 && <label>Clínica<select value={draft.clinicId} onChange={(event) => update("clinicId", event.target.value)}><option value="">Selecione uma clínica</option>{clinics.map((clinic) => <option key={clinic.id} value={clinic.id}>{clinic.name}{clinic.cityIbge ? ` · ${clinic.cityIbge}` : ""}</option>)}</select></label>}
      {step === 1 && <div className="vet-fields"><label>Data da notificação<input type="date" value={draft.notificationDate} onChange={(event) => update("notificationDate", event.target.value)} /></label><label>Espécie<input inputMode="numeric" value={draft.speciesCode} onChange={(event) => update("speciesCode", event.target.value)} /></label><label>Sexo<select value={draft.sexCode} onChange={(event) => update("sexCode", event.target.value as Draft["sexCode"])}><option value="i">Não informado</option><option value="F">Fêmea</option><option value="M">Macho</option></select></label><label>Castração<input inputMode="numeric" value={draft.castrationCode} onChange={(event) => update("castrationCode", event.target.value)} /></label></div>}
      {step === 2 && <div className="vet-fields"><label>Raça<input value={draft.breedName} onChange={(event) => update("breedName", event.target.value)} /></label><label className="vet-check"><input type="checkbox" checked={draft.mixedBreed} onChange={(event) => update("mixedBreed", event.target.checked)} /> SRD / raça mista</label></div>}
      {step === 3 && <div className="vet-fields"><label>Idade<input type="number" min="0" value={draft.ageValue} disabled={draft.ageUnit === "UNKNOWN"} onChange={(event) => update("ageValue", event.target.value)} /></label><label>Unidade<select value={draft.ageUnit} onChange={(event) => update("ageUnit", event.target.value as Draft["ageUnit"])}><option value="UNKNOWN">Desconhecida</option><option value="YEARS">Anos</option><option value="MONTHS">Meses</option></select></label><label>Motivo da idade desconhecida<input value={draft.ageUnknownReason} onChange={(event) => update("ageUnknownReason", event.target.value)} /></label></div>}
      {step === 4 && <div className="vet-fields"><label>Município IBGE de residência<input inputMode="numeric" maxLength={7} value={draft.residenceMunicipalityIbge} onChange={(event) => update("residenceMunicipalityIbge", event.target.value)} /></label><label>Território de residência<input value={draft.residenceTerritoryCode} onChange={(event) => update("residenceTerritoryCode", event.target.value)} /></label><label>Fonte do território<input value={draft.residenceTerritorySource} onChange={(event) => update("residenceTerritorySource", event.target.value)} /></label></div>}
      {step === 5 && <div className="vet-review"><p><strong>Clínica:</strong> {selectedClinic?.name ?? "não selecionada"}</p><p><strong>Espécie:</strong> {draft.speciesCode || "não informada"} · <strong>Sexo:</strong> {draft.sexCode}</p><p><strong>Idade:</strong> {draft.ageUnit === "UNKNOWN" ? "Não informada" : `${draft.ageValue} ${draft.ageUnit === "YEARS" ? "ano(s)" : "mês(es)"}`}</p><label className="vet-check"><input type="checkbox" checked={draft.sourceDeclaration} onChange={(event) => update("sourceDeclaration", event.target.checked)} /> Declaro que os dados têm fonte legítima e podem ser submetidos para vigilância.</label></div>}
      {error && <p className="form-error" role="alert">{error}</p>}{success && <p className="form-success" role="status">{success}</p>}
      <div className="vet-actions">{step > 0 && <button className="admin-action" type="button" onClick={() => setStep((current) => current - 1)}>Anterior</button>}{step < 5 ? <button className="admin-action primary" type="button" onClick={next}>Próxima etapa</button> : <button className="admin-action primary" type="button" disabled={busy} onClick={submit}>{busy ? "Enviando…" : "Enviar notificação"}</button>}</div>
    </section>
  </main>;
}
