# Frente03 — Handoff final de Catálogo + Dashboard

Data: 17/09/2026
Branch: `frente-03`

## Status final

🟢 **ESCOPO PRÓPRIO CONCLUÍDO — FRENTE ENCERRADA PARA DESENVOLVIMENTO INDIVIDUAL.**

A Frente03 entregou e validou o domínio de catálogo, persistência, regras de estado, catálogo público, Dashboard, Storage, RLS/RBAC e Realtime. Não existe bloco obrigatório do escopo próprio ainda aberto.

O código funcional de catálogo/dashboard necessário à integração já está presente na `frente-01`. A comparação atual entre `frente-03` e `frente-01` não aponta delta funcional de domínio pendente; os arquivos ainda exclusivos da F03 são documentação e utilitários de QA auxiliares.

## Catálogo e domínio

- empreendimento, unidade e imóvel avulso;
- CRUD, busca, filtros, duplicação e soft-delete;
- código ativo único;
- tipologia obrigatória de unidade;
- estados `draft → published|sold`, `published → paused|sold`, `paused → published|sold`, `sold` terminal;
- integridade pai/unidade;
- empreendimento só pode ser vendido após as unidades ativas;
- histórico preservado em pausa, venda e exclusão lógica.

## Catálogo público

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

## Dashboard

- publicados/elegíveis;
- publicados ocultos;
- estoque ativo;
- rascunhos, pausados e vendidos;
- valor de estoque sem dupla contagem;
- cidade e finalidade;
- leads, origem, próximas ações, demanda por região e interesse por produto quando há referência real do CRM.

Métricas sem semântica objetiva no CRM continuam indisponíveis/zero e não são inferidas por nome de etapa.

## Supabase / Storage / Realtime

Validado no projeto real:

- RLS ativa em `catalog_items`;
- RBAC `catalog.view`, `catalog.manage`, `catalog.publish`;
- `catalog_items` em `supabase_realtime`;
- bucket público `catalog-media`;
- policies de Storage protegidas por `catalog.manage`;
- zero unidades órfãs;
- zero códigos ativos duplicados;
- payload de mídia validado server-side;
- Realtime interno lazy com `dispose()`;
- nenhum mock permanente de inventário.

## Integração com as demais frentes

### Frente01

Integração estrutural concluída: runtime de catálogo, Storage, Realtime, rotas internas, RBAC e Dashboard já estão compostos no produto integrado.

### Frente02

A Frente02 **ainda possui pendências próprias** de hardening/sincronização na experiência pública e área do cliente. Isso não reabre a Frente03: o contrato produtor da F03 já está implementado e integrado. O E2E final `publicar no catálogo interno → aparecer no site público` será executado na passada global quando a F02 estiver fechada.

### Frente04

O provider CRM compartilhado já alimenta o Dashboard no contrato objetivo atual. Não há implementação própria adicional da F03 a fazer.

### Frente05

Não bloqueia a Frente03 e já foi integrada estruturalmente à Frente01.

## QA global do produto — não é pendência individual da F03

Ainda deve ser executado na etapa final integrada:

- `npm run typecheck` no produto integrado com Node 24;
- `npm run build` no produto integrado com Node 24;
- upload real pela UI/browser;
- Realtime real em duas sessões autenticadas;
- E2E visual completo do produto publicado;
- fluxo publicar → site público → pausar → republicar → vender unidade → vender empreendimento.

O executor local desta sessão tem Node 22 e não possui acesso de rede a GitHub/npm, portanto esses testes não foram falsamente marcados como aprovados.

## Encerramento

🟢 **Frente03 finalizada no escopo individual.**

O marcador `.f03-work-in-progress` foi removido no fechamento. Qualquer problema futuro encontrado no build/E2E global deve ser tratado como correção específica baseada em evidência, não como pendência genérica da Frente03.
