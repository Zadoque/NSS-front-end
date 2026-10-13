import type { AuthClient, Session } from "../../auth/realAuth";
import { AdminUsersPage } from "../../features/admin/AdminUsersPage";
import { DashboardPage } from "../../features/dashboard/DashboardPage";
import { FirstAccessPage } from "../../features/auth/FirstAccessPage";
import { ForgotPasswordPage } from "../../features/auth/ForgotPasswordPage";
import { LoginPage } from "../../features/auth/LoginPage";
import { ResetPasswordPage } from "../../features/auth/ResetPasswordPage";
import { HomePage } from "../../features/home/HomePage";
import { RequirePermission, RequireSession } from "./guards";

type Props = {
  path: string;
  session: Session | null;
  auth: AuthClient;
  demo: boolean;
  prodMock: boolean;
  go: (path: string) => void;
  logout: () => void;
};

export function AppRoutes({ path, session, auth, demo, prodMock, go, logout }: Props) {
  const done = (next: string) => () => go(next);
  if (prodMock && ["/primeiro-acesso", "/redefinir-senha", "/esqueci-senha", "/admin/usuarios"].includes(path.replace(/\/+$/, ""))) {
    return <main><h1>Recurso indisponível na demonstração</h1><p>Esta versão publica um snapshot de dados agregados e não cadastra usuários nem recebe senhas pessoais.</p><a href="/">Voltar à página inicial</a></main>;
  }
  if (path === "/primeiro-acesso") return <FirstAccessPage onDone={done("/login")} />;
  if (path === "/redefinir-senha") return <ResetPasswordPage onDone={done("/login")} />;
  if (path === "/esqueci-senha") return <ForgotPasswordPage onBack={done("/login")} />;
  if (path === "/admin/usuarios") return <RequirePermission session={session} permission="USER_MANAGEMENT"><AdminUsersPage onBack={done("/mapa")} /></RequirePermission>;
  if (path === "/mapa" || path === "/login") return <RequireSession session={session} fallback={<LoginPage auth={auth} demo={demo} onSuccess={done("/mapa")} />}>
    <DashboardPage onLogout={logout} onAdmin={session?.permissions.includes("USER_MANAGEMENT") ? done("/admin/usuarios") : undefined} />
  </RequireSession>;
  if (path === "/") return <HomePage />;
  return <main><h1>Página não encontrada</h1><a href="/">Voltar ao início</a></main>;
}
