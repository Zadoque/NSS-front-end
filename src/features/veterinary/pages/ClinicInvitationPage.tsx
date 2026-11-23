import { useEffect, useState } from "react";
import { requestJson } from "../../../shared/api/http";

type AcceptedClinic = { name?: string };

export function ClinicInvitationPage({ onDone }: { onDone: () => void }) {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("token") || "");
  const [clinic, setClinic] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  async function accept() {
    setBusy(true);
    setError("");
    try {
      const result = await requestJson("/clinics/invitations/accept", {
        method: "POST",
        body: JSON.stringify({ token }),
      }) as AcceptedClinic;
      setClinic(result.name || "a clínica");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível aceitar o convite.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-page"><section className="card auth-card">
    <h1>Aceitar convite de clínica</h1>
    {!token ? <p className="form-error" role="alert">Convite inválido ou expirado.</p> : clinic ? <>
      <p className="form-success" role="status">Convite aceito. Você agora participa de {clinic}.</p>
      <button className="primary" type="button" onClick={onDone}>Continuar</button>
    </> : <>
      <p>Confirme para participar da clínica veterinária no NSS.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary" type="button" disabled={busy} onClick={() => void accept()}>{busy ? "Aceitando convite…" : "Aceitar convite"}</button>
    </>}
  </section></main>;
}
