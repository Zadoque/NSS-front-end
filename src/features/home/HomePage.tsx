import { isDemo } from "../../data/dataSource";
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
          <div className="section-label">INICIATIVA EM FASE INICIAL</div>
          <h1>Informação para compreender a saúde do território</h1>
          <p>
            O Núcleo de Situação de Saúde — NSS é uma iniciativa vinculada à
            UENF que pretende apoiar o acompanhamento e a interpretação da
            situação de saúde, abrangendo Saúde Humana e Saúde Animal.
          </p>
          <a className="primary home-cta" href="/login">
            Acessar o mapa <span aria-hidden="true">→</span>
          </a>
        </section>
        <div className="home-grid">
          <section className="card home-section">
            <div className="section-label">NOSSA MISSÃO</div>
            <h2>O que queremos fazer</h2>
            <p>Estes são objetivos do Núcleo, em construção:</p>
            <ul>
              <li>
                Monitorar doenças e outros eventos epidemiológicos e acompanhar
                sua evolução territorial e temporal.
              </li>
              <li>
                Apoiar a elaboração e revisão de planos de contingência e
                auxiliar logisticamente prefeituras e outros órgãos públicos.
              </li>
              <li>
                Apoiar gestores na identificação de áreas que merecem atenção.
              </li>
              <li>
                Transformar dados públicos de saúde em informação compreensível
                e informar a população sobre riscos e cuidados necessários.
              </li>
              <li>
                Futuramente integrar perspectivas de saúde humana, animal e
                ambiental, quando houver fontes adequadas.
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
              {isDemo
                ? "Neste acesso, o mapa é uma demonstração com dados sintéticos, não dados reais do SINAN."
                : "Neste acesso, o mapa consulta a API epidemiológica, dentro dos limites de cobertura da V1."}
            </p>
            <h3>Dados e desenvolvimento</h3>
            <p>
              A plataforma está em desenvolvimento. A pipeline trabalha
              inicialmente com dados públicos obtidos por PySUS, tendo o SINAN
              como principal fonte incorporada nesta etapa. Outras fontes
              poderão ser adicionadas conforme as perguntas que o Núcleo decidir
              responder.
            </p>
            <p>
              Está sendo estabelecida uma parceria com a Prefeitura de Campos
              dos Goytacazes.
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
          NSS / UENF <span>Plataforma em desenvolvimento · V1</span>
        </footer>
      </main>
    </>
  );
}
