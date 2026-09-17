# Frente03 — Handoff final de Catálogo + Dashboard

Data: 17/09/2026
Origem: `frente-03`
Base integrada: `frente-01`

## Status

🟢 **FINALIZADA NO ESCOPO INDIVIDUAL.**

A Frente03 não possui bloco obrigatório próprio ainda aberto. O domínio funcional de catálogo e dashboard necessário ao produto integrado já está presente na `frente-01`.

## Entregue

- catálogo administrativo de empreendimento, unidade e imóvel avulso;
- CRUD, duplicação, soft-delete e busca;
- máquina de estados `draft/published/paused/sold`;
- integridade empreendimento/unidade;
- publicação pública hierárquica;
- `PublicCatalogService` com filtros/detalhe/faixa de preço;
- Dashboard sem métricas inventadas;
- Supabase/RLS/RBAC;
- Storage `catalog-media`;
- Realtime interno;
- validação de mídia e proteção de referências;
- integração com runtime global, CRM objetivo e experiência pública por contrato.

## QA já executado

- RLS e RBAC reais;
- visibilidade hierárquica pai/unidade;
- transições inválidas bloqueadas;
- venda de empreendimento com unidade ativa bloqueada;
- zero unidades órfãs;
- zero códigos ativos duplicados;
- zero resíduos de QA ao final;
- Realtime e lifecycle de mídia validados estruturalmente.

## O que permanece para a passada final integrada

Estes itens não mantêm a Frente03 aberta individualmente:

- build/typecheck global com Node 24;
- navegador/E2E autenticado;
- upload real pela UI;
- Realtime real em duas sessões;
- fluxo público completo `publicar → site → pausar → republicar → vender`;
- validação visual final.

A Frente02 ainda possui pendências próprias de hardening/sincronização. Isso não reabre a F03; o contrato produtor da F03 já está implementado e integrado.
