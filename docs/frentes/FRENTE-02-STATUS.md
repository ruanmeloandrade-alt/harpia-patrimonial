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
| 🟢 | Páginas institucionais | Sobre, Investimentos, Leilões, Assessoria Jurídica e Arquitetura usam somente conteúdo disponível/aprovado, sem inventar portfólio. |
| 🟢 | Entrypoint da Frente02 | `src/features/public-site/index.ts` expõe `PublicExperience`, contratos, adapters e manifesto das rotas públicas para a integração. |
| 🟢 | Contrato consumidor do catálogo | `PublicCatalogReader`, tipos de item, mídia e filtros criados em `src/features/public-catalog/contracts.ts`. |
| 🟢 | Adapter do catálogo da Frente03 | `createFront03PublicCatalogReader` adapta o contrato real já criado pela Frente03 (`name/kind/sale|rent/location`) ao view model público da Frente02 sem alterar o domínio da Frente03. |
| 🟠 | Catálogo público com dados reais | UI e adapter estão prontos; o serviço real existe na branch `frente-03`, mas ainda precisa ser integrado/instanciado no produto conjunto. |
| 🟠 | Busca e filtros públicos | Finalidade, cidade, localização, lançamento e faixa de preço estão implementados e mapeados ao contrato real da Frente03; falta integração conjunta e teste com dados publicados reais. |
| 🟠 | Página de imóvel/produto | Galeria, vídeo, dados, status, empreendimento/unidade, favorito e CTA existem; falta integração conjunta com item publicado real. |
| 🟢 | Estilo de vida | Componente consome `lifestyleTags` reais e mostra empty state quando não houver classificações. |
| 🟢 | Captura de contato para CTAs anônimos | `PublicExperience` intercepta conversões sem contato e abre modal que exige nome + WhatsApp e aceita e-mail opcional antes de encaminhar ao CRM. |
| 🟠 | Quero vender meu imóvel | Formulário, validação básica e payload de conversão existem; criação de lead está mapeada à Frente04, mas encaminhamento real para WhatsApp fica para a integração final. |
| 🟠 | Quero alugar meu imóvel | Formulário, validação básica e payload de conversão existem; criação de lead está mapeada à Frente04, mas encaminhamento real para WhatsApp fica para a integração final. |
| 🟠 | Retenção de comprador | Exit-intent, CTA e captura de contato estão prontos; falta ligar a execução ao CRM integrado e transporte final. |
| 🟢 | Adapter de conversão da Frente04 | `createFront04ConversionHandler` converte `PublicSiteConversion` no contrato real `LeadConversionEvent`, preserva contexto e garante `automaticMessageSent: false`. |
| 🟢 | Adapter de autenticação da Frente01 | `createFront01PublicAuthBridge` usa o `AuthContext` real da Frente01 e não cria segunda sessão/autenticação. |
| 🟠 | Login/cadastro acionado pelas ações públicas | O bridge real está pronto; a Frente01 já possui autenticação/páginas, mas o roteamento integrado e a abertura efetiva de login/cadastro ainda dependem do merge. |
| 🟠 | Favoritos/salvos | UX e bridge de favoritos existem; a persistência final usuário + item ainda precisa ser conectada às camadas reais no produto integrado. |
| 🟠 | Área do cliente final | Perfil, favoritos, interesses, histórico vazio, serviços e atendimento estruturados; bridge de identidade está pronto, mas persistência e navegação integradas ainda precisam do merge. |
| 🟢 | Eventos de conversão produzidos pela Frente02 | Origem, ação, página, serviço, contato, imóvel e metadados são preservados; CTAs sem contato passam pela captura antes do envio. |
| 🟢 | Zero mocks permanentes | Sem imóvel, usuário, métrica ou histórico fictício; ausência de dados gera empty state ou aviso de integração. |
| 🟢 | Tratamento de loading/erro/vazio | Catálogo e detalhe possuem estados explícitos; área do cliente e estilo de vida possuem empty states. |
| 🟠 | Responsividade | CSS responsivo, menu mobile e modal de contato responsivo implementados; validação visual real em navegador/dispositivos ainda não executada. |
| 🟠 | Montagem no bootstrap/roteador global | A Frente02 entregou `PublicExperience`, adapters e `publicRouteManifest`; a montagem em `App.tsx`/roteador é propriedade da Frente01 e ainda não está integrada. |
| 🔴 | Build integrado e teste ponta a ponta | NÃO VERIFICADO enquanto as branches não forem integradas e os contratos reais não estiverem instanciados no mesmo build. |
| 🔴 | Teste visual real desktop/mobile | NÃO VERIFICADO no produto integrado. O CSS foi implementado, mas não será marcado como validado sem execução real. |

## Arquivos funcionais principais

- `src/features/public-site/PublicSiteApp.tsx`
- `src/features/public-site/PublicExperience.tsx`
- `src/features/public-site/index.ts`
- `src/features/public-site/front01AuthAdapter.ts`
- `src/features/public-site/front04ConversionAdapter.ts`
- `src/features/public-site/public-site.css`
- `src/features/public-site/public-experience.css`
- `src/features/public-catalog/contracts.ts`
- `src/features/public-catalog/front03Adapter.ts`
- `src/features/client-area/ClientArea.tsx`

## Dependências formais

### Frente01

A Frente01 já possui `AuthProvider`, `useAuth`, perfil de cliente e roteador próprios. A Frente02 já entregou o adapter. Falta no produto integrado:

- montar `PublicExperience` nas rotas públicas;
- usar `createFront01PublicAuthBridge` com o estado real de `useAuth()`;
- definir no integrador a navegação para login/cadastro quando `requestLogin` for chamado;
- conectar a persistência final de favoritos à identidade real.

### Frente03

A Frente03 já possui `PublicCatalogService` e tipos reais. A Frente02 já entregou `createFront03PublicCatalogReader` para compatibilizar os dois contratos sem duplicar catálogo. Falta instanciar esse adapter após o merge.

### Frente04

A Frente04 já possui `LeadConversionEvent` e `ingestLeadConversion`. A Frente02 já entregou `createFront04ConversionHandler` e captura de contato anônimo. Falta instanciar o handler após o merge com o serviço real do CRM.

### Integração final

- encaminhamento real para WhatsApp;
- persistência final de favoritos;
- testes integrados de rotas, autenticação, catálogo, conversão, formulários e responsividade.

## Prioridade imediata da Frente02

1. revisar os componentes próprios contra os contratos reais já expostos pelas Frentes01/03/04;
2. manter adapters de integração sem invadir os domínios das outras frentes;
3. preparar handoff exato para o integrador;
4. após o merge, executar build e fluxo ponta a ponta;
5. corrigir qualquer regressão encontrada na integração;
6. só então mudar o status para `PRONTA PARA INTEGRAÇÃO`/`INTEGRADA` conforme os critérios do projeto.
