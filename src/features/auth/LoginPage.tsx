import { useState, type FormEvent } from "react";
import type { AuthClient } from "../../auth/realAuth";
import { isProdMock } from "../../data/dataSource";

export function LoginPage({ auth, demo, onSuccess }: { auth: AuthClient; demo: boolean; onSuccess: () => void }) {
  const [email, setEmail] = useState(demo ? "demo@nss.local" : "");
  const [password, setPassword] = useState(demo ? "NSS-DEMO-2026" : "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await auth.login(email, password);
      onSuccess();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page" aria-busy={loading}>
      <section className="card auth-card" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true">NSS</div>
        <div className="section-label">{demo ? "ACESSO DEMONSTRAÇÃO" : "ACESSO RESTRITO"}</div>
        <h1 id="login-title">Entrar no NSS</h1>
        <p>{isProdMock ? "Demonstração pública com dados sintéticos. Não é necessário informar e-mail ou senha." : demo ? "Use a conta DEMO para acessar o mapa epidemiológico sintético." : "Entre com suas credenciais institucionais para acessar o mapa epidemiológico."}</p>
        <form onSubmit={submit}>
          {!isProdMock && <>
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label htmlFor="password">Senha</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary" type="submit" disabled={loading}>{loading ? "Entrando…" : isProdMock ? "Entrar na demonstração" : "Entrar"}</button>
          {loading && <p role="status">{isProdMock ? "Abrindo demonstração…" : "Validando suas credenciais…"}</p>}
        </form>
        {!demo && <a href="/esqueci-senha">Esqueci minha senha</a>}
        {demo && !isProdMock && <p className="demo-note"><strong>Credenciais DEMO</strong>demo@nss.local · NSS-DEMO-2026</p>}
        <a href="/">← Voltar à página inicial</a>
      </section>
    </main>
  );
}
