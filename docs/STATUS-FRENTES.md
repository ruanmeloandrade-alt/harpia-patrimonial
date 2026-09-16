# Hárpia Patrimonial — Status das 5 Frentes

Atualizar este arquivo ao iniciar e ao concluir blocos relevantes.

## Frente01 — Núcleo/Auth/Usuários/Permissões

- Branch: `frente-01`
- Status nesta cópia: consultar a própria branch para o estado mais recente.
- Para a Frente03, já entregou: Supabase dedicado, auth/RBAC, `PlatformRuntimeProvider`, `IntegratedCatalog`, `IntegratedDashboard`, rota `/interno/catalogo`, menu interno e composição do catálogo público/CRM.

## Frente02 — Site público/Área do cliente

- Branch: `frente-02`
- Status nesta cópia: consultar a própria branch para o estado mais recente.
- Integração estrutural com Frente03 já montada pela Frente01 via `IntegratedPublicExperience` + `runtime.publicCatalogService`.

## Frente03 — Catálogo interno/Dashboard

- Branch: `frente-03`
- Status geral: 🟠 PARCIAL / BACKEND REAL E INTEGRAÇÃO ESTRUTURAL VALIDADOS, AGUARDANDO SINCRONIZAÇÃO FINAL + BUILD/BROWSER QA
- Responsável: ChatGPT — Frente03
- Regra visual: 🟢 completo e testável | 🟠 parcial/em andamento | 🔴 não iniciado.

### Blocos próprios

- 🟢 Modelo de domínio: empreendimento, unidade, imóvel avulso, tipologia, finalidade, localização, preço, estilos de vida e mídia.
- 🟢 CRUD/repositório: busca, edição, duplicação segura, exclusão lógica, código único e proteção contra unidades órfãs.
- 🟢 Publicação: máquina de estados protegida no adapter local, adapter Supabase e banco real.
- 🟢 Transições válidas: `draft→published|sold`, `published→paused|sold`, `paused→published|sold`; `sold` é terminal.
- 🟢 Contrato público: publicados apenas; listagem, detalhe, unidades do empreendimento, faixa de preço derivada, filtros e opções reais.
- 🟢 Filtro/faixa: empreendimentos com unidades publicadas usam os preços reais das unidades; preço do pai só é fallback quando necessário.
- 🟢 Dashboard patrimonial: estoque sem dupla contagem, status, cidade e finalidade.
- 🟢 Métricas CRM seguras: leads, origem, próximas tarefas e, com `referenceId`, demanda por região e interesse por produto.
- 🟢 `CrmRepositorySnapshotSource`: lê `load()` do repositório CRM e reage a `harpia:crm-updated`.

### Supabase real

- 🟢 Projeto dedicado ativo: `desxomqvtjaymwwxivwq`.
- 🟢 Migrations aplicadas: `catalog_front03`, `catalog_front03_grants_hardening`, `catalog_front03_select_policy_performance`, `catalog_front03_status_transitions`, `catalog_front03_media_storage`.
- 🟢 RLS público: `anon` enxerga publicados e não enxerga rascunhos.
- 🟢 Grants: `anon` somente SELECT; `authenticated` SELECT/INSERT/UPDATE sem DELETE; `service_role` possui DELETE.
- 🟢 Integridade: unidade sem tipologia rejeitada; empreendimento com unidade ativa não pode ser excluído/convertido deixando órfãos.
- 🟢 Timestamps: `published_at` e `sold_at` preenchidos pelo banco nas transições.
- 🟢 Código ativo duplicado rejeitado pelo índice único.
- 🟢 QA temporário limpo; consultas finais retornaram 0 registros `QA-%`.

### RBAC real

Testado com usuários temporários dentro de transação e rollback:

- 🟢 `catalog.manage`: cria e edita; tentativa de publicar sem `catalog.publish` é bloqueada.
- 🟢 `catalog.publish`: lê registros internos e muda status; edição de conteúdo é bloqueada; criação é bloqueada.
- 🟢 `catalog.view`: lê rascunhos internos; UPDATE afeta 0 linhas e não altera o dado; INSERT é bloqueado.

### Máquina de estados real

- 🟢 `draft→paused`: bloqueado.
- 🟢 `draft→published`: permitido.
- 🟢 `published→draft`: bloqueado.
- 🟢 `published→paused`: permitido.
- 🟢 `paused→published`: permitido.
- 🟢 `published→sold`: permitido.
- 🟢 `sold→published`: bloqueado como estado terminal.

### Mídia / Storage

- 🟢 Bucket real `catalog-media` criado no Supabase.
- 🟢 Bucket público para serving estável; escrita/listagem operacional/alteração/remoção protegidas por `catalog.manage`.
- 🟢 Limite de 50 MB e MIME types controlados: JPEG, PNG, WebP, GIF, MP4, WebM e PDF.
- 🟢 `SupabaseCatalogMediaStorage` implementado com nomes opacos, `upsert:false`, URL pública e remoção.
- 🟢 Adapter de Storage passou typecheck estrito e teste de execução com cliente simulado.
- 🟢 `CatalogAdminPage` suporta upload direto quando recebe `mediaStorage`; fallback por URLs continua funcionando.
- 🟠 Upload real pelo navegador: ainda precisa da injeção do adapter na composição da Frente01 e QA browser.

### Integração real já liberada pela Frente01

- 🟢 `PlatformRuntimeProvider` envolve a aplicação.
- 🟢 Runtime usa `SupabaseCatalogRepository` quando Supabase está configurado.
- 🟢 Runtime expõe `PublicCatalogService` construído sobre o mesmo repositório.
- 🟢 Runtime liga Dashboard ao repositório CRM compartilhado via `CrmRepositorySnapshotSource` + `CrmSnapshotMetricsProvider`.
- 🟢 `IntegratedCatalog` e `IntegratedDashboard` existem.
- 🟢 `/interno/catalogo` está montado no `AppRouter` com OR entre `catalog.view/manage/publish`.
- 🟢 `InternalShell` exibe Catálogo com a mesma regra de acesso.
- 🟢 experiência pública da Frente02 recebe `runtime.publicCatalogService`; não há segunda fonte de catálogo.

### Sincronização ainda necessária na branch integradora

A cópia da Frente03 na `frente-01` foi integrada antes das últimas melhorias. Antes do QA final, sincronizar os arquivos mais recentes da Frente03, principalmente:

- `src/features/catalog/catalogRepository.ts` — máquina de estados;
- `src/features/catalog/supabaseCatalogRepository.ts` — máquina de estados + porta tipada flexível;
- `src/features/catalog/catalog.schema.sql` — referência atual;
- `src/features/catalog/catalogMediaStorage.ts` — novo;
- `src/features/catalog/catalog.storage.sql` — novo;
- `src/features/catalog/CatalogAdminPage.tsx` — upload direto;
- `src/features/catalog/Front03Workspace.tsx` — prop `mediaStorage`;
- `src/features/catalog/index.ts` — export do adapter de mídia;
- `src/features/catalog/README.md` — contrato atualizado.

O Dashboard já estava sincronizado por SHA no último pente-fino.

### Tipos Supabase globais

- 🟠 `src/core/supabase/database.types.ts` na Frente01 ainda é uma geração anterior e não contém `catalog_items`.
- A geração atual do Supabase inclui `catalog_items` e os enums do catálogo.
- Isso deve ser regenerado antes do build final, embora a porta estrutural da Frente03 já não dependa desse arquivo para aceitar o cliente tipado.

### Advisors

- 🟢 Nenhum finding de Security Advisor pertence ao catálogo/Storage da Frente03.
- 🟠 Security Advisor atual reporta dois WARNs de `SECURITY DEFINER` em funções compartilhadas (`list_internal_assignees` e `save_platform_module_state`), fora do ownership da Frente03. Remediação: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- 🟢 Performance Advisor: nenhum warning funcional da Frente03; índices do catálogo aparecem apenas como `unused_index` INFO em banco novo, esperado sem tráfego.
- 🟠 Há INFO de FK sem índice em `platform_module_state`, módulo compartilhado fora da Frente03. Remediação: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys

### Build / browser

- 🟠 Build Vite completo: **NÃO VERIFICADO**. Executor atual usa Node 22; o projeto exige Node 24 e o registry npm não estava acessível.
- 🟠 Lint global: **NÃO VERIFICADO**; não há script/configuração de lint na branch isolada.
- 🟠 Teste visual/E2E no navegador integrado: **NÃO VERIFICADO**.

### Próximo passo da Frente03

1. Frente01/integrador sincronizar os arquivos listados acima.
2. Injetar `SupabaseCatalogMediaStorage` no `IntegratedCatalog`.
3. Regenerar `database.types.ts`.
4. Executar build + QA browser: criar → editar → upload → publicar → pausar → republicar → vender → validar site público/dashboard.

## Frente04 — CRM/Inbox

- Branch: `frente-04`
- Status nesta cópia: consultar a própria branch para o estado mais recente.
- Para a Frente03, a fonte compartilhada de CRM já está montada no `PlatformRuntime` da Frente01; métricas avançadas continuam dependendo de semântica explícita do CRM.

## Frente05 — SalesBot/Automatize/IA/Integrações

- Branch: `frente-05`
- Status nesta cópia: consultar a própria branch para o estado mais recente.
- Não bloqueia diretamente a Frente03.

---

# Pedidos entre frentes

- Data/hora: 16/09/2026 — atualizado nesta sessão
- Origem: Frente03
- Destino: Frente01 / Integrador
- Necessidade: sincronizar a versão mais recente dos arquivos da Frente03 listados na seção de sincronização, incluindo máquina de estados e Storage.
- Motivo: `IntegratedCatalog`/runtime/rota já existem, mas a cópia incorporada antecede as últimas correções da Frente03.
- Urgência: ALTA antes do QA final.
- Status: PENDENTE.

- Data/hora: 16/09/2026 — atualizado nesta sessão
- Origem: Frente03
- Destino: Frente01 / Integrador
- Necessidade: instanciar `SupabaseCatalogMediaStorage` com o cliente Supabase oficial e passar como `mediaStorage` ao `CatalogAdminPage` integrado.
- Motivo: bucket e adapter estão prontos; falta somente composição global para upload real no navegador.
- Urgência: ALTA.
- Status: PENDENTE.

- Data/hora: 16/09/2026 — atualizado após backend ativo
- Origem: Frente03
- Destino: Frente01 / Integrador
- Necessidade: regenerar `src/core/supabase/database.types.ts` usando o schema atual.
- Motivo: geração atual já contém tabela/enums do catálogo; arquivo da branch integradora ainda está anterior.
- Urgência: ALTA antes do build integrado.
- Status: PENDENTE.

- Data/hora: 16/09/2026 — resolvido
- Origem: Frente03
- Destino: Frente01
- Necessidade anterior: aplicar schema/RLS e montar rota/RBAC do catálogo.
- Resultado: backend real aplicado/testado; `/interno/catalogo`, runtime e menu foram montados.
- Status: RESOLVIDO.

- Data/hora: 16/09/2026 — resolvido estruturalmente
- Origem: Frente03
- Destino: Frente02 / Integrador
- Necessidade anterior: consumir `PublicCatalogService` como fonte única.
- Resultado: `IntegratedPublicExperience` recebe `runtime.publicCatalogService`.
- Status: RESOLVIDO estruturalmente; QA browser permanece pendente.

- Data/hora: 16/09/2026 — resolvido estruturalmente
- Origem: Frente03
- Destino: Frente04 / Integrador
- Necessidade anterior: fornecer estado real do CRM ao Dashboard.
- Resultado: `PlatformRuntime` usa repositório CRM compartilhado com `CrmRepositorySnapshotSource`.
- Status: RESOLVIDO para métricas objetivas atuais; métricas avançadas dependem de semântica futura.

---

# Critério de status

- 🔴 NÃO INICIADO: nenhuma implementação relevante começou.
- 🟠 PARCIAL / EM ANDAMENTO: há trabalho ativo ou falta integração/validação/teste para concluir.
- 🟢 COMPLETO E TESTÁVEL: escopo concluído, validações relevantes executadas e usuário pode testar.
- BLOQUEADA: depende de decisão ou contrato externo.
- PRONTA PARA INTEGRAÇÃO: escopo da frente concluído e testado isoladamente.
- INTEGRADA: merge validado no produto conjunto.
