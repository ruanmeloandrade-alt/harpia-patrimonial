# Frente05 — SalesBot, Automatize, agentes de IA e integrações preparatórias

Branch obrigatória: `frente-05`

## Missão

Construir a camada de automação inteligente da plataforma: editor visual de SalesBot, Automatize, agentes de IA e estrutura de integrações, deixando WhatsApp e Meta reais para a fase final.

## Ler antes de começar

1. `AGENTS.md`
2. `docs/BRIEFING-CONSOLIDADO.md`
3. `docs/ESCOPO-DE-TRABALHO.md`
4. `docs/CONVERSA-E-DECISOES.md`
5. `docs/FRENTES-DE-TRABALHO.md`
6. `docs/CONTRATOS-ENTRE-MODULOS.md`
7. `docs/STATUS-FRENTES.md`

## Escopo exclusivo

### 1. SalesBot

Criar construtor visual por blocos, inspirado conceitualmente no que já foi validado em MarketOn, sem copiar código automaticamente.

CRUD mínimo:

- criar;
- editar;
- duplicar;
- ativar;
- pausar;
- excluir;
- visualizar status.

### 2. Blocos mínimos do editor

- gatilho;
- condição;
- espera/delay;
- mensagem;
- agente IA;
- mover etapa;
- atribuir responsável;
- criar tarefa;
- atualizar campo;
- adicionar/remover tag;
- webhook/API;
- finalização;
- iniciar/encadear outro fluxo quando aplicável.

### 3. Regras do SalesBot nesta fase

- construir mecanismo configurável;
- não cadastrar bots operacionais reais ainda;
- não definir distribuição automática de leads por conta própria;
- não criar prompts reais da Hárpia sem material posterior;
- não simular envio WhatsApp real se integração ainda não estiver conectada.

### 4. Automatize

Criar área/experiência de automações ligada ao CRM.

Gatilhos previstos:

- lead criado;
- mudança de etapa;
- alteração de campo;
- tag adicionada/removida;
- ausência de interação;
- tarefa/data/evento futuro;
- eventos adicionais extensíveis.

Ações previstas:

- iniciar SalesBot;
- chamar agente IA;
- criar tarefa;
- mover etapa;
- alterar campo;
- aplicar/remover tag;
- atribuir responsável;
- webhook/API;
- outras ações extensíveis.

### 5. Agentes de IA

Permitir:

- criar agente;
- definir nome interno;
- função;
- instruções;
- regras;
- contexto;
- permissões/acessos;
- status ativo/pausado;
- pontos onde pode ser acionado.

IA fica em bastidor. Não criar personagem público ou fingir atendente humano.

### 6. Integração SalesBot + IA

O editor deve conseguir referenciar um agente configurado.

A estrutura deve prever:

- chamada do agente;
- contexto de entrada;
- resultado/saída;
- pausa/interrupção;
- handoff para humano quando futuramente configurado.

### 7. Integração com CRM

Consumir eventos da Frente04 e executar ações por contrato, sem acessar estado interno do CRM de forma acoplada.

Ações CRM devem ser chamadas por interfaces claras.

### 8. Integração com Inbox

Expor contratos para Frente04:

- iniciar SalesBot;
- pausar SalesBot;
- consultar status;
- acionar IA;
- pausar IA;
- consultar status.

### 9. Logs e execuções

Preparar estrutura para registrar:

- bot;
- lead/conversa associado;
- início;
- fim;
- status;
- nó/bloco atual;
- erro;
- ação executada;
- agente IA chamado quando aplicável.

Se ainda não houver execução real, não criar histórico fictício.

### 10. Tela de integrações

Preparar UI/configuração para:

- WhatsApp;
- Meta;
- e-mail;
- APIs externas.

Deve existir estado claro:

- não conectado;
- conectado futuramente;
- configuração pendente.

### 11. WhatsApp e Meta

Nesta frente, agora:

- preparar estrutura;
- definir pontos de conexão;
- deixar configuração organizada.

Fazer somente na fase final:

- credenciais reais;
- autenticação real;
- webhooks reais;
- envio/recebimento real;
- Meta API real.

## Pastas sob responsabilidade

Preferencialmente:

- `src/features/automations/**`
- `src/features/salesbot/**`
- `src/features/ai-agents/**`
- `src/features/integrations/**`

## Não editar sem coordenação

- auth/RBAC;
- site público;
- catálogo;
- CRM core;
- Inbox core;
- dashboard;
- arquivos globais da Frente01.

## Dependências

- Frente01: autenticação/permissões para acesso administrativo.
- Frente04: eventos de CRM e ações sobre lead/funil.
- Frente04: Inbox consumirá comandos de bot/IA.

A falta da integração real de WhatsApp/Meta não bloqueia a conclusão estrutural desta frente.

## Critérios de aceite

- CRUD de SalesBot estruturado;
- editor visual por blocos funciona;
- todos os tipos mínimos de bloco existem;
- `Automatize` permite configurar gatilho e ação;
- agentes IA podem ser criados/configurados/pausados;
- SalesBot consegue referenciar agente;
- contratos de iniciar/pausar bot e IA estão expostos;
- estrutura de logs existe sem dados falsos;
- tela de integrações mostra estado real de conexão;
- WhatsApp/Meta não são simulados como conectados;
- build funciona na branch.

## Handoff obrigatório ao terminar

- Status:
- Commit final:
- O que foi entregue:
- O que ficou pendente:
- Blocos implementados:
- Eventos CRM consumidos:
- Ações CRM expostas/consumidas:
- Contratos para Inbox:
- Integrações preparadas:
- Riscos conhecidos:
- Instruções para o chat de integração:


## Handoff adicional: Cérebro autenticado e feedback de ação, 24/09/2026

- Status: **PARCIAL / EM ANDAMENTO** até QA autenticado em navegador.
- Branch: `work/ai-brain-upload-feedback-20260924`.
- Escopo: fechar upload real do Cérebro, retirar a ponte estática e tornar ações visíveis ao usuário.
- Código principal:
  - `src/features/ai-agents/brainRepository.ts`
  - `src/features/ai-agents/AIAgentsWorkspace.tsx`
  - `src/features/ai-agents/repository.ts`
  - `src/features/ai-agents/runtime.ts`
  - `src/features/automations/front05.css`
  - `src/styles.css`
  - `supabase/schema/ai_brain.sql`
  - `supabase/functions/ai-brain-process-source/index.ts`
  - `supabase/functions/ai-brain-static-bridge/index.ts`
- Produção visual: `gh-pages/interno/index.html` usa sessão real, RLS, Storage privado e processador autenticado.
- Segurança: token fixo removido da página publicada; ponte temporária desativada no Supabase.
- Integração IA: provedor/modelo configurado em Integrações é resolvido automaticamente pelos agentes.
- Contexto: Cérebro e fontes prontas entram no runtime do agente.
- UX: botões possuem resposta visual de clique; operações assíncronas do Cérebro mostram carregamento e sucesso.
- Alteração compartilhada: `src/styles.css` foi alterado apenas para feedback visual global solicitado pelo usuário e reconciliado com o hotfix mais recente da Frente01.
- Testes executados: sintaxe JS da página estática; conferência de RLS, bucket, Edge Functions e remoção da ponte estática da página.
- NÃO VERIFICADO: build/typecheck completo e E2E autenticado de upload em navegador.
- Próximo passo: integrar a branch na `main`, conferir Security Advisor e testar upload com a primeira conta interna real.
