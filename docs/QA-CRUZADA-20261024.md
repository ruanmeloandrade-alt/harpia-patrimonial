# Hárpia — revisão cruzada dos erros de Saúde Slim e Converte Call
Data: 24/10/2026. Repositório: ruanmeloandrade-alt/harpia-patrimonial.
Fonte: main (base 6cf4dc6); trabalho isolado em fix/harpia-cross-system-qa-20261024.
Publicação da interface: gh-pages. Supabase: desxomqvtjaymwwxivwq.

## Escopo e preservação
Foram lidos os chats “Corrigir exclusão de bots” (Saúde Slim) e “Clarify incomplete request” (Converte Call), incluindo os relatos recentes de campos, condicionais, pausas e pipeline. A inspeção da Hárpia usou o código atual, a branch publicada, as funções ativas e o banco real. A versão publicada tem ações em massa e outras alterações que ainda não estão inteiramente em main; por isso os ajustes publicados preservam os bundles existentes, sem substituir a aplicação por um build mais antigo.

## Correções
| Item relatado | Resultado na Hárpia |
|---|---|
| Bot excluído reaparece / falso sucesso | Exclusão aguarda persistência confirmada, mantém rollback em erro e pede confirmação antes de excluir. |
| Campo criado ou selecionado não fica salvo | CRM e Inbox aguardam confirmação do banco antes de limpar o formulário ou confirmar a alteração. Tipos e opções conferidos no banco real. |
| Edição interrompida por atualização | Atualizações F05 não reinstalam todo o runtime de CRM/Inbox, preservando a tela e os formulários em edição. |
| Condicional OU presa à mesma saída | Cada regra tem saída própria, inclusive quando há uma regra só. O runtime usa a saída da primeira regra correspondente; mantém compatibilidade com destinos antigos. |
| Servidor ignora conexões | Execução e retomada após delay seguem o grafo; a ordem da lista é usada somente em definições antigas que não possuem campos de conexão. |
| Pausas liberadas por mensagem antiga/repetida | Cada pausa de resposta exige novo ID de evento; rejeita evento anterior ao início da espera quando o horário está disponível. A mesma resposta não libera pausas consecutivas. |
| Temporizador ignorado | Validação aceita segundos/minutos/horas/dias/semanas. Mensagem recebida não antecipa o prazo. |
| Comando de pausar não cancela espera | Pausa externa é verificada entre ações; no servidor também cancela prazos pendentes do scheduler. Uma ação externa já iniciada não é desfeita. |
| Pronto / Aplicar existentes | Bloqueia envio concorrente, preserva o ID salvo para nova tentativa, usa chave idempotente por aplicação, respeita filtros/horário e informa falhas do worker. CORS do endpoint foi corrigido. |
| Horário personalizado | Campos de início/fim adicionados; o executor valida o intervalo, inclusive quando atravessa meia-noite. Sem configuração válida não executa o dia inteiro. |
| Fontes do Cérebro sem edição | Edição de título e conteúdo com controle de concorrência por updated_at, usando a sessão e RLS existentes. |

## Casos diferentes ou não reproduzidos
- O seletor de unidade de tempo do funil da Hárpia já mantém quantidade e unidade em estados separados. A falha de regex foi encontrada na duração das pausas do SalesBot.
- O cabeçalho da Inbox usa altura mínima, sem a altura fixa de 64 px identificada na Saúde Slim. O Kanban usa rolagem horizontal; não foi aplicada a mudança visual de Projetos da extensão.
- Instalação de manifest.json e organização de projetos da extensão Converte Call não se aplicam ao sistema web Hárpia.
- Links autorizados/palavras proibidas não têm o mesmo módulo separado no Cérebro atual da Hárpia. Não foram criadas configurações comerciais novas nem copiado código dos outros sistemas.
- Remoção de formulários/DM/e-mail na Saúde Slim é decisão daquele produto; não foi copiada automaticamente para a Hárpia.

## Validação executada
- 41 verificações de fonte: duração, regras, saídas, mensagens repetidas/antigas, temporizador, filtros, horário e exclusão com falha de persistência.
- 12 verificações dos handlers reais de Edge Function em ambiente isolado com adaptador de persistência: grafo, retomada, pausa, cancelamento do prazo e proteção de acesso.
- 18 verificações em cada um dos dois bundles publicados: funções extraídas dos próprios arquivos, incluindo condicionais, pausas, campos e falhas do banco.
- 19 verificações aplicáveis dos acessos existentes aos gatilhos nos dois bundles (10 principal, 9 fallback).
- Total: 108 verificações automatizadas. O teste de saída OU falha com o bundle anterior e passa com a correção.
- npm run typecheck e npm run build passaram.
- Banco real, role authenticated com identidade de gestor existente: oito tipos de campos criados, lidos, opções editadas e excluídos em transação com rollback.
- Fonte de Cérebro criada e editada sob RLS em transação com rollback.
- Sem contas criadas, mensagens enviadas, configuração de bots operacionais ou dados temporários persistentes.

Os testes isolados usam adaptadores apenas nos testes. A aplicação mantém Supabase e serviços reais.

## Publicação de backend confirmada
- f05-runtime-worker v8 ACTIVE.
- f05-delay-worker v3 ACTIVE.
- automation-event-worker v12 ACTIVE.
- automation-apply-existing v2 ACTIVE.
- Código das quatro funções relido após implantação e comparado ao código enviado.
- OPTIONS de automation-apply-existing: HTTP 200 com CORS esperado.
- POST sem autorização ao runtime: HTTP 401, sem executar ações.
- Mantidas as proteções internas de autenticação existentes; nenhuma alteração de RLS ou dependência de produção.

## Interface
Bundles preparados:
- assets/index-cross-system-1c01837f4ade.js
- assets/index-cross-system-04e53da082e6.js

21 pontos de entrada HTML passam a referenciar esses arquivos. A publicação e a conferência por HTTPS serão registradas em STATUS-FRENTES.md e no relatório de entrega.

## Limites da homologação
🟢 Código e verificações descritas acima concluídos no escopo.
🟠 QA visual autenticado desktop/mobile e execução de ponta a ponta com destinatários reais: NÃO VERIFICADOS nesta revisão.
🟠 Áudio/vídeo, confirmação de reprodução e horário comercial dependem de eventos reais de transporte. O servidor mantém essas pausas aguardando confirmação; não as converte silenciosamente em temporizadores nem inventa entrega.
🟠 Integrações de envio ainda retornam not_configured quando indisponíveis. Esta entrega não configura WhatsApp, Meta, e-mail ou chaves de IA.

## Arquivos alterados
Fonte:
- src/app/PlatformRuntime.tsx
- src/features/ai-agents/AIAgentsWorkspace.tsx
- src/features/ai-agents/brainRepository.ts
- src/features/crm/CrmWorkspaceCore.tsx
- src/features/crm/PipelineTriggerConfigPanel.tsx
- src/features/inbox/InboxWorkspaceCore.tsx
- src/features/salesbot/SalesBotWorkspace.tsx
- src/features/salesbot/executionRepository.ts
- src/features/salesbot/repository.ts
- src/features/salesbot/runtime.ts
- src/features/salesbot/validation.ts
Backend:
- supabase/functions/_shared/salesbot-flow.ts
- supabase/functions/f05-runtime-worker/index.ts
- supabase/functions/f05-delay-worker/index.ts
- supabase/functions/automation-event-worker/index.ts
- supabase/functions/automation-apply-existing/index.ts
Verificação/publicação:
- scripts/patch-cross-system-regressions.cjs
- scripts/test-cross-system-regressions.cjs
- scripts/test-published-cross-system.cjs
- scripts/test-edge-flow.cjs
Documentação:
- docs/QA-CRUZADA-20261024.md
- docs/STATUS-FRENTES.md
Produção estática:
- Os dois bundles acima e 21 HTMLs existentes; conteúdo público, CSS de marca, catálogo, imagens e funções adicionais foram preservados.

## Decisão técnica e responsabilidade
Esta é uma correção de integração F01/F04/F05, autorizada pela revisão cruzada solicitada. PlatformRuntime é alterado somente para preservar a edição e propagar identidade/horário da mensagem; os demais módulos mantêm suas responsabilidades.
A publicação preserva os bundles atuais porque substituí-los pelo build de main removeria funções mais recentes. O script verifica hashes de entrada, ocorrência única das substituições, sintaxe e testes dos arquivos resultantes. Não usa GitHub Actions.

