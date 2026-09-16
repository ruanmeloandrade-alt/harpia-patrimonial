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
- Observação F05: QA da F04 confirmou a composição estrutural CRM/Inbox ↔ F05 na branch F01; E2E real continua pendente.

## Frente05 — SalesBot/Automatize/IA/Integrações

- Branch: `frente-05`
- Status: PRONTA PARA INTEGRAÇÃO — núcleo F05 concluído; integração estrutural existe na F01; faltam sincronização dos commits mais recentes, ajuste RBAC do integrador, build/typecheck e E2E real.
- Responsável: chat atual — Frente05
- Últimos commits relevantes desta rodada: `91237df68b038c6d565576f03fc2b93e464b4759` (rollback storage), `43fdd363d7d381bcf6ea7d49b09ab3af69def7a5` (listener storage), `3acd63a04675d33ff9d0c967554da1a401075141` (SalesBot sync), `74f56a72da4f01364a0254e3449b78f7de5aca5d` (Automatize sync), `d816e3cdfe448f9014424cc4ed3f679c182f8161` (Agentes IA sync), `ae8a449e67a6f9e8cd5c43ccb13343f95e97e94e` (provedores sync), `6326abf662ec63132c506f3e00973813804eace0` (integrações sync), `3b2e9c4d97b26a02c7d6dbe804bc95a4c5b7284d` (logs default deny).
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

### Persistência compartilhada / multiusuário

- F05 possui contrato oficial de storage compartilhado com fallback local somente para standalone/testes;
- quando `configureF05SharedStorage` é usado, backend compartilhado vira fonte de verdade e localStorage deixa de ser usado;
- integração F01 usa Supabase com optimistic locking por revisão;
- escrita F05 faz rollback em memória se backend rejeitar a persistência;
- rollback usa geração por chave para não apagar edição posterior;
- SalesBot, Automatize, Agentes IA, Provedores/Integrações e Execuções escutam hidratação/confirmação/rollback;
- banco real contém sete coleções estruturais F05, todas vazias e em revisão 0, sem dado fictício.

### Integração estrutural confirmada na Frente01

- rotas/sidebar para SalesBot, Automatize, Agentes IA, Execuções e Integrações;
- gate de hidratação antes de renderizar módulos F05;
- CRM → `processCrmAutomationEvent`;
- ações CRM consumidas por SalesBot/Automatize;
- Inbox → command ports SalesBot/IA;
- SalesBot composto com CRM + IA + condição + webhook;
- Automatize composto com CRM + SalesBot + IA + webhook;
- runtime IA server-side `ai-model-invoke`;
- cofre IA `ai-credential-vault` + Supabase Vault;
- estado F05 compartilhado em banco.

### Segurança / backend

- chave API não é persistida em localStorage, código ou documentação;
- chave bruta é resolvida somente no servidor;
- `ai-model-invoke` e `ai-credential-vault` exigem JWT;
- `anon` não possui SELECT na tabela F05 e teste como role `anon` foi recusado;
- `authenticated` sem identidade válida enxerga 0 linhas por RLS;
- `anon` não possui EXECUTE em `save_f05_shared_storage`;
- escrita compartilhada usa `SECURITY INVOKER` + RLS `f05_shared_storage_update`;
- Security Advisor atual do projeto: 0 lints;
- `ExecutionLogsPanel` é `canManage=false` por padrão para evitar exclusão de logs por omissão de prop.

### Desvio RBAC encontrado no integrador F01

- rotas SalesBot/Automatize/Agentes IA/Integrações ainda exigem somente `*.manage`, bloqueando usuários com apenas `*.view`;
- workspaces integrados são montados sem `canManage` explícito;
- correção esperada: rota aceita `view OR manage`; componente recebe `canManage={hasPermission(*.manage)}`;
- patch/instrução detalhada está em `docs/frentes/FRENTE-05-INTEGRACAO-F01.md`;
- não editar `AppRouter.tsx`, `InternalShell.tsx` ou `IntegratedInternalModules.tsx` a partir da F05.

### NÃO VERIFICADO AINDA

- build Vite/typecheck do produto totalmente consolidado;
- QA visual real logado em todas as rotas F05;
- E2E RBAC com usuários reais de view/manage;
- persistência/rollback pelo browser autenticado;
- salvar/remover chave pela UI com administrador real;
- chamada real a OpenAI/Anthropic/Gemini com chave real;
- comportamento ponta a ponta completo com dados reais CRM/Inbox;
- agendador durável de produção para bloco `delay`;
- WhatsApp real;
- Meta real.

### Dependências/pedidos atuais

- Frente01: sincronizar commits recentes da `frente-05` antes do QA final.
- Frente01: aplicar correção RBAC `view/manage` documentada no handoff.
- Produto: criar/promover primeiro administrador real para liberar E2E autenticado sem dado fictício.
- Frente04: nenhuma mudança nova de contrato F05 exigida; E2E conjunto permanece pendente.

### Próximo passo da Frente05

Quando a Frente01 sincronizar os commits e aplicar o RBAC integrado, executar pente fino conjunto: build/typecheck, navegação, permissões, persistência compartilhada, Inbox↔SalesBot/IA, CRM↔Automatize, cofre pela UI e correções de incompatibilidade. Até lá, não criar usuário fake, chave fake persistente, WhatsApp ou Meta reais.

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
- Necessidade atual: sincronizar commits recentes da branch `frente-05`, aplicar RBAC `view/manage` e executar QA/build conjunto.
- Arquivo/contrato principal: `src/features/automations/index.ts`, storage compartilhado, workspaces F05 e integração em `AppRouter`/`IntegratedInternalModules`.
- Status: PENDENTE.

- Data/hora: 16/09/2026
- Origem: Frente05
- Destino: Frente04
- Necessidade original: CRM/Inbox consumir contratos F05.
- Status: ESTRUTURA PRESENTE na integração da Frente01; E2E conjunto pendente.

---

# Pendências de integração global

- sincronizar branches/frentes no produto consolidado sem perder commits recentes;
- corrigir RBAC view/manage da F05 no shell integrador;
- executar build/typecheck conjunto;
- executar QA autenticado com administrador real;
- validar persistência compartilhada e conflito de revisão;
- validar CRM/Inbox ↔ SalesBot/Automatize/IA ponta a ponta;
- conectar WhatsApp e Meta somente na fase final.

---

# Critério de status

- NÃO INICIADA: nenhuma implementação relevante começou.
- EM ANDAMENTO: há trabalho ativo na branch.
- BLOQUEADA: depende de decisão ou contrato externo.
- PRONTA PARA INTEGRAÇÃO: escopo da frente concluído e testado isoladamente.
- INTEGRADA: merge validado no produto conjunto.
