# Hárpia | Adequação visual ao Brandbook 2026

Referência: PDF "Harpia BRANDBOOK 2026", 24 páginas, enviado em 12/10/2026.

## Identidade obrigatória
- Paleta: verde claro #C3CE94 (primário), verde-escuro do brasão (#3C4F33, inferido da amostra visual do swatch), preto #161616 e off-white #EEEEF0 em vez de branco puro.
- Tipografia: Inter para interface e corpo; Mermaid (arquivo original Mermaid1001.ttf) para títulos editoriais.
- Logotipo oficial na composição horizontal das áreas de navegação; preservar integridade e proporções da arte existente.
- CTA primário #C3CE94 com texto #161616, hover verde escuro com texto claro, foco visível e disabled de baixa opacidade.
- Personalidade: discreta, tradicional, refinada, sem efeitos extravagantes.

## Escopo desta alteração
- src/brandbook-2026.css: camada compartilhada de tokens, tipografia, botões, foco, formulários, navegação, cards, tabelas, modais e responsividade sem mudanças funcionais.
- src/main.tsx: inclusão da camada visual por último.
- src/shared/components/InternalShell.tsx: uso da composição horizontal original da marca no menu lateral.
- src/features/public-site/PublicSiteApp.tsx: uso da composição horizontal original da marca no header público.
- public/assets/brand e public/assets/fonts: reutilização dos mesmos arquivos oficiais já presentes na branch publicada, sem redesenho ou novos logotipos.

## Regras de integridade
Não houve alteração de backend, tokens, autenticação, dados, automações, contratos ou regras de negócio. Erros reais continuam visíveis e semanticamente diferenciados.

## Publicação e QA
- Branch de código separada para respeitar a proibição de GitHub Actions.
- A publicação estática em gh-pages é independente do bundle Vite desta branch.
- Build Vite, typecheck e testes E2E autenticados: NÃO VERIFICADOS neste ambiente (checkout integral e registry GitHub/npm indisponíveis localmente).
- CSS e HTML devem ser validados em navegador desktop/mobile antes de marcar a adequação como concluída; alterações visuais sem QA completo não são 'entrega validada'.
