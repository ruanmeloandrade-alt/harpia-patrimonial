# Frente03 — Handoff de Catálogo + Dashboard

Data: 16/09/2026
Branch: `frente-03`

Legenda:

- 🟢 completo e testável no nível indicado;
- 🟠 parcial/aguardando validação essencial;
- 🔴 não iniciado.

## Status geral

🟠 **INTEGRADA NA FRENTE01 + BACKEND REAL VALIDADO; FALTAM BUILD/TYPECHECK CONSOLIDADO E QA REAL DE NAVEGADOR/E2E.**

A Frente01 já incorporou integralmente a Frente03 atual e usa o runtime de catálogo, Storage, Realtime e tipos Supabase atualizados.

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

No HEAD atual da Frente01:

- `PlatformRuntimeProvider` usa `createCatalogRuntime`;
- runtime expõe `catalogRepository`, `publicCatalogService` e `catalogMediaStorage`;
- `catalogRuntime.dispose()` é chamado no cleanup;
- `IntegratedCatalog` recebe `repository` + `mediaStorage` + RBAC granular;
- `IntegratedDashboard` recebe catálogo e provider comercial compartilhado;
- `/interno/catalogo` e menu existem;
- Frente02 recebe `runtime.publicCatalogService`;
- `database.types.ts` contém `catalog_items`, relacionamento pai/unidade e enums do catálogo;
- tipos gerados foram conferidos contra o schema real;
- comparação de branches confirmou a Frente03 integralmente incorporada na Frente01.

## 🟠 Validação final ainda NÃO VERIFICADA

- `npm run typecheck` no produto integrado;
- `npm run build` no produto integrado;
- upload real pelo Storage API via tela;
- Realtime real em duas sessões/browser;
- fluxo E2E criar → editar → mídia → publicar → site → pausar → republicar → vender unidades → vender empreendimento;
- Dashboard final com dados da operação real;
- teste final pelo usuário.

## Bloqueio técnico atual deste chat

- Frente01 ainda não possui `package-lock.json`;
- executor local desta sessão usa Node 22, enquanto o projeto exige Node 24;
- dependências npm do projeto não estão instaladas/cacheadas neste executor.

Por isso build/typecheck consolidado não foi declarado aprovado.

## Estado para o usuário

🟢 Não há dependência estrutural restante da Frente01 para a Frente03.

🟠 O verde geral depende somente de build/typecheck em ambiente compatível e QA browser/E2E real.