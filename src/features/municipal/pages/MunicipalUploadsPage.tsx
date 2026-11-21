import { useEffect, useState, type FormEvent } from "react";
import { getJson, requestJson } from "../../../shared/api/http";

type Upload = { id: string; municipalityIbge: string; disease: string; competence: string; sha256: string; status: string; effectiveLimitBytes: number };
type UploadPage = { items: Upload[]; page: number; size: number; totalElements: number };

export function MunicipalUploadsPage({ onBack }: { onBack: () => void }) {
  const [municipality, setMunicipality] = useState("");
  const [disease, setDisease] = useState("ESPORO");
  const [competence, setCompetence] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [declared, setDeclared] = useState(false);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const result = await getJson("/municipal/uploads?page=0&size=20") as UploadPage;
      setUploads(result.items ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar os envios.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  // The initial fetch is intentionally deferred to avoid a synchronous state update during effect setup.
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!file || !declared) {
      setError("Selecione um arquivo e confirme a declaração de origem.");
      return;
    }
    setSending(true);
    const body = new FormData();
    body.append("municipalityIbge", municipality.trim());
    body.append("disease", disease.trim());
    body.append("competence", competence);
    body.append("sourceDeclaration", String(declared));
    body.append("file", file);
    try {
      await requestJson("/municipal/uploads", { method: "POST", body });
      setFile(null);
      setDeclared(false);
      setSuccess("Arquivo recebido para validação. O recebimento não publica os dados automaticamente.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar o arquivo.");
    } finally {
      setSending(false);
    }
  }

  return <main>
    <button type="button" onClick={onBack}>← Voltar</button>
    <h1>Envios municipais</h1>
    <p>Envie uma planilha para quarentena e validação. O arquivo original permanece rastreável.</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    {success && <p className="form-success" role="status">{success}</p>}
    <section className="card admin-section">
      <h2>Novo arquivo</h2>
      <form className="admin-form" onSubmit={submit}>
        <label>Município (IBGE)<input required pattern="[0-9]{7}" inputMode="numeric" value={municipality} onChange={event => setMunicipality(event.target.value)} /></label>
        <label>Doença<input required value={disease} onChange={event => setDisease(event.target.value)} /></label>
        <label>Competência<input required type="month" value={competence} onChange={event => setCompetence(event.target.value)} /></label>
        <label>Arquivo CSV/XLS/XLSX<input required type="file" accept=".csv,.xls,.xlsx" onChange={event => setFile(event.target.files?.[0] ?? null)} /></label>
        <label><input type="checkbox" checked={declared} onChange={event => setDeclared(event.target.checked)} /> Declaro a origem municipal do arquivo.</label>
        <button className="primary" type="submit" disabled={sending || !file || !declared || !municipality || !disease || !competence}>{sending ? "Enviando…" : "Enviar para validação"}</button>
      </form>
    </section>
    <section className="card admin-section" aria-labelledby="municipal-uploads-heading">
      <h2 id="municipal-uploads-heading">Arquivos recebidos</h2>
      {loading && <p role="status">Carregando envios…</p>}
      {!loading && !uploads.length && <p>Nenhum arquivo recebido para este usuário.</p>}
      {!loading && uploads.map(upload => <div className="admin-row" key={upload.id}><span>{upload.disease} · {upload.municipalityIbge} · {upload.competence}<small> {upload.sha256}</small></span><strong>{upload.status}</strong></div>)}
    </section>
  </main>;
}
