# Hárpia Patrimonial | Página de imóvel baseada no PDF aprovado
Data: 12/10/2026
Referência de interface: "Página Imóveis (2)(1).pdf", uma página vertical, fornecida pelo usuário.

## Decisão: trabalho dividido em duas partes

### Parte 1, experiência do visitante
Código-fonte React:
- `src/features/public-site/PropertyDetailPage.tsx`
- `src/features/public-site/propertyDetailData.ts`
- `src/features/public-site/property-detail-2026.css`
- `src/features/public-site/PublicSiteApp.tsx`

Foi substituído o detalhe antigo por layout completo aberto automaticamente em `/imoveis/:slug`, preservando contratos de catálogo, autenticação e callbacks existentes. 
Ordem visual: vídeo ou mídia principal à esquerda; características separadas em Serviços e Facilidades e Área Externa à direita; carrossel horizontal inferior com fotos e vídeos; métricas; IPTU, condomínio e valor m² quando disponíveis; preço/código/finalidade; Índice Wellness; descrição; endereço; agendar visita/atendimento; imóveis relacionados reais e rodapé da marca.
Suporta URLs oficiais de YouTube (watch, short, live, youtu.be), Vimeo (incluindo unlisted com hash) e arquivos de vídeo diretos via mídia do catálogo.
Não inventa vídeos, fotos, notas Wellness, imóveis ou custos quando ausentes.

### Parte 2, dados, publicação e edição
Código-fonte:
- `src/features/catalog/PropertyPresentationEditor.tsx`
- `src/features/catalog/property-presentation-editor.css`
- `src/features/catalog/CatalogAdminPage.tsx`

O editor aparece na raiz de Catálogos, utiliza propriedades do repositório real e respeita a permissão `catalog.manage`.
O editor escreve somente `features: string[]` e `media: CatalogMedia[]` em itens `itemType='property'`; não altera schema, bancos, credenciais, tabelas ou migrações.
Campos organizados em tokens `@area_m2`, `@dormitorios`, `@suites`, `@banheiros`, `@vagas`, `@iptu_mensal`, `@condominio_mensal`, `@endereco`, `@servico`, `@area_externa`, `@wellness`.
Metadados não existentes continuam ocultos no site; linhas Wellness usam o formato `Indicador|Avaliação`. Vídeos são itens reais em `media` e aceitam URLs HTTPS de YouTube/Vimeo/arquivos.
Os demais registros e mídias são preservados; remoção de links requer confirmação. Existe proteção contra sobrescrita de edição concorrente por `updatedAt`.

Publicação imediata na branch `gh-pages` (sem build/Actions):
- `index.html`: os cards existentes agora abrem `/imoveis/?codigo=...\`; o resultado da busca também abre a mesma rota, sem exigir cadastro para visualizar um imóvel;
- `imoveis/index.html`, `assets/catalog/property-detail-page.js`, `assets/catalog/property-detail-2026.css`: página pública dinâmica com o mesmo layout;
- `assets/catalog/harpia-existing-properties.js`: movidos, **sem adicionar nem alterar conteúdo**, os três imóveis já presentes na homepage estática;
- `assets/catalog/harpia-existing-media.js`: catálogo de 48 fotografias já existentes no próprio repositório, atribuídas aos códigos BOT-EASY-95, BOT-EASY-147 e BAR-ORYGEM-151, nenhuma imagem nova;
- `assets/catalog/harpia-property-videos.js`: mapa intencionalmente vazio para inclusão de links reais posteriores nas propriedades ainda estáticas;
- `assets/brand/harpia-logo-horizontal-dark-green.png`: logotipo oficial fornecido pelo brandbook, usado no rodapé;
- `404.html`: encaminha deep links antigos `/imoveis/:codigo` para a página completa e preserva fallback para outras URLs.

## Estado operacional e limites
O banco de dados ainda tinha **0 itens em `catalog_items`** na auditoria de 12/10. Por isso os três imóveis do site público continuam provenientes da base estática já existente, sem importação automática de registros no banco. O editor do Catálogo mostrará propriedades reais somente depois de cadastradas/presentes na base operacional. Não foi gravado nenhum imóvel fictício.

Se o proprietário enviar links do YouTube/Vimeo para os três imóveis estáticos, inserir no mapa `harpia-property-videos.js`, ou configurar diretamente pelo editor após a integração do imóvel com o banco. A URL é exibida no topo quando existir, sem usar mídia fictícia.

## Verificação executada, sem GitHub Actions
- HTML público atualizado e CSS do detalhe publicados no GitHub `gh-pages`.
- JavaScript publicado aprovado no analisador sintático.
- Teste em ambiente DOM simulado para os três imóveis já presentes: preço, código, 10/19/19 fotos e 2 relacionados, sem salvar dados.
- Teste isolado com fixture temporária de vídeo YouTube e metadados Wellness: player `iframe` e avaliação renderizados; nenhuma fixture incluída no produto.
- Sem alteração do backend, Supabase, dados reais, integrações, migrações e rotas funcionais existentes.

**NÃO VERIFICADO:** execução de `npm run typecheck`/`npm run build` na aplicação React (não há checkout local/registry disponível), QA visual interativo com usuário autenticado e resposta HTTP do domínio. O código-fonte de React está na branch separada; os arquivos HTML/CSS/JS da página publicada estão em `gh-pages`. A branch não foi mergeada na `main` para não disparar workflow automático em `main`.

## Aceite
Concluir QA visual desktop/mobile e build React com ambiente autorizado sem Actions. Não chamar de build validado enquanto essas verificações estiverem pendentes.
