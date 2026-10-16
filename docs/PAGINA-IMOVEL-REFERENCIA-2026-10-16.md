# Página de imóvel: referência integral do PDF

Data: 16/10/2026.
Referência recebida: `Página Imóveis (2)(2).pdf`, uma página de 1024,5 × 2304 pontos.
Decisão do usuário: reproduzir cores, tipografia, proporções, posição e sequência de toda a página, sem interpretação criativa. Vídeo principal hospedado no YouTube; carrossel inferior com fotos e vídeos que se ampliam ao clicar.

## Estado desta entrega

🟢 Renderer da página e interações de galeria: implementados e testados isoladamente em Chromium.
🟢 Arquivos estáticos enviados à branch de publicação `gh-pages`, em atualização atômica sem force push.
🟠 Validação no domínio, reprodução de vídeos reais e integração/build do aplicativo React completo: NÃO VERIFICADOS.

Não considerar o aplicativo React inteiro concluído nem afirmar identidade pixel a pixel em produção com base apenas nos testes isolados. O PR #33 permanece dependente do PR #32 e não foi mergeado na `main`.

## Publicação e arquivos

Commit da `gh-pages`: `36844c9dbbcada5bb17c6d5b2d340c6a45e2fe97`.
Base preservada: `d20b0a8f1e16be2d27d954bc9983837d03f3e88a`.

Somente quatro arquivos mudaram na publicação:

- `imoveis/index.html`.
- `assets/catalog/propertyReference.js`.
- `assets/catalog/property-reference-20261016.css`.
- `assets/catalog/property-reference-boot-20261016.js`.

Rota mantida: `/imoveis/?codigo=BOT-EASY-95`; funciona como template para qualquer imóvel retornado pelo catálogo e selecionado pelo código. Os links existentes da homepage e o fallback de deep links não foram substituídos.

Código-fonte na branch `work/harpia-imoveis-p1-p2-20261012`:

- `src/features/public-site/propertyReference.ts`: renderer compartilhado, normalização de dados e galeria.
- `src/features/public-site/property-reference-20261016.css`: apresentação exclusiva da página.
- `src/features/public-site/PropertyDetailPage.tsx`: adaptador React com os callbacks existentes de atendimento, agendamento, navegação e favoritos.

Os scripts anteriores e os arquivos reais de catálogo/mídia continuam no repositório; não foram apagados nem substituídos por fixtures.

## Apresentação medida no documento

Paleta extraída dos objetos do PDF, não aproximada por uma interpretação do brandbook anterior:

- Fundo: `#EEEDE6`.
- Verde escuro: `#3D5033`.
- Verde claro: `#C3CE94`.

Fontes identificadas no PDF: Inter e Mermaid. A publicação referencia os arquivos oficiais já existentes em `/assets/fonts/`. Nenhuma fonte extraída do PDF foi enviada para o repositório nesta entrega.

A página recebeu cabeçalho verde com marca centralizada; vídeo à esquerda e características à direita; galeria horizontal abaixo; especificações e custos; quadro central de preço/código/finalidade; faixa Wellness; descrição e endereço centralizados; dois CTAs; imóveis relacionados; rodapé verde com marca, canais e crédito.

Não há menu adicional, breadcrumb, título comercial extra ou chamada flutuante inserida no layout aprovado. Na rota React, a ocultação do cabeçalho/rodapé antigo é limitada ao seletor da página de imóvel; não modifica a home nem os módulos internos.

Geometria aferida em navegador de 1025 px com fixture local do material aprovado:

- Cabeçalho: 121,047 px de altura.
- Vídeo: x 26,094; y 148,609; largura 710,594; altura 405,188 px.
- Características: x 754,844; y 148,609; largura 241,594; altura 405,188 px.
- Galeria: y 575,203; altura 218,344 px.
- Preço: y 1005,281; altura 105,578 px.
- Wellness: y 1187,328; altura 95,594 px.
- Descrição: y 1351,797 px.
- CTAs: y 1690,078; altura 33,594 px.
- Relacionados: y 1775,609 px.
- Rodapé: y 2042,656; altura 261,516 px.

Essas medidas não significam que registros com descrições, mídias ou quantidade de características diferentes tenham a mesma altura absoluta. A página preserva o conteúdo real sem truncar informações para falsificar uma comparação.

## Vídeo principal e carrossel

O vídeo principal não é trocado ao navegar pelo carrossel. Fotos e vídeos do carrossel abrem uma galeria modal. Há navegação anterior/próxima, teclado, fechamento por Escape, restauração de foco, bloqueio de rolagem do fundo e suporte de gesto nas imagens. Os players são removidos ao fechar para não deixar áudio tocando escondido.

YouTube é convertido de URL oficial para o player incorporado, com validação do identificador. Também foram preservados Vimeo e arquivos de vídeo já suportados pelo catálogo. Nenhum vídeo ilustrativo foi cadastrado.

No catálogo operacional, o primeiro vídeo é usado como principal, ou um item explicitamente marcado como principal quando presente. As mídias existentes são preservadas e deduplicadas.

Na base estática legada, `HARPIA_PROPERTY_VIDEO_URLS[codigo]` continua aceitando a string já prevista e também aceita `{ main: URL_REAL, videos: [OUTRAS_URLS_REAIS] }`. Esse mapa não recebeu URLs fictícias. Os links reais dos imóveis ainda precisam ser fornecidos/configurados. Sem vídeo, a página usa uma fotografia real existente, sem fingir reprodução.

## Dados e integrações preservados

Não houve alteração de banco, schema, autenticação, permissões, funções de backend, credenciais privadas, integrações operacionais ou conteúdo dos imóveis.

O leitor estático mantém a consulta pública já existente ao Supabase e os registros legados anteriormente publicados. Dados retornados pelo banco têm prioridade em caso de mesmo código/ID. Erros de consulta não são tratados como envio/conversão bem-sucedidos.

Os valores, características, despesas, descrições e avaliações Wellness do PDF não foram importados automaticamente para todos os imóveis. Existem divergências entre o exemplo do PDF e a base anterior; esta entrega é de apresentação, não uma alteração de informações comerciais. Campos ausentes permanecem ausentes ou indicados como não informados. O valor por m² é calculado a partir dos dados cadastrados.

Os relacionados usam somente registros reais disponíveis, sem duplicar um imóvel apenas para preencher a terceira coluna ilustrada no PDF.

Os CTAs estáticos preservam o destino WhatsApp que já existia, acrescentando contexto identificável do imóvel/ação. O adaptador React preserva os callbacks de conversão do sistema. Não foi enviada mensagem nem criado lead de teste na produção.

Destinos sociais estáticos são reaproveitados dos links existentes da homepage. Canal sem destino conhecido aparece como não configurado, sem inventar endereço de Instagram, e-mail ou YouTube.

## Testes efetivamente executados

1. Compilação TypeScript estrita do renderer com bibliotecas ES2022/DOM, noUnusedLocals, noUnusedParameters e emissão de declarações: PASSOU.
2. Análise sintática/transpilação isolada do adaptador TSX: PASSOU. Isso não equivale ao typecheck do aplicativo completo.
3. Análise sintática do JavaScript publicado: PASSOU.
4. Chromium offline: modal de imagem, mudança por teclado, Escape, restauração de foco e desbloqueio de rolagem: PASSOU.
5. Chromium offline: criação da URL de embed YouTube e remoção de iframe/player ao fechar ou alternar contexto: PASSOU. Transporte real do YouTube NÃO foi exercitado.
6. Carrossel independente do vídeo principal: PASSOU.
7. Larguras 360, 390, 768, 1025, 1440 e 1920 px: sem rolagem horizontal indevida da página nem sobreposição de características/galeria nos cenários testados.
8. Imóvel sem vídeo e imóvel sem mídia: fallback de foto real e estados vazios: PASSOU.
9. Conteúdo não confiável tratado como texto, sem inserção de HTML operacional: PASSOU.
10. Validação de URL, identificador YouTube e configuração de vídeo principal/adicionais: PASSOU.
11. Script de inicialização real com transporte isolado por fixtures: legado, prioridade do banco, código inexistente, código vazio e falha de rede: PASSOU.
12. Erros JavaScript não capturados no cenário de navegador testado: zero.
13. SHA dos arquivos recebidos pelo GitHub comparado ao conteúdo local testado: renderer TS, renderer JS, CSS, inicialização e adaptador coincidentes; HTML de publicação também coincidente.

Fixtures, imagens demonstrativas recortadas do PDF, fontes extraídas para comparação e registros temporários de teste foram mantidos exclusivamente no ambiente local. Não foram publicados nem gravados no Supabase.

## Limites e continuidade

- NÃO VERIFICADO: resposta HTTP e inspeção visual do domínio após o commit. A ferramenta de acesso web não conseguiu abrir a URL; isso não comprova indisponibilidade do site.
- NÃO VERIFICADO: carregamento remoto das fontes/logos oficiais no domínio, player real do YouTube e permissões de incorporação de vídeos ainda não enviados.
- NÃO VERIFICADO: `npm run build` e `npm run typecheck` do checkout completo React, por indisponibilidade de checkout/registry nesse ambiente. O renderer isolado foi compilado, mas não deve ser confundido com o bundle inteiro.
- NÃO VERIFICADO: fluxo autenticado completo de favoritos, editor de catálogo e conversão CRM/WhatsApp em produção.
- Nenhum GitHub Action foi disparado manualmente; nenhum workflow foi alterado; não houve merge na `main`.

Próxima validação: abrir a página publicada no domínio, confirmar assets oficiais e testar com os links reais do YouTube. Para a futura integração React, compilar o aplicativo completo fora de GitHub Actions e preservar a dependência Brandbook do PR #33.
