import { useState, type FormEvent } from "react";
import { requestJson } from "../../../shared/api/http";
import { isDemo } from "../../dashboard/api/sources/dataSource";
import { BrandMark } from "../../../shared/brand/BrandMark";

type Result = { id: string; title?: string; disease?: string; competence?: string; slug?: string };
type SearchResponse = { posts: Result[]; bulletins: Result[]; totalElements: number };

export function PublicSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function search(event: FormEvent) {
    event.preventDefault();
    const normalized = query.trim();
    if (normalized.length < 2) { setError("Informe ao menos 2 caracteres."); return; }
    if (isDemo) { setResults({ posts: [], bulletins: [], totalElements: 0 }); setError(null); return; }
    setError(null);
    try {
      const value = await requestJson(`/public/search?q=${encodeURIComponent(normalized)}&type=all`);
      if (!value || typeof value !== "object") throw new Error("Resposta de busca inválida.");
      const body = value as Record<string, unknown>;
      if (!Array.isArray(body.posts) || !Array.isArray(body.bulletins)) throw new Error("Resposta de busca incompleta.");
      setResults({ posts: body.posts as Result[], bulletins: body.bulletins as Result[], totalElements: typeof body.totalElements === "number" ? body.totalElements : 0 });
    } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : "Não foi possível pesquisar."); }
  }
  return <>
    <header className="header"><BrandMark /><div><strong>Núcleo de Situação de Saúde</strong><p>UENF · Saúde e território</p></div><nav className="home-nav" aria-label="Navegação pública"><a href="/">Início</a><a href="/sobre">Sobre</a></nav></header>
    <main className="public-content-page"><a className="back-home" href="/">← Voltar ao início</a><div className="page-intro"><div className="section-label">PESQUISA PÚBLICA</div><h1>Buscar no NSS</h1><p>Pesquise publicações aprovadas de notícias e boletins.</p></div>
      <form className="public-search-form" onSubmit={search}><label htmlFor="public-search">Termo de busca</label><div><input id="public-search" value={query} onChange={(event) => setQuery(event.target.value)} /><button className="admin-action primary" type="submit">Pesquisar</button></div></form>
      {error && <p className="form-error" role="alert">{error}</p>}
      {results && <section className="card public-content-card" aria-live="polite"><h2>Resultados</h2>{results.totalElements === 0 ? <p>Nenhum resultado encontrado.</p> : <ul className="search-results">{results.posts.map((item) => <li key={`post-${item.id}`}><a href={item.slug ? `/noticias/${item.slug}` : "/noticias"}>{item.title ?? "Notícia"}</a></li>)}{results.bulletins.map((item) => <li key={`bulletin-${item.id}`}><a href={`/boletins#${item.id}`}>{item.disease ?? "Boletim"} · {item.competence ?? "competência não informada"}</a></li>)}</ul>}</section>}
      <footer>NSS / UENF <span>Resultados limitados ao conteúdo publicado</span></footer>
    </main>
  </>;
}
