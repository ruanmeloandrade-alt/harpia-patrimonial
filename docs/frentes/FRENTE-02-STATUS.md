# Frente02 — Semáforo de execução

Data-base: 16/09/2026
Branch: `frente-02`

Este arquivo é o quadro executivo da Frente02 e deve ser mantido atualizado durante a produção.

## Legenda

- 🟢 CONCLUÍDO: implementado dentro da Frente02 e sem pendência de código desta frente para o item descrito.
- 🟠 PARCIAL / INTEGRAÇÃO: a parte da Frente02 existe, mas o funcionamento final depende de merge, dado real, integração ou validação de outra frente.
- 🔴 NÃO CONCLUÍDO: ainda existe implementação ou validação relevante a executar antes de considerar a experiência integrada pronta.

## Escopo e andamento

| Status | Item do escopo | Estado atual |
|---|---|---|
| 🟢 | Estrutura da home pública | Hero, posicionamento, catálogo publicado, serviços, estilo de vida, DUMU, jurídico, atendimento consultivo e captação de proprietário estruturados. |
| 🟢 | Menu público desktop | Sobre, Investimentos, Leilões, Assessoria Jurídica, Arquitetura, Área Interna e CTA de atendimento presentes. |
| 🟢 | Navegação mobile | `PublicExperience` cria menu mobile desacoplado, com rotas públicas, área do cliente, vender/alugar e Área Interna. |
| 🟢 | Sincronização com roteador global | `PublicExperience` sincroniza `history.pushState`/`replaceState` com evento de localização para que o RouterProvider da Frente01 não fique defasado durante navegação pública. A tipagem isolada dessa instrumentação foi verificada com TypeScript. |
| 🟢 | Fallback de rota pública inválida | Rotas não pertencentes ao manifesto público recebem tela de página não encontrada com retorno para início/catálogo, em vez de tela vazia. |
| 🟢 | Metadados por rota | Título e descrição da página são atualizados para home, catálogo, institucionais, captação, cliente, detalhe e 404. |
| 🟢 | Acessibilidade de overlays | Menu mobile, captura de contato e retenção tratam foco, Escape, `aria-*` e bloqueio/restauração de scroll durante overlay. |
| 🟢 | Páginas institucionais | Sobre, Investimentos, Leilões, Assessoria Jurídica e Arquitetura usam somente conteúdo disponível/aprovado, sem inventar portfólio. |
| 🟢 | Entrypoint da Frente02 | `src/features/public-site/index.ts` expõe `PublicExperience`, contratos, adapters, pipeline e manifesto das rotas públicas para a integração. |
| 🟢 | Contrato consumidor do catálogo | `PublicCatalogReader`, tipos de item, mídia, filtros e opções globais de filtro criados em `src/features/public-catalog/contracts.ts`. |
| 🟢 | Adapter do catálogo da Frente03 | `createFront03PublicCatalogReader` adapta o contrato real da Frente03 ao view model público sem alterar o domínio da Frente03. |
| 🟢 | Relação empreendimento/unidade | Quando o item é unidade, o adapter resolve o `parentId` pelo serviço público real da Frente03 e preenche o nome do empreendimento-pai sem dado fictício. |
| 🟠 | Catálogo público com dados reais | UI e adapter estão prontos; o serviço real existe na branch `frente-03`, mas ainda precisa ser integrado/instanciado no produto conjunto. |
| 🟢 | Busca e filtros públicos — código da Frente02 | Finalidade, cidade, localização, lançamento, faixa de preço e estilo de vida estão implementados com opções estáveis do catálogo e não desaparecem conforme o usuário filtra. |
| 🟢 | Filtros compartilháveis | Estado de busca é serializado na URL (`finalidade`, `cidade`, `localizacao`, `lancamento`, preço e estilo), permitindo refresh e compartilhamento do filtro. |
| 🟠 | Busca/filtros com dados reais integrados | Falta executar no produto conjunto com o `PublicCatalogService` real da Frente03 e dados publicados reais. |
| 🟠 | Página de imóvel/produto | Galeria, vídeo, dados, status, relação empreendimento/unidade, favorito e CTA existem; falta validação conjunta com item publicado real. |
| 🟢 | Estilo de vida | Componente consome `lifestyleTags` reais, leva o filtro escolhido para `/imoveis?estilo=...` e mostra empty state quando não houver classificações. |
| 🟢 | Captura de contato para CTAs anônimos | `PublicExperience` intercepta conversões sem contato e abre modal que exige nome + WhatsApp e aceita e-mail opcional antes de encaminhar ao CRM. |
| 🟢 | Estado real dos formulários vender/alugar | Formulários têm `idle/busy/success/error`, só mostram sucesso se a conversão for aceita e não simulam registro quando o CRM não está conectado. |
| 🟠 | Quero vender meu imóvel — fluxo integrado | Formulário e contexto estão prontos; criação de lead está mapeada à Frente04 e continuação para WhatsApp está preparada, faltando número/configuração real no produto integrado. |
| 🟠 | Quero alugar meu imóvel — fluxo integrado | Formulário e contexto estão prontos; criação de lead está mapeada à Frente04 e continuação para WhatsApp está preparada, faltando número/configuração real no produto integrado. |
| 🟠 | Retenção de comprador | Exit-intent, modal acessível, captura de contato e evento estão prontos; falta instanciar CRM + continuação final no produto integrado. |
| 🟢 | Adapter de conversão da Frente04 | `createFront04ConversionHandler` converte `PublicSiteConversion` no contrato real `LeadConversionEvent`, preserva contexto e garante `automaticMessageSent: false`. |
| 🟢 | Pipeline CRM → WhatsApp | `createPublicConversionPipeline` garante captura no CRM antes da continuação externa; se a captura falha, o redirecionamento não acontece. |
| 🟢 | Continuação contextual para WhatsApp | `createWhatsAppContinuation` monta `wa.me` com contexto real e exige que o integrador forneça o número real; nenhum telefone fictício fica no código. |
| 🟢 | Adapter de autenticação da Frente01 | `createFront01PublicAuthBridge` usa o `AuthContext` real da Frente01 e não cria segunda sessão/autenticação. |
| 🟠 | Login/cadastro acionado pelas ações públicas | O bridge real está pronto; a Frente01 já possui autenticação/páginas, mas o roteamento integrado e a abertura efetiva de login/cadastro ainda dependem do merge. |
| 🟢 | Bridge de favoritos da Frente02 | `usePublicFavoritesBridge` liga cliente real + item real a um `PublicFavoritesStorePort`, carrega itens publicados e salva/remove sem usar `localStorage`. |
| 🟠 | Persistência definitiva de favoritos | Falta o store/tabela real no produto integrado. O schema atual da Frente01 ainda não possui a persistência compartilhada e a Frente02 não cria tabela paralela por conta própria. |
| 🟠 | Área do cliente final | Perfil, favoritos, interesses, histórico vazio, serviços e atendimento estruturados; bridge de identidade/favoritos está pronto, mas dados persistidos e navegação integrados ainda precisam do merge. |
| 🟢 | Eventos de conversão produzidos pela Frente02 | Origem, ação, página, serviço, contato, imóvel e metadados são preservados; CTAs sem contato passam pela captura antes do envio. |
| 🟢 | Zero mocks permanentes | Sem imóvel, usuário, métrica ou histórico fictício; ausência de dados gera empty state ou aviso de integração. |
| 🟢 | Tratamento de loading/erro/vazio | Catálogo e detalhe possuem estados explícitos; área do cliente e estilo de vida possuem empty states. |
| 🟠 | Responsividade | CSS responsivo, menu mobile, modal de contato, filtros, formulário e fallback de rota implementados; validação visual real em navegador/dispositivos ainda não executada. |
| 🟠 | Montagem no bootstrap/roteador global | A Frente02 entregou `PublicExperience`, adapters, pipeline, `publicRouteManifest` e handoff; a montagem em `App.tsx`/roteador é propriedade da Frente01 e ainda não está integrada. |
| 🔴 | Build integrado e teste ponta a ponta | NÃO VERIFICADO enquanto as branches não forem integradas e os contratos reais não estiverem instanciados no mesmo build. O projeto integrado exige Node `>=24 <25`; o ambiente isolado disponível para conferência está em Node 22 e não será usado para alegar build válido. |
| 🔴 | Teste visual real desktop/mobile | NÃO VERIFICADO no produto integrado. O CSS foi implementado, mas não será marcado como validado sem execução real. |

## Arquivos funcionais principais

- `src/features/public-site/PublicSiteApp.tsx`
- `src/features/public-site/PublicExperience.tsx`
- `src/features/public-site/index.ts`
- `src/features/public-site/catalogQuery.ts`
- `src/features/public-site/conversionPipeline.ts`
- `src/features/public-site/front01AuthAdapter.ts`
- `src/features/public-site/front04ConversionAdapter.ts`
- `src/features/public-site/whatsappContinuation.ts`
- `src/features/public-site/usePublicFavoritesBridge.ts`
- `src/features/public-site/public-site.css`
- `src/features/public-site/public-experience.css`
- `src/features/public-site/public-polish.css`
- `src/features/public-catalog/contracts.ts`
- `src/features/public-catalog/front03Adapter.ts`
- `src/features/client-area/ClientArea.tsx`
- `docs/frentes/FRENTE-02-INTEGRACAO.md`

## Dependências formais

### Frente01

A Frente01 já possui `AuthProvider`, `useAuth`, perfil de cliente e roteador próprios. A Frente02 já entregou o adapter. Falta no produto integrado:

- montar `PublicExperience` nas rotas públicas;
- usar `createFront01PublicAuthBridge` com o estado real de `useAuth()`;
- definir no integrador a navegação para login/cadastro quando `requestLogin` for chamado;
- fornecer um store persistente real compatível com `PublicFavoritesStorePort` vinculado ao usuário autenticado.

### Frente03

A Frente03 já possui `PublicCatalogService` e tipos reais. A Frente02 já entregou `createFront03PublicCatalogReader`, incluindo filtros globais, estilo de vida e resolução do empreendimento-pai. Falta instanciar esse adapter após o merge e validar com dados publicados reais.

### Frente04

A Frente04 já possui `LeadConversionEvent` e `ingestLeadConversion`. A Frente02 já entregou `createFront04ConversionHandler`, captura de contato anônimo e `createPublicConversionPipeline`. Falta instanciar o handler após o merge com o serviço real do CRM.

### Integração final

- informar o número real da Hárpia para `createWhatsAppContinuation`;
- fornecer o store/tabela real de favoritos;
- testes integrados de rotas, autenticação, catálogo, conversão, formulários, WhatsApp e responsividade.

## Prioridade imediata da Frente02

1. revisar a camada pública em busca de pendências próprias que ainda possam ser concluídas sem merge;
2. manter o handoff alinhado às implementações reais das Frentes01/03/04;
3. não duplicar autenticação, catálogo, CRM ou persistência compartilhada dentro da Frente02;
4. após o merge, executar build e fluxo ponta a ponta em Node compatível com o projeto;
5. testar desktop/mobile e corrigir regressões de integração;
6. só então mudar o status para `PRONTA PARA INTEGRAÇÃO`/`INTEGRADA` conforme os critérios do projeto.
