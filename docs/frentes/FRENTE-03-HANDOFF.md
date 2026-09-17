# Frente03 — Handoff final de Catálogo + Dashboard

Data: 17/09/2026
Branch: `frente-03`

Legenda:

- 🟢 completo e testável no nível indicado;
- 🟠 validação global ainda não executada;
- 🔴 não iniciado.

## Status da Frente03

🟢 **ESCOPO PRÓPRIO CONCLUÍDO — FRENTE ENCERRADA PARA DESENVOLVIMENTO.**

A Frente03 entregou e validou o domínio de catálogo, persistência, regras de estado, catálogo público, Dashboard, Storage, RLS/RBAC e Realtime. Não há dependência funcional restante da Frente01, Frente02, Frente04 ou Frente05 para continuar implementação própria da Frente03.

## 🟢 Catálogo e domínio

- empreendimento, unidade e imóvel avulso;
- CRUD, busca, filtros, duplicação e soft-delete;
- código ativo único;
- tipologia obrigatória de unidade;
- estados `draft → published|sold`, `published → paused|sold`, `paused → published|sold`, `sold` terminal;
- integridade pai/unidade;
- empreendimento só pode ser vendido após as unidades ativas;
- histórico preservado em pausa, venda e exclusão lógica.

## 🟢 Catálogo público

`PublicCatalogService` validado com:

- listagem e filtros reais;
- detalhe por id/código;
- unidades por empreendimento;
- faixa de preço;
- menor preço público derivado das unidades publicadas quando aplicável;
- `storagePath` fora do contrato público;
- unidade publicada só exposta publicamente quando o empreendimento pai também está publicado.

QA real adicional de 17/09/2026 confirmou:

- unidade publicada com pai em `draft` invisível para `anon`;
- publicação do pai torna a unidade visível;
- pausa do pai torna a unidade invisível novamente;
- venda do pai com unidade ativa bloqueada;
- venda da unidade e depois do pai permitida;
- `sold` terminal;
- zero resíduos `QA-%` / `QA-F03-%` após limpeza.

## 🟢 Dashboard

- publicados/elegíveis;
- publicados ocultos;
- estoque ativo;
- rascunhos, pausados e vendidos;
- valor de estoque sem dupla contagem;
- cidade e finalidade;
- leads, origem, próximas ações, demanda por região e interesse por produto quando há referência real do CRM.

Métricas sem semântica objetiva no CRM continuam indisponíveis/zero e não são inferidas por nome de etapa.

## 🟢 Supabase / Storage / Realtime

Projeto real validado com:

- RLS ativa em `catalog_items`;
- RBAC `catalog.view`, `catalog.manage`, `catalog.publish`;
- `catalog_items` em `supabase_realtime`;
- bucket público `catalog-media` presente;
- policies de Storage protegidas por `catalog.manage`;
- zero unidades órfãs;
- zero códigos ativos duplicados;
- payload de mídia validado server-side;
- Realtime interno lazy com `dispose()`;
- nenhum mock permanente de inventário.

## 🟢 Integração com Frente01

Confirmado no estado integrado:

- `PlatformRuntimeProvider` usa `createCatalogRuntime`;
- runtime expõe `catalogRepository`, `publicCatalogService` e `catalogMediaStorage`;
- `catalogRuntime.dispose()` está no cleanup;
- `IntegratedCatalog` recebe repository, Storage e RBAC granular;
- `IntegratedDashboard` recebe catálogo e provider comercial;
- `/interno/catalogo` existe;
- tipos Supabase do catálogo estão presentes.

O arquivo produtor `src/features/catalog/publicCatalog.ts` possui o mesmo SHA na `frente-03` e na `frente-01` (`d48892fc8fcd8f87638bb79c592b6b72902502da`).

## 🟢 Integração com Frente02 final

A Frente02 encerrou o escopo próprio em 17/09/2026.

O adapter `src/features/public-catalog/front03Adapter.ts` possui o mesmo SHA na `frente-02` final e na `frente-01` integrada (`f9297367cb89de798646472d7529a4539e547806`). Portanto o contrato final F03 → F02 está sincronizado no ponto de integração relevante para a Frente03.

## 🟢 Integração com Frente04 e Frente05

- Frente04: provider CRM compartilhado já alimenta o Dashboard no contrato objetivo atual.
- Frente05: não bloqueia a Frente03.

## 🟠 QA global do produto — não reabre a Frente03

Ainda não foram declarados como executados neste chat:

- `npm run typecheck` no produto integrado;
- `npm run build` no produto integrado;
- upload real pela UI/browser;
- Realtime real em duas sessões autenticadas;
- E2E visual completo do produto publicado.

Esses itens permanecem como **validação global de integração/ambiente**, não como implementação pendente da Frente03. Não devem manter a Frente03 aberta como frente de desenvolvimento.

## Encerramento

🟢 **Frente03 concluída e entregue para integração final.**

Commit deste handoff deve ser tratado como marco de encerramento da Frente03. Qualquer falha futura encontrada no build/E2E global deve ser reaberta como correção específica, com evidência do problema, e não como pendência genérica desta frente.
