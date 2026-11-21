import { useEffect, useState } from "react";
import { requestJson } from "../../../shared/api/http";
import { isDemo } from "../../dashboard/api/sources/dataSource";
import { BrandMark } from "../../../shared/brand/BrandMark";

type Post = { id: string; slug: string; title: string; body: string; publishedAt?: string };
type Bulletin = { id: string; disease: string; competence: string; territoryCode?: string; sourceDataset?: string; disclaimer?: string };

function pageData<T>(value: unknown): T[] {
  if (!value || typeof value !== "object") throw new Error("Resposta pública inválida.");
  const items = (value as Record<string, unknown>).items;
  if (!Array.isArray(items)) throw new Error("Resposta pública sem itens.");
  return items.filter((item): item is T => !!item && typeof item === "object");
}

export function PublicContentPage({ kind }: { kind: "posts" | "bulletins" }) {
  const [items, setItems] = useState<Array<Post | Bulletin>>([]);
  const [error, setError] = useState<string | null>(null);
  const title = kind === "posts" ? "Notícias" : "Boletins epidemiológicos";
  const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  useEffect(() => {
    if (isDemo) return;
    requestJson(`/public/${kind}`)
      .then((value) => setItems(pageData<Post | Bulletin>(value)))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Não foi possível carregar o conteúdo público."));
  }, [kind]);
  return <>
    <header className="header"><BrandMark /><div><strong>Núcleo de Situação de Saúde</strong><p>UENF · Saúde e território</p></div><nav className="home-nav" aria-label="Navegação pública"><a href="/">Início</a><a href="/sobre">Sobre</a></nav></header>
    <main className="public-content-page"><a className="back-home" href="/">← Voltar ao início</a><div className="page-intro"><div className="section-label">PUBLICAÇÕES</div><h1>{title}</h1><p>Conteúdo publicado pelo NSS, com fonte e estado de disponibilidade explícitos.</p></div>
      {error ? <p className="form-error" role="alert">{error}</p> : isDemo ? <p className="empty-state" role="status">Nenhuma publicação está conectada no modo demonstração.</p> : items.length === 0 ? <p className="empty-state" role="status">Nenhuma publicação disponível.</p> : <div className="public-content-list">{items.map((item) => kind === "posts" ? <article className="card public-content-card" key={(item as Post).id}><h2>{(item as Post).title}</h2><p className="public-content-date">{(item as Post).publishedAt ? new Date((item as Post).publishedAt as string).toLocaleDateString("pt-BR") : "Data não informada"}</p><p className="public-content-body">{(item as Post).body}</p></article> : <article className="card public-content-card" key={(item as Bulletin).id}><h2>{(item as Bulletin).disease}</h2><p><strong>Competência:</strong> {(item as Bulletin).competence}</p><p><strong>Território:</strong> {(item as Bulletin).territoryCode ?? "Não informado"}</p><p><strong>Fonte:</strong> {(item as Bulletin).sourceDataset ?? "Não informada"}</p><p>{(item as Bulletin).disclaimer ?? "Notificações não equivalem a casos confirmados."}</p><p className="public-content-links"><a href={`${apiBase}/api/public/bulletins/${(item as Bulletin).id}/html`}>Abrir HTML</a> <a href={`${apiBase}/api/public/bulletins/${(item as Bulletin).id}/pdf`}>Baixar PDF</a></p></article>)}</div>}
      <footer>NSS / UENF <span>Publicações sujeitas à cobertura e aprovação editorial</span></footer>
    </main>
  </>;
}
