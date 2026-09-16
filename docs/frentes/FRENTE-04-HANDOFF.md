# Handoff — Frente04 CRM/Inbox

Data-base: 16/09/2026
Branch: `frente-04`
Commit de implementação mais recente no momento deste handoff: `b2b6e154fd6a1336fa684fa5b66d18f24d5412e0`

## Status visual

- 🟠 Escopo próprio da Frente04: implementação principal concluída, aguardando integração obrigatória e validação completa no produto.
- 🟠 CRM/Kanban/Lead 360: código implementado e revisão isolada realizada; ainda sem rota final montada pela Frente01.
- 🟠 Inbox: implementada com transporte desacoplado e estado real de não conectado; ainda sem integração final de shell/automação.
- 🟠 Entrada automática de leads: contrato implementado; depende da Frente02/Frente01 para evento real de conversão.
- 🟠 SalesBot/IA pela Inbox: contrato implementado; depende da Frente05 para execução real.
- 🔴 Validação final integrada pelo usuário: ainda não disponível até montagem das dependências.

Nenhum item recebe 🟢 enquanto o usuário ainda não puder abrir e testar o fluxo integrado.

## Implementado pela Frente04

### CRM

- modelo de funil, etapa, lead, tag, campo personalizado, tarefa, histórico e eventos;
- persistência local transitória vazia por padrão, sem dados fictícios;
- criação, renomeação e ativação/desativação de funil;
- criação, renomeação, reordenação e exclusão protegida de etapa;
- Kanban configurável;
- movimentação manual de leads;
- criação e edição de lead;
- Lead 360 com nome, e-mail, WhatsApp, origem, página, ação, interesse, referência e observações;
- associação de responsável por contrato com usuários internos;
- tags;
- campos personalizados dos tipos texto, número, data, booleano, seleção única e seleção múltipla;
- tarefas/próximas ações com responsável, prazo, status e observação;
- histórico de alterações;
- eventos de domínio para futura automação;
- fila explícita de leads sem etapa para impedir que conversões novas fiquem invisíveis no CRM.

### Entrada de leads

- contrato `ingestLeadConversion`;
- captura de contato, origem, página, ação e interesse;
- criação sem disparo automático de mensagem;
- retorno explícito `automaticMessageSent: false`.

### Inbox

- layout de três colunas;
- lista de conversas;
- área central da conversa;
- contexto CRM à direita;
- sessões internas sem fingir canal real;
- texto, áudio, imagem, vídeo, documento e formulário previstos no contrato;
- bloqueio real de envio sem transporte conectado;
- ingestão de mensagens recebidas por contrato;
- alteração de etapa, responsável, tags, campos personalizados e próxima ação pela Inbox;
- contrato para iniciar/pausar SalesBot;
- contrato para iniciar/pausar IA;
- consulta de status;
- fallback `unavailable` sem simular execução.

## Arquivos principais

- `src/features/crm/domain.ts`
- `src/features/crm/repository.ts`
- `src/features/crm/service.ts`
- `src/features/crm/contracts.ts`
- `src/features/crm/CrmWorkspace.tsx`
- `src/features/crm/UnassignedLeadsQueue.tsx`
- `src/features/crm/Front04Workspace.tsx`
- `src/features/crm/crm.module.css`
- `src/features/inbox/domain.ts`
- `src/features/inbox/repository.ts`
- `src/features/inbox/service.ts`
- `src/features/inbox/InboxWorkspace.tsx`
- `src/features/inbox/inbox.module.css`

## Validações executadas

- branch e propriedade de arquivos conferidas antes das alterações;
- revisão estrutural dos serviços CRM e Inbox;
- checagem isolada de TypeScript/sintaxe do `CrmWorkspace` atualizado com stubs equivalentes das dependências: sem erros;
- checagem isolada de TypeScript/sintaxe do `UnassignedLeadsQueue` em conjunto com o CRM: sem erros;
- verificado por leitura que o serviço de Inbox bloqueia `sendMessage` quando não há transporte conectado;
- verificado por leitura que exclusão de etapa com lead é bloqueada;
- verificado por leitura que eventos de CRM são desacoplados por `CrmEventSink`;
- verificado que a interface começa sem dados fictícios e possui empty states.

## NÃO VERIFICADO ainda

- `npm run build` da aplicação integrada;
- TypeScript completo de todas as cinco frentes montadas juntas;
- rota protegida real da Frente01;
- permissões/RBAC reais;
- persistência multiusuário/backend;
- evento real site → CRM vindo da Frente02;
- referências reais catálogo/produto vindas da Frente03;
- execução real de SalesBot/IA/Automatize da Frente05;
- WhatsApp real;
- teste ponta a ponta pelo usuário.

## Dependências esperadas

### Frente01

1. Montar `Front04Workspace` no shell/rota interna protegida.
2. Fornecer usuários internos para `assignees` no formato `{ id, name }`.
3. Fornecer adapter definitivo de persistência/backend compatível com `CrmRepository` e `InboxRepository`, ou coordenar adaptação equivalente na integração.
4. Aplicar permissões reais na rota e operações conforme RBAC.

### Frente02

- Chamar `ingestLeadConversion` ou adapter equivalente em conversões reais do site/área do cliente, mantendo a regra de não enviar mensagem automaticamente.

### Frente03

- Fornecer referência real de imóvel/produto/serviço no contexto do lead quando aplicável.
- Consumir métricas comerciais da Frente04 no dashboard por contrato, sem duplicar fonte de verdade.

### Frente05

- Implementar `InboxAutomationPort` para SalesBot e IA.
- Consumir eventos `CrmEventSink` no Automatize.
- Conectar transporte real somente na fase definida de integrações, sem alterar a regra zero-mock.

## Riscos conhecidos

- persistência local atual é transitória e não é adequada como fonte definitiva multiusuário;
- não marcar CRM como operacional multiusuário antes de adapter/backend real;
- não marcar SalesBot/IA como funcionando antes da Frente05 conectar as portas;
- não marcar envio de WhatsApp como disponível antes do transporte real;
- qualquer alteração de contratos compartilhados deve ser coordenada antes de merge.

## Instrução ao integrador

Usar `Front04Workspace` como ponto único de montagem. Não recriar CRM/Inbox em arquivos globais. Passar usuários internos por `assignees` e a implementação de automação por `automationPort`. Manter `src/features/crm/**` e `src/features/inbox/**` como propriedade funcional da Frente04 durante o pente-fino. Após integração, executar build completo, TypeScript, rotas, CRUD principal, refresh/persistência, RBAC, entrada de lead, Inbox e comandos de automação antes de qualquer 🟢.
