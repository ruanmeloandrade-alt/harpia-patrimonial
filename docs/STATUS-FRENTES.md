# Hárpia Patrimonial — Status das 5 Frentes

Atualizar este arquivo ao iniciar e ao concluir blocos relevantes.

## Frente01 — Núcleo/Auth/Usuários/Permissões

- Branch: `frente-01`
- Status nesta cópia: **CONCLUÍDA ESTRUTURALMENTE + QA BACKEND AUTH/RBAC APROVADO — F02/F03/F04/F05 LIBERADAS**.
- 🟢 Para a Frente03 já entregou: Supabase dedicado, auth/RBAC, `PlatformRuntimeProvider`, `IntegratedCatalog`, `IntegratedDashboard`, rota `/interno/catalogo`, menu interno, composição do catálogo público/CRM, `createCatalogRuntime`, `catalogMediaStorage`, `dispose()` e tipos Supabase atualizados.
- 🟢 A dependência estrutural da Frente03 com a Frente01 está encerrada.
- 🟠 Pendência de ambiente conjunto: build/typecheck e QA real de navegador/E2E.

## Frente02 — Site público/Área do cliente

- Branch: `frente-02`
- Status nesta cópia: consultar a própria branch para o estado mais recente.
- 🟢 Integração estrutural com Frente03 já montada pela Frente01 via `IntegratedPublicExperience` + `runtime.publicCatalogService`.
- 🟠 A publicação pública atual ainda precisa estar no estado final para o E2E da Frente03 validar `publicar interno → aparecer no site publicado`.

## Frente03 — Catálogo interno/Dashboard

- Branch: `frente-03`
- Status geral: 🟠 **INTEGRADA E BACKEND REAL VALIDADO; FALTAM BUILD/TYPECHECK CONSOLIDADO + BROWSER/E2E.**
- Responsável: ChatGPT — Frente03
- Regra visual: 🟢 completo e testável | 🟠 parcial/em andamento | 🔴 não iniciado.

### 🟢 Domínio e catálogo

- 🟢 empreendimento, unidade e imóvel avulso;
- 🟢 tipologia, finalidade, localização, preço, lançamento, características, estilos de vida, incorporadora/origem e mídia;
- 🟢 CRUD, busca, filtros, duplicação, exclusão lógica e código ativo único;
- 🟢 máquina de estados: `draft→published|sold`, `published→paused|sold`, `paused→published|sold`; `sold` é terminal;
- 🟢 unidade exige empreendimento ativo e tipologia;
- 🟢 unidade nova/realocada não pode ser vinculada a empreendimento vendido;
- 🟢 unidade histórica já vinculada a pai vendido continua editável para correção cadastral;
- 🟢 empreendimento só pode ser vendido quando todas as unidades ativas estiverem vendidas;
- 🟢 empreendimento com unidades ativas não pode ser excluído nem convertido deixando órfãos;
- 🟢 duplicação de unidade com pai vendido/indisponível é bloqueada.

### 🟢 Catálogo público

- 🟢 `PublicCatalogService` com listagem, detalhe, unidades, faixa de preço e filtros;
- 🟢 somente itens publicamente elegíveis são retornados;
- 🟢 unidade publicada exige empreendimento pai publicado para exposição;
- 🟢 pausar/vender o pai retira as unidades do público preservando o histórico interno;
- 🟢 faixa de preço de empreendimento deriva das unidades publicadas;
- 🟢 preço público do empreendimento usa o menor preço das unidades publicadas quando existirem;
- 🟢 preço do pai só é fallback quando não existem unidades publicadas com preço;
- 🟢 `storagePath` não pertence ao contrato `PublicCatalogItem`.

### 🟢 Dashboard

- 🟢 publicados/elegíveis, publicados ocultos, estoque ativo, rascunhos, pausados e vendidos;
- 🟢 `hiddenPublished` explicita unidades com `status=published` ocultas porque o empreendimento pai não está publicado;
- 🟢 `inventoryCount` representa estoque operacional sem dupla contagem pai + unidades;
- 🟢 valor de estoque sem dupla contagem empreendimento + unidades;
- 🟢 cidade e finalidade;
- 🟢 Dashboard usa a mesma elegibilidade hierárquica do catálogo público;
- 🟢 CRM: leads, origem, próximas tarefas e, com `referenceId`, demanda por região e interesse por produto;
- 🟢 não infere visitas/propostas/negociações/vendas/VGV/ticket/conversão pelo nome de etapa.

### 🟢 Supabase real

Projeto dedicado: `desxomqvtjaymwwxivwq`.

Migrations registradas:

1. 🟢 `catalog_front03`;
2. 🟢 `catalog_front03_grants_hardening`;
3. 🟢 `catalog_front03_select_policy_performance`;
4. 🟢 `catalog_front03_status_transitions`;
5. 🟢 `catalog_front03_media_storage`;
6. 🟢 `catalog_front03_public_unit_parent_visibility`;
7. 🟢 `catalog_front03_sold_development_integrity`;
8. 🟢 `catalog_front03_realtime`;
9. 🟢 `catalog_front03_media_payload_validation`.

QA real já executado:

- 🟢 anon vê publicado e não vê rascunho;
- 🟢 cliente autenticado comum segue somente superfície pública e não ganha escrita interna;
- 🟢 `catalog.manage`, `catalog.publish` e `catalog.view` testados separadamente;
- 🟢 publish-only não altera conteúdo;
- 🟢 view-only não grava;
- 🟢 código duplicado rejeitado;
- 🟢 unidade sem tipologia rejeitada;
- 🟢 pai com unidades ativas não pode ser excluído;
- 🟢 status inválidos bloqueados;
- 🟢 `published_at`/`sold_at` controlados pelo banco;
- 🟢 unidade some do público quando o pai deixa de estar publicado, mas continua visível internamente;
- 🟢 empreendimento com unidade não vendida não pode ser vendido;
- 🟢 depois de vender todas as unidades, o empreendimento pode ser vendido;
- 🟢 edição histórica de unidade sob pai vendido é permitida;
- 🟢 criar/realocar unidade para pai vendido é bloqueado;
- 🟢 `catalog_items` está na publication `supabase_realtime`;
- 🟢 payload de mídia com tipo inválido ou URL fora de HTTP(S) é rejeitado no banco;
- 🟢 payload de mídia HTTPS válido é aceito;
- 🟢 RLS de `catalog_items` confirmada ativa em 17/09/2026;
- 🟢 bucket público `catalog-media` confirmado presente em 17/09/2026;
- 🟢 policies Storage SELECT/INSERT/UPDATE/DELETE confirmadas sob `catalog.manage` para `authenticated`;
- 🟢 0 unidades órfãs e 0 códigos ativos duplicados na checagem de 17/09/2026;
- 🟢 nenhum registro `QA-%`/`QA-F03-%` permaneceu no banco após os testes.

### 🟢 QA hierárquico adicional — 17/09/2026

Teste transitório no backend real, removido ao final:

- 🟢 unidade `published` com pai `draft` ficou invisível para `anon`;
- 🟢 ao publicar o pai, a unidade passou a ser visível para `anon`;
- 🟢 ao pausar o pai, a unidade voltou a ficar invisível para `anon`;
- 🟢 vender o empreendimento com unidade ativa não vendida permaneceu bloqueado;
- 🟢 vender a unidade e depois o empreendimento funcionou;
- 🟢 `sold` permaneceu terminal e rejeitou nova transição;
- 🟢 cleanup final confirmou 0 resíduos QA.

A publicação interna antecipada de uma unidade enquanto o pai ainda está em `draft` é aceita pelo backend; a RLS pública impede exposição até o pai estar publicado. Isso segue o contrato atual de elegibilidade pública hierárquica.

### 🟢 Realtime multi-sessão — implementação

- 🟢 `catalog_items` habilitado na publication `supabase_realtime` por migration versionada;
- 🟢 `RealtimeCatalogRepository` escuta mudanças em `catalog_items` e converte em `harpia:catalog-changed`;
- 🟢 serviço público continua no repositório base e não abre canal Realtime para visitante;
- 🟢 canal interno só é criado quando o repositório interno é efetivamente usado;
- 🟢 `dispose()` remove o canal;
- 🟢 testes isolados passaram: `REALTIME_CATALOG_RUNTIME_OK` e `REALTIME_CATALOG_LAZY_OK`;
- 🟠 validação WebSocket real entre dois navegadores continua para o QA E2E.

### 🟢 Mídia / Storage — backend e contrato

- 🟢 bucket `catalog-media` criado no Supabase real;
- 🟢 bucket público para serving, com operações de gestão protegidas por `catalog.manage`;
- 🟢 limite de 50 MB;
- 🟢 JPEG, PNG, WebP, GIF, MP4, WebM e PDF;
- 🟢 `SupabaseCatalogMediaStorage` com upload, URL pública, nomes opacos e remoção;
- 🟢 `CatalogMedia.storagePath` permite administrar mídia criada pelo Storage;
- 🟢 `CatalogAdminPage` rastreia uploads pendentes e limpa lote parcial em erro/troca/cancelamento;
- 🟢 mídia removida só apaga objeto do bucket quando nenhuma referência ativa ou histórica permanece;
- 🟢 duplicatas podem compartilhar o mesmo objeto sem quebrar a mídia uma da outra;
- 🟢 entrada manual por URL continua como fallback, limitada a HTTP(S);
- 🟢 tipo de mídia é validado no domínio, adapter Supabase e trigger real;
- 🟢 `createCatalogRuntime(client)` monta repository interno com Realtime + public service base + media storage protegido usando o mesmo cliente oficial;
- 🟢 regressões isoladas: `MEDIA_REFERENCE_GUARD_OK` e `CATALOG_MEDIA_VALIDATION_OK`.

### 🟢 Integração Frente01 — RESOLVIDA

Confirmado no estado integrado atual da Frente01:

- 🟢 `PlatformRuntimeProvider` usa `createCatalogRuntime(supabase)`;
- 🟢 `catalogRepository`, `publicCatalogService` e `catalogMediaStorage` são expostos no runtime;
- 🟢 `catalogRuntime.dispose()` é chamado no ciclo de vida do provider;
- 🟢 `IntegratedCatalog` passa `repository` + `mediaStorage` + RBAC granular;
- 🟢 `IntegratedDashboard` usa o repositório do catálogo e provider comercial compartilhado;
- 🟢 `/interno/catalogo` e sidebar já usam `catalog.view/manage/publish`;
- 🟢 Frente02 recebe `runtime.publicCatalogService`;
- 🟢 `database.types.ts` contém `catalog_items`, relacionamento pai/unidade e enums `catalog_item_kind`, `catalog_purpose`, `catalog_status`;
- 🟢 schema real e tipos gerados foram conferidos;
- 🟢 Frente01 declarou F02/F03/F04/F05 liberadas estruturalmente.

### Advisors

- 🟢 Security Advisor: **zero findings** na última validação registrada após as migrations da F03.
- 🟢 Performance Advisor: nenhum erro funcional; apenas `unused_index` INFO em índices de banco ainda sem tráfego.

### 🟠 Build / navegador — bloqueio restante

- 🟠 Build Vite completo integrado: **NÃO VERIFICADO** neste chat.
- 🟠 Typecheck completo da versão integrada: **NÃO VERIFICADO**.
- 🟠 Upload real pela Storage API no navegador: **NÃO VERIFICADO**.
- 🟠 Realtime real entre duas sessões/browser: **NÃO VERIFICADO**.
- 🟠 QA visual/E2E no shell final: **NÃO VERIFICADO**.
- O `package-lock.json` ainda não existe na Frente01 no estado consultado.
- O executor local desta sessão possui Node 22; o projeto exige Node 24 e não há dependências npm instaladas/cacheadas. Isso impede declarar build/typecheck consolidado como executado aqui.

### Próximo fechamento da Frente03

1. Ambiente Node 24/npm compatível para `npm run typecheck` e `npm run build` na versão integrada.
2. QA browser com usuário interno real: criar → editar → upload → publicar → verificar site → pausar → republicar → testar duas sessões → vender unidades → vender empreendimento → validar Dashboard/site.
3. Publicação final da Frente02 disponível para validar o trecho público do E2E.
4. Só então promover o status geral para 🟢.

## Frente04 — CRM/Inbox

- Branch: `frente-04`
- Status nesta cópia: consultar a própria branch para o estado mais recente.
- 🟢 Para Frente03, a fonte compartilhada já está montada no runtime integrado.
- 🟢 Não existe pendência estrutural da Frente04 para o Dashboard atual da Frente03.
- Métricas comerciais avançadas só entram quando houver semântica objetiva explícita; a Frente03 não deve inferi-las.

## Frente05 — SalesBot/Automatize/IA/Integrações

- Branch: `frente-05`
- Status nesta cópia: consultar a própria branch para o estado mais recente.
- 🟢 Não bloqueia diretamente a Frente03.

---

# Pedidos entre frentes

- Origem: Frente03
- Destino: Frente01 / Integrador
- Necessidade anterior: sincronizar a Frente03 atual, adotar `createCatalogRuntime`, expor `mediaStorage`, usar `dispose()` e regenerar tipos Supabase.
- Resultado: confirmado no estado integrado da Frente01.
- Status: 🟢 RESOLVIDO.

- Origem: Frente03
- Destino: Integração final
- Necessidade: build/typecheck integrado e QA browser/E2E com sessão interna real.
- Urgência: ALTA para fechamento.
- Status: 🟠 PENDENTE.

- Origem: Frente03
- Destino: Frente02
- Necessidade: publicação pública final disponível para validar `publicar interno → aparecer no site publicado`.
- Status: 🟠 PENDENTE apenas para o E2E final.

---

# Critério de status

- 🔴 NÃO INICIADO: nenhuma implementação relevante começou.
- 🟠 PARCIAL / EM ANDAMENTO: há trabalho ativo ou falta integração/validação/teste para concluir.
- 🟢 COMPLETO E TESTÁVEL: escopo concluído e validado no nível indicado.
- BLOQUEADA: depende de decisão ou contrato externo.
- PRONTA PARA INTEGRAÇÃO: escopo da frente concluído e testado isoladamente.
- INTEGRADA: merge validado no produto conjunto.
