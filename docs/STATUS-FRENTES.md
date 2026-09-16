# Hárpia Patrimonial — Status das 5 Frentes

Atualizar este arquivo ao iniciar e ao concluir blocos relevantes.

## Frente01 — Núcleo/Auth/Usuários/Permissões

- Branch: `frente-01`
- Status: EM ANDAMENTO — BACKEND ATIVO / TESTES E2E E INTEGRAÇÃO PENDENTES
- Responsável: este chat
- Último commit relevante de implementação antes deste status: `63c1e3b299a8279f8505d6bac30e0459d05f21e1`
- Backend dedicado: projeto Supabase `Harpia Patrimonial`, ref `desxomqvtjaymwwxivwq`, organização `Marketing11`, região `sa-east-1`, status `ACTIVE_HEALTHY`.
- Entregue estruturalmente: cliente Supabase tipado; sessão persistente; cadastro/login/logout/recuperação; validação da sessão de recuperação; rotas protegidas; `dashboard.view` aplicado na rota; área base do cliente; shell interno; Error Boundary global; criação/edição/ativação de usuários; criação/edição/ativação de grupos; permissões por grupo; exceções individuais; bloqueio de autoelevação/autodesativação; configurações estruturais e preferências compartilhadas; métricas reais do núcleo; contrato público `src/core/auth/index.ts`; constantes compartilhadas de permissão; tipos TypeScript gerados do schema real; versões de dependências fixadas no `package.json`.
- Banco aplicado: migrations `core_auth`, `core_auth_hardening` e `core_auth_performance` executadas com sucesso.
- Edge Function: `admin-user` publicada, `ACTIVE`, com `verify_jwt = true`.
- Segurança verificada: Supabase Security Advisor com 0 lints; RLS habilitado; teste como role `authenticated` sem identidade retornou 0 linhas para permissões, grupos, configurações e perfis.
- Performance verificada: avisos úteis do advisor corrigidos; restam apenas informações de índices ainda não utilizados, esperadas em banco novo sem tráfego.
- Seed estrutural verificado: 22 permissões, 1 grupo de sistema `Administrador`, 22 permissões allow no grupo administrador e 0 perfis reais/fictícios.
- Independências concluídas: não há outro bloco de implementação do núcleo que dependa apenas da Frente01 e precise ser construído antes dos testes reais/deploy para cumprir o escopo atual.
- Pendências próprias: configurar `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no ambiente de hospedagem; configurar URLs de redirect do Auth quando o deploy final estiver definido; criar/promover o primeiro administrador real quando os dados forem fornecidos; validar cadastro/login/logout/refresh/recovery e gestão de usuários/permissões ponta a ponta; gerar `package-lock.json` e rodar build/typecheck quando houver ambiente com registry npm acessível.
- Dependências entre frentes aguardando: integrar identidade/autorização da Frente01 com a área do cliente da Frente02 e com os módulos internos das demais frentes durante o pente fino. A Frente01 não vai invadir esses módulos antes dos handoffs correspondentes.
- Próximo passo: aguardar dados reais do primeiro administrador e a consolidação do ambiente de deploy/integração; assim que disponíveis, executar QA real de autenticação/RLS e fechar a frente para integração.

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
