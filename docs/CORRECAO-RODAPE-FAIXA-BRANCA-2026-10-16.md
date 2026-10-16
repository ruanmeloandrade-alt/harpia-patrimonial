# Correção da faixa branca no rodapé

Data: 16/10/2026.
Solicitação: remover a faixa clara inferior que cortava as últimas frases do rodapé, sem redesenhar a página.

## Causa reproduzida e alteração

O rodapé desktop tinha altura fixa de `calc(675.14 * var(--u))`. Nos testes com as fontes oficiais, a última linha ultrapassava o fundo verde em 3,81 a 5,23 pixels, deixando o fundo claro da página aparecer atrás do texto.

A correção mantém a altura mínima de referência, mas permite ao rodapé crescer conforme o conteúdo. Acrescenta 24 pixels de espaço inferior, respeita a área segura do dispositivo e permite quebra dos créditos quando necessário. Nenhum texto foi removido ou ocultado.

Foi acrescentado exclusivamente o bloco `style#harpia-footer-overflow-fix` no `index.html` da `gh-pages`. O HTML anterior, os scripts, o CSS original, as seções, os links, o mapa, os dados e as integrações permanecem byte a byte preservados fora desse bloco. A ponte do rodapé compartilhado nas páginas de imóvel também consome o novo estilo da home.

## Publicação

Commit: `62fb563b7174c7a91df5da0f150af4d4f913a78f`.
Blob do HTML: `3b8f67c81d56db6bb3076ff0641f5829a5b1d070`, idêntico ao arquivo local preparado e conferido.
GitHub Pages: execução existente automática `38922105107`, com build, deploy e report-build-status concluídos com sucesso.
Nenhum workflow foi criado, editado ou disparado manualmente. Nenhuma alteração na main ou no backend.

## Verificação

- Chromium local: larguras 360, 390, 768, 1080, 1366, 1536 e 1920 px.
- Em todas, a última linha fica dentro do fundo verde, com 24 pixels de margem inferior.
- Posição inicial do rodapé inalterada; sem deslocar as seções acima.
- Largura total da página não ultrapassa a viewport nos cenários testados.
- Rodapé compartilhado via módulo existente e Shadow DOM testado em 390, 1080 e 1920 px: mesmo espaço inferior, conteúdo do imóvel preservado e desmontagem sem elementos remanescentes.
- Nenhum PNG, mapa substituto ou dado de teste foi publicado.

NÃO VERIFICADO: inspeção direta do domínio nesta sessão. A navegação do Chromium é bloqueada por política do ambiente e a ferramenta web não conseguiu abrir a URL. Testes de apresentação executados com os arquivos reais em ambiente local; recursos de rede externos isolados. A confirmação da implantação vem do GitHub Pages, não de uma alegação de inspeção remota.
