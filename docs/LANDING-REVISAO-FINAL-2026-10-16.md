# Landing page padrão: revisão final de 16/10/2026

## Referência e decisão

Referência exclusiva desta alteração: `Harpia_Revisao_Final(1).pdf`, fornecido pelo usuário, uma página de 1080 × 5625,84 pontos. O usuário exige reprodução do documento, sem liberdade criativa. A referência substitui o layout anterior da home, incluindo seu cabeçalho e rodapé. O corpo da página individual do imóvel continua seguindo seu PDF próprio. A decisão anterior de compartilhar o cabeçalho e rodapé da landing com o detalhe do imóvel permanece válida.

## Publicação

Base de publicação preservada: gh-pages, commit `9c9f87e2ff1ad94b7b2e674a82bd600ee435b229`.

Arquivos de produção desta entrega:
- `index.html`;
- `assets/home/revisao-final-20261016.css`;
- `assets/home/revisao-final-20261016.js`.

Não foram alterados o aplicativo interno compilado, a página individual do imóvel, as integrações, os registros no Supabase, a autenticação de servidor, as credenciais privadas ou os workflows. A publicação usa a branch gh-pages já configurada, sem criar, editar ou disparar manualmente GitHub Actions. A presença dos arquivos na branch não deve, sozinha, ser confundida com a confirmação do deploy; conferir a execução automática de Pages correspondente ao commit.

## Implementação visual

Reconstrução em HTML/CSS, não imagem da página com links sobrepostos. Texto selecionável, links nativos, formulários reais e catálogo gerado a partir de dados. A unidade desktop deriva da largura de 1080 pontos do PDF. Foram mantidas as quebras dos títulos e a ordem das seções: abertura dividida, faixa institucional, curadoria com dois destaques e imóveis adicionais em linha, Sobre, Jurídico/Arquitetura lado a lado, decisão, faixa verde-clara, experiência consultiva, formulário de atendimento e rodapé completo.

Paleta medida: verde escuro #3D5033, verde claro #C3CE94, fundo #EEEEF0, texto #161616. Fontes oficiais já existentes: Inter e Mermaid. Fotos de imóveis, equipe, jurídico e arquitetura reaproveitadas dos arquivos existentes, com recortes aferidos a partir do PDF. A fotografia externa da abertura usa a URL Unsplash que já estava na home anterior; seu carregamento remoto ainda exige verificação no domínio. Não foram substituídas fotografias por imagens inventadas.

O cabeçalho e rodapé continuam compatíveis com `assets/catalog/landing-chrome-20261016.js`, que lê `body > header` e `footer.site-footer` da home e isola seus estilos no detalhe do imóvel. O menu móvel utiliza details/summary nativos para continuar utilizável no conteúdo copiado, sem depender de um script duplicado.

## Catálogo, navegação e atendimento

A consulta pública é somente leitura e considera imóveis publicados. Os registros legados que já estavam publicados são mantidos como fallback, com prioridade para dados do banco em caso de código/ID repetido. Sem novos imóveis fictícios. Cidade e bairro são derivados dos registros. Filtros de finalidade, cidade, bairro, lançamento e preço funcionam na vitrine; `Ver todos os imóveis` limpa os filtros.

Os links mantêm `/imoveis/?codigo=...`. Os três códigos previamente existentes continuam BOT-EASY-95, BOT-EASY-147 e BAR-ORYGEM-151. Os títulos editoriais desses registros legados seguem a apresentação do PDF. Para o resumo legado BOT-EASY-95, o PDF informa explicitamente 1 vaga; esse valor é usado apenas no resumo público se o cadastro legado não tiver o campo. Valores existentes no banco continuam tendo prioridade. Nenhum registro operacional foi gravado ou alterado.

O acesso à Área Interna mantém a rota `/cliente/`. As páginas institucionais, legais e de conta permanecem em suas rotas existentes. Não foi replicada autenticação em JavaScript nem criada conta de exemplo.

Atendimento e formulário encaminham ao número WhatsApp já usado pela home, com nome, telefone, interesse, bairro e contexto de origem/ação/UTMs. A interface informa abertura do WhatsApp, não mensagem enviada ou lead criado. Esta entrega não implementa nem declara uma nova gravação de lead no CRM. O mapa continua sendo o embed Google Maps do endereço já configurado, não uma imagem estática publicada.

## Verificações locais executadas

- Análise sintática do JavaScript com Node: passou.
- Chromium, renderização local com fontes e materiais disponíveis: passou.
- Larguras 360, 390, 768, 1080, 1440 e 1920: documentWidth igual à largura da viewport, sem rolagem horizontal da página.
- Três registros anteriormente publicados: dois cards e uma linha adicional.
- Faixa R$ 2 a 5 milhões: dois resultados.
- Limpar filtros: três resultados.
- URLs dos três imóveis: preservadas.
- Formulário vazio: inválido; nome e telefone válidos: aceitos pela validação HTML.
- CTAs com destino WhatsApp e contexto identificável: conferidos.
- Erros JavaScript não capturados no cenário local: zero.

Referências verticais da versão local em viewport de 1080 px: cabeçalho 0/70,5; abertura 70,5/523,5; origem 594/181; curadoria 775/813,09; Sobre 1588,09/662; serviços 2250,09/675,19; decisão 2925,28/292,5; proteção 3217,78/382,5; jornada 3600,28/675,09; contato 4275,38/675,09; rodapé 4950,47/675,13. Esses valores descrevem posição/altura das seções no cenário com o catálogo legado e não prometem alturas imutáveis para quantidades diferentes de imóveis.

## Limites de validação

O navegador desta sessão bloqueia navegação HTTP, inclusive localhost. Os testes utilizaram set_content, fontes/imagens locais e transporte público isolado. A imagem do PDF foi usada apenas no ambiente local para a comparação da abertura e do mapa. Nenhuma dessas imagens de teste foi cadastrada como imóvel ou adicionada à publicação.

NÃO VERIFICADO: inspeção visual ao vivo do domínio, disponibilidade remota da fotografia Unsplash e do mapa Google, navegação autenticada de ponta a ponta e envio real pelo WhatsApp. Não declarar identidade pixel a pixel em produção sem essa conferência. O HTML e JavaScript enviados tiveram seus SHAs comparados com as versões locais. A folha CSS deve ser reconferida no artefato publicado.

O campo de YouTube na área interna, mencionado em conversa anterior, é uma pendência distinta e não faz parte desta alteração da landing.
