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

# Handoff atual — 16/09/2026

Legenda: 🟢 completo/testado no nível indicado | 🟠 parcial/aguardando integração essencial | 🔴 não iniciado.

## Status geral

🟠 **TRABALHO PRÓPRIO FUNCIONAL FECHADO NOS BLOCOS PRINCIPAIS; AGUARDANDO SINCRONIZAÇÃO NA FRENTE01 + BUILD/BROWSER/E2E.**

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
- 0 resíduos `QA-%` após testes;
- Security Advisor = 0 findings.

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

## 🟢 Integração estrutural já existente

Na Frente01 já foram observados:

- Supabase/Auth/RBAC;
- `PlatformRuntimeProvider`;
- `IntegratedCatalog` / `IntegratedDashboard`;
- rota `/interno/catalogo` e menu;
- OR entre `catalog.view/manage/publish`;
- catálogo público repassado à Frente02;
- CRM compartilhado repassado ao Dashboard.

## 🟠 Dependências externas restantes

Frente01/integrador ainda precisa:

1. sincronizar a versão atual dos módulos Frente03;
2. usar `createCatalogRuntime(requireSupabase())` ou composição equivalente;
3. expor `mediaStorage` no runtime global;
4. chamar `catalogRuntime.dispose()` no ciclo de vida do runtime;
5. regenerar/conferir `database.types.ts` com o schema atual;
6. rodar typecheck/build integrado.

QA conjunto ainda necessário:

- upload real pelo navegador;
- Realtime real entre duas sessões;
- criar → editar → mídia → publicar → site → pausar → republicar → vender unidades → vender empreendimento;
- validação visual do Dashboard/site;
- teste final pelo usuário.

## Estado final desta frente agora

🟢 Não há bloco obrigatório do escopo próprio identificado como totalmente não iniciado.

🟠 O verde geral depende de integração sincronizada + build/browser/E2E real; nenhum desses pontos é declarado aprovado sem execução.
