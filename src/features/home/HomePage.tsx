import { isDemo, isProdMock } from "../../data/dataSource";
export function HomePage() {
  return (
    <>
      <header className="header">
        <div className="brand-mark" aria-hidden="true">
          NSS
        </div>
        <div>
          <strong>Núcleo de Situação de Saúde</strong>
          <p>UENF · Saúde e território</p>
        </div>
        <a className="header-login" href="/login">Entrar</a>
      </header>
      <main className="home">
        <section className="home-hero">
          <div className="section-label">PLATAFORMA NSS · V1</div>
          <h1>Informação para acompanhar a saúde no território</h1>
          <p>
            O Núcleo de Situação de Saúde — NSS é a plataforma da UENF para
            consulta territorial de notificações epidemiológicas. Nesta primeira
            versão, reúne filtros temporais, mapas e rankings para apoiar a
            leitura da situação de saúde.
          </p>
          <a className="primary home-cta" href="/login">
            Acessar o mapa <span aria-hidden="true">→</span>
          </a>
        </section>
        <div className="home-grid">
          <section className="card home-section">
            <div className="section-label">NOSSA MISSÃO</div>
            <h2>Para que serve o NSS</h2>
            <p>A plataforma apoia a vigilância e a interpretação responsável dos dados:</p>
            <ul>
              <li>
                Consultar notificações por doença, período e território.
              </li>
              <li>
                Acompanhar a distribuição territorial e temporal dos eventos disponíveis.
              </li>
              <li>
                Apoiar gestores na identificação de áreas que merecem atenção.
              </li>
              <li>
                Transformar dados públicos em informação compreensível para análise.
              </li>
              <li>
                Oferecer uma base evolutiva para incorporar novas fontes e recortes.
              </li>
            </ul>
          </section>
          <section className="card home-section">
            <div className="section-label">ATUALMENTE · V1</div>
            <h2>O que já está disponível</h2>
            <p>
              Explore Brasil, Sudeste e municípios do Rio de Janeiro, com
              filtros de doença, ano e mês e ranking municipal. A cobertura
              epidemiológica é parcial.
            </p>
            <p>
              {isProdMock ? "Neste acesso, o mapa usa um snapshot estático de dados reais agregados do SINAN. Não há atualização em tempo real. Consulte a data da publicação no mapa." : isDemo
                ? "Neste acesso, o mapa é uma demonstração com dados sintéticos, não dados reais do SINAN."
                : "Neste acesso, o mapa consulta a API epidemiológica, dentro dos limites de cobertura da V1."}
            </p>
            <h3>Dados e desenvolvimento</h3>
            <p>
              A V1 utiliza dados públicos de notificações epidemiológicas,
              processados pela pipeline do NSS. O SINAN é a fonte principal
              incorporada nesta versão; a cobertura exibida no mapa informa
              explicitamente os limites de cada recorte.
            </p>
            <p>
              Os valores apresentados são notificações. Eles não equivalem,
              isoladamente, a incidência, casos confirmados ou diagnóstico clínico.
            </p>
          </section>
        </div>
        <section className="card home-section location">
          <div>
            <div className="section-label">UENF · CAMPOS DOS GOYTACAZES</div>
            <h2>Onde estamos</h2>
            <address>
              Hospital Veterinário Darcy Ribeiro — UENF
              <br />
              Av. Alberto Lamego, 3000
              <br />
              Campos dos Goytacazes — RJ
            </address>
          </div>
          <a className="primary home-cta" href="/login">
            Acessar o mapa <span aria-hidden="true">→</span>
          </a>
        </section>
        <footer>
          NSS / UENF <span>Plataforma de situação de saúde · V1</span>
        </footer>
      </main>
    </>
  );
}
