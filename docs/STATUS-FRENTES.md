# Hárpia Patrimonial — Status das 5 Frentes

Atualizar este arquivo ao iniciar e ao concluir blocos relevantes.

## Frente01 — Núcleo/Auth/Usuários/Permissões

- Branch: `frente-01`
- Status: EM ANDAMENTO
- Responsável: este chat
- Último commit relevante: `bc04062932dc99dfceeadfb56014bc970056b6d7`
- Entregue até agora: cliente Supabase desacoplado; sessão persistente; contratos de autenticação; cadastro/login/logout/recuperação; rotas protegidas; área base do cliente; shell interno; usuários; grupos; permissões por grupo; exceções individuais; configurações estruturais; métricas reais do núcleo; schema RLS; Edge Function segura para criação de usuários internos; documentação de ativação do backend.
- Em andamento: validação estática, revisão de segurança e handoff da frente.
- Bloqueio externo: ainda não existe projeto Supabase dedicado da Hárpia. O único projeto conectado é MKTon e não será utilizado. A criação do projeto dedicado exige escolha explícita da organização e confirmação de custo.
- Verificação: instalação/build completo ainda NÃO VERIFICADOS porque o ambiente de execução não conseguiu acessar o registry npm; análise TypeScript sem resolução não apontou erro de sintaxe, apenas módulos ausentes no ambiente.
- Próximo passo: criar/ligar o projeto Supabase dedicado, aplicar schema, publicar `admin-user`, rodar advisors e executar testes reais de autenticação/RLS.

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
- Status inicial: NÃO INICIADA
- Responsável: chat/agente designado pelo usuário
- Último commit relevante: —
- Entregue: —
- Em andamento: —
- Bloqueios: —
- Próximo passo: iniciar pela leitura da documentação obrigatória.

---

# Pedidos entre frentes

Use esta seção quando uma frente precisar que outra altere um arquivo ou contrato que não pertence ao seu escopo.

Formato obrigatório:

- Data/hora:
- Origem:
- Destino:
- Necessidade:
- Arquivo/contrato afetado:
- Motivo:
- Urgência:
- Status: PENDENTE / EM ANDAMENTO / RESOLVIDO

Nenhuma solicitação registrada ainda.

---

# Pendências de integração global

- Integrar autenticação da Frente01 com área do cliente da Frente02.
- Integrar catálogo publicado da Frente03 com busca pública da Frente02.
- Integrar eventos de conversão da Frente02 com criação de lead da Frente04.
- Integrar métricas CRM da Frente04 no dashboard da Frente03.
- Integrar comandos Inbox da Frente04 com SalesBot/IA da Frente05.
- Integrar eventos CRM da Frente04 com Automatize da Frente05.
- Conectar WhatsApp e Meta somente na fase final.

---

# Critério de status

- NÃO INICIADA: nenhuma implementação relevante começou.
- EM ANDAMENTO: há trabalho ativo na branch.
- BLOQUEADA: depende de decisão ou contrato externo.
- PRONTA PARA INTEGRAÇÃO: escopo da frente concluído e testado isoladamente.
- INTEGRADA: merge validado no produto conjunto.
