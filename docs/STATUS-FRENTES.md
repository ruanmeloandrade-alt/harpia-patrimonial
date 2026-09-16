# Hárpia Patrimonial — Status das 5 Frentes

Atualizar este arquivo ao iniciar e ao concluir blocos relevantes.

## Frente01 — Núcleo/Auth/Usuários/Permissões

- Branch: `frente-01`
- Status nesta cópia: consultar a própria branch para o estado mais recente.
- 🟢 Para a Frente03 já entregou: Supabase dedicado, auth/RBAC, `PlatformRuntimeProvider`, `IntegratedCatalog`, `IntegratedDashboard`, rota `/interno/catalogo`, menu interno, composição do catálogo público/CRM, `createCatalogRuntime`, `catalogMediaStorage`, `dispose()` e tipos Supabase atualizados.
- 🟢 A comparação atual de branches mostra a Frente03 integralmente incorporada na Frente01.
- 🟠 Pendência relevante para Frente03: build/typecheck integrado e QA real de navegador/E2E.

## Frente02 — Site público/Área do cliente

- Branch: `frente-02`
- Status nesta cópia: consultar a própria branch para o estado mais recente.
- 🟢 Integração estrutural com Frente03 já montada pela Frente01 via `IntegratedPublicExperience` + `runtime.publicCatalogService`.
- 🟠 QA visual/E2E com dados reais publicados ainda depende da validação final da aplicação integrada.

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
- 🟢 nenhum registro `QA-%`/`QA-F03-%` permaneceu no banco após os testes.

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

Confirmado no HEAD atual da Frente01:

- 🟢 `PlatformRuntimeProvider` usa `createCatalogRuntime(supabase)`;
- 🟢 `catalogRepository`, `publicCatalogService` e `catalogMediaStorage` são expostos no runtime;
- 🟢 `catalogRuntime.dispose()` é chamado no ciclo de vida do provider;
- 🟢 `IntegratedCatalog` passa `repository` + `mediaStorage` + RBAC granular;
- 🟢 `IntegratedDashboard` usa o repositório do catálogo e provider comercial compartilhado;
- 🟢 `/interno/catalogo` e sidebar já usam `catalog.view/manage/publish`;
- 🟢 Frente02 recebe `runtime.publicCatalogService`;
- 🟢 `database.types.ts` contém `catalog_items`, relacionamento pai/unidade e enums `catalog_item_kind`, `catalog_purpose`, `catalog_status`;
- 🟢 schema real e tipos gerados foram conferidos nesta rodada;
- 🟢 comparação de branches: a Frente03 atual está integralmente incorporada na Frente01, sem arquivos próprios pendentes de sincronização.

### Advisors

- 🟢 Security Advisor: **zero findings** após as migrations atuais.
- 🟢 Performance Advisor: nenhum erro funcional; apenas `unused_index` INFO em índices de banco ainda sem tráfego.
- Referência do INFO: https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index

### 🟠 Build / navegador — bloqueio restante

- 🟠 Build Vite completo integrado: **NÃO VERIFICADO** neste chat.
- 🟠 Typecheck completo da versão integrada: **NÃO VERIFICADO**.
- 🟠 Upload real pela Storage API no navegador: **NÃO VERIFICADO**.
- 🟠 Realtime real entre duas sessões/browser: **NÃO VERIFICADO**.
- 🟠 QA visual/E2E no shell final: **NÃO VERIFICADO**.
- O `package-lock.json` ainda não existe na Frente01.
- O executor local desta sessão possui Node 22 e TypeScript global 5.8.3; o projeto exige Node 24 e não há dependências npm instaladas/cacheadas. Isso impede declarar build/typecheck consolidado como executado aqui.

### Próximo fechamento da Frente03

1. Gerar lockfile/instalar dependências em ambiente Node 24 com registry acessível.
2. Rodar `npm run typecheck` e `npm run build` na branch integrada.
3. QA browser com usuário interno real: criar → editar → upload → publicar → verificar site → pausar → republicar → testar duas sessões → vender unidades → vender empreendimento → validar Dashboard/site.
4. Só então promover o status geral para 🟢.

## Frente04 — CRM/Inbox

- Branch: `frente-04`
- Status nesta cópia: consultar a própria branch para o estado mais recente.
- 🟢 Para Frente03, a fonte compartilhada já está montada no runtime integrado.
- 🟠 Métricas comerciais avançadas dependem de semântica explícita futura do CRM.

## Frente05 — SalesBot/Automatize/IA/Integrações

- Branch: `frente-05`
- Status nesta cópia: consultar a própria branch para o estado mais recente.
- Não bloqueia diretamente a Frente03.

---

# Pedidos entre frentes

- Data: 16/09/2026
- Origem: Frente03
- Destino: Frente01 / Integrador
- Necessidade anterior: sincronizar a Frente03 atual, adotar `createCatalogRuntime`, expor `mediaStorage`, usar `dispose()` e regenerar tipos Supabase.
- Resultado: confirmado no HEAD atual da Frente01.
- Status: 🟢 RESOLVIDO.

- Data: 16/09/2026
- Origem: Frente03
- Destino: Integração final
- Necessidade: build/typecheck integrado e QA browser/E2E com sessão interna real.
- Urgência: ALTA para fechamento.
- Status: 🟠 PENDENTE.

- Data: 16/09/2026
- Origem: Frente03
- Destino: Frente01 / Frente02 / Frente04
- Necessidades anteriores de rota, catálogo público e CRM compartilhado.
- Resultado: composição estrutural já existente na Frente01.
- Status: 🟢 RESOLVIDO estruturalmente; QA final continua conjunto.

---

# Critério de status

- 🔴 NÃO INICIADO: nenhuma implementação relevante começou.
- 🟠 PARCIAL / EM ANDAMENTO: há trabalho ativo ou falta integração/validação/teste para concluir.
- 🟢 COMPLETO E TESTÁVEL: escopo concluído e validado no nível indicado.
- BLOQUEADA: depende de decisão ou contrato externo.
- PRONTA PARA INTEGRAÇÃO: escopo da frente concluído e testado isoladamente.
- INTEGRADA: merge validado no produto conjunto.
