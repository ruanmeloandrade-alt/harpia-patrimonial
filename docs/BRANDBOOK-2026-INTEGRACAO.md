# Hárpia Patrimonial & Co. | Adequação ao Brandbook 2026
Data: 12/10/2026

## Fonte de verdade visual
Brandbook 2026 enviado em PDF, 24 páginas. A aplicação usa diretamente os arquivos aprovados na biblioteca do próprio manual:
- Logos e brasões: pasta Drive apontada pelo link na p. 4;
- Fontes Inter e Mermaid: pasta Drive vinculada nas pp. 5-6;
- Ícones oficiais SVG: pasta Drive vinculada na p. 22.

Amostra do verde escuro extraída visualmente da segunda faixa da paleta (p. 7): #3C4F33. O texto impresso sobre esse bloco repete o hexadecimal da cor clara; optou-se pela cor que aparece no próprio bloco, documentando a divergência. Cores restantes: #C3CE94, #161616, #EEEEF0 (não utilizar branco puro).

## Conteúdos do manual aplicados
1. Diretriz de logo, pp. 2-4: composição horizontal oficial nas navegações, brasão original sem distorção ou fundo desenhado; marca de origem em cabeçalhos internos.
2. Tipografia, pp. 5-6: Inter para conteúdo e interface; Mermaid para títulos editoriais, com fontes originais locais.
3. Paleta, p. 7: botões primários #C3CE94 com contraste, hover, foco visível e estado desabilitado; fundo #EEEEF0.
4. Essência, história, posicionamento e tom, pp. 1, 9-13, 18-20: homepage reescrita com orientação patrimonial e tradição familiar desde 1986, evitando promessa de ganho ou tom vendedor.
5. Elementos de identidade, pp. 2-4 e 9-12: brasão e lettering oficiais como ornamentos de baixa opacidade, com composições editoriais contidas.
6. Moodboard, p. 21: reduzir excessos de cor/sombra, conservar fotografias documentais já presentes, foco em arquitetura e luz natural. **Não foram adicionadas fotografias externas novas**.
7. Iconografia, p. 22: 11 SVGs originais da coleção preta e ícone branco de comentários incorporados. Busca, favoritos e atendimento passam a usar SVGs oficiais nas interfaces em que os padrões existem.

## Código React preparado na branch do PR #32
Componentes reais alterados:
- src/shared/components/HarpiaBrandMark.tsx
- src/features/dashboard/DashboardPage.tsx
- src/features/crm/CrmWorkspaceCore.tsx
- src/features/inbox/InboxWorkspaceCore.tsx
- src/features/calendar/CalendarWorkspace.tsx
- src/features/salesbot/SalesBotWorkspace.tsx
- src/features/ai-agents/AIAgentsWorkspace.tsx
- src/features/catalog/CatalogAdminPage.tsx
- src/features/settings/SettingsWorkspace.tsx
- src/features/marketing/MarketingWorkspace.tsx
- src/features/client-area/ClientArea.tsx
- src/features/auth/AuthCard.tsx
- src/features/public-site/PublicSiteApp.tsx
- src/shared/components/InternalShell.tsx
- src/main.tsx
- src/brandbook-2026.css
- src/brandbook-editorial-2026.css

## Publicação estática direta, sem GitHub Actions
A branch gh-pages recebeu:
- 34 arquivos HTML referenciando a nova camada editorial de CSS;
- src/brandbook-editorial-2026.css espelhado em assets/brand/brandbook-editorial-2026.css;
- 12 arquivos SVG oficiais em assets/brand/icons/;
- nova abertura editorial da homepage, faixa com brasão/tradição desde 1986 e revisão dos textos;
- brasão nas páginas Sobre, Cliente e Sistema;
- aviso vermelho removido em entrega anterior, mantido ausente.

A folha de estilo reconhece o bundle React já publicado e desenha o brasão de forma responsiva quando ainda não existe o elemento React. O seletor :has evita duplicação após a compilação da branch de código-fonte.

## Regras preservadas
Não editar frontend com mocks; não tocar backend, integrações, autenticação, dados, permissões, fluxos, SalesBots, tabelas ou env. As alterações realizadas nesta etapa são apresentação (TSX/CSS/HTML) e recursos estáticos oficiais. Nenhuma GitHub Action foi executada manualmente.

## QA executado
- comparação GitHub entre main e branch e entre gh-pages anterior e a atual para verificar que não houve alterações em backend ou dados;
- conferência de 34 rotas e presença de ambos os estilos (ainda deve ser terminada em todas as páginas);
- conferência de existência dos 7 recursos gráficos referenciados na CSS;
- comparativo de JavaScript inline e quantidade de forms nas páginas index, cliente, sistema e sobre: invariantes mantidas;
- inspeção estática de CSS: balanceamento de chaves e tokens esperados;
- comparação de SHA das versões do CSS na fonte e na publicação: idênticas.

## Pendências e limitação honesta
- NÃO VERIFICADO: npm run build e npm run typecheck num checkout completo. O ambiente de execução não possui dependências em cache e não acessa o registry/GitHub via rede. Não disparar GitHub Actions.
- NÃO VERIFICADO: testes visuais autenticados de todos os fluxos em desktop/mobile com captura de screenshot, navegação e estado real.
- PENDENTE: integração do código-fonte React do PR #32 à main e publicação do bundle compilado fora de GitHub Actions. O CSS da gh-pages foi atualizado, mas o JS do app em produção permanece o bundle anterior até build externo.
- PENDENTE: revisão editorial de fotografias com materiais aprovados específicos; nenhuma imagem externa foi substituída sem autorização.

Critério de finalização: só declarar tudo concluído após build/typecheck, conferência visual real e deploy do bundle compilado.
