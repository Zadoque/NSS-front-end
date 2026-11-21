import { useEffect, useState } from "react";
import { requestJson } from "../../../shared/api/http";

export function AccessVerificationPage() {
  const [state, setState] = useState<"loading" | "done" | "error">("loading");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") || "";
    if (!token) {
      // The URL is the external source of truth for this terminal invalid-link state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessage("Link de confirmação inválido ou expirado.");
      setState("error");
      return;
    }
    void requestJson("/public/access-requests/verify", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then(result => {
        setMessage((result as { message?: string }).message || "E-mail confirmado. Sua solicitação será analisada.");
        setState("done");
      })
      .catch(cause => {
        setMessage(cause instanceof Error ? cause.message : "Link de confirmação inválido ou expirado.");
        setState("error");
      });
  }, []);
  return <main className="auth-page"><section className="card auth-card">
    <h1>Confirmação de e-mail</h1>
    {state === "loading" ? <p role="status">Confirmando seu e-mail…</p> : <p className={state === "done" ? "form-success" : "form-error"} role={state === "done" ? "status" : "alert"}>{message}</p>}
    <a href="/">Voltar à página inicial</a>
  </section></main>;
}
