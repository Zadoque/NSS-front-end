import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { requestJson, getJson } from "../../../shared/api/http";

type Grant = { permission: string; scopeType?: string | null; clinicId?: string | null };
type User = { id: number; email: string; name?: string; active: boolean; roles?: string[]; permissions?: string[]; grants?: Grant[] };
type Invite = { id: number; email: string; expiresAt: string };
type UserPage = { items: User[]; page: number; size: number; hasNext: boolean; totalItems: number };
type AuthorizationKind = "role" | "grant";

const roles = ["USUARIO_COMUM", "CHEFE_GERAL", "ADMINISTRADOR", "AGENTE_EPIDEMIOLOGICO", "REPRESENTANTE_CLINICA", "REPRESENTANTE_MUNICIPAL", "ANALISTA_DADOS", "ESCRITOR", "ESCRITOR_CHEFE"];
const grants = ["map.human.view", "map.animal.view"];

function AuthorizationControls({ user, busy, reason, setReason, password, setPassword, role, setRole, grant, setGrant, clinicId, setClinicId, onChange }: {
  user: User; busy: boolean; reason: string; setReason: Dispatch<SetStateAction<string>>; password: string; setPassword: Dispatch<SetStateAction<string>>;
  role: string; setRole: Dispatch<SetStateAction<string>>; grant: string; setGrant: Dispatch<SetStateAction<string>>; clinicId: string; setClinicId: Dispatch<SetStateAction<string>>;
  onChange: (kind: AuthorizationKind, value: string, revoke?: boolean) => void;
}) {
  return <div className="admin-authorization" id={`authorization-${user.id}`} aria-label={`Autorização de ${user.email}`}>
    <label>Motivo auditável<input value={reason} onChange={e => setReason(e.target.value)} disabled={busy} /></label>
    <label>Senha para alteração de papel<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /></label>
    <fieldset><legend>Papéis</legend><label>Papel<select value={role} onChange={e => setRole(e.target.value)} disabled={busy}>{roles.map(value => <option key={value}>{value}</option>)}</select></label><button className="admin-action" aria-label={`Conceder papel a ${user.email}`} disabled={busy} onClick={() => onChange("role", role)}>Conceder papel</button><button className="admin-action" aria-label={`Revogar papel de ${user.email}`} disabled={busy} onClick={() => onChange("role", role, true)}>Revogar papel</button></fieldset>
    <fieldset><legend>Grants de mapa</legend><label>Grant<select value={grant} onChange={e => setGrant(e.target.value)} disabled={busy}>{grants.map(value => <option key={value} value={value}>{value}</option>)}</select></label><label>ID da clínica para grant animal<input placeholder="UUID opcional" value={clinicId} onChange={e => setClinicId(e.target.value)} disabled={busy} /></label><button className="admin-action" aria-label={`Conceder grant a ${user.email}`} disabled={busy} onClick={() => onChange("grant", grant)}>Conceder grant</button><button className="admin-action" aria-label={`Revogar grant de ${user.email}`} disabled={busy} onClick={() => onChange("grant", grant, true)}>Revogar grant</button></fieldset>
  </div>;
}

export function AdminUsersPage({ onBack }: { onBack: () => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const [accountType, setAccountType] = useState<"ADMIN" | "USER">("USER");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [activeAction, setActiveAction] = useState("");
  const [deliveryEmail, setDeliveryEmail] = useState("");
  const [authorizationUser, setAuthorizationUser] = useState<number | null>(null);
  const [authorizationRole, setAuthorizationRole] = useState(roles[0]);
  const [authorizationGrant, setAuthorizationGrant] = useState(grants[0]);
  const [authorizationClinicId, setAuthorizationClinicId] = useState("");
  const [authorizationReason, setAuthorizationReason] = useState("");
  const [stepUpPassword, setStepUpPassword] = useState("");
  const [authorizationBusy, setAuthorizationBusy] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  async function loadUsers(nextPage = 0, append = false) {
    setLoadingUsers(true);
    try {
      const result = await getJson(`/admin/users?search=${encodeURIComponent(search)}&page=${nextPage}&size=60`) as UserPage;
      setUsers(previous => append ? [...previous, ...result.items] : result.items); setPage(result.page); setHasNext(result.hasNext);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível carregar usuários."); }
    finally { setLoadingUsers(false); }
  }
  async function loadInvites() {
    setLoadingInvites(true);
    try { setInvites((await getJson("/admin/users/invitations")) as Invite[]); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível carregar convites."); }
    finally { setLoadingInvites(false); }
  }
  async function reload() { await Promise.all([loadUsers(0), loadInvites()]); }
  useEffect(() => { const timer = window.setTimeout(() => { void reload(); }, 0); return () => window.clearTimeout(timer); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const element = sentinel.current; if (!element) return;
    const observer = new IntersectionObserver(entries => { if (entries[0]?.isIntersecting && hasNext && !loadingUsers) void loadUsers(page + 1, true); }, { rootMargin: "240px" });
    observer.observe(element); return () => observer.disconnect(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasNext, loadingUsers, page]);

  async function action(path: string, method = "POST", body?: object, successMessage = "Operação concluída.", recipient?: string) {
    setError(""); setSuccess(""); setActiveAction(`${method}:${path}`); setDeliveryEmail(recipient || "");
    try { await requestJson(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) }); setSuccess(successMessage); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível concluir."); }
    finally { setActiveAction(""); setDeliveryEmail(""); }
  }
  async function invite() {
    setError(""); setSuccess(""); setSendingInvite(true); setDeliveryEmail(email.trim());
    try { await requestJson("/admin/users", { method: "POST", body: JSON.stringify({ email: email.trim(), accountType }) }); setEmail(""); setSuccess("Convite enviado por e-mail."); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível convidar."); }
    finally { setSendingInvite(false); setDeliveryEmail(""); }
  }
  async function changeAuthorization(user: User, kind: AuthorizationKind, value: string, revoke = false) {
    const reason = authorizationReason.trim(); if (!reason) { setError("Informe o motivo auditável."); return; }
    setError(""); setSuccess(""); setAuthorizationBusy(true);
    try {
      let proof = "";
      if (kind === "role") { if (!stepUpPassword) { setError("Confirme sua senha para alterar papéis."); return; } proof = (await requestJson("/auth/step-up", { method: "POST", body: JSON.stringify({ currentPassword: stepUpPassword }) }) as { proof: string }).proof; }
      const path = kind === "role" ? `/users/${user.id}/roles${revoke ? `/${encodeURIComponent(value)}` : ""}` : `/users/${user.id}/grants${revoke ? `/${encodeURIComponent(value)}` : ""}`;
      const headers: Record<string, string> = { "Idempotency-Key": crypto.randomUUID() }; if (kind === "role") headers["X-Step-Up-Proof"] = proof;
      const init: RequestInit = { method: revoke ? "DELETE" : "POST", headers };
      if (revoke) { const clinic = kind === "grant" && authorizationClinicId.trim() ? `&clinicId=${encodeURIComponent(authorizationClinicId.trim())}` : ""; await requestJson(`${path}?reason=${encodeURIComponent(reason)}${clinic}`, init); }
      else { init.body = JSON.stringify(kind === "role" ? { role: value, reason, stepUpProof: proof } : { permission: value, reason, ...(authorizationClinicId.trim() ? { clinicId: authorizationClinicId.trim() } : {}) }); await requestJson(path, init); }
      setSuccess("Autorização atualizada."); setAuthorizationReason(""); setStepUpPassword(""); setAuthorizationClinicId(""); await loadUsers(0);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível atualizar a autorização."); }
    finally { setAuthorizationBusy(false); }
  }

  const actionInProgress = sendingInvite || Boolean(activeAction);
  return <main>
    <button onClick={onBack}>← Voltar</button><h1>Gerenciar usuários</h1>
    {error && <p className="form-error" role="alert">{error}</p>}{success && <p className="form-success" role="status">{success}</p>}
    {deliveryEmail && <p className="form-progress" role="status">Enviando seu convite ou link de renovação para {deliveryEmail} <span className="loading-spinner" aria-label="Enviando" /></p>}
    <section className="card admin-section"><h2>Novo convite</h2><div className="admin-form"><label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={sendingInvite} /></label><label>Tipo de conta<select value={accountType} onChange={e => setAccountType(e.target.value as "ADMIN" | "USER")} disabled={sendingInvite}><option value="USER">Usuário</option><option value="ADMIN">Administrador</option></select></label><button className="primary" onClick={() => void invite()} disabled={sendingInvite || !email.trim()}>{sendingInvite ? "Enviando convite…" : "Enviar convite"}</button></div>{sendingInvite && <p role="status">Enviando o convite e atualizando a lista…</p>}</section>
    <section className="card admin-section"><h2>Convites pendentes</h2>{loadingInvites && <p role="status">Carregando convites…</p>}{!loadingInvites && invites.map(i => { const renewKey = `POST:/admin/users/invitations/${i.id}/renew`; const cancelKey = `POST:/admin/users/invitations/${i.id}/cancel`; return <div className="admin-row" key={i.id}><span>{i.email}<small> expira em {new Date(i.expiresAt).toLocaleString()}</small></span><div className="admin-actions"><button className="admin-action" disabled={actionInProgress} onClick={() => void action(`/admin/users/invitations/${i.id}/renew`, "POST", undefined, "Convite renovado e e-mail enviado.", i.email)}>Renovar</button><button className="admin-action" disabled={actionInProgress} onClick={() => void action(`/admin/users/invitations/${i.id}/cancel`, "POST", undefined, "Convite cancelado.")}>Cancelar</button></div>{activeAction === renewKey || activeAction === cancelKey ? <span className="admin-action-state" role="status">Processando…</span> : null}</div>; })}{!loadingInvites && !invites.length && <p>Nenhum convite pendente.</p>}</section>
    <section className="card admin-section"><h2>Usuários</h2><div className="admin-form"><label>Pesquisar nome ou e-mail<input value={search} onChange={e => setSearch(e.target.value)} /></label><button onClick={() => void loadUsers(0)}>Pesquisar</button></div>{users.map(u => { const resetKey = `POST:/admin/users/${u.id}/password-reset`; const activationKey = `PATCH:/admin/users/${u.id}/activation`; const open = authorizationUser === u.id; const grantText = u.grants?.map(g => `${g.permission}${g.clinicId ? ` [${g.scopeType}:${g.clinicId}]` : " [GLOBAL]"}`).join(", ") || u.permissions?.join(", ") || "nenhum"; return <div className="admin-row" key={u.id}><span>{u.name || "Primeiro acesso pendente"} — {u.email}<small><br />Papéis: {u.roles?.join(", ") || "nenhum"}<br />Grants: {grantText}</small></span><div className="admin-actions"><button className="admin-action" disabled={actionInProgress} onClick={() => void action(`/admin/users/${u.id}/password-reset`, "POST", undefined, "E-mail de redefinição enviado.", u.email)}>Resetar senha</button><button className="admin-action" disabled={actionInProgress} onClick={() => void action(`/admin/users/${u.id}/activation`, "PATCH", { active: !u.active }, u.active ? "Usuário desativado." : "Usuário ativado.")}>{u.active ? "Desativar" : "Ativar"}</button><button className="admin-action" aria-expanded={open} aria-controls={`authorization-${u.id}`} onClick={() => setAuthorizationUser(open ? null : u.id)}>Papéis e grants</button></div>{activeAction === resetKey || activeAction === activationKey ? <span className="admin-action-state" role="status">Processando…</span> : null}{open && <AuthorizationControls user={u} busy={authorizationBusy} reason={authorizationReason} setReason={setAuthorizationReason} password={stepUpPassword} setPassword={setStepUpPassword} role={authorizationRole} setRole={setAuthorizationRole} grant={authorizationGrant} setGrant={setAuthorizationGrant} clinicId={authorizationClinicId} setClinicId={setAuthorizationClinicId} onChange={(kind, value, revoke) => void changeAuthorization(u, kind, value, revoke)} />}</div>; })}<div ref={sentinel} aria-hidden="true" />{loadingUsers && <p role="status">Carregando usuários…</p>}{!loadingUsers && !hasNext && users.length > 0 && <p>Todos os {users.length} usuários foram carregados.</p>}</section>
  </main>;
}
