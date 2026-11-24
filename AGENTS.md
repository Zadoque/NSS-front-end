# Regras de execução do NSS

- Trabalhe na etapa aprovada em ambiente isolado. Preserve alterações existentes e não troque o ambiente ativo sem aprovação explícita.
- Registre critérios de aceite antes de alterar comportamento. Mudanças em contratos de schema, autenticação ou interpretação epidemiológica exigem aprovação.
- Use revisão independente de QA em modo de leitura. Para metas de desempenho, solicite revisão independente da comparação e da evidência.
- Rode as verificações relevantes ao diff. Use PostgreSQL e Redis reais para os contratos críticos e testes de mutação dirigidos quando aplicáveis. Verificações não executadas ficam pendentes.
- Compare alternativas no mesmo snapshot e nas mesmas condições. Confirme paridade antes de medir desempenho.
- Registre no PR os comandos, resultados, achados e limitações. As verificações obrigatórias devem passar na revisão integrada. Não reduza critérios para contornar falhas.

## Frontend

Preserve a navegação e os IDs do catálogo territorial. O cache de consultas fica separado por conta e filtros e expira às 02h em America/Sao_Paulo. Use npm run build, npm run lint e os cenários Playwright relevantes.

## Ferramentas no NixOS

Para Chromium, Playwright e demais ferramentas de verificação, procure primeiro um `flake.nix` aplicável. Se não houver pacote declarado, use `nix-shell -p <pacote> --run '<comando>'` (ou `nix shell nixpkgs#<pacote> --command <comando>`) em vez de instalar globalmente. Registre o comando e a versão efetiva nos resultados; não altere o sistema ativo.

## Escopo aprovado desta fase

- Todos os testes E2E usam o stack descartável `nss-v1`.
- Não é necessário garantir compatibilidade com cada commit anterior; não há primeira versão publicada com backend. O aceite é o snapshot atual funcionar de forma coerente e segura, preservando autenticação, permissões, contratos e limites de confiança.
- DT-10, DT-11 e DT-13 ficam por último.
