# Hárpia Patrimonial — Status das 5 Frentes

Atualizar este arquivo ao iniciar e ao concluir blocos relevantes.

## Frente01 — Núcleo/Auth/Usuários/Permissões

- Branch: `frente-01`
- Observação da Frente05 em 16/09/2026: a Frente01 já possui shell/rotas internos, autenticação/RBAC, backend Supabase, estado compartilhado, Realtime, cofre IA e composição dos runtimes da F05. O status autoritativo da Frente01 permanece na própria branch/chat da Frente01.

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
- Status: PRONTA PARA INTEGRAÇÃO — núcleo F05 concluído e endurecido; integração estrutural existe na F01; faltam sincronização dos commits mais recentes, ajuste RBAC do integrador, build/typecheck e E2E autenticado.
- Responsável: chat atual — Frente05
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
- RBAC F05 com view/manage, `manage => view`, default deny e modo somente leitura;
- API pública consolidada em `src/features/automations/index.ts`.

### Persistência compartilhada / multiusuário

- F05 possui contrato oficial de storage compartilhado com fallback local somente para standalone/testes;
- quando `configureF05SharedStorage` é usado, backend compartilhado vira fonte de verdade e localStorage deixa de ser usado;
- integração F01 usa Supabase com optimistic locking por revisão e fila por chave;
- escrita otimista F05 faz rollback em memória se backend rejeitar;
- rollback usa geração por chave para não apagar edição posterior;
- `replaceStoredListFromRemote(...)` restaura snapshot autoritativo e invalida rollbacks antigos;
- `writeStoredListConfirmed(...)` permite mutações críticas aguardarem confirmação do backend;
- SalesBot, Automatize, Agentes IA, Provedores/Integrações e Execuções escutam hidratação, refresh remoto, confirmação e rollback;
- testes de corrida/rollback e escrita confirmada passaram em ambiente controlado;
- banco real contém sete coleções estruturais F05, todas vazias e em revisão 0, sem dado fictício.

### Consistência provedor IA / Vault

- primeira chave só é marcada como configurada depois que o perfil confirma persistência;
- falha nessa persistência aciona limpeza compensatória da credencial recém-criada;
- atualização de chave existente preserva o mesmo `secretRef` do Vault;
- remoção confirma primeiro o perfil sem referência e depois limpa o Vault;
- se a limpeza do Vault falhar, o perfil anterior é restaurado;
- exclusão de perfil é persistida de forma confirmada e revertida se a limpeza do Vault falhar;
- perfil não pode ser excluído enquanto houver qualquer agente referenciando-o;
- chave não pode ser removida nem perfil pronto desativado enquanto houver agente ativo dependente;
- fluxo de compensação passou em teste controlado (`F05 credential/profile consistency tests: OK`).

### Integração estrutural confirmada na Frente01

- rotas/sidebar para SalesBot, Automatize, Agentes IA, Execuções e Integrações;
- gate de hidratação antes de renderizar módulos F05;
- Realtime para estado F05/CRM/Inbox entre sessões;
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
- `Front05Workspace` sem `access` usa `NO_FRONT05_ACCESS`;
- workspaces diretos usam `canManage=false` por padrão, inclusive Execuções e Provedores IA.

### Desvio RBAC encontrado no integrador F01

- rotas SalesBot/Automatize/Agentes IA/Integrações ainda exigem somente `*.manage`, bloqueando usuários com apenas `*.view`;
- workspaces integrados são montados sem `canManage` explícito;
- após sincronizar o default-deny F05, administradores também ficarão somente leitura se a F01 não passar `canManage` explicitamente;
- correção esperada: rota aceita `view OR manage`; componente recebe `canManage={hasPermission(*.manage)}`;
- patch/instrução detalhada está em `docs/frentes/FRENTE-05-INTEGRACAO-F01.md`;
- não editar `AppRouter.tsx`, `InternalShell.tsx` ou `IntegratedInternalModules.tsx` a partir da F05.

### Usuários temporários de QA

- responsável do projeto autorizou criar um admin interno temporário e um viewer interno temporário para E2E, com exclusão ao final;
- nesta sessão, criação de Auth foi bloqueada pelo conector Supabase e o runtime local não alcança o endpoint público do Auth;
- não foi feito bypass direto em `auth.users`;
- última conferência: `auth.users = 0`;
- F01 ou outra frente com acesso ao Auth pode criar os dois usuários sem pedir nova autorização.

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
- Frente01/Auth: criar os dois usuários temporários de QA já autorizados, se o ambiente daquela frente permitir.
- Frente04: nenhuma mudança nova de contrato F05 exigida; E2E conjunto permanece pendente.

### Próximo passo da Frente05

Quando a Frente01 sincronizar os commits/aplicar RBAC ou quando os usuários de QA aparecerem no Auth, executar imediatamente o pente fino conjunto: build/typecheck, navegação, permissões, persistência compartilhada, Inbox↔SalesBot/IA, CRM↔Automatize e cofre pela UI. Até lá, não criar dados operacionais fake, WhatsApp ou Meta reais.

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
- Necessidade atual: sincronizar commits recentes da branch `frente-05`, aplicar RBAC `view/manage`, criar usuários temporários de QA autorizados e executar QA/build conjunto.
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
- criar usuários temporários de QA autorizados;
- executar build/typecheck conjunto;
- executar QA autenticado;
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
