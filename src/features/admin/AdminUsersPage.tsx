import { useEffect, useRef, useState } from "react";
import { requestJson, getJson } from "../../api/http";

type User = { id: number; email: string; name?: string; active: boolean };
type Invite = { id: number; email: string; expiresAt: string };
type UserPage = { items: User[]; page: number; size: number; hasNext: boolean; totalItems: number };

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
  const sentinel = useRef<HTMLDivElement>(null);

  async function loadUsers(nextPage = 0, append = false) {
    setLoadingUsers(true);
    try {
      const result = await getJson(`/admin/users?search=${encodeURIComponent(search)}&page=${nextPage}&size=60`) as UserPage;
      setUsers(previous => append ? [...previous, ...result.items] : result.items);
      setPage(result.page);
      setHasNext(result.hasNext);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar usuários.");
    } finally {
      setLoadingUsers(false);
    }
  }

  async function loadInvites() {
    setLoadingInvites(true);
    try {
      setInvites((await getJson("/admin/users/invitations")) as Invite[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar convites.");
    } finally {
      setLoadingInvites(false);
    }
  }

  async function reload() { await Promise.all([loadUsers(0), loadInvites()]); }

  useEffect(() => {
    const timer = window.setTimeout(() => { void reload(); }, 0);
    return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const element = sentinel.current;
    if (!element) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting && hasNext && !loadingUsers) void loadUsers(page + 1, true);
    }, { rootMargin: "240px" });
    observer.observe(element);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasNext, loadingUsers, page]);

  async function action(path: string, method = "POST", body?: object) {
    setError("");
    setSuccess("");
    try {
      await requestJson(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) });
      setSuccess("Operação concluída.");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível concluir.");
    }
  }

  async function invite() {
    setError("");
    setSuccess("");
    setSendingInvite(true);
    try {
      await requestJson("/admin/users", { method: "POST", body: JSON.stringify({ email: email.trim(), accountType }) });
      setEmail("");
      setSuccess("Convite enviado por e-mail.");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível convidar.");
    } finally {
      setSendingInvite(false);
    }
  }

  return <main>
    <button onClick={onBack}>← Voltar</button>
    <h1>Gerenciar usuários</h1>
    {error && <p className="form-error" role="alert">{error}</p>}
    {success && <p className="form-success" role="status">{success}</p>}
    <section className="card admin-section">
      <h2>Novo convite</h2>
      <div className="admin-form">
        <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} disabled={sendingInvite} />
        <select value={accountType} onChange={e => setAccountType(e.target.value as "ADMIN" | "USER")} disabled={sendingInvite}>
          <option value="USER">Usuário</option><option value="ADMIN">Administrador</option>
        </select>
        <button className="primary" onClick={() => void invite()} disabled={sendingInvite || !email.trim()}>{sendingInvite ? "Enviando convite…" : "Enviar convite"}</button>
      </div>
      {sendingInvite && <p role="status">Enviando o convite e atualizando a lista…</p>}
    </section>
    <section className="card admin-section">
      <h2>Convites pendentes</h2>
      {loadingInvites && <p role="status">Carregando convites…</p>}
      {!loadingInvites && invites.map(i => <div className="admin-row" key={i.id}><span>{i.email}<small> expira em {new Date(i.expiresAt).toLocaleString()}</small></span><button onClick={() => void action(`/admin/users/invitations/${i.id}/renew`)}>Renovar</button><button onClick={() => void action(`/admin/users/invitations/${i.id}/cancel`)}>Cancelar</button></div>)}
      {!loadingInvites && !invites.length && <p>Nenhum convite pendente.</p>}
    </section>
    <section className="card admin-section">
      <h2>Usuários</h2>
      <div className="admin-form"><input placeholder="Pesquisar nome ou e-mail" value={search} onChange={e => setSearch(e.target.value)} /><button onClick={() => void loadUsers(0)}>Pesquisar</button></div>
      {users.map(u => <div className="admin-row" key={u.id}><span>{u.name || "Primeiro acesso pendente"} — {u.email}</span><button onClick={() => void action(`/admin/users/${u.id}/password-reset`)}>Resetar senha</button><button onClick={() => void action(`/admin/users/${u.id}/activation`, "PATCH", { active: !u.active })}>{u.active ? "Desativar" : "Ativar"}</button></div>)}
      <div ref={sentinel} aria-hidden="true" />{loadingUsers && <p role="status">Carregando usuários…</p>}{!loadingUsers && !hasNext && users.length > 0 && <p>Todos os {users.length} usuários foram carregados.</p>}
    </section>
  </main>;
}
