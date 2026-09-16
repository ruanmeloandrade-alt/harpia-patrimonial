# Frente04 ↔ Frente01 — integração atual

Data: 16/09/2026

## Estado observado na Frente01

A Frente01 já evoluiu além do bloqueio anterior:

- `/interno/crm` existe no `AppRouter`;
- `/interno/inbox` existe no `AppRouter`;
- `PlatformRuntime` hidrata CRM e Inbox no estado compartilhado do Supabase;
- usuários internos são carregados para atribuição de responsável;
- CRM emite eventos para o engine da Frente05;
- dashboard recebe métricas do mesmo CRM;
- endpoint `public-lead-ingest` e o estado compartilhado CRM/Inbox já existem no backend dedicado.

Portanto, **montagem de rota e existência de backend não são mais bloqueios estruturais**.

## Ajuste crítico 1 — não montar `CrmWorkspace` sozinho

A composição integrada observada na Frente01 monta `CrmWorkspace` diretamente.

Isso é insuficiente porque conversões públicas legítimas entram inicialmente sem `stageId`. Um lead sem etapa fica fora das colunas do Kanban.

A entrada correta da Frente04 é:

- `Front04CrmScreen` para a rota CRM;

Ela inclui:

1. `UnassignedLeadsQueue`;
2. `CrmWorkspace`;
3. a mesma instância de `CrmService`.

Regra: **todo lead real criado sem etapa precisa permanecer visível e classificável**.

## Ajuste crítico 2 — automação deve ser escolhida explicitamente

A Frente04 agora recebe listas de recursos por composição, sem importar internamente repositories da Frente05:

- `salesBots?: Array<{ id: string; name: string }>`;
- `aiAgents?: Array<{ id: string; name: string }>`.

`Front04InboxScreen` e `Front04Workspace` repassam essas listas para `InboxWorkspace`.

A Inbox:

- nunca escolhe bot automaticamente;
- exige SalesBot selecionado antes de iniciar;
- exige agente IA selecionado antes de iniciar;
- consulta status considerando `botId`/`agentId` selecionados;
- impede trocar a seleção enquanto a execução correspondente está rodando.

A Frente01/integrador deve obter os recursos ativos da Frente05 e injetá-los. Isso evita dependência direta F04 → implementação interna F05.

## Ajuste crítico 3 — execução não pode migrar para recurso errado

O adapter `createFront05InboxAutomationAdapter` foi endurecido:

- SalesBot pausado só é retomado quando o bot selecionado é o mesmo da execução preservada;
- escolher outro bot cria nova execução em vez de retomar a anterior;
- status de um bot/agente selecionado diferente da execução antiga aparece como `idle`, não como status da execução anterior;
- IA em execução com o mesmo agente não dispara invocação duplicada.

## Permissões

A rota integrada atual exige `crm.manage` e `inbox.manage`. Isso é seguro para operação administrativa, mas mantém `crm.view`/`inbox.view` sem uma tela somente leitura.

Não alterar para `view OR manage` até que a UI tenha modo somente leitura, porque o service atual atualiza estado em memória antes da persistência assíncrona; permitir edição visual para usuário sem `manage` geraria feedback enganoso antes da RLS rejeitar a gravação.

## Pendências reais depois destes ajustes

- montar `Front04CrmScreen` no lugar de `CrmWorkspace` direto;
- compor a Inbox com listas ativas reais de SalesBot/agentes IA;
- executar build/typecheck do produto integrado;
- criar/promover usuário administrador real e testar RBAC;
- validar CRUD CRM com refresh e persistência compartilhada;
- validar conversão pública → lead sem etapa → classificação no CRM;
- validar Inbox ↔ SalesBot/IA/Automatize ponta a ponta;
- validar erro/conflito de revisão compartilhada em duas sessões;
- WhatsApp real continua fase final.

Até esses testes, o status permanece 🟠.
