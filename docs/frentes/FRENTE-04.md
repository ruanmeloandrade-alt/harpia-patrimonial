# Frente04 — CRM e Inbox operacional

Branch obrigatória: `frente-04`

## Missão

Construir o núcleo comercial/operacional da Hárpia: CRM configurável e Inbox integrada ao contexto do lead, sem conectar WhatsApp real nesta fase.

## Modo obrigatório de apresentação de progresso

Sempre que o usuário pedir status, acompanhamento ou entrega desta frente, apresentar o escopo usando estes indicadores:

- 🔴 **Não iniciado** — nenhum trabalho relevante foi implementado.
- 🟠 **Parcial / em andamento** — existe implementação, mas ainda falta escopo, integração ou validação para o usuário testar como concluído.
- 🟢 **Completo e testável** — o bloco foi implementado, integrado no escopo necessário e está liberado para teste do usuário.

Regra: nunca usar 🟢 apenas porque o código foi escrito. Verde exige condição real de teste. Se build, integração ou fluxo principal não tiver sido validado, manter 🟠 e declarar o que falta.

## Escopo executivo e acompanhamento

### Bloco A — Fundação do CRM
- 🟠 Modelo de dados implementado: funil, etapa, lead, tag, campo personalizado, tarefa e histórico. Falta validação integrada.
- 🟠 Persistência vazia e real por padrão implementada com adapter local transitório; falta adapter multiusuário/backend da Frente01.
- 🟠 Serviço CRUD e regras de integridade implementados; falta validação de build/fluxo integrado.
- 🟠 Eventos de domínio implementados por `CrmEventSink`; falta conexão com Automatize da Frente05.

### Bloco B — Funis, etapas e Kanban
- 🟠 Criar/renomear/ativar/desativar funil implementado na UI e serviço; falta rota/build integrado.
- 🟠 Criar/renomear/reordenar/remover etapa com integridade implementado; remoção bloqueia etapa com leads.
- 🟠 Kanban por funil implementado; falta validação no shell final.
- 🟠 Movimentação manual de lead implementada por drag-and-drop e serviço.

### Bloco C — Lead 360º
- 🟠 Criar lead implementado; edição estrutural existe no serviço e ficha visual está parcial.
- 🟠 Origem e contexto de imóvel/produto/serviço previstos e exibidos.
- 🟠 Responsável implementado por contrato de usuários; falta lista real da Frente01.
- 🟠 Tags implementadas.
- 🟠 Campos personalizados implementados estruturalmente; UI inicial cria campo de texto e permite edição.
- 🟠 Observações previstas no modelo/serviço; falta acabamento de edição visual dedicado.
- 🟠 Tarefas/próximos passos implementados.
- 🟠 Histórico/timestamps implementados.

### Bloco D — Entrada de leads por contrato
- 🟠 Contrato para eventos do site/conta implementado em `ingestLeadConversion`.
- 🟠 Registro de origem, página/ação e contexto implementado; falta integração com Frente02/Frente01.
- 🟠 Garantia implementada: criar lead retorna `automaticMessageSent: false` e não chama transporte.

### Bloco E — Inbox operacional
- 🟠 Layout de três colunas implementado.
- 🟠 Lista de conversas implementada com estado vazio real.
- 🟠 Área central da conversa implementada.
- 🟠 Contexto CRM à direita implementado.
- 🟠 Empty state e estado de canal não conectado implementados; falta validação na rota final.

### Bloco F — Recursos de mensagem preparados
- 🟠 Texto preparado pelo contrato de transporte; envio bloqueado sem canal conectado.
- 🟠 Áudio previsto no modelo/contrato.
- 🟠 Imagem prevista no modelo/contrato.
- 🟠 Vídeo previsto no modelo/contrato.
- 🟠 Documento/anexo previsto no modelo/contrato.
- 🟠 Formulário previsto no modelo/contrato.
- 🟠 Proteção implementada: sem transporte real, nenhuma mensagem é registrada como enviada.

### Bloco G — Operação de CRM pela Inbox
- 🟠 Alterar etapa implementado.
- 🟠 Alterar responsável implementado.
- 🟠 Editar campo personalizado implementado.
- 🟠 Adicionar/remover tags implementado.
- 🟠 Criar tarefa/próxima ação implementado.

### Bloco H — Contratos com SalesBot/IA
- 🟠 Interface para iniciar/pausar SalesBot implementada; indisponível até Frente05 conectar.
- 🟠 Interface para acionar/pausar IA implementada; indisponível até Frente05 conectar.
- 🟠 Consulta de status implementada por contrato.
- 🟠 Motor não foi duplicado; fallback mostra `unavailable` e não simula sucesso.

### Bloco I — Validação e handoff
- 🔴 Build/TypeScript/imports completos da branch ainda NÃO VERIFICADOS em ambiente montado.
- 🔴 Fluxos CRUD principais ainda não foram testados ponta a ponta na rota final.
- 🟠 Empty states foram implementados, mas falta validação visual integrada.
- 🟠 Persistência local foi implementada; refresh/backend multiusuário ainda precisa validação/integração.
- 🔴 Handoff final não preenchido porque a frente ainda não está pronta para integração.

## Ler antes de começar

1. `AGENTS.md`
2. `docs/BRIEFING-CONSOLIDADO.md`
3. `docs/ESCOPO-DE-TRABALHO.md`
4. `docs/CONVERSA-E-DECISOES.md`
5. `docs/FRENTES-DE-TRABALHO.md`
6. `docs/CONTRATOS-ENTRE-MODULOS.md`
7. `docs/STATUS-FRENTES.md`

## Escopo exclusivo

### 1. CRM configurável

Entregar:

- criação de funil;
- edição/renomeação;
- ativação/desativação;
- etapas configuráveis;
- criação de etapa;
- renomear etapa;
- reordenar;
- remover com segurança/integridade;
- Kanban ou visual equivalente;
- movimentação manual de lead entre etapas.

A plataforma não deve nascer amarrada aos funis antigos da MarketOn.

### 2. Lead/contato

Ficha deve suportar:

- nome;
- e-mail;
- WhatsApp;
- origem;
- produto/imóvel/serviço de interesse;
- responsável;
- funil;
- etapa;
- tags;
- campos personalizados;
- observações;
- tarefas;
- próximos passos;
- histórico;
- timestamps relevantes.

### 3. Criação de lead por eventos do site

Consumir contrato da Frente02/Frente01 para criar lead quando houver conversão relevante.

Registrar contexto:

- origem;
- ação/página;
- imóvel/produto/serviço;
- contato conhecido.

Regra absoluta: criação de lead não envia mensagem automaticamente.

### 4. Tags

Permitir:

- criar/usar tags;
- adicionar/remover no lead;
- filtrar quando aplicável;
- registrar alteração quando necessário.

### 5. Campos personalizados

Preparar estrutura configurável para:

- criar campo;
- tipo de campo;
- editar valor no lead;
- disponibilizar valor para automações futuramente.

### 6. Responsáveis

Preparar associação do lead a usuário interno cadastrado pela Frente01.

Não pré-configurar round robin nem regra automática. Distribuição será definida depois via automações/SalesBot.

### 7. Tarefas e próximos passos

Permitir:

- criar tarefa;
- definir responsável;
- prazo;
- status;
- vincular a lead;
- visualizar próximo passo.

### 8. Histórico

Registrar alterações relevantes do lead, incluindo ao menos:

- criação;
- mudança de etapa;
- mudança de responsável;
- tags;
- campos;
- tarefas/ações relevantes.

### 9. Eventos para Automatize

Emitir ou preparar interface de eventos para Frente05:

- lead criado;
- etapa alterada;
- campo alterado;
- tag adicionada/removida;
- ausência de interação quando houver mecanismo;
- outros eventos extensíveis.

Não implementar regra de automação dentro do CRM.

### 10. Inbox

Layout obrigatório:

- lista de conversas à esquerda;
- chat no centro;
- contexto CRM à direita.

### 11. Contexto exibido na Inbox

Prever:

- lead;
- origem;
- responsável;
- etapa;
- tags;
- campos personalizados;
- imóvel/produto/serviço relacionado;
- próxima ação;
- dados de contato.

### 12. Recursos de mensagem preparados

- texto;
- áudio;
- imagem;
- vídeo;
- documento/anexo;
- formulário.

Sem WhatsApp real, a interface deve deixar claro o estado não conectado/inativo e não fingir envio real.

### 13. Ações CRM pela Inbox

Permitir operar diretamente no contexto da conversa:

- alterar etapa;
- mudar responsável;
- editar campos personalizados;
- adicionar/remover tags;
- criar tarefa/próxima ação.

### 14. Ações de automação pela Inbox

Preparar comandos por contrato da Frente05 para:

- iniciar SalesBot;
- pausar SalesBot;
- acionar IA;
- pausar IA;
- consultar status.

Não implementar motor de bot/IA nesta frente.

## Pastas sob responsabilidade

Preferencialmente:

- `src/features/crm/**`
- `src/features/inbox/**`
- serviços/repositórios/tipos específicos de lead, funil, etapa, tarefa, tag, campo e conversa.

## Não editar sem coordenação

- auth/RBAC;
- catálogo;
- área pública;
- motor SalesBot;
- Automatize;
- agentes IA;
- integrações externas;
- arquivos globais da Frente01.

## Dependências

- Frente01: usuários internos e permissões.
- Frente02: eventos de conversão do site.
- Frente03: referência de imóvel/produto.
- Frente05: comandos e status de SalesBot/IA.

Se uma dependência não estiver integrada, criar interface clara e empty state, não mock operacional enganoso.

## Critérios de aceite

- funis/etapas são configuráveis;
- lead pode ser criado/editado/movido;
- ficha do lead possui contexto comercial;
- tags/campos/tarefas funcionam estruturalmente;
- histórico é preservado;
- CRM emite/prepara eventos para automação;
- Inbox tem 3 colunas conforme definido;
- ações CRM podem ser feitas pela Inbox;
- bot/IA aparecem como comandos integráveis, sem simular execução inexistente;
- sem mensagens fictícias como se fossem WhatsApp real;
- build funciona na branch.

## Handoff obrigatório ao terminar

- Status:
- Commit final:
- O que foi entregue:
- O que ficou pendente:
- Modelo de dados CRM:
- Eventos emitidos:
- Contratos esperados da Frente05:
- Integrações esperadas com catálogo/site:
- Riscos conhecidos:
- Instruções para o chat de integração:
