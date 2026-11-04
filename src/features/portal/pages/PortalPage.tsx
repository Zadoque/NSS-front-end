import { useState, type ChangeEvent, type FormEvent } from "react";

type Role = "ADMIN" | "EPIDEMIOLOGICAL_AGENT" | "REPORTING_CLINIC";
type Post = { id: string; title: string; disease: string; body: string; image?: string; date: string };
type Clinic = { id: string; name: string; email: string; uf: string; municipality: string; district: string };
type AnimalDisease = { id: string; name: string; fields: string[] };
type Notification = { id: string; disease: string; clinic: string; breed: string; sex: string; neutered: string; ownerLocation: string; uf: string; municipality: string; district: string; date: string };
type TeamMember = { id: string; name: string; role: string; description: string; email: string };

const STORAGE = {
  posts: "nss.preview.posts",
  clinics: "nss.preview.clinics",
  diseases: "nss.preview.animal-diseases",
  notifications: "nss.preview.animal-notifications",
  team: "nss.preview.team",
};

const initialPosts: Post[] = [
  { id: "post-dengue", title: "Dengue: elimine a água parada", disease: "Dengue (DENG)", body: "Reserve alguns minutos por semana para esvaziar recipientes, tampar caixas d’água e manter calhas limpas. A prevenção começa dentro de casa.", date: "2026-03-12", image: "/posts/dengue-prevencao.png" },
  { id: "post-chik", title: "Chikungunya: reconheça os sinais", disease: "Chikungunya (CHIK)", body: "Febre e dor intensa nas articulações merecem atenção. Procure a unidade de saúde e evite a automedicação, especialmente em caso de piora.", date: "2026-03-05", image: "/posts/chikungunya-cuidados.png" },
  { id: "post-toxo", title: "Toxoplasmose: cuidado durante a gestação", disease: "Toxoplasmose gestacional (TOXG)", body: "Lave bem frutas e verduras, cozinhe completamente as carnes e siga o acompanhamento do pré-natal. Converse com a equipe de saúde sobre dúvidas.", date: "2026-02-26", image: "/posts/toxoplasmose-prevencao.png" },
];
const initialDiseases: AnimalDisease[] = [{ id: "animal-toxoplasmosis", name: "Toxoplasmose animal", fields: ["Raça do cachorro", "Sexo", "É castrado?", "Local onde o dono mora", "UF", "Município", "Distrito/Bairro"] }];
const initialTeam: TeamMember[] = [{ id: "team-uenf", name: "Núcleo de Situação de Saúde", role: "Coordenação NSS", description: "Equipe interdisciplinar de vigilância, dados e território da UENF.", email: "nss@uenf.br" }];

function read<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}
function save(key: string, value: unknown) { localStorage.setItem(key, JSON.stringify(value)); }
function id(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`; }

export function PortalPage({ onBack }: { onBack: () => void }) {
  const [role, setRole] = useState<Role>("ADMIN");
  const [section, setSection] = useState("overview");
  const [posts, setPosts] = useState(() => read(STORAGE.posts, initialPosts));
  const [clinics, setClinics] = useState(() => read(STORAGE.clinics, [] as Clinic[]));
  const [diseases, setDiseases] = useState(() => read(STORAGE.diseases, initialDiseases));
  const [notifications, setNotifications] = useState(() => read(STORAGE.notifications, [] as Notification[]));
  const [team, setTeam] = useState(() => read(STORAGE.team, initialTeam));
  const [notice, setNotice] = useState("");

  function update<T>(key: string, setter: (value: T[]) => void, value: T[]) { setter(value); save(key, value); setNotice("Alteração salva no preview."); }
  const canAdmin = role === "ADMIN";
  const canAgent = role === "ADMIN" || role === "EPIDEMIOLOGICAL_AGENT";
  const canClinic = role === "ADMIN" || role === "REPORTING_CLINIC";

  return <>
    <header className="header portal-header">
      <img className="brand-image" src="/logo.jpg" alt="NSS" />
      <div><strong>Núcleo de Situação de Saúde</strong><p>Portal integrado de saúde humana e saúde animal</p></div>
      <button className="header-action" onClick={onBack}>Mapa epidemiológico</button>
      <details className="home-menu">
        <summary aria-label="Abrir menu">•••</summary>
        <div className="home-menu-popover"><button type="button" onClick={() => setSection("team")}>Equipe NSS</button><a href="/mapa">Mapa de saúde humana</a></div>
      </details>
    </header>
    <main className="portal-page">
      <section className="portal-hero">
        <div><div className="section-label">PORTAL NSS · 2026</div><h1>Informação que conecta território, vigilância e cuidado</h1><p>Notícias, notificações e gestão colaborativa para uma visão ampliada da saúde.</p></div>
        <label className="role-switch">Visualizar como<select value={role} onChange={e => setRole(e.target.value as Role)}><option value="ADMIN">Administrador</option><option value="EPIDEMIOLOGICAL_AGENT">Agente Epidemiológico</option><option value="REPORTING_CLINIC">Clínica Notificadora</option></select></label>
      </section>
      <nav className="portal-nav" aria-label="Seções do portal">
        <button className={section === "overview" ? "active" : ""} onClick={() => setSection("overview")}>Início</button>
        <button className={section === "news" ? "active" : ""} onClick={() => setSection("news")}>Notícias</button>
        <button className={section === "bulletins" ? "active" : ""} onClick={() => setSection("bulletins")}>Boletins epidemiológicos</button>
        <button className={section === "animal" ? "active" : ""} onClick={() => setSection("animal")}>Saúde animal</button>
        <button className={section === "team" ? "active" : ""} onClick={() => setSection("team")}>Equipe</button>
        {canAdmin && <button className={section === "admin" ? "active" : ""} onClick={() => setSection("admin")}>Administração</button>}
      </nav>
      {notice && <p className="form-success portal-notice" role="status">{notice}</p>}
      {section === "overview" && <Overview posts={posts} onNews={() => setSection("news")} onAnimal={() => setSection("animal")} />}
      {section === "news" && <News posts={posts} canEdit={canAgent} onChange={value => update(STORAGE.posts, setPosts, value)} />}
      {section === "bulletins" && <Bulletins />}
      {section === "animal" && <Animal role={role} diseases={diseases} clinics={clinics} notifications={notifications} canAdmin={canAdmin} canAgent={canAgent} canClinic={canClinic} onDiseases={value => update(STORAGE.diseases, setDiseases, value)} onClinics={value => update(STORAGE.clinics, setClinics, value)} onNotifications={value => update(STORAGE.notifications, setNotifications, value)} />}
      {section === "team" && <Team team={team} canEdit={canAdmin} onChange={value => update(STORAGE.team, setTeam, value)} />}
      {section === "admin" && canAdmin && <Admin clinics={clinics} onClinics={value => update(STORAGE.clinics, setClinics, value)} />}
    </main>
  </>;
}

function Bulletins() {
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const bulletins = months.map((month, index) => ({ month, total: 412 + index * 37 + (index % 3) * 19, dengue: 176 + index * 14, chikungunya: 91 + index * 8, toxoplasmosis: 36 + index * 3 }));
  return <section className="portal-section"><div className="section-heading"><div><div className="section-label">PUBLICAÇÃO MENSAL · 2026</div><h2>Boletins epidemiológicos</h2></div><span className="pill">12 edições no ano</span></div><div className="card bulletin-intro"><div><h3>Panorama mensal da situação de saúde</h3><p>A cada mês, o NSS consolida as notificações publicadas e organiza os principais indicadores por doença para apoiar a leitura do território.</p></div><div className="bulletin-current"><span>Última edição</span><strong>Março de 2026</strong><b>{bulletins[2].total.toLocaleString("pt-BR")} notificações</b></div></div><div className="bulletin-grid">{bulletins.map(item => <article className="card bulletin-card" key={item.month}><div><span className="section-label">NSS · 2026</span><h3>Boletim de {item.month}</h3></div><strong>{item.total.toLocaleString("pt-BR")}</strong><small>notificações consolidadas</small><div className="bulletin-lines"><span>Dengue <b>{item.dengue}</b></span><span>Chikungunya <b>{item.chikungunya}</b></span><span>Toxoplasmose <b>{item.toxoplasmosis}</b></span></div><button className="secondary-button">Abrir boletim →</button></article>)}</div></section>;
}

function Overview({ posts, onNews, onAnimal }: { posts: Post[]; onNews: () => void; onAnimal: () => void }) {
  return <><section className="portal-grid portal-overview"><article className="card portal-feature"><div className="section-label">DESTAQUE · SAÚDE HUMANA</div><h2>Dados para decisões mais próximas das pessoas</h2><p>Explore o mapa nacional com dados epidemiológicos de 2026, detalhamento territorial e os metadados de publicação.</p><div className="portal-actions"><a className="primary portal-button" href="/mapa">Abrir mapa de saúde humana →</a><button className="secondary-button" onClick={onNews}>Ver notícias e análises</button></div></article><article className="card portal-animal-feature"><div className="section-label">SAÚDE ANIMAL · CAMPOS DOS GOYTACAZES</div><h2>Uma saúde, um território</h2><p>Notificações clínicas e vigilância animal organizadas para Campos dos Goytacazes.</p><button className="secondary-button" onClick={onAnimal}>Abrir módulo animal →</button></article></section><section className="portal-section"><div className="section-heading"><div><div className="section-label">PUBLICAÇÕES RECENTES</div><h2>Notícias do NSS</h2></div><button onClick={onNews}>Todas as notícias</button></div><div className="news-grid">{posts.slice(0, 3).map(post => <PostCard key={post.id} post={post} />)}</div></section></>;
}

function PostCard({ post, onDelete, canEdit }: { post: Post; onDelete?: () => void; canEdit?: boolean }) {
  return <article className="card post-card">{post.image ? <img src={post.image} alt="" /> : <div className="post-art" aria-hidden="true">NSS</div>}<div className="post-card-body"><span className="post-tag">{post.disease}</span><h3>{post.title}</h3><p>{post.body}</p><small>{new Date(`${post.date}T12:00:00`).toLocaleDateString("pt-BR")}</small>{canEdit && onDelete && <button className="danger-button" onClick={onDelete}>Excluir post</button>}</div></article>;
}

function News({ posts, canEdit, onChange }: { posts: Post[]; canEdit: boolean; onChange: (value: Post[]) => void }) {
  const [form, setForm] = useState({ title: "", disease: "Dengue (DENG)", body: "", image: "" });
  const [imageName, setImageName] = useState("");
  function submit(event: FormEvent) { event.preventDefault(); if (!form.title.trim() || !form.body.trim()) return; onChange([{ ...form, id: id("post"), date: new Date().toISOString().slice(0, 10) }, ...posts]); setForm({ title: "", disease: "Dengue (DENG)", body: "", image: "" }); setImageName(""); }
  function readImage(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { setForm(current => ({ ...current, image: String(reader.result) })); setImageName(file.name); }; reader.readAsDataURL(file); }
  return <section className="portal-section"><div className="section-heading"><div><div className="section-label">EDITORIAL NSS</div><h2>Notícias e análises</h2></div><span className="pill">{posts.length} publicações</span></div><div className="news-grid">{posts.map(post => <PostCard key={post.id} post={post} canEdit={canEdit} onDelete={() => onChange(posts.filter(item => item.id !== post.id))} />)}</div>{canEdit && <form className="card portal-form" onSubmit={submit}><div className="section-label">NOVA PUBLICAÇÃO</div><h3>Publicar notícia</h3><div className="form-grid"><label>Título<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></label><label>Doença relacionada<select value={form.disease} onChange={e => setForm({ ...form, disease: e.target.value })}><option>Dengue (DENG)</option><option>Chikungunya (CHIK)</option><option>Toxoplasmose congênita (TOXC)</option><option>Toxoplasmose gestacional (TOXG)</option></select></label><label className="form-wide">Texto da notícia<textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} rows={4} required /></label><label>Imagem<input type="file" accept="image/*" onChange={readImage} /><small>{imageName || "Escolha uma imagem para a capa"}</small></label></div><button className="primary compact-button">Publicar notícia</button></form>}</section>;
}

function Animal({ role, diseases, clinics, notifications, canAdmin, canAgent, canClinic, onDiseases, onClinics, onNotifications }: { role: Role; diseases: AnimalDisease[]; clinics: Clinic[]; notifications: Notification[]; canAdmin: boolean; canAgent: boolean; canClinic: boolean; onDiseases: (v: AnimalDisease[]) => void; onClinics: (v: Clinic[]) => void; onNotifications: (v: Notification[]) => void }) {
  const [diseaseName, setDiseaseName] = useState("");
  const [clinicForm, setClinicForm] = useState({ name: "", email: "", uf: "RJ", municipality: "Campos dos Goytacazes", district: "Centro" });
  const [notification, setNotification] = useState({ breed: "", sex: "", neutered: "Não informado", ownerLocation: "", uf: "RJ", municipality: "Campos dos Goytacazes", district: "Centro" });
  function addDisease(e: FormEvent) { e.preventDefault(); if (!diseaseName.trim()) return; onDiseases([...diseases, { id: id("disease"), name: diseaseName, fields: initialDiseases[0].fields }]); setDiseaseName(""); }
  function addClinic(e: FormEvent) { e.preventDefault(); if (!clinicForm.name || !clinicForm.email) return; onClinics([...clinics, { ...clinicForm, id: id("clinic") }]); setClinicForm({ name: "", email: "", uf: "RJ", municipality: "Campos dos Goytacazes", district: "Centro" }); }
  function addNotification(e: FormEvent) { e.preventDefault(); onNotifications([{ ...notification, id: id("notification"), disease: "Toxoplasmose animal", clinic: role === "REPORTING_CLINIC" ? "Clínica notificadora" : "Registro de demonstração", date: new Date().toISOString() }, ...notifications]); setNotification({ breed: "", sex: "", neutered: "Não informado", ownerLocation: "", uf: "RJ", municipality: "Campos dos Goytacazes", district: "Centro" }); }
  return <section className="portal-section"><div className="section-heading"><div><div className="section-label">VIGILÂNCIA INTEGRADA</div><h2>Saúde animal</h2></div><span className="pill">Campos dos Goytacazes · RJ</span></div><div className="animal-map card"><div><div className="section-label">MAPA TERRITORIAL</div><h3>Notificações por distrito</h3><p>Recorte inicial de saúde animal para Campos dos Goytacazes.</p></div><div className="district-map"><span>Centro <b>{notifications.filter(n => n.district === "Centro").length}</b></span><span>Guarus <b>{notifications.filter(n => n.district === "Guarus").length}</b></span><span>Goitacazes <b>{notifications.filter(n => n.district === "Goitacazes").length}</b></span><span>Morangaba <b>{notifications.filter(n => n.district === "Morangaba").length}</b></span></div></div><div className="animal-grid"><div className="card portal-form"><div className="section-label">DOENÇAS NOTIFICÁVEIS</div><h3>Catálogo de saúde animal</h3>{diseases.map(disease => <div className="catalog-row" key={disease.id}><span><strong>{disease.name}</strong><small>{disease.fields.join(" · ")}</small></span>{canAgent && disease.id !== "animal-toxoplasmosis" && <button className="danger-button" onClick={() => onDiseases(diseases.filter(item => item.id !== disease.id))}>Excluir</button>}</div>)}{canAgent && <form className="inline-form" onSubmit={addDisease}><input value={diseaseName} onChange={e => setDiseaseName(e.target.value)} placeholder="Nome da nova doença" /><button className="secondary-button">Adicionar doença</button></form>}</div>{canClinic && <AnimalNotification form={notification} setForm={setNotification} onSubmit={addNotification} />}</div>{canAdmin && <form className="card portal-form" onSubmit={addClinic}><div className="section-label">ADMINISTRAÇÃO</div><h3>Cadastrar clínica notificadora</h3><p className="helper-text">O convite de acesso será associado ao e-mail informado.</p><div className="form-grid"><label>Nome da clínica<input value={clinicForm.name} onChange={e => setClinicForm({ ...clinicForm, name: e.target.value })} required /></label><label>E-mail institucional<input type="email" value={clinicForm.email} onChange={e => setClinicForm({ ...clinicForm, email: e.target.value })} required /></label><label>UF<select value={clinicForm.uf} onChange={e => setClinicForm({ ...clinicForm, uf: e.target.value })}><option>RJ</option></select></label><label>Município<input value={clinicForm.municipality} onChange={e => setClinicForm({ ...clinicForm, municipality: e.target.value })} /></label><label>Distrito/Bairro<input value={clinicForm.district} onChange={e => setClinicForm({ ...clinicForm, district: e.target.value })} /></label></div><button className="primary compact-button">Cadastrar clínica</button>{clinics.map(clinic => <div className="catalog-row" key={clinic.id}><span><strong>{clinic.name}</strong><small>{clinic.email} · {clinic.municipality}, {clinic.uf} · {clinic.district}</small></span></div>)}</form>}</section>;
}

function AnimalNotification({ form, setForm, onSubmit }: { form: { breed: string; sex: string; neutered: string; ownerLocation: string; uf: string; municipality: string; district: string }; setForm: (value: typeof form) => void; onSubmit: (event: FormEvent) => void }) {
  return <form className="card portal-form" onSubmit={onSubmit}><div className="section-label">CLÍNICA NOTIFICADORA</div><h3>Nova notificação · Toxoplasmose animal</h3><div className="form-grid"><label>Raça do cachorro<input value={form.breed} onChange={e => setForm({ ...form, breed: e.target.value })} required /></label><label>Sexo<select value={form.sex} onChange={e => setForm({ ...form, sex: e.target.value })} required><option value="">Selecione</option><option>Macho</option><option>Fêmea</option></select></label><label>É castrado?<select value={form.neutered} onChange={e => setForm({ ...form, neutered: e.target.value })}><option>Não informado</option><option>Sim</option><option>Não</option></select></label><label>Local onde o dono mora<input value={form.ownerLocation} onChange={e => setForm({ ...form, ownerLocation: e.target.value })} required /></label><label>UF<select value={form.uf} onChange={e => setForm({ ...form, uf: e.target.value })}><option>RJ</option></select></label><label>Município<input value={form.municipality} onChange={e => setForm({ ...form, municipality: e.target.value })} /></label><label>Distrito/Bairro<input value={form.district} onChange={e => setForm({ ...form, district: e.target.value })} /></label></div><button className="primary compact-button">Enviar notificação</button></form>;
}

function Admin({ clinics, onClinics }: { clinics: Clinic[]; onClinics: (v: Clinic[]) => void }) { return <section className="portal-section"><div className="section-label">CONTROLE DE ACESSO</div><h2>Clínicas notificadoras</h2><p className="helper-text">Cadastros ativos e convites vinculados ao território de atuação.</p><div className="admin-list">{clinics.length ? clinics.map(clinic => <div className="admin-row" key={clinic.id}><span><strong>{clinic.name}</strong><small>{clinic.email} · {clinic.municipality}/{clinic.uf} · {clinic.district}</small></span><button className="danger-button" onClick={() => onClinics(clinics.filter(item => item.id !== clinic.id))}>Revogar</button></div>) : <div className="empty-card">Nenhuma clínica cadastrada ainda.</div>}</div></section>; }

function Team({ team, canEdit, onChange }: { team: TeamMember[]; canEdit: boolean; onChange: (v: TeamMember[]) => void }) { const [form, setForm] = useState({ name: "", role: "", description: "", email: "" }); function submit(e: FormEvent) { e.preventDefault(); if (!form.name || !form.role) return; onChange([...team, { ...form, id: id("team") }]); setForm({ name: "", role: "", description: "", email: "" }); } return <section className="portal-section"><div className="section-label">QUEM FAZ O NSS</div><h2>Equipe</h2><p className="helper-text">Conheça as pessoas e áreas que fazem a informação de saúde chegar ao território.</p><div className="team-grid">{team.map(member => <article className="card team-card" key={member.id}><div className="avatar">{member.name.charAt(0)}</div><h3>{member.name}</h3><strong>{member.role}</strong><p>{member.description}</p><small>{member.email}</small>{canEdit && member.id !== "team-uenf" && <button className="danger-button" onClick={() => onChange(team.filter(item => item.id !== member.id))}>Remover membro</button>}</article>)}</div>{canEdit && <form className="card portal-form" onSubmit={submit}><div className="section-label">ADMINISTRAÇÃO</div><h3>Adicionar membro da equipe</h3><div className="form-grid"><label>Nome<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></label><label>Cargo<input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} required /></label><label>E-mail<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label><label className="form-wide">Breve descrição<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></label></div><button className="primary compact-button">Cadastrar membro</button></form>}</section>; }
