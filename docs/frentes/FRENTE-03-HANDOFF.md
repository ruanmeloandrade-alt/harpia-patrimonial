# Frente03 — Handoff de Catálogo + Dashboard

Data: 16/09/2026
Branch: `frente-03`

Legenda:

- 🟢 completo e testável no escopo validado;
- 🟠 parcial/aguardando integração ou validação essencial;
- 🔴 não iniciado.

## Status geral

🟠 **BACKEND REAL VALIDADO + CONTRATOS PRONTOS; AGUARDANDO SINCRONIZAÇÃO FINAL NA FRENTE01, TIPOS GLOBAIS E QA DE BUILD/NAVEGADOR.**

A Frente01 já entregou Supabase, auth/RBAC, runtime global, rota/menu, integração pública e CRM compartilhado. A Frente03 continuou avançando e agora também possui Realtime multi-sessão interno, hardening de mídia e lifecycle de Storage protegido contra referências compartilhadas.

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

## 🟢 Catálogo público e visibilidade

`PublicCatalogService` fornece listagem, detalhe, unidades, bundle de empreendimento, faixa de preço e filtros.

Garantias:

- só itens publicamente elegíveis;
- unidade `published` só é pública se o pai também estiver publicado e ativo;
- pausar/vender o pai esconde as unidades sem destruir histórico;
- faixa de preço deriva das unidades publicadas;
- `storagePath` não faz parte do contrato público.

A Frente01 já entrega `runtime.publicCatalogService` à experiência pública da Frente02.

## 🟢 Dashboard

Patrimonial:

- publicados/elegíveis;
- **publicados ocultos** (`hiddenPublished`) para unidades `published` escondidas pelo estado do pai;
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

Regressão isolada: `DASHBOARD_HIDDEN_PUBLISHED_OK`.

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

Último check:

- 🟢 `QA-%` / `QA-F03-%`: 0 resíduos;
- 🟢 Security Advisor: 0 findings;
- 🟢 Performance: somente `unused_index` INFO em banco sem tráfego relevante.

## 🟢 Realtime multi-sessão

Arquivos:

- `realtimeCatalogRepository.ts`;
- `catalog.realtime.sql`;
- `catalogRuntime.ts`.

Comportamento:

- `catalog_items` está na publication `supabase_realtime`;
- área interna recebe mudanças `INSERT/UPDATE/DELETE` de outras sessões;
- mudança Realtime vira `harpia:catalog-changed` para Catálogo/Dashboard;
- serviço público usa repositório Supabase base e não abre Realtime para visitante;
- canal interno só nasce quando o repositório interno é efetivamente usado;
- `dispose()` remove o canal.

Testes isolados:

- 🟢 `REALTIME_CATALOG_RUNTIME_OK`;
- 🟢 `REALTIME_CATALOG_LAZY_OK`.

🟠 WebSocket real entre dois browsers continua para o QA integrado.

## 🟢 Mídia / Storage

Bucket: `catalog-media`.

- serving público;
- gestão protegida por `catalog.manage`;
- limite de 50 MB;
- JPEG, PNG, WebP, GIF, MP4, WebM e PDF;
- nomes opacos, `upsert:false`;
- upload direto opcional na `CatalogAdminPage` e URL manual como fallback.

Hardening:

- URL manual deve usar HTTP(S);
- tipos permitidos: `image`, `video`, `document`, `floorplan`;
- mesma validação existe em local, adapter Supabase e trigger real (`catalog.media-validation.sql`);
- lote parcial de upload é limpo quando falha;
- upload não salvo é limpo em cancelamento/troca;
- mídia persistida só é apagada do bucket quando nenhum item ativo ou histórico ainda referencia o mesmo `storagePath`/URL;
- duplicatas podem compartilhar um objeto sem quebrar a mídia uma da outra.

Testes:

- 🟢 SQL real: URL insegura rejeitada, tipo inválido rejeitado, HTTPS válido aceito;
- 🟢 `CATALOG_MEDIA_VALIDATION_OK`;
- 🟢 `MEDIA_REFERENCE_GUARD_OK`.

🟠 Upload real via browser/API integrada ainda depende da sincronização da Frente01.

## 🟢 Factory de integração

Usar:

```ts
const catalogRuntime = createCatalogRuntime(requireSupabase());
```

O runtime devolve:

- `repository` — Supabase + Realtime interno;
- `publicCatalogService` — repositório base, sem Realtime público;
- `mediaStorage` — Storage com proteção de referências;
- `dispose()` — encerra canal interno.

A Frente01 não precisa montar adapters separados.

## 🟢 Integração estrutural já existente na Frente01

Confirmado anteriormente:

- `PlatformRuntimeProvider`;
- `IntegratedCatalog` e `IntegratedDashboard`;
- `/interno/catalogo` e menu;
- OR entre `catalog.view/manage/publish`;
- catálogo público compartilhado com Frente02;
- CRM compartilhado com Dashboard.

A Frente01 também avançou com Realtime compartilhado de CRM/Inbox/Frente05; o catálogo agora possui o mesmo padrão dentro da própria Frente03.

## 🟠 Pendências reais da Frente01 / integrador

1. Sincronizar a versão atual dos módulos Frente03, incluindo:
   - `CatalogAdminPage.tsx`;
   - `Front03Workspace.tsx`;
   - `types.ts`;
   - `catalogRepository.ts`;
   - `supabaseCatalogRepository.ts`;
   - `publicCatalog.ts`;
   - `catalogMediaStorage.ts`;
   - `realtimeCatalogRepository.ts`;
   - `catalogRuntime.ts`;
   - `catalog.schema.sql`;
   - `catalog.public-visibility.sql`;
   - `catalog.sold-integrity.sql`;
   - `catalog.storage.sql`;
   - `catalog.realtime.sql`;
   - `catalog.media-validation.sql`;
   - `index.ts`;
   - `dashboardService.ts`;
   - `DashboardPage.tsx`.
2. Adotar `createCatalogRuntime(requireSupabase())`, expor `mediaStorage` e chamar `dispose()` no ciclo do runtime.
3. Regenerar/conferir `src/core/supabase/database.types.ts` no schema atual.
4. Rodar typecheck/build integrado.
5. Executar QA browser/E2E.

## 🟠 Validação final ainda NÃO VERIFICADA

- build Vite completo integrado;
- typecheck completo do produto integrado;
- upload real pelo Storage API via tela;
- Realtime real em duas sessões/browser;
- fluxo E2E criar → editar → mídia → publicar → site → pausar → republicar → vender unidades → vender empreendimento;
- Dashboard final com dados da operação real.

## Estado para o usuário

🟢 O trabalho próprio da Frente03 está avançado e validado em domínio, banco, RLS, RBAC, catálogo público, Dashboard, Storage e Realtime nos níveis descritos.

🟠 O verde geral depende agora da sincronização na branch integradora e do build/browser/E2E final.
