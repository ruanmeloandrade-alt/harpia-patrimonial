# Hárpia Patrimonial — Status das 5 Frentes

Atualizar este arquivo ao iniciar e ao concluir blocos relevantes.

## Frente01 — Núcleo/Auth/Usuários/Permissões

- Branch: `frente-01`
- Status observado pela Frente02: EM ANDAMENTO — backend dedicado ativo; integração entre módulos e E2E ainda pendentes.
- Referência observada: backend `Harpia Patrimonial` ativo, migrations do núcleo aplicadas e contrato público Auth disponível.
- Observação F02: `client_favorites` já existe no banco/schema da Frente01 com RLS e FKs para cliente + catálogo; `database.types.ts` versionado na Frente01 ainda precisa ser regenerado para refletir as tabelas atuais do banco.

## Frente02 — Site público/Área do cliente

- Branch: `frente-02`
- Status: EM ANDAMENTO — BLOQUEIOS DA F01 REDUZIDOS; AGUARDANDO MONTAGEM/INTEGRAÇÃO E QA REAL
- Responsável: chat/agente Frente02 designado pelo usuário em 16/09/2026
- Último commit funcional relevante: `0495b01a9befdc7319526063c5b83132aab36d3b`
- Entregue: home pública com busca real; páginas institucionais; catálogo/filtros/detalhe; tipologia real da Frente03; filtros sanitizados e persistidos em URL; relação unidade → empreendimento; serviços relacionados; área do cliente; favoritos com loading/erro/retry; interesses/histórico por fonte real; retenção; vender/alugar com estado real; Minha conta/menu mobile; acessibilidade; captura de contato; metadados; adapters Auth/Catálogo/CRM; pipeline CRM → WhatsApp; `Front02IntegrationShell`; `Front02ClientAccountShell`; matcher de rotas públicas; adapter `createSupabaseFavoritesStore` para o schema oficial; handoff e semáforo.
- Favoritos reais: tabela `public.client_favorites` já existe no Supabase da Hárpia com PK `(client_id,item_id)`, FK para `user_profiles`, FK para `catalog_items`, RLS e policies de dono. Security Advisor retornou 0 lints. Teste SQL: `anon` vê 0 linhas e role `authenticated` sem identidade vê 0 linhas. Nenhum usuário fictício foi criado.
- Validação executada nesta rodada: contratos atuais da Frente01 relidos; schema real de favoritos inspecionado; Security Advisor executado; constraints/RLS conferidos; tipos atuais do banco gerados para comparação; typecheck isolado do matcher de rotas e adapter de favoritos sem erros.
- NÃO VERIFICADO: escrita/leitura de favorito com conta real; build/typecheck do produto conjunto; execução ponta a ponta com branches integradas; dados reais de interesses/histórico; WhatsApp oficial; responsividade visual em navegador/dispositivos.
- Bloqueios/dependências restantes: Frente01/integrador precisa montar os shells da Frente02 no `AppRouter`, regenerar `database.types.ts` do schema atual e fornecer o client oficial; Frente03 precisa ser instanciada no shell; Frente04 precisa ser instanciada para conversões/dados do cliente.
- Próximo passo: após montagem, executar QA de `/`, catálogo, `/conta`, Auth, favoritos reais e rotas; corrigir regressões F02 e então avançar para F3/F4 e E2E final.

## Frente03 — Catálogo interno/Dashboard

- Branch: `frente-03`
- Status observado pela Frente02: contrato público e schema já existem; integração/validação final ainda pendentes.
- Dependência F02: instanciar `PublicCatalogService` real no `Front02IntegrationShell`/`Front02ClientAccountShell`.

## Frente04 — CRM/Inbox

- Branch: `frente-04`
- Status observado pela Frente02: contrato `LeadConversionEvent`/ingestão compatível com o adapter F02; integração real ainda pendente.
- Dependência F02: instanciar `createFront04ConversionHandler` e, quando disponível, fonte real de histórico/interesses.

## Frente05 — SalesBot/Automatize/IA/Integrações

- Branch: `frente-05`
- Sem dependência direta necessária para a retomada atual da Frente02.

---

# Pedidos entre frentes

- Data/hora: 16/09/2026 — rodada atual
- Origem: Frente02
- Destino: Frente01 / integrador
- Necessidade: montar `Front02IntegrationShell` nas rotas públicas usando `matchesFront02PublicRoute(pathname)` e substituir `PublicPlaceholder`.
- Arquivo/contrato afetado: `src/app/AppRouter.tsx` e composição global.
- Motivo: a Frente02 já exporta o matcher e o shell; o roteador global é propriedade da Frente01.
- Urgência: ALTA.
- Status: PENDENTE DE INTEGRAÇÃO.

- Data/hora: 16/09/2026 — rodada atual
- Origem: Frente02
- Destino: Frente01 / integrador
- Necessidade: substituir o conteúdo básico de `/conta` por `Front02ClientAccountShell` dentro do `ClientRoute`, preservando a guarda da Frente01.
- Arquivo/contrato afetado: `src/app/AppRouter.tsx` / rota `/conta`.
- Motivo: evitar duas áreas do cliente concorrentes e reaproveitar Auth central sem criar nova sessão.
- Urgência: ALTA.
- Status: PENDENTE DE INTEGRAÇÃO.

- Data/hora: 16/09/2026 — rodada atual
- Origem: Frente02
- Destino: Frente01
- Necessidade: regenerar `src/core/supabase/database.types.ts` a partir do Supabase atual antes do build integrado.
- Arquivo/contrato afetado: `src/core/supabase/database.types.ts`.
- Motivo: os tipos atuais do banco já contêm `catalog_items`, `client_favorites` e outras estruturas recentes, enquanto o arquivo versionado observado ainda reflete schema anterior. O adapter F02 usa o client oficial e precisa do tipo atualizado no merge.
- Urgência: ALTA antes do typecheck integrado.
- Status: PENDENTE.

- Data/hora: 16/09/2026 — rodada atual
- Origem: Frente02
- Destino: Frente01 / integrador de dados
- Necessidade: ligar `createSupabaseFavoritesStore(requireSupabase())` ao `Front02ClientAccountShell`/`Front02IntegrationShell` usando o client oficial após regeneração dos tipos.
- Arquivo/contrato afetado: `public.client_favorites`, client Supabase central e composição F02.
- Motivo: tabela/RLS já existem e foram verificados; falta apenas ligação tipada e teste com conta real.
- Urgência: ALTA.
- Status: PENDENTE DE INTEGRAÇÃO.

- Data/hora: 16/09/2026 11:51 BRT
- Origem: Frente02
- Destino: Frente03 / integrador
- Necessidade: instanciar `PublicCatalogService` real por `createFront03PublicCatalogReader` após merge.
- Arquivo/contrato afetado: catálogo público da Frente03 + `src/features/public-catalog/front03Adapter.ts`.
- Motivo: adapter da Frente02 já cobre filtros, estilo de vida, `typology` e empreendimento-pai; falta composição/teste com dados reais.
- Urgência: ALTA.
- Status: PENDENTE DE INTEGRAÇÃO.

- Data/hora: 16/09/2026 11:51 BRT
- Origem: Frente02
- Destino: Frente04 / integrador
- Necessidade: instanciar `createFront04ConversionHandler` sobre o CRM real e, quando existir fonte real, fornecer interesses/histórico associados ao cliente.
- Arquivo/contrato afetado: `LeadConversionEvent`/`ingestLeadConversion` + portas da área do cliente.
- Motivo: captura, bloqueio sem contato, pipeline e UI da Frente02 já estão preparados sem simular mensagem ou histórico.
- Urgência: ALTA para conversões; MÉDIA para histórico.
- Status: PENDENTE DE INTEGRAÇÃO.

---

# Pendências de integração global

- Montar experiência pública F02 no `AppRouter` da Frente01.
- Montar `Front02ClientAccountShell` em `/conta` protegido por `ClientRoute`.
- Regenerar tipos Supabase centrais após schemas atuais de catálogo/favoritos.
- Ligar client Supabase oficial ao adapter de favoritos da Frente02 e testar com conta real.
- Instanciar catálogo publicado da Frente03 na busca pública da Frente02.
- Integrar eventos de conversão da Frente02 com criação de lead da Frente04.
- Integrar fonte real de interesses/histórico quando houver vínculo disponível.
- Executar build/typecheck/E2E e QA visual após composição.
- Configurar WhatsApp/Meta reais somente na fase final, com dados oficiais.

---

# Critério de status

- NÃO INICIADA: nenhuma implementação relevante começou.
- EM ANDAMENTO: há trabalho ativo na branch.
- BLOQUEADA: depende de decisão, contrato, integração ou validação externa à frente.
- PRONTA PARA INTEGRAÇÃO: escopo da frente concluído e testado isoladamente.
- INTEGRADA: merge validado no produto conjunto.
