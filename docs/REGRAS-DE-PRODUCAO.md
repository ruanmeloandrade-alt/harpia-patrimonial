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

## 2. Definition of Ready — antes de começar qualquer tarefa

Antes de escrever código, o chat/agente deve confirmar: branch correta; leitura de `AGENTS.md`, `docs/REGRAS-DE-PRODUCAO.md`, briefing, escopo, arquivo da frente, contratos e status; versão mais recente dos arquivos; propriedade dos arquivos; e menor conjunto de mudanças necessário. Se isso não puder ser confirmado, a tarefa ainda não está pronta para começar.

## 3. Isolamento das cinco frentes

- Frente01 → `frente-01`
- Frente02 → `frente-02`
- Frente03 → `frente-03`
- Frente04 → `frente-04`
- Frente05 → `frente-05`

Não desenvolver diretamente na `main`, não fazer force push, não reescrever histórico de outra frente e não editar arquivo pertencente a outra frente por conveniência. Arquivos globais, roteador raiz, providers, configuração de build, dependências compartilhadas e tokens/estilos globais pertencem por padrão à Frente01. Necessidades globais devem ser registradas em `docs/STATUS-FRENTES.md`.

## 4. Regra anti-conflito

Antes de editar arquivo existente: buscar novamente no GitHub, verificar alterações concorrentes e comparar com a base usada. Se houver conflito, NÃO sobrescrever e NÃO resolver no chute; registrar no status e deixar a integração para a frente proprietária ou para o pente fino.

## 5. Contrato antes da implementação

Módulos dependentes devem usar contratos explícitos. Não duplicar tipos centrais, fontes de verdade ou lógica de outro módulo. Mudança de contrato compartilhado exige atualização de `docs/CONTRATOS-ENTRE-MODULOS.md`.

## 6. Banco de dados e persistência

Não duplicar entidades, não reescrever migrations já utilizadas por outra frente, preservar integridade e histórico, confirmar ações destrutivas, não colocar segredos no repositório e aplicar autorização também na camada de dados/servidor quando houver.

## 7. Regra zero mocks

Mocks só podem ser temporários durante construção e devem ser removidos antes do handoff. Sem dados reais: métricas `0`, listas vazias, Inbox vazia, integração `não conectado`, sem cards/usuários/conversas fictícias. É proibido fingir funcionamento para a plataforma parecer cheia.

## 8. UI e UX

Toda tela deve considerar loading, vazio, erro, sucesso, confirmação de ação destrutiva, responsividade básica, navegação sem botão morto, textos coerentes, acessibilidade básica e componentes compartilhados. Não duplicar componentes sem necessidade.

## 9. Funcionalidade antes de enfeite

Ordem: fluxo funcional → persistência → erros/empty state → permissões/segurança → responsividade → acabamento visual. Não priorizar animações enquanto o fluxo principal não funciona.

## 10. Integrações ainda não conectadas

WhatsApp e Meta ficam para o final. Até lá usar interfaces preparatórias e estados `não conectado`, sem simular envio real, inventar tokens ou criar dependência que bloqueie a plataforma.

## 11. Autenticação e permissões

Cliente final e usuário interno são contextos distintos. Sessão persistente conforme briefing. Permissões internas por grupo/função + exceção individual. Esconder botão não substitui autorização real. Rotas internas precisam ser protegidas.

## 12. Commits

Commits pequenos, descritivos e prefixados pela frente, por exemplo `[F01] auth: criar sessão persistente`. Evitar `update`, `fix`, `changes`, `final`.

## 13. Não dizer “pronto” antes de validar

Antes do handoff verificar, quando disponível: build, TypeScript, lint, imports, rotas, formulário principal, salvar/editar/excluir, estado vazio, refresh/persistência, funcionamento sem integração externa, responsividade e permissões. Se algo não puder ser testado, registrar `NÃO VERIFICADO`. Nunca afirmar teste não executado.

## 14. Definition of Done

Só considerar concluído quando: atende briefing/escopo; sem mock permanente; sem quebrar contrato; branch correta; sem segredo; erros/empty states considerados; testes possíveis executados; sem botões principais mortos; status atualizado; handoff preenchido; mudanças de produto documentadas; pendências expostas claramente.

## 15. Handoff obrigatório

Registrar data/hora, branch, commit relevante, implementação, arquivos/rotas, contratos alterados, testes executados, itens não testados, bugs conhecidos, dependências, pedidos de integração e próximo passo. Outro chat precisa conseguir continuar sem depender da conversa anterior.

## 16. Mudança de escopo

Aplicar a decisão mais recente e atualizar conversa/decisões, briefing/escopo quando estrutural, contratos e status das frentes afetadas.

## 17. Pente fino e integração final

Nenhuma frente integra tudo sozinha. O integrador deve revisar handoffs, contratos, conflitos, duplicações, build/testes completos, navegação ponta a ponta, empty/error states, permissões, mocks e desacoplamento de WhatsApp/Meta, seguindo também `docs/PENTE-FINO-INTEGRACAO.md`.

## 18. Prioridade

Funcionamento → integridade dos dados → não quebrar outra frente → briefing → velocidade → estética extra. Escolher a solução mais simples, estável e extensível.

## 19. Proibições explícitas

É proibido: branch errada; sobrescrever sem reler; inventar requisito; remover requisito por dificuldade; esconder falha com mock; duplicar entidade central; acoplar módulo improvisadamente; expor segredo; afirmar teste inexistente; marcar concluído com fluxo quebrado; alterar código de outra frente sem registro; usar GitHub Actions.

## 20. Resumo operacional

Antes: **ler → conferir branch → status → contratos → arquivos atuais**.
Durante: **escopo próprio → commits pequenos → sem mock permanente → sem sobrescrever outra frente**.
Depois: **build/testes → revisar requisito → atualizar status → handoff → declarar exatamente o que está pronto e o que falta**.

## 21. Status visual obrigatório nos relatórios ao usuário

Todo chat/agente deve apresentar o andamento do próprio escopo usando estes três estados visuais:

- 🔴 **NÃO INICIADO** — nenhum trabalho relevante foi realizado naquele item.
- 🟠 **PARCIAL / EM ANDAMENTO** — existe implementação ou avanço real, mas ainda falta código, integração, validação, teste ou algum requisito para o usuário poder considerar o item concluído.
- 🟢 **COMPLETO E TESTÁVEL** — implementação concluída no escopo da frente, validações relevantes executadas e o usuário já pode testar o item conforme o handoff.

Regras obrigatórias:

1. Nunca usar 🟢 somente porque a interface existe.
2. Item com teste essencial marcado `NÃO VERIFICADO` não pode receber 🟢.
3. Se um módulo tiver partes em estados diferentes, quebrar o relatório em subitens e marcar cada um separadamente.
4. Não usar 🟢 para algo que ainda dependa de integração obrigatória para funcionar no produto.
5. Todo relatório de entrega/progresso deve trazer a legenda ou deixar o significado dos emojis inequívoco.
6. O estado visual apresentado ao usuário deve ser coerente com `docs/STATUS-FRENTES.md` e com o handoff da frente.
7. É proibido melhorar artificialmente o status para transmitir sensação de avanço; o emoji deve refletir o estado real e verificável.
