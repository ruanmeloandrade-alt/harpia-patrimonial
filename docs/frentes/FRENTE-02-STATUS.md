# Frente02 — Semáforo de execução

Data-base: 16/09/2026
Branch: `frente-02`
Estado executivo: EM ANDAMENTO — INTEGRADA ESTRUTURALMENTE NA FRENTE01; QA ESTÁTICO ATIVO / SYNC, BUILD E E2E PENDENTES

## Legenda

- 🟢 CONCLUÍDO: implementado e confirmado no recorte descrito.
- 🟠 PARCIAL / INTEGRAÇÃO: implementação existe, mas falta sync, dado real, correção compartilhada ou validação executável.
- 🔴 NÃO CONCLUÍDO: validação obrigatória ainda não executada.

## Estado integrado atual

A Frente01 já incorporou a base funcional da Frente02 ao produto conjunto:

- `AppRouter` encaminha as rotas públicas para a experiência integrada;
- Auth e sessão vêm exclusivamente da Frente01;
- `PlatformRuntime` usa `SupabaseCatalogRepository` quando o backend está configurado;
- favoritos usam store Supabase central;
- conversões públicas usam `public-lead-ingest`;
- interesses/histórico usam `client-area-data`;
- `/conta` encaminha para a área do cliente da experiência pública.

A comparação mais recente F01 × F02 mostra **10 arquivos funcionais da F2 com delta a sincronizar**. O restante é documentação/handoff.

## Escopo e andamento

| Status | Item | Estado atual |
|---|---|---|
| 🟢 | Home pública | Implementada e montada estruturalmente. |
| 🟢 | Páginas institucionais | Sobre, Investimentos, Leilões, Jurídico e Arquitetura. |
| 🟢 | Busca rápida na home | Finalidade, cidade, localização e estilo de vida. |
| 🟢 | Cidade → localização na home | Adapter expõe localizações agrupadas por cidade; fallback mantém compatibilidade com readers antigos. Commits `10ee908`, `37fd27a`, `4e092ea`. |
| 🟢 | Filtros compartilháveis/sanitizados | URL/refresh, NaN, negativos, lançamento inválido, finalidade arbitrária e faixa invertida tratados. |
| 🟢 | Faixa de preço pública | Empreendimento com unidades publicadas usa faixa derivada das unidades, evitando preço próprio enganoso. Commit `afe2d6d`. |
| 🟢 | Catálogo — unidade órfã | F2 descarta unidade sem empreendimento publicado na lista, detalhe e opções de filtro. Commit `3845a83`. |
| 🟠 | Último sync do catálogo F3 | Producer atual da F3 também reforça visibilidade, lookup case-insensitive e integridade; precisa entrar na integração global. |
| 🟢 | Tipologia e empreendimento/unidade | Adapter usa `typology` e resolve pai real. |
| 🟢 | Detalhe do imóvel | Galeria, vídeo, características, serviços relacionados, CTA e favorito. |
| 🟢 | Vender/alugar | Formulário só mostra sucesso quando a conversão é aceita. |
| 🟢 | Retenção | Exit-intent + captura implementados. |
| 🟢 | Auth F1 → F2 | Sessão/perfil central consumidos sem segunda autenticação. |
| 🟢 | Isolamento cliente/interno | Dados persistentes da conta só carregam para `client` ativo. Commit `14918a0`. |
| 🟢 | Favoritos — banco | `client_favorites` existe com PK/FKs/RLS/policies de dono. |
| 🟢 | Favoritos — resolução | Primeiro por `item_id` estável, slug como fallback. Commit `39f2cd8`. |
| 🟢 | Favoritos — troca de sessão | Respostas/mutações obsoletas não sobrescrevem a conta nova. Commit `a231a10`. |
| 🟢 | Favoritos — concorrência | Mutações serializadas por cliente+imóvel. Commit `60ae458`. |
| 🟢 | Área do cliente | Perfil, favoritos, interesses, histórico, loading, erro e retry. |
| 🟢 | Área do cliente — corrida de sessão | Resposta antiga ignorada após troca de conta/source. Commit `6f232a4`. |
| 🟢 | Conversão F2→F4 | Contrato atual da F4 confirmado compatível; nome + WhatsApp exigidos. |
| 🟢 | Metadata pública | Identidade é removida antes do ingest; variantes como `clientId`, `client_id` e `client-id` são normalizadas/bloqueadas. Commits `c738140`, `dfd6863`. |
| 🟢 | CRM → WhatsApp | Continuação só acontece após sucesso da captura. |
| 🟢 | WhatsApp — degradação segura | Número inválido não derruba o site e não impede o lead; apenas desativa a continuação. Commit `d6ef782`. |
| 🟢 | Rota pública malformada | Error Boundary evita tela branca e oferece fallback seguro. Commits `4a5c037`, `4cc14f4`, `158aceae`. |
| 🟢 | Tipos Supabase centrais | Frente01 regenerou `database.types.ts`; `catalog_items` e `client_favorites` agora constam nos tipos. |
| 🟢 | Runtime de catálogo | Frente01 usa `SupabaseCatalogRepository` quando Supabase está configurado. |
| 🟢 | Zero mocks permanentes | Nenhum usuário, imóvel, lead ou favorito fictício foi criado para passar teste. |
| 🟠 | Sync dos hardenings F2 | Cópia integrada F1 ainda não contém os 10 deltas funcionais atuais da F2. |
| 🟠 | Idempotência de favoritos central | Store F1 observado ainda usa `upsert`; RLS observado não possui UPDATE. Recomenda-se `insert` + tratar `23505` ou solução equivalente sem ampliar UPDATE. |
| 🟠 | Integridade clientId do lead | `public-lead-ingest` ainda encaminha metadata do caller. Backend deve remover identidade enviada e derivar vínculo server-side do JWT válido. |
| 🟠 | Catálogo real para QA | Backend observado ainda sem item publicado real. |
| 🟠 | Conta/favoritos E2E | Falta conta real para validar sessão e persistência ponta a ponta. |
| 🟠 | WhatsApp final | Telefone oficial da organização ainda não confirmado/configurado no runtime observado. |
| 🟠 | CRM real | Falta atendimento real para validar interesses/histórico ponta a ponta. |
| 🟠 | Responsividade visual | CSS existe, mas browser integrado ainda não foi validado. |
| 🔴 | Typecheck/build integrado | NÃO VERIFICADO no ambiente exigido (`Node >=24 <25`). |
| 🔴 | E2E/browser real | NÃO VERIFICADO. |

## Delta funcional atual F02 → F01

Arquivos observados como diferentes na comparação mais recente:

1. `src/features/client-area/useClientAreaData.ts`;
2. `src/features/public-catalog/contracts.ts`;
3. `src/features/public-catalog/front03Adapter.ts`;
4. `src/features/public-site/Front02IntegrationShell.tsx`;
5. `src/features/public-site/HomeCatalogSearch.tsx`;
6. `src/features/public-site/PublicExperience.tsx`;
7. `src/features/public-site/PublicExperienceBoundary.tsx`;
8. `src/features/public-site/catalogQuery.ts`;
9. `src/features/public-site/front04ConversionAdapter.ts`;
10. `src/features/public-site/usePublicFavoritesBridge.ts`.

## Pendências compartilhadas prioritárias

### Frente01 / backend

1. sincronizar os 10 arquivos funcionais acima;
2. alinhar `SupabaseFavoritesStore.add()` ao RLS sem depender de UPDATE desnecessário;
3. endurecer `public-lead-ingest` para derivar identidade server-side quando houver JWT válido;
4. manter `client-area-data` vinculando dados somente à identidade autenticada;
5. executar typecheck/build no ambiente correto.

### Frente03 / integração

- sincronizar a versão atual do catálogo público e depois validar com item real publicado.

### Dados reais / operação

- telefone oficial para WhatsApp;
- conta real de cliente;
- item real publicado;
- atendimento/conversão real.

## Primeira entrega

Checklist específico: `docs/frentes/FRENTE-02-ENTREGA-01.md`.

## Próximo passo da Frente02

Continuar QA estático somente onde houver trabalho próprio real. Assim que os syncs F1/F3 entrarem, retomar imediatamente QA integrado com dados reais disponíveis. Build, browser e E2E permanecem `NÃO VERIFICADO` até execução real.
