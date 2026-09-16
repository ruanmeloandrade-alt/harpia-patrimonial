# Hárpia Patrimonial — Regras de Produção

Data-base: 16/09/2026

Este documento define o modo obrigatório de produção para todos os chats/agentes que atuarem no projeto. O objetivo é reduzir retrabalho, conflitos entre frentes, regressões, código duplicado, funcionalidades fictícias e entregas declaradas como prontas sem validação.

---

## 1. Princípio geral

A prioridade é entregar rápido **sem sacrificar coerência, funcionamento e continuidade entre chats**.

Regras absolutas:

- GitHub é a fonte de verdade.
- Não trabalhar baseado apenas na memória do chat.
- Não usar GitHub Actions.
- Não copiar código de MarketOn ou Pais e Filhos; usar apenas como referência de produto e fluxo.
- Não inventar dados reais, métricas, imóveis, usuários, bots, agentes ou resultados.
- Não declarar uma funcionalidade como pronta se ela não foi implementada e verificada.
- Não sobrescrever trabalho de outra frente.
- Não alterar escopo sem registrar a decisão no GitHub.

---

## 2. Definition of Ready — antes de começar qualquer tarefa

Antes de escrever código, o chat/agente deve confirmar:

1. Está na branch correta da sua frente.
2. Leu `AGENTS.md`.
3. Leu `docs/REGRAS-DE-PRODUCAO.md`.
4. Leu `docs/BRIEFING-CONSOLIDADO.md` e `docs/ESCOPO-DE-TRABALHO.md` nas partes relevantes.
5. Leu `docs/FRENTES-DE-TRABALHO.md` e seu `docs/frentes/FRENTE-0X.md`.
6. Consultou `docs/CONTRATOS-ENTRE-MODULOS.md` para não criar contrato incompatível com outra frente.
7. Consultou `docs/STATUS-FRENTES.md` para saber bloqueios, dependências e mudanças recentes.
8. Buscou a versão mais recente dos arquivos que pretende alterar.
9. Identificou se os arquivos pertencem à sua frente ou são compartilhados.
10. Definiu o menor conjunto de arquivos necessário para concluir a tarefa.

Se um item acima não puder ser confirmado, a tarefa ainda não está pronta para começar.

---

## 3. Isolamento das cinco frentes

Cada frente trabalha somente na sua branch:

- Frente01 → `frente-01`
- Frente02 → `frente-02`
- Frente03 → `frente-03`
- Frente04 → `frente-04`
- Frente05 → `frente-05`

Durante a produção paralela:

- não desenvolver diretamente na `main`;
- não fazer force push;
- não reescrever histórico de outra frente;
- não editar arquivo pertencente a outra frente apenas por conveniência;
- não mover responsabilidades de uma frente para outra sem registrar a decisão.

Arquivos globais, roteador raiz, providers, configuração de build, dependências compartilhadas e tokens/estilos globais pertencem por padrão à Frente01.

Se outra frente precisar alterar um arquivo global, deve registrar a necessidade em `docs/STATUS-FRENTES.md` e, sempre que possível, criar seu módulo de forma desacoplada para a Frente01 ou o integrador apenas fazer a conexão final.

---

## 4. Regra anti-conflito

Antes de editar qualquer arquivo existente:

1. buscar novamente o arquivo no GitHub;
2. verificar se outra frente o alterou;
3. comparar com a versão que serviu de base para o trabalho;
4. só então editar.

Se houver alteração concorrente no mesmo arquivo:

- NÃO sobrescrever;
- NÃO tentar “resolver no chute”;
- registrar o conflito no status;
- preservar as duas intenções;
- deixar a integração para a frente proprietária do arquivo ou para o pente fino.

---

## 5. Contrato antes da implementação

Quando um módulo depende de outro, usar contrato explícito antes de acoplar código.

Exemplos:

- Site público precisa consumir catálogo → definir formato de `Product/Property` no contrato.
- CRM precisa receber cadastro do site → definir payload de criação de lead.
- Inbox precisa mover etapa → usar serviço/contrato do CRM, não duplicar lógica.
- SalesBot precisa chamar IA → usar interface de agente, não acessar estrutura interna diretamente.

Regras:

- Não duplicar tipos centrais com formatos diferentes.
- Não criar uma segunda fonte de verdade para o mesmo dado.
- Não acessar tabelas/estado de outro módulo de forma improvisada se existe serviço/contrato definido.
- Alteração de contrato compartilhado exige atualização de `docs/CONTRATOS-ENTRE-MODULOS.md`.

---

## 6. Banco de dados e persistência

- Não criar duas tabelas para representar a mesma entidade.
- Não alterar ou apagar migration já utilizada por outra frente; criar uma nova migration/alteração incremental quando aplicável.
- Nomes de tabelas, campos e relacionamentos devem seguir um padrão único.
- Toda exclusão relevante deve considerar histórico e integridade referencial.
- Operações destrutivas precisam de confirmação na UI quando aplicável.
- Não colocar segredo, token, senha ou chave no repositório.
- Permissões não podem existir apenas no frontend; quando houver backend/banco, a proteção deve existir também na camada de dados/servidor.

---

## 7. Regra zero mocks

Mocks podem ser usados somente de forma temporária durante construção local de componente e devem ser removidos antes do handoff.

No estado entregue:

- métrica sem dado = `0`;
- lista sem dado = empty state;
- imóvel inexistente = nenhum card fictício;
- usuário inexistente = nenhum usuário fictício;
- conversa inexistente = Inbox vazia;
- integração não conectada = estado `não conectado`;
- recurso ainda não operacional = indicar claramente que está aguardando integração, sem fingir sucesso.

É proibido usar dados fictícios apenas para a plataforma “parecer cheia”.

---

## 8. UI e UX

Toda tela entregue deve prever, conforme aplicável:

- estado carregando;
- estado vazio;
- estado de erro;
- sucesso/feedback de ação;
- confirmação para ações destrutivas;
- responsividade mínima para desktop e mobile;
- navegação sem botão morto;
- labels e textos coerentes com Hárpia;
- acessibilidade básica de formulário;
- consistência visual com tokens/componentes compartilhados.

Não criar cinco versões diferentes do mesmo botão, modal, campo ou card se um componente compartilhado resolve.

---

## 9. Funcionalidade antes de enfeite

A ordem de implementação de cada recurso é:

1. fluxo funcional;
2. persistência/dados reais;
3. estados de erro e vazio;
4. permissões/segurança;
5. responsividade;
6. acabamento visual.

Não gastar tempo em animação, microinteração ou detalhe cosmético enquanto o fluxo principal não funciona.

---

## 10. Regras para integrações ainda não conectadas

WhatsApp e Meta serão conectados no final.

Até lá:

- construir interfaces, serviços e telas preparatórias;
- usar estados `não conectado`/`aguardando configuração`;
- não simular envio real de mensagem;
- não inventar IDs/tokens;
- não criar dependência que impeça o restante da plataforma de funcionar sem essas integrações.

---

## 11. Autenticação e permissões

- Cliente final e usuário interno são contextos diferentes.
- Cadastro do cliente final: nome, e-mail, WhatsApp e senha.
- Sessão persistente conforme briefing.
- Permissões internas: grupo/função + exceções individuais.
- Esconder botão não é autorização suficiente; ações protegidas devem validar permissão na camada adequada.
- Rotas internas não devem ficar acessíveis publicamente por simples URL.

---

## 12. Commits

Commits devem ser pequenos, descritivos e vinculados à frente.

Padrão recomendado:

- `[F01] auth: criar sessão persistente`
- `[F02] site: implementar filtros do catálogo`
- `[F03] catalogo: criar fluxo de publicação`
- `[F04] crm: adicionar edição de etapas`
- `[F05] salesbot: adicionar bloco de condição`

Evitar commits genéricos como `update`, `fix`, `changes` ou `final`.

Uma tarefa grande deve ser dividida em commits lógicos sempre que possível.

---

## 13. Não dizer “pronto” antes de validar

Uma frente não pode declarar módulo concluído apenas porque a tela existe.

Antes do handoff, verificar no mínimo:

- build do projeto;
- erros de TypeScript quando configurado;
- lint quando configurado;
- imports quebrados;
- rotas principais;
- formulário principal;
- salvar/editar/excluir quando aplicável;
- estado vazio;
- refresh da página quando houver persistência;
- comportamento sem integração externa;
- responsividade básica;
- permissões relevantes.

Se o ambiente não permitir executar algum teste, registrar explicitamente `NÃO VERIFICADO` no handoff. Nunca escrever que passou em teste que não foi executado.

---

## 14. Definition of Done — critérios obrigatórios

Uma tarefa só é considerada concluída quando:

1. atende ao briefing e ao escopo da frente;
2. não introduz mock permanente;
3. não quebra contrato compartilhado;
4. código está na branch correta;
5. não contém segredo no repositório;
6. tratamento de erro/empty state foi considerado;
7. build/testes possíveis foram executados;
8. não existem botões principais sem ação sem que estejam explicitamente marcados como integração futura;
9. status da frente foi atualizado;
10. handoff informa arquivos alterados, funcionalidades prontas, testes feitos, pendências e dependências;
11. qualquer mudança de produto foi documentada;
12. o agente consegue apontar exatamente o que ainda falta — sem mascarar pendências.

---

## 15. Handoff obrigatório de cada frente

Ao finalizar um bloco de trabalho, registrar no arquivo da frente e/ou em `docs/STATUS-FRENTES.md`:

- data/hora;
- branch;
- último commit relevante;
- o que foi implementado;
- arquivos principais alterados;
- rotas/telas criadas;
- contratos criados/alterados;
- testes realmente executados;
- o que não foi testado;
- bugs conhecidos;
- dependências de outras frentes;
- pedidos para integração;
- próximo passo recomendado.

Isso é obrigatório para outro chat conseguir continuar sem depender da conversa anterior.

---

## 16. Regra para mudança de escopo

Se o usuário mudar uma decisão:

1. aplicar a nova decisão;
2. atualizar `docs/CONVERSA-E-DECISOES.md`;
3. atualizar briefing/escopo se a mudança for estrutural;
4. atualizar contrato entre módulos se necessário;
5. avisar frentes afetadas via `docs/STATUS-FRENTES.md`.

A decisão mais recente registrada prevalece sobre implementação antiga.

---

## 17. Pente fino e integração final

Nenhuma frente deve tentar “integrar tudo sozinha”.

O integrador/pente fino deve:

- partir das cinco branches;
- revisar os handoffs;
- comparar contratos;
- integrar sem apagar funcionalidades;
- resolver conflitos conscientemente;
- remover duplicações;
- executar build/testes completos;
- verificar navegação ponta a ponta;
- conferir estados vazios e erros;
- conferir permissões;
- conferir que não restaram mocks;
- validar que WhatsApp/Meta continuam desacoplados até a etapa de conexão real.

Seguir também `docs/PENTE-FINO-INTEGRACAO.md`.

---

## 18. Regra de prioridade até a entrega

Quando houver disputa entre opções:

1. funcionamento;
2. integridade dos dados;
3. não quebrar outra frente;
4. aderência ao briefing;
5. velocidade;
6. estética extra.

Escolher a solução mais simples, estável e extensível que cumpra o requisito. Não criar complexidade apenas para parecer robusto.

---

## 19. Proibições explícitas

É proibido:

- trabalhar na branch errada;
- sobrescrever arquivo sem reler a versão atual;
- inventar requisito para preencher lacuna não essencial;
- remover requisito porque dá mais trabalho;
- esconder falha com mock;
- duplicar entidade central;
- acoplar módulo diretamente a implementação interna de outra frente quando existe contrato;
- expor segredo no GitHub;
- afirmar que algo foi testado quando não foi;
- marcar frente como concluída com fluxo principal quebrado;
- alterar código de outra frente sem registrar motivo;
- usar GitHub Actions.

---

## 20. Resumo operacional

Antes: **ler → conferir branch → conferir status → conferir contratos → buscar arquivos atuais**.

Durante: **trabalhar só no escopo → commits pequenos → sem mock permanente → sem sobrescrever outra frente**.

Depois: **build/testes → revisar requisito → atualizar status → preencher handoff → declarar exatamente o que está pronto e o que falta**.
