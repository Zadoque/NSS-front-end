import { useState, type FormEvent } from "react";
import { mockAuth } from "../../auth/mockAuth";

export function LoginPage({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState(mockAuth.credentials.email);
  const [password, setPassword] = useState(mockAuth.credentials.password);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await mockAuth.login(email, password);
      onSuccess();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="card auth-card" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true">NSS</div>
        <div className="section-label">ACESSO DEMONSTRAÇÃO</div>
        <h1 id="login-title">Entrar no NSS</h1>
        <p>Use a conta DEMO para acessar o mapa epidemiológico sintético.</p>
        <form onSubmit={submit}>
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label htmlFor="password">Senha</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary" type="submit" disabled={loading}>{loading ? "Entrando…" : "Entrar"}</button>
        </form>
        <p className="demo-note"><strong>Credenciais DEMO</strong>{mockAuth.credentials.email} · {mockAuth.credentials.password}</p>
        <a href="/">← Voltar à página inicial</a>
      </section>
    </main>
  );
}
