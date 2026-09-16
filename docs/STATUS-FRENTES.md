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
- Status: EM ANDAMENTO — escopo isolado da F05 concluído; aguardando integrações externas para validação final do produto.
- Responsável: chat atual — Frente05
- Último commit relevante de código: `05bc1eaeaa9df9bea23d24250a71bb2016218f6d`
- Relatório de testes: `docs/frentes/FRENTE-05-TESTES.md`
- Entregue: contratos CRM/Inbox; persistência local sem dados fictícios; CRUD de SalesBot; catálogo completo de blocos; configuração e validação por bloco; duplicar/ativar/pausar/excluir; runtime real e retomável de SalesBot; `createSalesBotCommandPort`; Automatize com gatilhos, condições, ações configuráveis, duplicação, ordenação e motor de eventos; CRUD/configuração de agentes IA; execução e logs de agentes; logs consolidados SalesBot/IA; workspace consolidado; API pública da Frente05; tela de integrações; perfis configuráveis de provedor/modelo IA; seleção de provedor por agente; cofre de credenciais por contrato; resolvedor server-side de segredo; runtime server-side de provedor; adaptadores OpenAI/Codex, Anthropic/Claude, Gemini e customizado.
- Integridade: SalesBot/Automatize não ativam configuração incompleta; referências a bot/agente são verificadas; edição que invalida configuração ativa provoca pausa automática; `delay` retoma no próximo bloco sem reagendamento duplicado; ação `not_configured` no Automatize interrompe a sequência para evitar estado parcial.
- Provedores IA preparados: OpenAI; OpenAI/Codex; Anthropic/Claude; Google Gemini; provedor customizado. Modelo e endpoint ficam configuráveis, sem lista rígida de modelos.
- Segurança de chave API: chave não é salva em `localStorage`, código ou documentação. A UI usa `AICredentialVaultPort`; a execução server-side usa `AICredentialResolverPort`; a chave bruta só chega ao adaptador no backend.
- Validações executadas nesta rodada: SalesBot runtime = OK; SalesBot command port = OK; Automatize engine = OK; adaptadores de provedor = OK; cadeia cofre/resolvedor -> runtime -> agente IA -> log = OK; TypeScript dos núcleos usados nesses testes = OK. Os testes e limites estão documentados em `docs/frentes/FRENTE-05-TESTES.md`.
- NÃO VERIFICADO: build Vite do produto final com F05 montada no shell; teste visual integrado na navegação; autenticação/permissões reais da Frente01; integração ponta a ponta com CRM/Inbox reais da Frente04; persistência/resolução real de segredo no backend da Frente01; chamada real aos provedores com chave do cliente.
- Em andamento: nenhum novo bloco exclusivamente F05 pendente nesta rodada. Aguardar F01/F04 e executar pente fino de integração assim que os contratos forem conectados.
- Bloqueios externos: shell/roteador/auth/cofre pertencem à Frente01; CRM/Inbox pertence à Frente04. WhatsApp e Meta reais permanecem deliberadamente para a fase final.
- Próximo passo: Frente01 montar `Front05Workspace`, implementar `AICredentialVaultPort` e `AICredentialResolverPort`; Frente04 conectar eventos/ações CRM e Inbox aos ports públicos. Depois, executar build e teste visual conjunto.

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
- Necessidade: consumir `createSalesBotCommandPort`/`AIAgentCommandPort` pela Inbox e emitir eventos CRM conforme `CrmAutomationEvent` para `processCrmAutomationEvent`.
- Arquivo/contrato afetado: `src/features/automations/contracts.ts` e `src/features/automations/index.ts`.
- Motivo: integração ponta a ponta CRM/Inbox ↔ automações/SalesBot/IA sem acoplamento.
- Urgência: alta para integração final.
- Status: PENDENTE

- Data/hora: 16/09/2026 12:24 BRT
- Origem: Frente05
- Destino: Frente01
- Necessidade: implementar backend/cofre seguro compatível com `AICredentialVaultPort` e `AICredentialResolverPort`; injetar o vault na UI e usar o resolvedor no runtime server-side criado pela F05.
- Arquivo/contrato afetado: `src/features/integrations/aiCredentialPort.ts`, `src/features/integrations/aiCredentialResolverPort.ts`, `src/features/integrations/providerRuntime.ts` e API pública `src/features/automations/index.ts`.
- Motivo: permitir que o administrador cole a chave API do provedor escolhido sem armazenar segredo no navegador/GitHub e permitir que o backend resolva `secretRef` somente no momento da chamada ao modelo.
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
- Implementar resolvedor server-side de `secretRef` pelo contrato `AICredentialResolverPort`.
- Executar build/teste visual conjunto após montagem das frentes.
- Conectar WhatsApp e Meta somente na fase final.

---

# Critério de status

- NÃO INICIADA: nenhuma implementação relevante começou.
- EM ANDAMENTO: há trabalho ativo na branch.
- BLOQUEADA: depende de decisão ou contrato externo.
- PRONTA PARA INTEGRAÇÃO: escopo da frente concluído e testado isoladamente.
- INTEGRADA: merge validado no produto conjunto.
