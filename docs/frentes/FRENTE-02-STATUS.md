# Frente02 — Semáforo de execução

Data-base: 16/09/2026
Branch: `frente-02`

## Legenda

- 🟢 CONCLUÍDO: implementado dentro da Frente02 e sem pendência de código desta frente para o item descrito.
- 🟠 PARCIAL / INTEGRAÇÃO: a parte da Frente02 existe, mas o funcionamento final depende de merge, dado real, integração ou validação de outra frente.
- 🔴 NÃO CONCLUÍDO: ainda existe implementação ou validação relevante a executar antes de considerar a experiência integrada pronta.

## Escopo e andamento

| Status | Item do escopo | Estado atual |
|---|---|---|
| 🟢 | Home pública | Hero, posicionamento, serviços, catálogo, estilo de vida, DUMU, jurídico, atendimento e captação estruturados. |
| 🟢 | Busca rápida na home | Finalidade, cidade, localização e estilo de vida usam opções reais do catálogo e levam os filtros para a URL do catálogo. |
| 🟢 | Menu desktop/mobile | Navegação pública, área do cliente, vender/alugar e Área Interna estruturadas. |
| 🟢 | Sincronização com roteador | `history.pushState`/`replaceState` sincronizados com a navegação global. |
| 🟢 | 404 pública | Rota pública inválida recebe fallback próprio em vez de tela vazia. |
| 🟢 | Metadados por rota | `document.title` e meta description atualizados por página. |
| 🟢 | Acessibilidade de overlays | Foco, Escape, `aria-*` e scroll lock em menu, captura e retenção. |
| 🟢 | Páginas institucionais | Sobre, Investimentos, Leilões, Assessoria Jurídica e Arquitetura sem conteúdo fictício. |
| 🟢 | Entrypoint/handoff | `index.ts` expõe experiência, contratos, adapters, hooks, pipeline e manifesto de rotas. |
| 🟢 | Contrato público do catálogo | Itens, mídia, filtros, estilo de vida e opções globais definidos. |
| 🟢 | Adapter Frente03 | Contrato real da Frente03 adaptado sem duplicar domínio. |
| 🟢 | Empreendimento/unidade | Unidade resolve `parentId` pelo serviço real e exibe nome do empreendimento-pai quando publicado. |
| 🟠 | Catálogo com dados reais no produto integrado | UI e adapter prontos; falta instanciar o serviço da Frente03 após merge. |
| 🟢 | Filtros completos | Finalidade, cidade, localização, lançamento, preço e estilo de vida implementados. |
| 🟢 | Filtros compartilháveis | Query persiste em URL e suporta refresh/compartilhamento. |
| 🟠 | Teste dos filtros com dados reais | Falta executar no produto conjunto. |
| 🟠 | Página de imóvel integrada | Galeria, vídeo, status, empreendimento/unidade, favorito e CTA prontos; falta validar com item real integrado. |
| 🟢 | Estilo de vida | Tags reais levam diretamente ao catálogo filtrado. |
| 🟢 | Captura anônima | Nome + WhatsApp obrigatórios; e-mail opcional; nada fictício. |
| 🟢 | Vender/alugar — interface | Estados `idle/busy/success/error`; sucesso só aparece quando a conversão foi aceita. |
| 🟠 | Vender/alugar — fluxo final | Falta instanciar CRM e WhatsApp real no produto conjunto. |
| 🟠 | Retenção de comprador | Exit-intent, modal acessível, captura e evento prontos; falta pipeline integrado. |
| 🟢 | Adapter Frente04 | Conversão pública → `LeadConversionEvent`, sem envio automático de mensagem. |
| 🟢 | Pipeline CRM → WhatsApp | CRM precisa concluir antes do redirecionamento. |
| 🟢 | Continuação para WhatsApp | `wa.me` contextual preparado sem telefone fictício; número vem da configuração real. |
| 🟢 | Adapter Frente01 | Reutiliza sessão/perfil reais da Frente01. |
| 🟠 | Login/cadastro integrado | Rotas reais `/entrar` e `/cadastro` já identificadas; falta composição no roteador global. |
| 🟢 | Bridge de favoritos | Cliente real + item real + `PublicFavoritesStorePort`, sem `localStorage`. |
| 🟠 | Persistência definitiva de favoritos | Falta store/tabela real compartilhada com RLS/autorização. |
| 🟢 | Área do cliente — interface | Perfil, favoritos, serviços, interesses e histórico têm componentes, loading, erro e empty states. |
| 🟢 | Porta de interesses/histórico | `useClientAreaData` aceita qualquer fonte real por `clientId` sem acoplar a tela ao CRM. |
| 🟠 | Área do cliente com dados persistidos reais | Falta fonte integrada de favoritos/interesses/histórico. |
| 🟢 | Zero mocks permanentes | Ausência de dados gera estado vazio/erro real. |
| 🟢 | Loading/erro/vazio | Cobertura explícita nas principais jornadas. |
| 🟠 | Responsividade | Código responsivo pronto; falta teste visual real desktop/mobile. |
| 🟠 | Montagem no bootstrap global | `PublicExperience` e handoff prontos; montagem pertence à Frente01/integrador. |
| 🔴 | Build integrado e E2E | NÃO VERIFICADO até merge e execução no Node `>=24 <25` exigido pelo projeto. |
| 🔴 | Teste visual real | NÃO VERIFICADO sem execução no produto integrado. |

## Arquivos funcionais principais

- `src/features/public-site/PublicSiteApp.tsx`
- `src/features/public-site/PublicExperience.tsx`
- `src/features/public-site/HomeCatalogSearch.tsx`
- `src/features/public-site/index.ts`
- `src/features/public-site/catalogQuery.ts`
- `src/features/public-site/conversionPipeline.ts`
- `src/features/public-site/front01AuthAdapter.ts`
- `src/features/public-site/front04ConversionAdapter.ts`
- `src/features/public-site/whatsappContinuation.ts`
- `src/features/public-site/usePublicFavoritesBridge.ts`
- `src/features/public-catalog/contracts.ts`
- `src/features/public-catalog/front03Adapter.ts`
- `src/features/client-area/ClientArea.tsx`
- `src/features/client-area/useClientAreaData.ts`
- `docs/frentes/FRENTE-02-INTEGRACAO.md`

## Dependências formais restantes

### Frente01 / integrador

- montar `PublicExperience` no `AppRouter` substituindo o placeholder público;
- manter `/entrar`, `/cadastro`, `/conta` e `/interno/**` sob o núcleo;
- ligar `createFront01PublicAuthBridge`;
- definir e persistir o store real de favoritos associado ao usuário autenticado.

### Frente03 / integrador

- instanciar `createFront03PublicCatalogReader` sobre o `PublicCatalogService` real;
- validar catálogo, filtros e detalhes com dados publicados reais.

### Frente04 / integrador

- instanciar `createFront04ConversionHandler` sobre o CRM real;
- fornecer, quando disponível, fonte real de interesses/histórico vinculada ao cliente.

### Integração final

- obter telefone real da configuração da organização e configurar `createWhatsAppContinuation`;
- executar build/typecheck no Node correto;
- testar rotas, auth, catálogo, favoritos, CRM, WhatsApp e responsividade.

## Próximo passo da Frente02

1. continuar pente-fino apenas em código próprio;
2. manter contratos/handoff sincronizados com as outras frentes;
3. não duplicar banco, auth, catálogo ou CRM;
4. após merge, executar testes reais e corrigir regressões;
5. só alterar para `PRONTA PARA INTEGRAÇÃO`/`INTEGRADA` após validação real.
