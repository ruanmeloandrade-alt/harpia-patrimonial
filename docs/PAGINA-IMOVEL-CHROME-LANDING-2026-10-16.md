# Página do imóvel: cabeçalho e rodapé da landing page padrão

Data: 16/10/2026.

## Decisão mais recente do usuário

O cabeçalho e o rodapé da página do imóvel devem ser os mesmos da landing page padrão. Esta decisão substitui exclusivamente o cabeçalho e o rodapé do PDF e a decisão anterior registrada em PAGINA-IMOVEL-REFERENCIA-2026-10-16.md. O corpo da página continua inalterado: vídeo, características, carrossel expansível, informações, preço, Wellness, descrição, atendimento e relacionados.

## Implementação

A página pública importa o HTML real do cabeçalho e do rodapé de `/`, juntamente com as folhas de estilo efetivamente usadas pela landing. Não foi criada uma versão visual aproximada. Os estilos ficam isolados em Shadow DOM para não modificar a diagramação do corpo do imóvel. As fontes são registradas com os mesmos arquivos oficiais. Os links de seção, como Sobre, passam a resolver a seção da home (`/#sobre`), em vez de uma âncora inexistente no imóvel. A altura do cabeçalho fixo é observada para não cobrir o início do conteúdo.

Arquivos publicados:
- assets/catalog/landing-chrome-20261016.js
- assets/catalog/property-reference-boot-20261016.js
- imoveis/index.html, com versão do script atualizada para 20261016.2

Código-fonte sincronizado na branch work/harpia-imoveis-p1-p2-20261012:
- src/features/public-site/landingChrome.ts
- src/features/public-site/PropertyDetailPage.tsx

Nenhuma modificação no HTML/CSS da landing original, no renderer/CSS do corpo da página do imóvel, nos registros de imóveis, no banco, na autenticação ou nas APIs. As fotos e vídeos não foram substituídos. Os links existentes de canais e Área Interna são mantidos como navegação nativa; scripts de autenticação da landing não são duplicados ou executados na página do imóvel.

## Publicação

Commit gh-pages: 9c9f87e2ff1ad94b7b2e674a82bd600ee435b229.
Atualização atômica, sem force push, sobre 36844c9dbbcada5bb17c6d5b2d340c6a45e2fe97.
Publicação automática já configurada do GitHub Pages confirmada com status completed/success, execução 38904657796, em 16/10/2026 às 13:02:10 UTC. Nenhum workflow foi criado, alterado ou acionado manualmente.

## Verificação executada

🟢 Módulo TypeScript compilado em modo estrito com noUnusedLocals/noUnusedParameters.
🟢 Comparação Chromium offline usando o HTML, CSS e fontes reais do artefato publicado, com SHA da homepage coincidente com o arquivo atual do GitHub.
🟢 Larguras 1440, 1025, 768, 390 e 360 px: zero diferenças nas 23 propriedades computadas comparadas em todos os elementos do cabeçalho e rodapé, incluindo dimensões, cores, fontes, espaçamentos e bordas.
🟢 HTML interno de .hp-ref-main idêntico ao da versão anterior, nos cinco tamanhos.
🟢 Nenhuma rolagem horizontal indevida; cabeçalho com 84 px no desktop e 74 px no mobile, sem cobrir vídeo/características.
🟢 Galeria ampliada continua abrindo e fechando por Escape; zero exceções JavaScript não capturadas no cenário testado.
🟢 Publicação GitHub Pages confirmada.

🟠 NÃO VERIFICADO: abertura HTTP e inspeção visual ao vivo do domínio nesta sessão. O navegador está restrito a ensaios offline e a ferramenta web não abriu o domínio. Os ensaios usaram respostas locais, sem tráfego de teste para o banco ou WhatsApp de produção.
🟠 O build completo React e as pendências gerais do PR #33 continuam fora do aceite desta alteração pontual; não foram declarados concluídos.
