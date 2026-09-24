# Hárpia Patrimonial — Status das 5 Frentes

Atualização: 17/09/2026

## Frente01 — Núcleo/Auth/Usuários/Permissões + integração global

- Branch: `frente-01`
- Status individual: **FINALIZADA NO ESCOPO DA FRENTE01**.
- Auth/RBAC, usuários, grupos, permissões, sessão, shell e runtime global entregues.
- QA backend real executado anteriormente com usuários temporários e limpeza ao final.
- Security Advisor sem lints na última verificação registrada.

## Frente02 — Site público/Área do cliente

- Branch: `frente-02`
- Status individual: **FINALIZADA NO ESCOPO DA FRENTE02**.
- Site público, catálogo público, área do cliente, favoritos, captação e conversão entregues.
- **Sincronização funcional com a base final: CONCLUÍDA.**

## Frente03 — Catálogo interno/Dashboard

- Branch: `frente-03`
- Status individual: **FINALIZADA NO ESCOPO DA FRENTE03**.
- Catálogo, publicação, Dashboard, Storage, RLS/RBAC e Realtime entregues e validados no backend real.
- Código funcional necessário ao produto integrado já presente na base consolidada.
- Handoff final registrado em `docs/frentes/FRENTE-03-HANDOFF.md`.

## Frente04 — CRM/Inbox

- Branch: `frente-04`
- Status individual: **FINALIZADA NO ESCOPO DA FRENTE04**.
- CRM/Kanban/Lead 360, Inbox, RBAC, persistência multiusuário, Realtime e contratos F05 concluídos.
- **Sincronização funcional com a base final: CONCLUÍDA.**
- Commit de integração: `b97e99d381e4e3fee1acfde5984127dc6055a4ed`.

## Frente05 — SalesBot/Automatize/IA/Integrações

- Branch: `frente-05`
- Status individual: **FINALIZADA NO ESCOPO DA FRENTE05 E INTEGRADA ESTRUTURALMENTE**.
- PR #3 mergeado para conectar `automation-event-worker` ao runtime F05.
- PR #4 mergeado para reconciliar os módulos finais da F05.
- `automation-event-worker` v4 ACTIVE no Supabase.
- `f05-runtime-worker` e `f05-delay-worker` ativos.
- Scheduler durável ativo.

---

# Base final integrada

- [x] Frente01 concluída.
- [x] Frente02 concluída.
- [x] Frente03 concluída.
- [x] Frente04 concluída.
- [x] Frente05 concluída.
- [x] Frentes reconciliadas funcionalmente na base consolidada.
- [x] PR #5 `frente-01 → main` mergeada em 17/09/2026.
- [x] Commit de integração na `main`: `a5b522aac5b1514e396c2d5ca69a49589df08463`.
- [x] `main` definida como fonte de verdade.

As branches `frente-01` a `frente-05` permanecem como histórico. Não fazer merge forçado das branches históricas divergidas.

## QA final integrado — 17/09/2026

🟢 **QA ESTRUTURAL/INTEGRAÇÃO ENCERRADA. PROJETO LIBERADO PARA A PRÓXIMA FASE.**

Detalhamento principal: `docs/QA-FINAL-2026-09-17.md`.
Segunda passada funcional: `docs/QA-FINAL-PASSADA-2-2026-09-17.md`.

### Validado

- [x] Supabase `ACTIVE_HEALTHY`.
- [x] Security Advisor com `0` lints.
- [x] Performance Advisor sem erro bloqueante.
- [x] RBAC/RLS admin/viewer/cliente em teste transacional real.
- [x] autoalteração de segurança bloqueada.
- [x] catálogo: transições, publicação hierárquica e integridade empreendimento/unidade.
- [x] `public-lead-ingest` real: HTTP 201, CRM + outbox, sem envio automático.
- [x] criação de conta de cliente conectada ao CRM via camada de composição; contrato real do Edge/CRM validado.
- [x] ações CRM: etapa, tag, campo e tarefa.
- [x] grafo SalesBot: válido aceito e ciclo rejeitado.
- [x] E2E server-side `CRM → Automatize → SalesBot → runtime F05` concluído.
- [x] delay durável retomado e concluído.
- [x] bloco `message` sem canal real fica `not_configured/paused`, sem falso envio.
- [x] scheduler, Vault/token, Edge Functions, Storage policies e Realtime estrutural conferidos.
- [x] contato público ligado a `organization_settings` sem valor inventado durante a QA.
- [x] limpeza final sem dados temporários de QA.
- [x] base consolidada promovida para `main` via PR #5.
- [x] requisito exclusivo de Node 24 removido; `package.json` aceita `Node >=22.12 <25`.

### Itens NÃO VERIFICADOS que não bloqueiam a próxima fase

- [ ] instalação limpa/reprodutível e `package-lock.json` versionado;
- [ ] `npm run typecheck` e `npm run build` no checkout completo da `main`;
- [ ] E2E autenticado admin/viewer/cliente em navegador;
- [ ] navegação visual desktop/mobile;
- [ ] formulário completo de cadastro em navegador;
- [ ] catálogo interno → publicação → site público pela UI;
- [ ] upload real de mídia pela UI;
- [ ] Realtime observado em duas sessões simultâneas;
- [ ] sessão/reload/fechar-reabrir navegador;
- [ ] e-mail/recovery/redirects finais;
- [ ] console do navegador sem erros relevantes;
- [ ] validação visual final do usuário.

Esses itens migram para a fase funcional/visual, integração externa e publicação. Devem ser verificados junto das correções reais e não como uma auditoria isolada que paralise o projeto.

---

## Avanços da fase funcional / integração — 17/09/2026

- [x] Dados públicos reais da empresa configurados no Supabase: WhatsApp/telefone, e-mail e Rio de Janeiro/RJ.
- [x] Número público armazenado em formato internacional para compatibilidade com `wa.me`.
- [x] `public-organization-contact` já lê o telefone real de `organization_settings`.
- [x] Pipeline público mantém a ordem correta: captura o lead no CRM e depois continua para WhatsApp com contexto.
- [x] CTA `Ser Atendido Agora!` incluído também no menu mobile usando o mesmo fluxo real de captura.
- [x] Configurações internas deixam explícito qual telefone alimenta os CTAs públicos.
- [x] Interface passou a distinguir `WhatsApp público` de `WhatsApp API`.
- [x] Navegação da área interna passou a ser recolhível em tablet/mobile, evitando empurrar os módulos para baixo da sidebar completa.
- [x] Busca principal da home agora contempla finalidade, cidade, localização, lançamento, faixa de preço e estilo de vida com opções derivadas do catálogo real.
- [x] Login/cadastro público preservam a rota de origem; usuário que autentica a partir de um imóvel volta ao contexto original em vez de cair obrigatoriamente em `/cliente`.
- [x] Retorno pós-auth é restrito a caminhos internos do próprio site e bloqueia destino externo/área interna indevida.

**WhatsApp público/click-to-chat está configurado. WhatsApp API para Inbox/envios/automações e Meta continuam como integrações externas da fase final e não são tratados como conectados.**

---

# Próxima fase

A partir daqui o trabalho deve priorizar:

1. front-end e posicionamento de botões;
2. fluxos reais de uso;
3. dados reais;
4. integrações reais;
5. validação visual/E2E durante as correções;
6. preparação de publicação.

# Critério de status

- NÃO INICIADA: nenhuma implementação relevante começou.
- EM ANDAMENTO: há trabalho ativo.
- BLOQUEADA: depende de decisão ou recurso externo indispensável.
- PRONTA PARA INTEGRAÇÃO: escopo local pronto para composição.
- INTEGRADA ESTRUTURALMENTE: módulos encaixados sem afirmar testes ainda não executados.
- FINALIZADA NO ESCOPO: implementação e QA executáveis da frente concluídos.
- LIBERADA PARA PRÓXIMA FASE: QA estrutural suficiente para avançar, mantendo explicitamente como `NÃO VERIFICADO` o que só pode ser confirmado no fluxo visual/integrado final.


---

## Central de Configurações — 24/09/2026

🟢 **IMPLEMENTADA, INTEGRADA E PUBLICADA VISUALMENTE**

Implementado e mergeado na `main` pela PR #11. A versão visual correspondente também foi publicada na `gh-pages`:

- central única de Configurações;
- Geral completo;
- Preferências com tema, idioma, moeda, fuso, data/hora, cor e modo compacto;
- Usuários + funções + grupos + permissões no mesmo fluxo;
- definição de acessos já no cadastro de usuário;
- Integrações com WhatsApp, IA e catálogo de integrações de segunda fase;
- CRM e atendimento;
- Automações;
- Notificações;
- Segurança;
- Dados e privacidade;
- Marketing como segunda fase;
- Sistema;
- persistência em `organization_settings.preferences`;
- aplicação global de tema e modo compacto;
- smoke transacional do JSON de preferências executado com rollback, sem alterar dados reais.

Validação concluída nesta entrega:

- [x] branch reconciliada com alterações concorrentes de Produtos/CRM;
- [x] PR #11 mergeada na `main`;
- [x] persistência JSON validada no Supabase com rollback;
- [x] página estática publicada contém todas as áreas de Configurações;
- [x] JavaScript da página publicada validado sintaticamente;
- [x] usuário fictício removido da área publicada;
- [x] navegação separada de Usuários/Permissões/Integrações removida da apresentação.

Continua marcado como NÃO VERIFICADO:

- `npm run typecheck`;
- `npm run build`;
- navegação autenticada completa em navegador;
- validação visual final desktop/mobile.

O shell disponível não possui checkout do repositório e não resolve GitHub/registry npm, impedindo build local neste ambiente.


---

## Ajustes de Configurações por usuário — 24/09/2026

🟢 **INTEGRADO NA MAIN E PUBLICADO VISUALMENTE**

- PR #15 mergeada na `main`.
- Tema e modo compacto agora são preferências individuais por funcionário.
- Moeda, fuso, idioma e formatos continuam globais.
- `user_preferences` criado com RLS por usuário.
- Horário de atendimento configurável por dia da semana.
- Aba Automações removida de Configurações.
- `user_notifications` criado com RLS e Realtime.
- Notificações conectadas a novo lead, nova mensagem inbound, falha de automação e falha de integração.
- Front interno possui sino, popup, som e opção de notificação do navegador.
- `admin-user` v3 ACTIVE com criação de conta + grupos + overrides em uma única operação e rollback de falha.
- `ai-credential-vault` v3 ACTIVE com identificação de OpenAI, Anthropic/Claude e Google Gemini e listagem de modelos do provedor.
- Campo manual de modelo e observações removidos da configuração de IA.
- Security Advisor: 0 lints.
- Ambiente publicado usa Auth real no login.
- Setup único da primeira conta Administrador publicado e protegido por token + condição de banco vazio.
- JavaScript de `login/index.html`, `setup-admin/index.html` e `interno/index.html` validado sintaticamente.

### Limitações de validação

- Ainda não foi executado `npm run typecheck` ou `npm run build` em checkout local completo.
- Não foi criado usuário fictício para QA. O Auth permanece vazio até a ativação da primeira conta real.
- O fluxo de notificação está estruturalmente conectado e publicado, mas entrega a um usuário real só poderá ser observada depois da primeira conta interna existir.
- A inspeção real de uma chave de IA depende de uma chave fornecida pela operação; nenhuma chave foi inventada para QA.


## Continuidade Agentes IA: Cérebro, upload autenticado e feedback visual, 24/09/2026

🟠 **IMPLEMENTAÇÃO CONCLUÍDA, AGUARDANDO QA AUTENTICADO EM NAVEGADOR**

- Cérebro integrado à base React oficial em `src/features/ai-agents/**`.
- Contexto geral e fontes adicionais passam a usar `ai_brain_config` e `ai_brain_sources`.
- Upload aceita TXT, PDF, JPG, PNG e WEBP, com limite de 10 MB.
- PDF e imagem são enviados ao bucket privado `ai-brain` usando a sessão autenticada do usuário.
- PDF e imagem chamam `ai-brain-process-source`, que permanece protegido por JWT e permissão `ai.manage`.
- Runtime dos agentes inclui automaticamente o contexto do Cérebro e fontes processadas.
- Agentes usam automaticamente uma configuração de IA pronta em Integrações, sem exigir seleção de provedor em cada agente.
- Página publicada em `gh-pages/interno/index.html` deixou de usar token fixo para o Cérebro e passou a usar a sessão interna real, RLS, Storage privado e Edge Function autenticada.
- `ai-brain-static-bridge` foi desativada no Supabase, versão 2, `verify_jwt=true`, retornando HTTP 410 para chamadas antigas.
- Estrutura do Cérebro, RLS e Storage foi versionada em `supabase/schema/ai_brain.sql`.
- `ai-brain-process-source` e a ponte desativada foram versionadas em `supabase/functions/**`.
- Botões da base React receberam resposta visual mínima ao clique, foco visível, estado ocupado e estado de sucesso.
- A tela de Cérebro possui estados reais de `Salvando...`, `Salvo ✓`, envio, registro, processamento e conclusão.
- O CSS global foi reconciliado com o hotfix `cf84513b0e75ae1ca7211b8aeb0c0cb897672c7e`, preservando as mudanças concorrentes de preferências e tema.

### Validação executada

- [x] JavaScript da página publicada validado sintaticamente.
- [x] Página publicada sem referência a `AI_BRIDGE_TOKEN` ou `ai-brain-static-bridge`.
- [x] Fluxo publicado contém chamada autenticada ao `ai-brain-process-source`.
- [x] Feedback visual global dos botões confirmado na página publicada.
- [x] Bucket `ai-brain` confirmado privado, 10 MB e MIME types restritos.
- [x] RLS de `ai_brain_config`, `ai_brain_sources` e `storage.objects` conferida.
- [x] `ai-brain-process-source` ACTIVE com `verify_jwt=true`.
- [x] `ai-brain-static-bridge` ACTIVE v2 somente como endpoint desativado, com `verify_jwt=true`.

### Ainda não verificado

- [ ] Upload real de PDF e imagem pela UI com uma conta interna real.
- [ ] Extração completa observada pelo navegador até o status `ready`.
- [ ] `npm run typecheck` e `npm run build` em checkout completo.
- [ ] QA visual final desktop/mobile da base React compilada.

Motivo dos itens não verificados: este ambiente não possui checkout completo do repositório e não resolve GitHub/registry via shell. Não foi criada conta fictícia para contornar autenticação.
