# Hárpia Patrimonial — Status das 5 Frentes

Atualizar este arquivo ao iniciar e ao concluir blocos relevantes.

## Frente01 — Núcleo/Auth/Usuários/Permissões

- Branch: `frente-01`
- Status inicial: NÃO INICIADA
- Responsável: chat/agente designado pelo usuário
- Último commit relevante: —
- Entregue: —
- Em andamento: —
- Bloqueios: —
- Próximo passo: iniciar pela leitura da documentação obrigatória.

## Frente02 — Site público/Área do cliente

- Branch: `frente-02`
- Status inicial: NÃO INICIADA
- Responsável: chat/agente designado pelo usuário
- Último commit relevante: —
- Entregue: —
- Em andamento: —
- Bloqueios: —
- Próximo passo: iniciar pela leitura da documentação obrigatória.

## Frente03 — Catálogo interno/Dashboard

- Branch: `frente-03`
- Status inicial: NÃO INICIADA
- Responsável: chat/agente designado pelo usuário
- Último commit relevante: —
- Entregue: —
- Em andamento: —
- Bloqueios: —
- Próximo passo: iniciar pela leitura da documentação obrigatória.

## Frente04 — CRM/Inbox

- Branch: `frente-04`
- Status inicial: NÃO INICIADA
- Responsável: chat/agente designado pelo usuário
- Último commit relevante: —
- Entregue: —
- Em andamento: —
- Bloqueios: —
- Próximo passo: iniciar pela leitura da documentação obrigatória.

## Frente05 — SalesBot/Automatize/IA/Integrações

- Branch: `frente-05`
- Status: EM ANDAMENTO
- Responsável: chat atual — Frente05
- Último commit relevante de código: `c17ce0a57a74f463c05aad1dcff956efe829b81c`
- Entregue: contratos CRM/Inbox; persistência local sem dados fictícios; CRUD de SalesBot; catálogo completo de blocos; configuração por bloco; duplicar/ativar/pausar/excluir; Automatize com gatilhos, condições e ações configuráveis; CRUD/configuração de agentes IA; logs/execuções; workspace consolidado; API pública da Frente05; tela de integrações; perfis configuráveis de provedor/modelo IA; seleção de provedor por agente; contratos de cofre seguro e runtime de IA.
- Provedores IA preparados: OpenAI; OpenAI/Codex; Anthropic/Claude; Google Gemini; provedor customizado. Modelo e endpoint ficam configuráveis, sem lista rígida de modelos.
- Segurança de chave API: chave não é salva em `localStorage`, código ou documentação. A UI recebe a chave e usa o contrato `AICredentialVaultPort`; só marca a credencial como configurada quando o cofre/backend seguro confirma armazenamento.
- Validações executadas: parse/sintaxe dos componentes SalesBot, Automatize, Agentes IA, Integrações e workspace = OK; checagem TypeScript isolada dos módulos F05 = OK; teste de comportamento dos repositórios/contratos = OK para criar/configurar/ativar/duplicar SalesBot, iniciar/pausar/retomar execução, criar log, validar Automação sem ação, ativar Automação configurada, criar perfil de provedor IA, exigir modelo/chave, impedir ativação de agente sem provedor pronto, ativar agente com perfil pronto e manter execução externa como `not_configured` enquanto não houver adaptador real.
- NÃO VERIFICADO: build Vite completo da branch dentro do shell final; teste visual integrado na navegação da plataforma; integração ponta a ponta com CRM/Inbox reais; persistência real de segredo/API key no backend. Motivo: shell/roteador e camada base de persistência segura pertencem à Frente01; CRM/Inbox pertence à Frente04.
- Em andamento: integração visual com shell, cofre seguro de credenciais, integração CRM/Inbox e pente fino após montagem.
- Bloqueios: a Frente05 não pode editar o shell/roteador raiz da Frente01. Persistência segura de chave precisa de backend/cofre. Integração real com CRM/Inbox depende da Frente04. WhatsApp e Meta reais permanecem fora desta fase por decisão de produto.
- Próximo passo: Frente01 montar `Front05Workspace` e fornecer implementação de `AICredentialVaultPort`; Frente04 consumir/expor os contratos; então executar build e teste visual conjunto.

---

# Pedidos entre frentes

Use esta seção quando uma frente precisar que outra altere um arquivo ou contrato que não pertence ao seu escopo.

- Data/hora: 16/09/2026 12:10 BRT
- Origem: Frente05
- Destino: Frente01
- Necessidade: montar/importar `Front05Workspace` na navegação interna da plataforma usando a API pública `src/features/automations/index.ts`.
- Arquivo/contrato afetado: roteador/shell global da Frente01; não editar pela Frente05.
- Motivo: permitir teste visual integrado de SalesBot, Automatize, Agentes IA, Execuções e Integrações sem violar propriedade de arquivos.
- Urgência: alta para demonstração.
- Status: PENDENTE

- Data/hora: 16/09/2026 12:10 BRT
- Origem: Frente05
- Destino: Frente04
- Necessidade: consumir `salesBotCommandPort`/`aiAgentCommandPort` pela Inbox e emitir eventos CRM conforme `CrmAutomationEvent` para Automatize.
- Arquivo/contrato afetado: `src/features/automations/contracts.ts` e `src/features/automations/index.ts`.
- Motivo: integração ponta a ponta CRM/Inbox ↔ automações/SalesBot/IA sem acoplamento.
- Urgência: alta para integração final.
- Status: PENDENTE

- Data/hora: 16/09/2026 12:24 BRT
- Origem: Frente05
- Destino: Frente01
- Necessidade: implementar cofre/backend seguro compatível com `AICredentialVaultPort` e injetá-lo em `Front05Workspace`.
- Arquivo/contrato afetado: `src/features/integrations/aiCredentialPort.ts` e API pública `src/features/automations/index.ts`; backend/persistência segura da Frente01.
- Motivo: permitir que o administrador cole a chave API do provedor escolhido sem armazenar segredo no navegador, GitHub ou documentação.
- Urgência: alta antes de conectar provedor IA real.
- Status: PENDENTE

---

# Pendências de integração global

Registrar aqui somente itens que dependem de merge ou decisão entre duas ou mais frentes.

- Integrar autenticação da Frente01 com área do cliente da Frente02.
- Integrar catálogo publicado da Frente03 com busca pública da Frente02.
- Integrar eventos de conversão da Frente02 com criação de lead da Frente04.
- Integrar métricas CRM da Frente04 no dashboard da Frente03.
- Integrar comandos Inbox da Frente04 com SalesBot/IA da Frente05.
- Integrar eventos CRM da Frente04 com Automatize da Frente05.
- Montar `Front05Workspace` no shell/roteador da Frente01.
- Implementar e injetar cofre seguro de credenciais IA pelo contrato `AICredentialVaultPort`.
- Conectar WhatsApp e Meta somente na fase final.

---

# Critério de status

- NÃO INICIADA: nenhuma implementação relevante começou.
- EM ANDAMENTO: há trabalho ativo na branch.
- BLOQUEADA: depende de decisão ou contrato externo.
- PRONTA PARA INTEGRAÇÃO: escopo da frente concluído e testado isoladamente.
- INTEGRADA: merge validado no produto conjunto.
