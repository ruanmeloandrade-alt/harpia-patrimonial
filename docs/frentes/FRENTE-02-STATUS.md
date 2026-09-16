# Frente02 — Semáforo de execução

Data-base: 16/09/2026
Branch: `frente-02`
Estado executivo: AGUARDANDO INTEGRAÇÃO / VALIDAÇÃO REAL

## Legenda

- 🟢 CONCLUÍDO: implementado dentro da Frente02 e sem pendência de código desta frente para o item descrito.
- 🟠 PARCIAL / INTEGRAÇÃO: a parte da Frente02 existe, mas o funcionamento final depende de merge, dado real, integração ou validação de outra frente.
- 🔴 NÃO CONCLUÍDO: validação obrigatória ainda não executada ou requisito final dependente do produto integrado.

## Escopo e andamento

| Status | Item do escopo | Estado atual |
|---|---|---|
| 🟢 | Home pública | Hero, posicionamento, serviços, catálogo, estilo de vida, DUMU, jurídico, atendimento e captação estruturados. |
| 🟢 | Busca rápida na home | Finalidade, cidade, localização e estilo de vida usam opções reais do catálogo e levam filtros para a URL. |
| 🟢 | Menu desktop/mobile | Navegação pública, Minha conta, área do cliente, vender/alugar e Área Interna estruturadas. |
| 🟢 | Sincronização com roteador | `history.pushState`/`replaceState` sincronizados com a navegação global. |
| 🟢 | 404 pública | Rota pública inválida recebe fallback próprio. |
| 🟢 | Metadados por rota | `document.title` e meta description atualizados por página. |
| 🟢 | Acessibilidade de overlays | Foco, Escape, `aria-*` e scroll lock em menu, captura e retenção. |
| 🟢 | Páginas institucionais | Sobre, Investimentos, Leilões, Assessoria Jurídica e Arquitetura sem conteúdo fictício. |
| 🟢 | Entrypoint/handoff | `index.ts` expõe experiência, shell, contratos, adapters, hooks, pipeline e manifesto de rotas. |
| 🟢 | Shell único de integração | `Front02IntegrationShell` recebe ports reais das outras frentes e compõe Auth, catálogo, CRM, favoritos, dados do cliente e WhatsApp sem duplicar domínio. |
| 🟢 | Contrato público do catálogo | Itens, mídia, filtros, estilo de vida e opções globais definidos. |
| 🟢 | Adapter Frente03 | Contrato real da Frente03 adaptado sem duplicar domínio. |
| 🟢 | Tipologia real | `typology` da Frente03 é usada como tipo público quando disponível; fallback continua honesto por `kind`. |
| 🟢 | Empreendimento/unidade | Unidade resolve `parentId` pelo serviço real e exibe nome do empreendimento-pai quando publicado. |
| 🟠 | Catálogo com dados reais no produto integrado | UI e adapter prontos; falta instanciar o serviço real após merge. |
| 🟢 | Filtros completos | Finalidade, cidade, localização, lançamento, preço e estilo de vida implementados. |
| 🟢 | Sanitização de filtros | Query inválida é normalizada; números negativos/NaN e valor inválido de lançamento não entram no contrato. |
| 🟢 | Filtros compartilháveis | Query persiste em URL e suporta refresh/compartilhamento. |
| 🟠 | Teste dos filtros com dados reais | Falta executar no produto conjunto. |
| 🟠 | Página de imóvel integrada | Galeria, vídeo, status, tipologia, empreendimento/unidade, favorito, CTA e serviços relacionados prontos; falta validar com item real integrado. |
| 🟢 | Serviços relacionados no imóvel | Investimentos, Assessoria Jurídica e Arquitetura aparecem como rotas reais, sem ofertas fictícias. |
| 🟢 | Estilo de vida | Tags reais levam diretamente ao catálogo filtrado. |
| 🟢 | Captura anônima | Nome + WhatsApp obrigatórios; e-mail opcional; nada fictício. |
| 🟢 | Vender/alugar — interface | Estados `idle/busy/success/error`; sucesso só aparece quando a conversão foi aceita. |
| 🟠 | Vender/alugar — fluxo final | Falta instanciar CRM e WhatsApp oficial no produto conjunto. |
| 🟠 | Retenção de comprador | Exit-intent, modal acessível, captura e evento prontos; falta pipeline integrado. |
| 🟢 | Adapter Frente04 | Conversão pública → `LeadConversionEvent`, sem envio automático de mensagem. |
| 🟢 | Bloqueio sem contato | Sem contato válido o adapter falha explicitamente e impede continuação externa. |
| 🟢 | Pipeline CRM → WhatsApp | CRM precisa concluir antes do redirecionamento. |
| 🟢 | Continuação para WhatsApp | `wa.me` contextual preparado sem telefone fictício; telefone exige formato internacional válido. |
| 🟢 | Adapter Frente01 | Reutiliza sessão/perfil reais da Frente01 e consome `user.id` como identidade para dados persistentes. |
| 🟢 | Compatibilidade com Auth real da Frente01 | Contrato atual `src/core/auth/index.ts`/`AuthContextValue` conferido; `useAuth`, `ClientRoute`, `InternalRoute`, usuário, perfil e sessão permanecem compatíveis com o adapter da Frente02. O backend dedicado da Hárpia já está ativo e com RLS/migrations do núcleo aplicados. |
| 🟠 | Login/cadastro integrado | Auth/backend da Frente01 já estão estruturados; ainda falta montar a experiência da Frente02 no `AppRouter` e executar login/cadastro no produto conjunto. |
| 🟢 | Bridge de favoritos | Cliente real + item real + `PublicFavoritesStorePort`, sem `localStorage`. |
| 🟢 | Estados de favoritos | Carregamento, falha, retry e atualização sem promise rejeitada solta estão tratados na camada F2. |
| 🟠 | Persistência definitiva de favoritos | O backend compartilhado agora existe, mas a tabela/store real de favoritos ainda não foi definida/aplicada. |
| 🟢 | Área do cliente — interface | Perfil, favoritos, serviços, interesses e histórico têm dados/loading/erro/empty state. |
| 🟢 | Retry da área do cliente | Falha em favoritos/interesses/histórico expõe tentativa de recarga real. |
| 🟢 | Porta de interesses/histórico | `useClientAreaData` aceita qualquer fonte real por `clientId` sem acoplar a tela ao CRM. |
| 🟠 | Área do cliente com dados persistidos reais | Auth/identidade real já existem; ainda falta persistência/fonte real de favoritos, interesses e histórico e montagem da área no fluxo integrado. |
| 🟢 | Zero mocks permanentes | Ausência de dados gera estado vazio/erro real. |
| 🟢 | Loading/erro/vazio | Cobertura explícita nas principais jornadas. |
| 🟠 | Responsividade | Código responsivo pronto; falta teste visual real desktop/mobile. |
| 🟠 | Montagem no bootstrap global | `AppRouter` da Frente01 ainda renderiza `PublicPlaceholder` em `/` e `ClientAccountShell` próprio em `/conta`; falta substituir/compor esses pontos com a Frente02 durante integração. |
| 🔴 | Build integrado e E2E | NÃO VERIFICADO até merge e execução no Node `>=24 <25` exigido pelo projeto. |
| 🔴 | Teste visual real | NÃO VERIFICADO sem execução no produto integrado. |

## Independências da Frente02

No pente-fino atual não restou implementação funcional conhecida que possa ser concluída isoladamente sem:

- montar os módulos no roteador/bootstrap compartilhado;
- definir/aplicar persistência compartilhada ainda ausente, principalmente favoritos;
- instanciar serviços reais das Frentes03/04;
- executar o produto integrado em ambiente compatível.

O avanço recente da Frente01 removeu o bloqueio de inexistência do backend: o projeto Supabase dedicado da Hárpia está ativo e o contrato Auth foi novamente conferido como compatível. O bloqueio referente à Frente01 ficou reduzido à composição real no `AppRouter`, testes de autenticação no produto conjunto e persistência compartilhada que ainda não existe.

## Arquivos funcionais principais

- `src/features/public-site/Front02IntegrationShell.tsx`
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

Resolvido/confirmado:

- backend Supabase dedicado da Hárpia ativo;
- migrations/RLS do núcleo aplicados;
- contrato público Auth estável e compatível com o adapter da Frente02.

Ainda pendente:

- montar `Front02IntegrationShell`/`PublicExperience` no `AppRouter` substituindo o `PublicPlaceholder`;
- decidir composição de `/conta` (`ClientRoute`) com a área rica da Frente02 sem duplicar experiência;
- definir/aplicar persistência real de favoritos associada ao usuário autenticado;
- executar cadastro/login/logout/sessão/guardas com a Frente02 montada.

### Frente03 / integrador

- instanciar `createFront03PublicCatalogReader` sobre o `PublicCatalogService` real;
- validar catálogo, tipologia, filtros e detalhes com dados publicados reais.

### Frente04 / integrador

- instanciar `createFront04ConversionHandler` sobre o CRM real;
- fornecer, quando disponível, fonte real de interesses/histórico vinculada ao cliente.

### Integração final

- obter telefone oficial em formato internacional e configurar `createWhatsAppContinuation`;
- executar build/typecheck no Node correto;
- testar rotas, auth, catálogo, favoritos, CRM, WhatsApp e responsividade.

## Próximo passo da Frente02

Referente à Frente01, o backend/Auth já não bloqueiam preparação adicional. O próximo passo exige composição compartilhada no `AppRouter`/merge. Assim que esse ponto estiver montado, a Frente02 deve executar QA de login/cadastro/conta/rotas e corrigir regressões próprias. Paralelamente continuam as integrações com Frente03 e Frente04.