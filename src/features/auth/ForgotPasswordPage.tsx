import { useState, type FormEvent } from "react";
import { requestJson } from "../../api/http";

export function ForgotPasswordPage({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState(""); const [sent, setSent] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); setError(""); try { await requestJson("/auth/password-reset/request", { method: "POST", body: JSON.stringify({ email }) }); setSent(true); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível processar a solicitação."); } }
  return <main className="auth-page"><section className="card auth-card"><h1>Esqueci minha senha</h1>{sent ? <><p>Se o e-mail estiver cadastrado e ativo, enviaremos um link para redefinição.</p><button className="primary" onClick={onBack}>Voltar para o login</button></> : <form onSubmit={submit}><label htmlFor="reset-email">E-mail</label><input id="reset-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />{error && <p className="form-error">{error}</p>}<button className="primary">Enviar link</button></form>}</section></main>;
}
