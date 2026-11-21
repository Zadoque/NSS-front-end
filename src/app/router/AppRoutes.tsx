import type { AuthClient, Session } from "../../features/auth/model/realAuth";
import { AdminUsersPage } from "../../features/admin-users/pages/AdminUsersPage";
import { DashboardPage } from "../../features/dashboard/DashboardPage";
import { FirstAccessPage } from "../../features/auth/pages/FirstAccessPage";
import { ForgotPasswordPage } from "../../features/auth/pages/ForgotPasswordPage";
import { LoginPage } from "../../features/auth/pages/LoginPage";
import { ResetPasswordPage } from "../../features/auth/pages/ResetPasswordPage";
import { AccessRequestPage } from "../../features/access/pages/AccessRequestPage";
import { AccessVerificationPage } from "../../features/access/pages/AccessVerificationPage";
import { VeterinaryNotificationPage } from "../../features/veterinary/pages/VeterinaryNotificationPage";
import { HomePage } from "../../features/home/pages/HomePage";
import { AboutPage } from "../../features/home/pages/AboutPage";
import { PublicContentPage } from "../../features/home/pages/PublicContentPage";
import { LegalPage } from "../../features/home/pages/LegalPage";
import { PublicSearchPage } from "../../features/home/pages/PublicSearchPage";
import { PublicPostPage } from "../../features/home/pages/PublicPostPage";
import { MunicipalUploadsPage } from "../../features/municipal/pages/MunicipalUploadsPage";
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
  if (prodMock && ["/primeiro-acesso", "/redefinir-senha", "/esqueci-senha", "/admin/usuarios", "/uploads-municipais"].includes(path.replace(/\/+$/, ""))) {
    return <main><h1>Recurso indisponível na demonstração</h1><p>Esta versão publica um snapshot de dados agregados e não cadastra usuários nem recebe senhas pessoais.</p><a href="/">Voltar à página inicial</a></main>;
  }
  if (path === "/primeiro-acesso") return <FirstAccessPage onDone={done("/login")} />;
  if (path === "/redefinir-senha") return <ResetPasswordPage onDone={done("/login")} />;
  if (path === "/esqueci-senha") return <ForgotPasswordPage onBack={done("/login")} />;
  if (path === "/solicitar-acesso") return <AccessRequestPage />;
  if (path === "/confirmar-acesso") return <AccessVerificationPage />;
  if (path === "/sobre") return <AboutPage />;
  if (path === "/noticias") return <PublicContentPage kind="posts" />;
  if (path === "/boletins") return <PublicContentPage kind="bulletins" />;
  if (path === "/privacidade") return <LegalPage slug="privacidade" title="Política de privacidade" />;
  if (path === "/termos") return <LegalPage slug="termos" title="Termos de uso" />;
  if (path === "/buscar") return <PublicSearchPage />;
  if (path.startsWith("/noticias/") && path.length > "/noticias/".length) return <PublicPostPage slug={decodeURIComponent(path.slice("/noticias/".length))} />;
  if (path === "/admin/usuarios") return <RequirePermission session={session} permission="USER_MANAGEMENT"><AdminUsersPage onBack={done("/mapa")} /></RequirePermission>;
  if (path === "/uploads-municipais") return <RequirePermission session={session} permission="MUNICIPAL_UPLOAD"><MunicipalUploadsPage onBack={done("/mapa")} /></RequirePermission>;
  if (path === "/notificacoes-animais") return <RequireSession session={session} fallback={<LoginPage auth={auth} demo={demo} onSuccess={done("/notificacoes-animais")} />}><VeterinaryNotificationPage key={session?.id ?? session?.email ?? "anonymous"} onBack={done("/mapa")} /></RequireSession>;
  if (path === "/mapa" || path === "/login") return <RequireSession session={session} fallback={<LoginPage auth={auth} demo={demo} onSuccess={done("/mapa")} />}>
    <DashboardPage onLogout={logout} onAdmin={session?.permissions.includes("USER_MANAGEMENT") ? done("/admin/usuarios") : undefined} onVeterinary={done("/notificacoes-animais")} onMunicipal={session?.permissions.includes("MUNICIPAL_UPLOAD") ? done("/uploads-municipais") : undefined} />
  </RequireSession>;
  if (path === "/") return <HomePage />;
  return <main><h1>Página não encontrada</h1><a href="/">Voltar ao início</a></main>;
}
