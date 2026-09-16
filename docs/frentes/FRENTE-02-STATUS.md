# Frente02 — Semáforo de execução

Data-base: 16/09/2026
Branch: `frente-02`

Este arquivo é o quadro executivo da Frente02 e deve ser mantido atualizado durante a produção.

## Legenda

- 🟢 CONCLUÍDO: implementado dentro da Frente02 e sem pendência de código desta frente para o item descrito.
- 🟠 PARCIAL / INTEGRAÇÃO: a parte da Frente02 existe, mas o funcionamento final depende de contrato, dado real, integração ou validação de outra frente.
- 🔴 NÃO CONCLUÍDO: ainda existe implementação ou validação relevante a fazer pela Frente02.

## Escopo e andamento

| Status | Item do escopo | Estado atual |
|---|---|---|
| 🟢 | Estrutura da home pública | Hero, posicionamento, catálogo publicado, serviços, estilo de vida, DUMU, jurídico, atendimento consultivo e captação de proprietário estruturados. |
| 🟢 | Menu público desktop | Sobre, Investimentos, Leilões, Assessoria Jurídica, Arquitetura, Área Interna e CTA de atendimento presentes. |
| 🟢 | Navegação mobile | `PublicExperience` cria menu mobile desacoplado, com rotas públicas, área do cliente, vender/alugar e Área Interna. |
| 🟢 | Páginas institucionais | Sobre, Investimentos, Leilões, Assessoria Jurídica e Arquitetura usam somente conteúdo disponível/aprovado, sem inventar portfólio. |
| 🟢 | Contrato consumidor do catálogo | `PublicCatalogReader`, tipos de item, mídia e filtros criados em `src/features/public-catalog/contracts.ts`. |
| 🟠 | Catálogo público com dados reais | UI, estados de carregamento/erro/vazio e cards existem; aguarda implementação real do catálogo publicado pela Frente03. |
| 🟠 | Busca e filtros públicos | Finalidade, cidade, localização, lançamento e faixa de preço estão implementados; opções reais dependem da Frente03. |
| 🟠 | Página de imóvel/produto | Galeria, vídeo, dados, status, empreendimento/unidade, favorito e CTA existem; conteúdo real depende da Frente03. |
| 🟢 | Estilo de vida | Componente consome `lifestyleTags` reais e mostra empty state quando não houver classificações. |
| 🟠 | Quero vender meu imóvel | Formulário, validação básica e payload de conversão existem; encaminhamento real para CRM/WhatsApp depende das Frentes04/05 e configuração final. |
| 🟠 | Quero alugar meu imóvel | Formulário, validação básica e payload de conversão existem; encaminhamento real para CRM/WhatsApp depende das Frentes04/05 e configuração final. |
| 🟠 | Retenção de comprador | Exit-intent e CTA existem; registro real do lead/atendimento depende do contrato da Frente04 e transporte final. |
| 🟠 | Login/cadastro acionado pelas ações públicas | A Frente02 já chama o `PublicAuthBridge`; implementação de autenticação e sessão pertence à Frente01. |
| 🟠 | Favoritos/salvos | UX e bridge de favoritos existem; persistência usuário + item depende da identidade da Frente01 e item real da Frente03. |
| 🟠 | Área do cliente final | Perfil, favoritos, interesses, histórico vazio, serviços e atendimento estruturados; identidade/persistência reais dependem da Frente01 e integrações. |
| 🟠 | Eventos de conversão para CRM | `PublicSiteConversion` carrega origem, ação, página, serviço, contato e imóvel; consumidor real depende da Frente04. |
| 🟢 | Zero mocks permanentes | Sem imóvel, usuário, métrica ou histórico fictício; ausência de dados gera empty state ou aviso de integração. |
| 🟢 | Tratamento de loading/erro/vazio | Catálogo e detalhe possuem estados explícitos; área do cliente e estilo de vida possuem empty states. |
| 🟠 | Responsividade | CSS responsivo e menu mobile implementados; validação visual real em navegador/dispositivos ainda não executada. |
| 🔴 | Montagem no bootstrap/roteador global | Não executada pela Frente02 porque `App.tsx`, roteador e providers globais pertencem à Frente01. O componente a montar é `PublicExperience`. |
| 🔴 | Build integrado e teste ponta a ponta | NÃO VERIFICADO enquanto a Frente02 não estiver montada no núcleo e contratos reais não estiverem conectados. |

## Arquivos funcionais principais

- `src/features/public-site/PublicSiteApp.tsx`
- `src/features/public-site/PublicExperience.tsx`
- `src/features/public-site/public-site.css`
- `src/features/public-site/public-experience.css`
- `src/features/public-catalog/contracts.ts`
- `src/features/client-area/ClientArea.tsx`

## Dependências formais

### Frente01

- montar `PublicExperience` no roteador/bootstrap público;
- fornecer `PublicAuthBridge` com cliente atual e abertura de login/cadastro;
- fornecer persistência de identidade necessária aos favoritos.

### Frente03

- fornecer `PublicCatalogReader` real com itens publicados e filtros dinâmicos.

### Frente04

- consumir `PublicSiteConversion` e criar/atualizar lead sem disparar mensagem automaticamente.

### Integração final

- encaminhamento real para WhatsApp;
- testes integrados de rotas, persistência, favoritos, formulários e responsividade.

## Prioridade imediata da Frente02

1. continuar revisão funcional dos componentes próprios;
2. preparar adaptação limpa para os contratos reais quando Frente01/03/04 expuserem as implementações;
3. não duplicar autenticação, catálogo ou CRM dentro da Frente02;
4. executar build e teste ponta a ponta após montagem pelo núcleo;
5. só então mudar o status para `PRONTA PARA INTEGRAÇÃO`.
