import { useEffect, useState, type MouseEvent } from "react";
import { mockAuth } from "../auth/mockAuth";
import { realAuth, type AuthClient } from "../auth/realAuth";
import { isDemo, isProdMock } from "../data/dataSource";
import { AppRoutes } from "./router/AppRoutes";
import { useSession } from "../features/auth/model/useSession";

export function App() {
  const auth: AuthClient = isDemo ? mockAuth : realAuth;
  const [path, setPath] = useState(window.location.pathname);
  const { session, ready: authReady, logout: logoutSession } = useSession(auth, isDemo);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  useEffect(() => {
    document.title =
      path === "/mapa"
        ? "Mapa | NSS — UENF"
        : path === "/login"
          ? "Login | NSS — UENF"
        : path === "/admin/usuarios"
          ? "Usuários | NSS — UENF"
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
      !["/", "/mapa", "/login", "/admin/usuarios", "/primeiro-acesso", "/esqueci-senha", "/redefinir-senha"].includes(url.pathname)
    )
      return;
    event.preventDefault();
    window.history.pushState(null, "", url);
    setPath(url.pathname);
    window.scrollTo(0, 0);
  }
  function logout() {
    void logoutSession();
    window.history.pushState(null, "", "/");
    setPath("/");
  }
  if (!authReady && path !== "/") return <main><p role="status">Verificando sessão…</p></main>;
  const go = (nextPath: string) => {
    window.history.pushState(null, "", nextPath);
    setPath(nextPath);
    window.scrollTo(0, 0);
  };
  return (
    <div onClick={followLink}>
      <AppRoutes path={path} session={session} auth={auth} demo={isDemo} prodMock={isProdMock} go={go} logout={logout} />
    </div>
  );
}
