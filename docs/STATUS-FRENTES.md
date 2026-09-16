# Hárpia Patrimonial — Status das 5 Frentes

Atualizar este arquivo ao iniciar e ao concluir blocos relevantes.

## Frente01 — Núcleo/Auth/Usuários/Permissões

- Branch: `frente-01`
- Status: BLOQUEADA PARA VALIDAÇÃO REAL
- Responsável: este chat
- Último commit relevante: `7463a6357fd5e0a54296fcc5d3a86e0d95119605`
- Entregue estruturalmente: cliente Supabase desacoplado; sessão persistente; cadastro/login/logout/recuperação; validação da sessão de recuperação; rotas protegidas; `dashboard.view` aplicado também na rota; área base do cliente; shell interno; Error Boundary global; criação/edição/ativação de usuários; criação/edição/ativação de grupos; permissões por grupo; exceções individuais; bloqueio de autoelevação/autodesativação; configurações estruturais e preferências compartilhadas; métricas reais do núcleo; contrato público `src/core/auth/index.ts`; constantes compartilhadas de permissão; schema RLS; hardening adicional de RLS; Edge Function segura para criação de usuários internos; documentação de ativação do backend; versões de dependências fixadas no `package.json`.
- Independências concluídas: não há outro item de código da Frente01 que precise ser construído antes do backend dedicado para cumprir o escopo atual.
- Bloqueio externo: ainda não existe projeto Supabase dedicado da Hárpia. O único projeto conectado é MKTon e não será utilizado. Existe uma única organização Supabase disponível, `Marketing11`, mas a criação do novo projeto exige confirmação explícita do usuário para essa organização e confirmação de custo antes da criação.
- Dependências entre frentes aguardando: integração da identidade/autorização da Frente01 com a área do cliente da Frente02 e com os módulos internos das demais frentes durante o pente fino. A Frente01 não vai invadir esses módulos antes dos handoffs correspondentes.
- Verificação: instalação/build completo continuam `NÃO VERIFICADOS` porque o ambiente não conseguiu acessar o registry npm. O `package-lock.json` também não pôde ser gerado por essa indisponibilidade. Testes reais de cadastro, login, persistência, RLS, grupos e exceções aguardam o Supabase dedicado.
- Próximo passo após desbloqueio: confirmar a organização `Marketing11`, consultar/confirmar custo, criar/ligar o Supabase dedicado, aplicar `core_auth.sql` + `core_auth_hardening.sql`, publicar `admin-user`, configurar URL/chave publishable, criar primeiro administrador conscientemente, rodar advisors e executar testes ponta a ponta.

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
