import { useState, type FormEvent } from "react";
import { requestJson } from "../../../shared/api/http";

export function AccessRequestPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [requestedRole, setRequestedRole] = useState("USUARIO_COMUM");
  const [confirmed, setConfirmed] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const result = await requestJson("/public/access-requests", {
        method: "POST",
        body: JSON.stringify({ name, email, reason, requestedRole, reviewConfirmed: confirmed, privacyNoticeAcknowledged: privacy }),
      }) as { message?: string; trackingHint?: string };
      setMessage(`${result.message || "Solicitação recebida."}${result.trackingHint ? ` Protocolo: ${result.trackingHint}.` : ""}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar a solicitação.");
    }
  }

  return <main className="auth-page"><section className="card auth-card">
    <h1>Solicitar acesso</h1>
    <p>Preencha os dados para solicitar uma conta institucional.</p>
    {message ? <p className="form-success" role="status">{message}</p> : <form onSubmit={submit}>
      <label htmlFor="access-name">Nome</label><input id="access-name" value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={150} required />
      <label htmlFor="access-email">E-mail</label><input id="access-email" type="email" value={email} onChange={event => setEmail(event.target.value)} required />
      <label htmlFor="access-reason">Justificativa</label><textarea id="access-reason" value={reason} onChange={event => setReason(event.target.value)} minLength={10} maxLength={4000} required />
      <label htmlFor="access-role">Papel solicitado</label><select id="access-role" value={requestedRole} onChange={event => setRequestedRole(event.target.value)}><option>USUARIO_COMUM</option><option>ANALISTA_DADOS</option><option>AGENTE_EPIDEMIOLOGICO</option></select>
      <label><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} required /> Confirmo que a solicitação foi revisada.</label>
      <label><input type="checkbox" checked={privacy} onChange={event => setPrivacy(event.target.checked)} required /> Li o aviso de privacidade.</label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary">Enviar solicitação</button>
    </form>}
  </section></main>;
}
