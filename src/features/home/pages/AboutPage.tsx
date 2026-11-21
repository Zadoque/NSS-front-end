import { useEffect, useState } from "react";
import { requestJson } from "../../../shared/api/http";
import { isDemo } from "../../dashboard/api/sources/dataSource";
import { BrandMark } from "../../../shared/brand/BrandMark";

type AboutContent = {
  mission: string;
  scope?: string;
  institutions: string[];
  team: Array<{ name?: string; role?: string; description?: string }>;
  revision?: number;
};

const demoAbout: AboutContent = {
  mission: "Apoiar a leitura responsável da situação de saúde por meio de dados epidemiológicos compreensíveis e territorialmente contextualizados.",
  scope: "O NSS apresenta notificações agregadas e informa os limites de cobertura de cada fonte.",
  institutions: ["UENF", "PROPPG/PROEX", "CCTA/CCT/CBB", "LSA/LCCOMP/LRB", "NSS"],
  team: [],
};

function parseAbout(value: unknown): AboutContent {
  if (!value || typeof value !== "object") throw new Error("Conteúdo institucional inválido.");
  const content = value as Record<string, unknown>;
  if (typeof content.mission !== "string" || !Array.isArray(content.institutions) || !Array.isArray(content.team)) {
    throw new Error("Conteúdo institucional incompleto.");
  }
  return {
    mission: content.mission,
    scope: typeof content.scope === "string" ? content.scope : undefined,
    institutions: content.institutions.filter((item): item is string => typeof item === "string"),
    team: content.team.filter((item): item is Record<string, unknown> => !!item && typeof item === "object").map((item) => ({
      name: typeof item.name === "string" ? item.name : undefined,
      role: typeof item.role === "string" ? item.role : undefined,
      description: typeof item.description === "string" ? item.description : undefined,
    })),
    revision: typeof content.revision === "number" ? content.revision : undefined,
  };
}

export function AboutPage() {
  const [content, setContent] = useState<AboutContent | null>(isDemo ? demoAbout : null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isDemo) return;
    let active = true;
    requestJson("/public/about")
      .then((value) => { if (active) setContent(parseAbout(value)); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Não foi possível carregar a página Sobre."); });
    return () => { active = false; };
  }, []);

  return (
    <>
      <header className="header">
        <BrandMark />
        <div><strong>Núcleo de Situação de Saúde</strong><p>UENF · Saúde e território</p></div>
        <a className="header-login" href="/">Início</a>
      </header>
      <main className="about-page">
        <a className="back-home" href="/">← Voltar ao início</a>
        <div className="page-intro"><div className="section-label">INSTITUCIONAL</div><h1>Sobre o NSS</h1><p>Missão, escopo e instituições que sustentam a plataforma.</p></div>
        {error ? <p className="form-error" role="alert">{error}</p> : !content ? <p role="status">Carregando informações institucionais…</p> : (
          <div className="about-grid">
            <section className="card home-section"><div className="section-label">NOSSA MISSÃO</div><h2>Para que existe o NSS</h2><p>{content.mission}</p>{content.scope && <p>{content.scope}</p>}</section>
            <section className="card home-section"><div className="section-label">HIERARQUIA INSTITUCIONAL</div><h2>Instituições</h2><ol className="institution-list">{content.institutions.map((institution) => <li key={institution}>{institution}</li>)}</ol></section>
            {content.team.length > 0 && <section className="card home-section about-team"><div className="section-label">EQUIPE</div><h2>Pessoas e funções</h2>{content.team.map((member, index) => <article key={`${member.name ?? "member"}-${index}`}><h3>{member.name ?? "Não informado"}</h3>{member.role && <p><strong>{member.role}</strong></p>}{member.description && <p>{member.description}</p>}</article>)}</section>}
          </div>
        )}
        {content?.revision !== undefined && <p className="about-revision">Revisão institucional publicada: {content.revision}.</p>}
        <footer>NSS / UENF <span>Conteúdo institucional publicado pelo portal</span></footer>
      </main>
    </>
  );
}
