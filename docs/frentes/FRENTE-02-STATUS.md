# Frente02 — Semáforo de execução

Data-base: 16/09/2026
Branch: `frente-02`
Estado executivo: EM ANDAMENTO — INTEGRADA ESTRUTURALMENTE NA FRENTE01; QA ESTÁTICO PRÓPRIO NO LIMITE / SYNC, BUILD E E2E PENDENTES

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

A comparação mais recente F01 × F02 mostra **12 arquivos funcionais da F2 com delta a sincronizar**. O restante é documentação/handoff.

## Escopo e andamento

| Status | Item | Estado atual |
|---|---|---|
| 🟢 | Home pública | Implementada e montada estruturalmente. |
| 🟢 | Páginas institucionais | Sobre, Investimentos, Leilões, Jurídico e Arquitetura. |
| 🟢 | Busca rápida na home | Finalidade, cidade, localização e estilo de vida. |
| 🟢 | Cidade → localização na home | Adapter expõe localizações agrupadas por cidade; fallback mantém compatibilidade com readers antigos. Commits `10ee908`, `37fd27a`, `4e092ea`. |
| 🟢 | Busca da home — opções mutáveis | Seleções que deixarem de existir nas opções reais são limpas automaticamente, evitando envio de filtro invisível/obsoleto. Commit `4582891`. |
| 🟢 | Filtros compartilháveis/sanitizados | URL/refresh, NaN, negativos, lançamento inválido, finalidade arbitrária, faixa invertida, caracteres de controle e tamanho excessivo tratados. Commit `3d69514`. |
| 🟢 | Faixa de preço pública | Empreendimento com unidades publicadas usa faixa derivada das unidades, evitando preço próprio enganoso. Commit `afe2d6d`. |
| 🟢 | Catálogo — unidade órfã | F2 descarta unidade sem empreendimento publicado na lista, detalhe e opções de filtro. Commit `3845a83`. |
| 🟢 | Catálogo — lookup resiliente | Detalhe possui fallback case-insensitive para código quando o producer integrado ainda estiver em versão anterior. Commit `e04a7e0`. |
| 🟠 | Último sync do catálogo F3 | Producer atual da F3 possui realtime, validação de mídia e integridade próprias; a jornada pública básica da F2 já possui fallback local, mas a integração global ainda deve sincronizar o producer atual. |
| 🟢 | Tipologia e empreendimento/unidade | Adapter usa `typology` e resolve pai real. |
| 🟢 | Detalhe do imóvel | Galeria, vídeo, características, serviços relacionados, CTA e favorito. |
| 🟢 | Vender/alugar | Formulário só mostra sucesso quando a conversão é aceita. |
| 🟢 | Retenção | Exit-intent + captura implementados. |
| 🟢 | Auth F1 → F2 | Sessão/perfil central consumidos sem segunda autenticação. |
| 🟢 | Isolamento cliente/interno | Dados persistentes da conta só carregam para `client` ativo. Commit `14918a0`. |
| 🟢 | Privacidade — troca de conta | Interesses/histórico da conta anterior ficam ocultos imediatamente antes mesmo do novo carregamento concluir. Commit `2e099d5`. |
| 🟢 | Área do cliente — troca de fonte | Snapshot anterior também é ocultado se a fonte/adapter de dados mudar mantendo a mesma conta. Commit `93a9c69`. |
| 🟢 | Favoritos — banco | `client_favorites` existe com PK/FKs/RLS/policies de dono. |
| 🟢 | Favoritos — resolução | Primeiro por `item_id` estável, slug como fallback. Commit `39f2cd8`. |
| 🟢 | Favoritos — troca de sessão | Respostas/mutações obsoletas não sobrescrevem a conta nova. Commit `a231a10`. |
| 🟢 | Favoritos — isolamento visual entre contas | Favoritos da conta anterior não aparecem nem transitoriamente após troca de identidade. Commit `77811a9`. |
| 🟢 | Favoritos — concorrência | Mutações serializadas por cliente+imóvel. Commit `60ae458`. |
| 🟢 | Favoritos — corrida reload × mutação | Uma leitura iniciada antes de salvar/remover não pode sobrescrever o estado novo. Commit `48a7ea5`. |
| 🟢 | Favoritos — erro visível | Falha de persistência é exibida também fora da Área do Cliente por aviso global descartável. Commits `59e62e3`, `4b8b286`. |
| 🟢 | Área do cliente | Perfil, favoritos, interesses, histórico, loading, erro e retry. |
| 🟢 | Área do cliente — corrida de sessão | Resposta antiga ignorada após troca de conta/source. Commits `6f232a4`, `93a9c69`. |
| 🟢 | Conversão F2→F4 | Contrato atual da F4 confirmado compatível; nome + WhatsApp exigidos. |
| 🟢 | Metadata pública | Identidade é removida antes do ingest; variantes equivalentes de chave são normalizadas/bloqueadas. Commits `c738140`, `dfd6863`. |
| 🟢 | CRM → WhatsApp | Continuação só acontece após sucesso da captura. |
| 🟢 | Conversão — sucesso definitivo do lead | Falha apenas na continuação externa ou no callback de diagnóstico não transforma lead já aceito em falso erro na UI. Commits `ddc19de`, `751e00d`. |
| 🟢 | WhatsApp — mensagem contextual | Campos de usuário são normalizados, limitados e sem caracteres de controle antes de formar o texto. Commit `ba43a7b`. |
| 🟢 | WhatsApp — degradação segura | Número inválido não derruba o site e não impede o lead; apenas desativa a continuação. Commit `d6ef782`. |
| 🟢 | Rota pública malformada | Error Boundary evita tela branca e oferece fallback seguro. Commits `4a5c037`, `4cc14f4`, `158aceae`. |
| 🟢 | Tipos Supabase centrais | Frente01 regenerou `database.types.ts`; `catalog_items` e `client_favorites` agora constam nos tipos. |
| 🟢 | Runtime de catálogo | Frente01 usa `SupabaseCatalogRepository` quando Supabase está configurado. |
| 🟢 | Zero mocks permanentes | Nenhum usuário, imóvel, lead ou favorito fictício foi criado para passar teste. |
| 🟠 | Sync dos hardenings F2 | Cópia integrada F1 ainda não contém os 12 deltas funcionais atuais da F2. |
| 🟠 | Idempotência de favoritos central | Store F1 observado ainda usa `upsert`; RLS observado não possui UPDATE. Recomenda-se `insert` + tratar `23505` ou solução equivalente sem ampliar UPDATE. |
| 🟠 | Integridade clientId do lead | `public-lead-ingest` ainda encaminha metadata do caller. O fluxo legítimo F1 injeta `clientId` após a sanitização F2, mas o backend deve derivar identidade server-side para impedir caller direto forjado. |
| 🟠 | Catálogo real para QA | Backend consultado nesta rodada continua com 0 itens e 0 publicados. |
| 🟠 | Conta/favoritos E2E | Backend consultado continua com 0 perfis e 0 favoritos. |
| 🟠 | WhatsApp final | `organization_settings.phone` continua nulo e a F5 confirma WhatsApp real ainda não conectado. |
| 🟠 | CRM real | Estado CRM existe, mas os contadores consultados continuam com 0 leads e 0 entradas de histórico. |
| 🟠 | Responsividade visual | CSS possui breakpoints desktop/tablet/mobile; browser integrado ainda não foi validado visualmente. |
| 🔴 | Typecheck/build integrado | NÃO VERIFICADO. Ambiente disponível nesta sessão possui apenas Node `22.16.0`; projeto exige `>=24 <25`. |
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
9. `src/features/public-site/conversionPipeline.ts`;
10. `src/features/public-site/front04ConversionAdapter.ts`;
11. `src/features/public-site/usePublicFavoritesBridge.ts`;
12. `src/features/public-site/whatsappContinuation.ts`.

## Pendências compartilhadas prioritárias

### Frente01 / backend

1. sincronizar os 12 arquivos funcionais acima;
2. alinhar `SupabaseFavoritesStore.add()` ao RLS sem depender de UPDATE desnecessário;
3. endurecer `public-lead-ingest` para derivar identidade server-side quando houver JWT válido;
4. manter `client-area-data` vinculando dados somente à identidade autenticada;
5. executar typecheck/build no ambiente correto.

### Frente03 / integração

- sincronizar a versão atual do catálogo/realtime na integração global para manter producer e runtime alinhados; a F2 já possui fallback local para a jornada pública básica.

### Dados reais / operação

- telefone oficial para WhatsApp;
- conta real de cliente;
- item real publicado;
- atendimento/conversão real.

## Primeira entrega

Checklist específico: `docs/frentes/FRENTE-02-ENTREGA-01.md`.

## Próximo passo da Frente02

O QA estático próprio chegou ao limite útil sem invadir ownership de outra frente ou inventar dados. Assim que os syncs F1/F3 ou dados operacionais entrarem, retomar imediatamente QA integrado. Build, browser e E2E permanecem `NÃO VERIFICADO` até execução real.
