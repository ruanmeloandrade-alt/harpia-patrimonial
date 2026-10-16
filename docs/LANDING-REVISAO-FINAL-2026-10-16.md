# Landing page padrão: PDF de revisão final

## Decisão de 16/10/2026

O usuário forneceu `Harpia_Revisao_Final(1).pdf` e determinou que a página de vendas padrão reproduza sua composição, sem liberdade criativa. A referência é uma página de 1080 × 5625,84 pontos. Esta decisão substitui a apresentação anterior da HOME, inclusive cabeçalho e rodapé. O corpo da página individual de imóvel continua seguindo seu PDF próprio.

## Publicação confirmada

Commit da gh-pages: `68e806aade5712fb348b396ce8ed5eaf91673d73`.
Base preservada: `9c9f87e2ff1ad94b7b2e674a82bd600ee435b229`.
GitHub Pages: execução automática `38919845943`, com build, deploy e report-build-status em completed/success.
Artefato publicado consultado e extraído: `12053109051`, github-pages.
Não foi criado, editado ou disparado manualmente workflow.

Arquivos efetivamente publicados:
- `gh-pages:index.html` (blob `5a4497a91e0f27cc27636a7c79cfe122881151ff`).
- `gh-pages:assets/home/revisao-final-20261016.css` (blob `46f3b9d7293db83206cb053aa6dc1e56bfad1901`).
- `gh-pages:assets/home/revisao-final-20261016.js` (blob `68d9bcce34b76e5d06a611cfd4bd54afbbcdfee5`).
- `gh-pages:docs/LANDING-REVISAO-FINAL-2026-10-16.md` com detalhamento da implementação e limites.

ATENÇÃO À CONTINUIDADE: o HTML, CSS e JavaScript da home pública estão versionados na gh-pages. Não substituir essa home por um build antigo do PublicSiteApp React. Os PRs #32/#33 e a main não foram mergeados nesta etapa. Ao integrar a aplicação React, preservar a home final acima e os arquivos de publicação.

## Implementação

Página HTML/CSS real, com textos selecionáveis, campos, links e filtros, não um PNG da página. Ordem e composições do documento: abertura dividida, faixa institucional, dois imóveis em destaque e outros em linha, Sobre, Jurídico e Arquitetura, decisão, faixa verde-clara, experiência consultiva, atendimento e rodapé completo. Fontes Inter/Mermaid e cores #3D5033, #C3CE94, #EEEEF0 e #161616. Fotos e recursos oficiais anteriores reaproveitados, com recortes aferidos pela referência. A fotografia de abertura mantém a URL Unsplash já usada na home; o mapa mantém o iframe Google Maps do endereço existente.

A consulta ao catálogo continua pública e somente leitura. Os registros publicados do banco têm prioridade sobre os legados em caso de código/ID igual. Sem imóveis fictícios adicionais. O resumo legado de BOT-EASY-95 usa 1 vaga quando esse campo não existe, conforme valor expressamente informado no PDF final; não houve gravação desse valor no banco. Campos existentes no banco mantêm prioridade.

Busca por finalidade, cidade, bairro, lançamento e preço; cidades/bairros derivados dos registros; limpeza de filtros pelo botão Ver todos os imóveis. Links preservados em `/imoveis/?codigo=...`. Área Interna mantém `/cliente/`; páginas institucionais e legais mantêm suas rotas.

Formulário encaminha nome, WhatsApp, interesse e bairro ao WhatsApp já configurado, com contexto de origem/ação/UTMs. Não declara mensagem enviada nem lead criado. Não houve nova integração de captura no CRM ou alteração da autenticação de servidor. O cadastro de vídeo YouTube no painel é uma pendência separada, não incluída nesta alteração.

## QA do artefato publicado

O ZIP efetivamente enviado ao Pages foi baixado e os três arquivos de produção tiveram seus SHAs verificados. Os testes locais foram repetidos com os bytes desse artefato, incluindo a CSS final.

🟢 JavaScript: análise sintática Node passou.
🟢 Chromium local: zero erros JavaScript não capturados no cenário testado.
🟢 360, 390, 768, 1080, 1440 e 1920 px: documentWidth igual à largura da viewport.
🟢 Três registros reais anteriormente publicados: dois cards e uma linha.
🟢 Filtro R$ 2 a 5 milhões: dois resultados; limpar filtros: três resultados.
🟢 URLs dos três imóveis existentes preservadas.
🟢 Formulário vazio inválido; nome e telefone válidos aceitos pela validação HTML.
🟢 Destinos WhatsApp com contexto de ação/origem conferidos.

## Cabeçalho e rodapé compartilhados

A ponte `landing-chrome-20261016.js` existente foi testada com o novo HTML/CSS do artefato publicado em ambiente local. Resultado: state=ready, um cabeçalho, um rodapé, seis links no menu, corpo do imóvel preservado, HomeInter aplicado e menu móvel abrindo por details/summary. Alturas em 1080 px: cabeçalho 70,5 e rodapé 675,125. Zero erros JavaScript. Desmontagem limpou os dois componentes. Nenhuma alteração no renderer de vídeo/galeria do imóvel.

## Limites

🟠 NÃO VERIFICADO: inspeção visual diretamente no domínio, carregamento remoto da imagem Unsplash e do mapa, autenticação ponta a ponta e envio real no WhatsApp.

O navegador desta sessão bloqueia navegação HTTP, inclusive localhost. Os testes foram locais, via set_content e recursos disponíveis, com transporte público isolado. A referência do PDF serviu apenas para comparação local da fotografia externa e mapa. Esses recursos de teste não foram publicados como imagens substitutas.

A confirmação de deploy veio do GitHub Pages. Ela não equivale a afirmar identidade pixel a pixel em produção. Não declarar teste no domínio ou envio de mensagens reais que não foram realizados.
