# Frente03 — Catálogo interno, publicação e dashboard

Branch obrigatória: `frente-03`

## Missão

Construir a operação interna de produtos/imóveis da Hárpia e o dashboard real, garantindo que um cadastro interno alimente o catálogo público somente após publicação explícita.

## Escopo exclusivo

### Catálogo administrativo

Administrar:

- empreendimento/produto;
- unidades de empreendimento;
- imóvel avulso.

Campos mínimos:

- código, nome, tipo, finalidade e descrição;
- cidade, bairro/condomínio/localização e endereço;
- preço/faixa de preço;
- lançamento;
- características e atributos de estilo de vida;
- incorporadora/origem;
- fotos, vídeos, plantas e arquivos;
- status/publicação.

Ações:

- criar;
- editar;
- duplicar;
- publicar;
- pausar;
- marcar vendido;
- excluir com confirmação.

### Relação empreendimento/unidades

Unidade suporta código, tipologia, preço, status, dados específicos e mídia própria. Imóvel avulso não exige pai.

### Contrato público

Expor somente itens publicamente elegíveis, com listagem, filtros, detalhe, cidades/localizações derivadas, relação empreendimento/unidade, status e mídia.

### Dashboard

Usar apenas dados reais para:

- estoque/produtos ativos;
- leads;
- visitas;
- propostas;
- negociações;
- vendas;
- VGV/pipeline;
- ticket;
- conversão;
- origem dos leads;
- performance/interesse por produto;
- demanda por região;
- agenda/próximas ações.

Métricas não suportadas objetivamente pela Frente04 permanecem em zero/indisponíveis; nunca inferir por nome de etapa.

## Regras obrigatórias

- nenhum mock permanente;
- cadastro nasce `draft`;
- publicação é explícita;
- `paused` sai da exposição pública preservando histórico;
- `sold` é histórico e terminal;
- exclusão é lógica/protegida;
- duplicação cria identificadores/código válidos;
- unidade publicada só é pública se o empreendimento pai também estiver publicado e ativo;
- não cadastrar estoque real nesta fase;
- não implementar CRM/SalesBot/Meta/WhatsApp nesta frente.

## Ownership

Preferencialmente:

- `src/features/catalog/**`;
- `src/features/dashboard/**`;
- serviços/repositórios/tipos específicos do domínio imobiliário e mídia.

Não editar sem coordenação:

- auth/RBAC;
- roteador/shell global;
- site público;
- CRM/Inbox;
- SalesBot/Automatize/IA;
- configuração global pertencente à Frente01.

## Critérios de aceite

- usuário autorizado acessa o catálogo;
- empreendimento, unidade e avulso podem ser criados;
- fotos/vídeos/arquivos estão contemplados;
- publicar/pausar/vender/duplicar/excluir são coerentes;
- catálogo público só consome elegíveis;
- filtros vêm dos dados reais;
- Dashboard não contém números fictícios;
- empty states claros;
- build integrado funciona.

---

# Handoff atual — 17/09/2026

Legenda: 🟢 completo/testado no nível indicado | 🟠 parcial/aguardando validação essencial | 🔴 não iniciado.

## Status geral

🟠 **TRABALHO PRÓPRIO IMPLEMENTADO E BACKEND REAL VALIDADO; INTEGRAÇÃO ESTRUTURAL COM A FRENTE01 LIBERADA; RESTAM BUILD/TYPECHECK E QA BROWSER/E2E.**

## 🟢 Domínio, persistência e estado

- modelos de empreendimento, unidade e avulso;
- tipologia, finalidade, localização, preço, lifestyle tags e mídia;
- `LocalCatalogRepository` e `SupabaseCatalogRepository`;
- CRUD, busca, duplicação segura e soft-delete;
- código ativo único;
- máquina de estados real: `draft→published|sold`, `published→paused|sold`, `paused→published|sold`, `sold` terminal;
- `published_at` e `sold_at` controlados no banco;
- unidade nova/realocada não aponta para empreendimento vendido;
- unidade histórica sob pai vendido continua editável;
- empreendimento só é vendido depois das unidades ativas;
- pai com unidades ativas não pode ser excluído/convertido deixando órfãos.

## 🟢 Supabase/RLS/RBAC real

Projeto dedicado: `desxomqvtjaymwwxivwq`.

Migrations Frente03 aplicadas:

1. `catalog_front03`;
2. `catalog_front03_grants_hardening`;
3. `catalog_front03_select_policy_performance`;
4. `catalog_front03_status_transitions`;
5. `catalog_front03_media_storage`;
6. `catalog_front03_public_unit_parent_visibility`;
7. `catalog_front03_sold_development_integrity`;
8. `catalog_front03_realtime`;
9. `catalog_front03_media_payload_validation`.

QA real:

- anon só vê publicamente elegíveis;
- cliente autenticado comum não ganha acesso interno;
- `catalog.view/manage/publish` testados separadamente;
- código duplicado/tipologia ausente/transições inválidas bloqueados;
- integridade pai/unidade validada;
- payload de mídia inseguro/tipo inválido bloqueados;
- RLS de `catalog_items` ativa;
- `catalog_items` presente em `supabase_realtime`;
- bucket público `catalog-media` presente;
- policies do bucket exigem `catalog.manage` para gestão autenticada;
- 0 unidades órfãs;
- 0 códigos ativos duplicados;
- 0 resíduos `QA-%` / `QA-F03-%` após testes;
- Security Advisor = 0 findings na última verificação registrada.

### QA hierárquico adicional — 17/09/2026

Teste transitório no backend real, com limpeza confirmada ao final:

- unidade `published` + pai `draft` → invisível para `anon`;
- pai muda para `published` → unidade passa a ser visível para `anon`;
- pai muda para `paused` → unidade volta a ser invisível para `anon`;
- venda do empreendimento com unidade ainda ativa → bloqueada;
- venda da unidade seguida da venda do empreendimento → permitida;
- tentativa de alterar status após `sold` → bloqueada.

O backend aceita publicação interna antecipada de uma unidade enquanto o pai está em `draft`; a RLS pública mantém essa unidade invisível. Esse comportamento está coerente com a regra atual de elegibilidade pública hierárquica.

## 🟢 Catálogo público

`PublicCatalogService` entrega:

- listagem/filtros;
- detalhe id/código;
- unidades por empreendimento;
- bundle de empreendimento;
- opções reais de filtro;
- faixa de preço derivada das unidades publicadas;
- preço público do empreendimento como menor preço das unidades publicadas quando existirem;
- fallback ao preço do pai quando não houver unidade publicada com preço;
- mídia sem `storagePath` operacional.

Teste da coerência de preço público: `PUBLIC_DEVELOPMENT_PRICE_OK`.

## 🟢 Dashboard

Patrimonial:

- publicados/elegíveis;
- publicados ocultos pelo pai (`hiddenPublished`);
- estoque ativo (`inventoryCount`);
- rascunhos, pausados e vendidos;
- valor de estoque sem dupla contagem;
- cidade e finalidade.

Testes isolados:

- `DASHBOARD_HIDDEN_PUBLISHED_OK`;
- `DASHBOARD_INVENTORY_COUNT_OK`.

CRM objetivo atual:

- leads;
- origem;
- próximas ações;
- demanda regional quando há `interest.referenceId`;
- interesse por produto.

Visitas/propostas/negociações/vendas/VGV/ticket/conversão continuam sem fonte semântica objetiva na Frente04 e não são inventadas.

## 🟢 Mídia / Storage

Bucket real `catalog-media`:

- serving público;
- gestão sob `catalog.manage`;
- limite 50 MB;
- JPEG/PNG/WebP/GIF/MP4/WebM/PDF;
- nomes opacos e `upsert:false`.

Lifecycle:

- upload direto opcional + URL manual;
- URL manual limitada a HTTP(S);
- lote parcial limpo em erro;
- uploads não salvos limpos em cancelamento/troca;
- `storagePath` interno;
- remoção só apaga objeto quando nenhuma referência ativa ou histórica permanece;
- duplicatas podem compartilhar mídia com segurança.

Testes:

- `CATALOG_MEDIA_VALIDATION_OK`;
- `MEDIA_REFERENCE_GUARD_OK`;
- QA SQL real de payload de mídia.

## 🟢 Realtime

- `catalog_items` incluído em `supabase_realtime`;
- `RealtimeCatalogRepository` para área interna;
- público usa repositório base sem canal Realtime;
- canal abre apenas com uso interno e possui `dispose()`;
- eventos remotos convertem para `harpia:catalog-changed`.

Testes:

- `REALTIME_CATALOG_RUNTIME_OK`;
- `REALTIME_CATALOG_LAZY_OK`.

## 🟢 Integração estrutural Frente01

A Frente01 já declarou a dependência estrutural da Frente03 como **LIBERADA** e mantém:

- Supabase/Auth/RBAC;
- `PlatformRuntimeProvider` usando `createCatalogRuntime`;
- `catalogRepository`, `publicCatalogService` e `catalogMediaStorage` no runtime;
- cleanup por `catalogRuntime.dispose()`;
- `IntegratedCatalog` / `IntegratedDashboard`;
- rota `/interno/catalogo` e menu;
- RBAC granular do catálogo;
- catálogo público repassado à Frente02;
- CRM compartilhado repassado ao Dashboard;
- tipos Supabase alinhados ao schema integrado.

Não existe mais ação estrutural pendente da Frente01 para o código próprio da Frente03.

## 🟢 Integração Frente04

A fonte comercial objetiva já está composta no Dashboard via integração global.

Não há nova métrica avançada que a Frente03 deva inferir por conta própria. Só entram como disponíveis métricas que a Frente04 expõe com semântica objetiva.

## 🟢 Frente05

Não bloqueia o escopo próprio nem o fechamento técnico da Frente03.

## 🟠 Dependência Frente02 para E2E público

O contrato F03 → F02 está integrado, mas a publicação pública atual da Frente02 ainda precisa estar no estado final para validar no navegador o trecho:

`publicar no catálogo interno → item aparecer no site público publicado`.

Isso não bloqueia backend, domínio, RLS ou contrato público da Frente03.

## 🟠 Validações finais ainda não verificadas

- `npm run typecheck` no produto integrado;
- `npm run build` no produto integrado;
- upload real pelo navegador;
- Realtime real entre duas sessões autenticadas;
- criar → editar → mídia → publicar → site → pausar → republicar → vender unidades → vender empreendimento;
- validação visual do Dashboard/site;
- teste final pelo usuário.

## Bloqueio de ambiente desta sessão

- o estado consultado da Frente01 continua sem `package-lock.json`;
- o projeto exige Node 24;
- o executor local disponível nesta sessão está em Node 22 e sem dependências npm instaladas/cacheadas.

Por isso build/typecheck consolidado não é marcado como aprovado sem execução real.

## Estado final desta frente agora

🟢 Não há bloco obrigatório do escopo próprio identificado como não iniciado.

🟢 A dependência estrutural da Frente01 está encerrada.

🟢 A Frente05 não bloqueia a Frente03.

🟠 O verde geral depende das validações de ambiente integrado: build/typecheck, navegador/E2E, upload real, Realtime multi-sessão e trecho público dependente da publicação final da Frente02.