import { useEffect, useState } from "react";
import { requestJson } from "../../../shared/api/http";
import { isDemo } from "../../dashboard/api/sources/dataSource";
import { BrandMark } from "../../../shared/brand/BrandMark";

export function LegalPage({ slug, title }: { slug: string; title: string }) {
  const [content, setContent] = useState<{ html: string; revision?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (isDemo) return;
    requestJson(`/public/legal/${slug}`)
      .then((value) => {
        if (!value || typeof value !== "object" || typeof (value as Record<string, unknown>).html !== "string") throw new Error("Documento legal inválido.");
        const body = value as Record<string, unknown>;
        setContent({ html: new DOMParser().parseFromString(body.html as string, "text/html").body.textContent ?? "", revision: typeof body.revision === "number" ? body.revision : undefined });
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Não foi possível carregar o documento."));
  }, [slug]);
  return <>
    <header className="header"><BrandMark /><div><strong>Núcleo de Situação de Saúde</strong><p>UENF · Saúde e território</p></div><a className="header-login" href="/">Início</a></header>
    <main className="legal-page"><a className="back-home" href="/">← Voltar ao início</a><div className="page-intro"><div className="section-label">DOCUMENTO INSTITUCIONAL</div><h1>{title}</h1><p>Documento publicado pelo NSS.</p></div>
      {error ? <p className="form-error" role="alert">{error}</p> : isDemo ? <p className="empty-state" role="status">Documento não conectado no modo demonstração.</p> : !content ? <p role="status">Carregando documento…</p> : <article className="card legal-card"><p>{content.html}</p>{content.revision !== undefined && <small>Revisão publicada: {content.revision}.</small>}</article>}
      <footer>NSS / UENF <span>Documento sujeito à revisão institucional</span></footer>
    </main>
  </>;
}
