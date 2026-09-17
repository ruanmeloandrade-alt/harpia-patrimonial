# Frente03 — Handoff de Catálogo + Dashboard

Data: 17/09/2026
Branch: `frente-03`

Legenda:

- 🟢 completo e testável no nível indicado;
- 🟠 parcial/aguardando validação essencial;
- 🔴 não iniciado.

## Status geral

🟠 **INTEGRADA NA FRENTE01 + BACKEND REAL VALIDADO; FALTAM BUILD/TYPECHECK CONSOLIDADO E QA REAL DE NAVEGADOR/E2E.**

A Frente01 já incorporou integralmente a Frente03 atual e usa o runtime de catálogo, Storage, Realtime e tipos Supabase atualizados. Em 17/09/2026 a Frente01 registrou QA backend Auth/RBAC aprovado e liberou estruturalmente as Frentes02–05; portanto a Frente03 não deve aguardar a Frente01 para trabalho próprio.

## 🟢 Domínio e regras

- empreendimento, unidade e imóvel avulso;
- tipologia obrigatória de unidade;
- CRUD, busca, duplicação, exclusão lógica e código ativo único;
- máquina de estados: `draft→published|sold`, `published→paused|sold`, `paused→published|sold`, `sold` terminal;
- unidade nova/realocada não aponta para empreendimento vendido;
- unidade histórica sob pai vendido continua editável;
- empreendimento só pode ser vendido depois de todas as unidades ativas estarem vendidas;
- empreendimento com unidades ativas não pode ser excluído/convertido deixando órfãos;
- duplicação de unidade com pai vendido/indisponível é bloqueada.

## 🟢 Catálogo público

`PublicCatalogService` fornece listagem, filtros, detalhe, unidades por empreendimento, bundle de empreendimento e faixa de preço.

Garantias:

- só itens publicamente elegíveis;
- unidade `published` só é pública se o pai também estiver publicado e ativo;
- pausar/vender o pai esconde as unidades sem destruir histórico;
- faixa de preço deriva das unidades publicadas;
- preço público do empreendimento usa o menor preço das unidades publicadas quando existirem;
- preço do pai só é fallback quando não houver unidade publicada precificada;
- `storagePath` não faz parte do contrato público.

### QA real adicional — 17/09/2026

Validação executada diretamente no backend real, com dados transitórios removidos ao final:

- 🟢 unidade `published` com empreendimento pai em `draft` ficou invisível para `anon`;
- 🟢 após publicar o empreendimento pai, a mesma unidade passou a ficar visível para `anon`;
- 🟢 após pausar o empreendimento pai, a unidade voltou a ficar invisível para `anon`;
- 🟢 venda do empreendimento com unidade ativa não vendida permaneceu bloqueada;
- 🟢 após vender a unidade, foi possível vender o empreendimento;
- 🟢 item vendido permaneceu terminal e rejeitou nova transição de status;
- 🟢 limpeza final confirmou 0 registros com prefixo `QA-%` / `QA-F03-%`.

Observação: o backend permite que uma unidade seja marcada como `published` enquanto o pai ainda está em `draft`, porém a RLS pública mantém a unidade invisível até o pai também estar publicado. Isso está coerente com o contrato atual da Frente03, cuja regra é de elegibilidade pública hierárquica, não de proibição absoluta da publicação interna antecipada.

## 🟢 Dashboard

Patrimonial:

- publicados/elegíveis;
- publicados ocultos (`hiddenPublished`);
- estoque ativo (`inventoryCount`);
- rascunhos, pausados e vendidos;
- valor do estoque sem dupla contagem;
- cidade e finalidade.

CRM objetivo:

- leads;
- origem;
- próximas tarefas;
- demanda por região quando existe `interest.referenceId`;
- interesse por produto por leads referenciados.

Não inferir pelo nome de etapa: visitas, propostas, negociações, vendas, VGV, ticket ou conversão.

Testes isolados relevantes: `DASHBOARD_HIDDEN_PUBLISHED_OK`, `DASHBOARD_INVENTORY_COUNT_OK`, `PUBLIC_DEVELOPMENT_PRICE_OK`.

A integração atual da Frente01 continua compondo `CrmRepositorySnapshotSource` + `CrmSnapshotMetricsProvider` com o `catalogRepository`, mantendo somente métricas objetivas disponíveis e sem inferência por nome configurável de etapa.

## 🟢 Supabase real

Projeto: `Harpia Patrimonial` (`desxomqvtjaymwwxivwq`).

Migrations Frente03 registradas:

1. `catalog_front03`;
2. `catalog_front03_grants_hardening`;
3. `catalog_front03_select_policy_performance`;
4. `catalog_front03_status_transitions`;
5. `catalog_front03_media_storage`;
6. `catalog_front03_public_unit_parent_visibility`;
7. `catalog_front03_sold_development_integrity`;
8. `catalog_front03_realtime`;
9. `catalog_front03_media_payload_validation`.

QA real cobriu RLS público/interno, RBAC `view/manage/publish`, máquina de estados, código único, tipologia, relação pai/unidade, venda do empreendimento, visibilidade hierárquica e payload de mídia.

Último check de 17/09/2026:

- 🟢 `catalog_items`: RLS habilitada;
- 🟢 `catalog_items`: incluída em `supabase_realtime`;
- 🟢 bucket público `catalog-media`: presente;
- 🟢 policies de Storage para SELECT/INSERT/UPDATE/DELETE exigem `catalog.manage` para `authenticated`;
- 🟢 0 unidades órfãs;
- 🟢 0 códigos ativos duplicados;
- 🟢 `QA-%` / `QA-F03-%`: 0 resíduos;
- 🟢 Security Advisor previamente validado com 0 findings;
- 🟢 Performance: somente `unused_index` INFO em banco sem tráfego relevante.

## 🟢 Realtime multi-sessão — implementação

- `catalog_items` está na publication `supabase_realtime`;
- `RealtimeCatalogRepository` recebe mudanças remotas e emite `harpia:catalog-changed`;
- serviço público usa repositório base sem canal para visitante;
- canal interno é lazy;
- `dispose()` remove o canal.

Testes isolados: `REALTIME_CATALOG_RUNTIME_OK` e `REALTIME_CATALOG_LAZY_OK`.

🟠 Falta validar WebSocket real entre dois navegadores autenticados.

## 🟢 Mídia / Storage

Bucket real: `catalog-media`.

- serving público;
- gestão sob `catalog.manage`;
- limite 50 MB;
- JPEG, PNG, WebP, GIF, MP4, WebM e PDF;
- nomes opacos e `upsert:false`;
- upload direto opcional + URL manual HTTP(S);
- lote parcial limpo em erro;
- upload não salvo limpo em cancelamento/troca;
- mídia persistida só é apagada quando nenhuma referência ativa ou histórica permanece;
- duplicatas podem compartilhar o mesmo objeto com segurança.

Testes: `CATALOG_MEDIA_VALIDATION_OK` e `MEDIA_REFERENCE_GUARD_OK`.

🟠 Falta upload real pela UI/browser.

## 🟢 Integração Frente01 — confirmada

No estado integrado atual da Frente01:

- `PlatformRuntimeProvider` usa `createCatalogRuntime`;
- runtime expõe `catalogRepository`, `publicCatalogService` e `catalogMediaStorage`;
- `catalogRuntime.dispose()` é chamado no cleanup;
- `IntegratedCatalog` recebe `repository` + `mediaStorage` + RBAC granular;
- `IntegratedDashboard` recebe catálogo e provider comercial compartilhado;
- `/interno/catalogo` e menu existem;
- Frente02 recebe `runtime.publicCatalogService`;
- `database.types.ts` contém `catalog_items`, relacionamento pai/unidade e enums do catálogo;
- tipos gerados foram conferidos contra o schema real;
- Frente01 declarou em `docs/STATUS-FRENTES.md` a dependência estrutural da Frente03 como **LIBERADA**.

## 🟠 Integração Frente02

O contrato estrutural F03 → F02 está resolvido pela `PublicCatalogService` integrada na Frente01.

A Frente02 ainda possui pendência ligada à publicação/ambiente público atual. Para a Frente03, isso bloqueia apenas o E2E final `publicar no interno → aparecer no site publicado`; não bloqueia o backend próprio nem o contrato público da F03.

## 🟢 Integração Frente04

O Dashboard da Frente03 já recebe o provider comercial compartilhado da Frente04 via integração da Frente01.

Métricas hoje consideradas objetivas:

- leads;
- origem dos leads;
- próximas ações/tarefas;
- demanda por região quando há referência real de catálogo;
- interesse por produto quando há referência real.

Métricas sem semântica objetiva permanecem indisponíveis/zero, conforme regra do projeto.

## 🟢 Frente05

A Frente05 não bloqueia o escopo ou o fechamento técnico próprio da Frente03.

## 🟠 Validação final ainda NÃO VERIFICADA

- `npm run typecheck` no produto integrado;
- `npm run build` no produto integrado;
- upload real pelo Storage API via tela;
- Realtime real em duas sessões/browser;
- fluxo E2E criar → editar → mídia → publicar → site → pausar → republicar → vender unidades → vender empreendimento;
- Dashboard final com dados da operação real;
- teste final pelo usuário.

## Bloqueio técnico atual deste chat

- Frente01 continua sem `package-lock.json` no estado consultado;
- executor local desta sessão usa Node 22, enquanto o projeto exige Node 24;
- dependências npm do projeto não estão instaladas/cacheadas neste executor.

Por isso build/typecheck consolidado não foi declarado aprovado.

## Estado para integração final

🟢 Trabalho próprio de backend, domínio, catálogo público, dashboard, Storage, RLS e Realtime da Frente03 está implementado e validado no nível disponível.

🟢 Dependência estrutural da Frente01 está encerrada.

🟢 Frente05 não bloqueia a Frente03.

🟠 O verde geral da Frente03 depende agora somente das validações de ambiente integrado: build/typecheck, navegador/E2E, upload real pela UI, Realtime multi-sessão e o trecho do E2E público que depende da publicação atual da Frente02.