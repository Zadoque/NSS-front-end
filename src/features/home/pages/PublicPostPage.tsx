import { useEffect, useState } from "react";
import { requestJson } from "../../../shared/api/http";
import { isDemo } from "../../dashboard/api/sources/dataSource";
import { BrandMark } from "../../../shared/brand/BrandMark";

export function PublicPostPage({ slug }: { slug: string }) {
  const [post, setPost] = useState<{ title: string; body: string; publishedAt?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (isDemo) return;
    requestJson(`/public/posts/${encodeURIComponent(slug)}`)
      .then((value) => {
        if (!value || typeof value !== "object" || typeof (value as Record<string, unknown>).title !== "string" || typeof (value as Record<string, unknown>).body !== "string") throw new Error("Notícia inválida.");
        const body = value as Record<string, unknown>;
        setPost({ title: body.title as string, body: body.body as string, publishedAt: typeof body.publishedAt === "string" ? body.publishedAt : undefined });
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Não foi possível carregar a notícia."));
  }, [slug]);
  return <>
    <header className="header"><BrandMark /><div><strong>Núcleo de Situação de Saúde</strong><p>UENF · Saúde e território</p></div><a className="header-login" href="/noticias">Notícias</a></header>
    <main className="public-content-page"><a className="back-home" href="/noticias">← Voltar às notícias</a>{error ? <p className="form-error" role="alert">{error}</p> : isDemo ? <p className="empty-state" role="status">Notícia não conectada no modo demonstração.</p> : !post ? <p role="status">Carregando notícia…</p> : <article className="card public-content-card"><div className="section-label">NOTÍCIA PUBLICADA</div><h1>{post.title}</h1>{post.publishedAt && <p className="public-content-date">{new Date(post.publishedAt).toLocaleDateString("pt-BR")}</p>}<p className="public-content-body">{post.body}</p></article>}<footer>NSS / UENF <span>Conteúdo editorial publicado</span></footer></main>
  </>;
}
