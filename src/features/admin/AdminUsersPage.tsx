import { useEffect, useState } from "react";
import { requestJson, getJson } from "../../api/http";

type User = { id: number; email: string; name?: string; active: boolean };
type Invite = { id: number; email: string; expiresAt: string };

export function AdminUsersPage({ onBack }: { onBack: () => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [search, setSearch] = useState(""); const [email, setEmail] = useState("");
  const [accountType, setAccountType] = useState<"ADMIN" | "USER">("USER"); const [error, setError] = useState("");
  async function load() {
    setUsers((await getJson(`/admin/users?search=${encodeURIComponent(search)}`)) as User[]);
    setInvites((await getJson("/admin/users/invitations")) as Invite[]);
  }
  // Initial data load; mutations explicitly call load again.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, []);
  async function action(path: string, method = "POST", body?: object) {
    try { await requestJson(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível concluir."); }
  }
  async function invite() {
    try { await requestJson("/admin/users", { method: "POST", body: JSON.stringify({ email, accountType }) }); setEmail(""); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível convidar."); }
  }
  return <main>
    <button onClick={onBack}>← Voltar</button><h1>Gerenciar usuários</h1>
    {error && <p className="form-error">{error}</p>}
    <section className="card admin-section"><h2>Novo convite</h2><div className="admin-form">
      <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} />
      <select value={accountType} onChange={e => setAccountType(e.target.value as "ADMIN" | "USER")}><option value="USER">Usuário</option><option value="ADMIN">Administrador</option></select>
      <button className="primary" onClick={() => void invite()} disabled={!email}>Enviar convite</button>
    </div></section>
    <section className="card admin-section"><h2>Convites pendentes</h2>
      {invites.map(i => <div className="admin-row" key={i.id}><span>{i.email}<small> expira em {new Date(i.expiresAt).toLocaleString()}</small></span><button onClick={() => void action(`/admin/users/invitations/${i.id}/renew`)}>Renovar</button><button onClick={() => void action(`/admin/users/invitations/${i.id}/cancel`)}>Cancelar</button></div>)}
      {!invites.length && <p>Nenhum convite pendente.</p>}
    </section>
    <section className="card admin-section"><h2>Usuários</h2><div className="admin-form"><input placeholder="Pesquisar nome ou e-mail" value={search} onChange={e => setSearch(e.target.value)} /><button onClick={() => void load()}>Pesquisar</button></div>
      {users.map(u => <div className="admin-row" key={u.id}><span>{u.name || "Primeiro acesso pendente"} — {u.email}</span><button onClick={() => void action(`/admin/users/${u.id}/password-reset`)}>Resetar senha</button><button onClick={() => void action(`/admin/users/${u.id}/activation`, "PATCH", { active: !u.active })}>{u.active ? "Desativar" : "Ativar"}</button></div>)}
    </section>
  </main>;
}
