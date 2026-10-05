import { useEffect, useState, type MouseEvent } from "react";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { HomePage } from "../features/home/HomePage";
import { LoginPage } from "../features/auth/LoginPage";
import { mockAuth } from "../auth/mockAuth";
import { realAuth, type AuthClient } from "../auth/realAuth";
import { isDemo } from "../data/dataSource";

export function App() {
  const auth: AuthClient = isDemo ? mockAuth : realAuth;
  const [path, setPath] = useState(window.location.pathname);
  const [session, setSession] = useState(auth.getSession());
  const [authReady, setAuthReady] = useState(isDemo);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  useEffect(() => {
    const unsubscribe = auth.subscribe(() => setSession(auth.getSession()));
    void auth.restore().finally(() => setAuthReady(true));
    return unsubscribe;
  }, [auth]);
  useEffect(() => {
    document.title =
      path === "/mapa"
        ? "Mapa | NSS — UENF"
        : path === "/login"
          ? "Login | NSS — UENF"
        : "NSS — Núcleo de Situação de Saúde";
    document.querySelector("h1")?.setAttribute("tabindex", "-1");
    document.querySelector("h1")?.focus();
  }, [path]);
  function followLink(event: MouseEvent<HTMLDivElement>) {
    const link = (event.target as Element).closest("a");
    if (
      !link ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      link.target ||
      link.hasAttribute("download")
    )
      return;
    const url = new URL(link.href);
    if (
      url.origin !== window.location.origin ||
      !["/", "/mapa", "/login"].includes(url.pathname)
    )
      return;
    event.preventDefault();
    window.history.pushState(null, "", url);
    setPath(url.pathname);
    window.scrollTo(0, 0);
  }
  function logout() {
    void auth.logout();
    window.history.pushState(null, "", "/");
    setPath("/");
  }
  if (!authReady && path !== "/") return <main><p role="status">Verificando sessão…</p></main>;
  return (
    <div onClick={followLink}>
      {path === "/mapa" ? (
        session ? <DashboardPage onLogout={logout} /> : <LoginPage auth={auth} demo={isDemo} onSuccess={() => { window.history.pushState(null, "", "/mapa"); setPath("/mapa"); }} />
      ) : path === "/login" ? (
        session ? <DashboardPage onLogout={logout} /> : <LoginPage auth={auth} demo={isDemo} onSuccess={() => { window.history.pushState(null, "", "/mapa"); setPath("/mapa"); }} />
      ) : path === "/" ? (
        <HomePage />
      ) : (
        <main>
          <h1>Página não encontrada</h1>
          <a href="/">Voltar ao início</a>
        </main>
      )}
    </div>
  );
}
