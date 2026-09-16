# Hárpia Patrimonial — Status das 5 Frentes

Atualizar este arquivo ao iniciar e ao concluir blocos relevantes.

## Frente01 — Núcleo/Auth/Usuários/Permissões

- Branch: `frente-01`
- Observação da Frente05 em 16/09/2026: a Frente01 já possui shell/rotas internos, autenticação/RBAC, backend Supabase, estado compartilhado, cofre IA e composição dos runtimes da F05. O status autoritativo da Frente01 permanece na própria branch/chat da Frente01.

## Frente02 — Site público/Área do cliente

- Branch: `frente-02`
- Status autoritativo: consultar a própria branch/chat da Frente02.

## Frente03 — Catálogo interno/Dashboard

- Branch: `frente-03`
- Status autoritativo: consultar a própria branch/chat da Frente03.

## Frente04 — CRM/Inbox

- Branch: `frente-04`
- Status autoritativo: consultar a própria branch/chat da Frente04.
- Observação F05: a branch integrada da Frente01 já contém adapters CRM/Inbox ↔ F05 e composição estrutural para QA conjunto.

## Frente05 — SalesBot/Automatize/IA/Integrações

- Branch: `frente-05`
- Status: PRONTA PARA INTEGRAÇÃO — núcleo F05 concluído; integração estrutural com F01 já existe; faltam sincronização final, build/typecheck e E2E real.
- Responsável: chat atual — Frente05
- Últimos commits relevantes desta rodada: `c89d8b02fac2d03e349f3d6ad57f87b549534e06` (hardening storage), `6464c195fe1a7e94ff07d5eef5b1a6a76572a152` (runtime IA canônico), `dc5fce688d6a1b8a98b640994720b43d794c3c33` (cofre canônico).
- Relatório de testes: `docs/frentes/FRENTE-05-TESTES.md`
- Handoff atualizado para Frente01: `docs/frentes/FRENTE-05-INTEGRACAO-F01.md`

### Entregue no núcleo F05

- SalesBot: CRUD, catálogo completo de blocos, validação, referências cruzadas, ativar/pausar, duplicação, runtime retomável e encadeamento;
- Automatize: eventos, condições, ações, validação, ordenação, duplicação e motor sequencial;
- agentes IA: configuração, provedor/modelo, ativação, execução, pausa contratual e logs sem persistir prompt/resposta;
- contratos CRM/Inbox públicos e desacoplados;
- logs SalesBot + IA sem histórico fictício;
- integrações configuráveis;
- provedores OpenAI/Codex, Anthropic/Claude, Google Gemini e customizado;
- RBAC F05 com view/manage e modo somente leitura;
- API pública consolidada em `src/features/automations/index.ts`.

### Novo após os avanços da Frente01

- F05 agora possui contrato oficial de storage compartilhado com fallback local apenas para standalone/testes;
- quando `configureF05SharedStorage` é usado, o backend compartilhado vira fonte de verdade e localStorage deixa de ser usado;
- storage compartilhado da integração usa Supabase com optimistic locking por revisão;
- adapter de cofre F05 foi alinhado ao `ai-credential-vault` canônico da Frente01;
- adapter de runtime IA F05 foi alinhado ao `ai-model-invoke` canônico da Frente01;
- executor duplicado `ai-provider-runtime` foi removido da fonte da branch F05;
- hardening do RPC `save_f05_shared_storage` aplicado no Supabase real: anon sem EXECUTE, RPC público SECURITY INVOKER, elevação privilegiada movida para schema privado;
- o warning do Security Advisor referente à função da Frente05 foi eliminado.

### Integração estrutural já confirmada na branch Frente01

- rotas/sidebar para SalesBot, Automatize, Agentes IA, Execuções e Integrações;
- gate de hidratação: módulos F05 só renderizam após estado compartilhado estar pronto;
- CRM → `processCrmAutomationEvent`;
- ações CRM consumidas pelo SalesBot/Automatize;
- Inbox → command ports SalesBot/IA;
- SalesBot composto com CRM + IA;
- runtime IA server-side seguro composto no PlatformRuntime;
- cofre IA real com Supabase Vault;
- estado F05 compartilhado em banco.

### Segurança / backend

- chave API nunca é persistida em localStorage, código ou documentação;
- navegador trabalha com `secretRef`; chave bruta é resolvida somente server-side;
- `ai-model-invoke` e `ai-credential-vault` exigem JWT;
- perfis IA são carregados do estado compartilhado canônico antes da execução;
- acesso anônimo ao RPC de escrita F05 foi explicitamente removido;
- Security Advisor atual: não há mais finding da Frente05; permanecem dois warnings globais da Frente01 em RPCs fora do escopo F05 (`list_internal_assignees` e `save_platform_module_state`).

### NÃO VERIFICADO AINDA

- build Vite/typecheck do produto totalmente consolidado;
- QA visual real logado em todas as rotas F05;
- E2E de permissões com usuário interno real;
- salvar/remover chave pela UI com administrador real;
- chamada real a OpenAI/Anthropic/Gemini com uma chave real do cliente;
- comportamento ponta a ponta completo com dados reais do CRM/Inbox;
- WhatsApp real;
- Meta real.

### Dependências/pedidos atuais

- Frente01: sincronizar os commits recentes da `frente-05` antes do QA final. O handoff atualizado está em `docs/frentes/FRENTE-05-INTEGRACAO-F01.md`.
- Frente01: manter `ai-model-invoke` como runtime canônico; hardening recomendado: timeout explícito e bloqueio de CGNAT `100.64.0.0/10` em endpoint customizado.
- Frente04: nenhuma mudança de contrato nova exigida nesta rodada; os adapters estruturais já estão presentes na integração F01, mas o E2E operacional ainda precisa de validação conjunta.
- Produto: criar/promover o primeiro administrador real para liberar E2E autenticado sem dados fictícios.

### Próximo passo da Frente05

Assim que a Frente01 sincronizar os últimos commits da F05, executar o pente fino integrado: build/typecheck, RBAC view/manage, persistência compartilhada, Inbox↔SalesBot/IA, CRM↔Automatize, cofre pela UI e correções de incompatibilidade. Até lá, não criar Meta/WhatsApp reais nem inventar usuário/chave de teste.

---

# Pedidos entre frentes

- Data/hora: 16/09/2026
- Origem: Frente05
- Destino: Frente01
- Necessidade original: montar rotas/sidebar F05 e integrar cofre/runtime.
- Status: RESOLVIDO ESTRUTURALMENTE na branch Frente01.

- Data/hora: 16/09/2026
- Origem: Frente05
- Destino: Frente01
- Necessidade atual: sincronizar os commits recentes da branch `frente-05` e executar QA/build conjunto.
- Arquivo/contrato principal: `src/features/automations/index.ts`, storage compartilhado, RBAC F05 e adapters Supabase.
- Status: PENDENTE.

- Data/hora: 16/09/2026
- Origem: Frente05
- Destino: Frente04
- Necessidade original: CRM/Inbox consumir os contratos F05.
- Status: ESTRUTURA PRESENTE na integração da Frente01; E2E conjunto ainda pendente.

---

# Pendências de integração global

- sincronizar as branches/frentes no produto consolidado sem perder os commits recentes;
- executar build/typecheck conjunto;
- executar QA autenticado com administrador real;
- validar persistência compartilhada e conflitos de revisão;
- validar CRM/Inbox ↔ SalesBot/Automatize/IA ponta a ponta;
- conectar WhatsApp e Meta somente na fase final.

---

# Critério de status

- NÃO INICIADA: nenhuma implementação relevante começou.
- EM ANDAMENTO: há trabalho ativo na branch.
- BLOQUEADA: depende de decisão ou contrato externo.
- PRONTA PARA INTEGRAÇÃO: escopo da frente concluído e testado isoladamente.
- INTEGRADA: merge validado no produto conjunto.
