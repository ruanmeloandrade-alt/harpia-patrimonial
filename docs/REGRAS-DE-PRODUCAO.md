# Hárpia Patrimonial — Regras de Produção

Data-base: 16/09/2026

Este documento define o modo obrigatório de produção para todos os chats/agentes. Objetivo: reduzir retrabalho, conflitos, regressões, duplicação e falso “pronto”.

## 1. Regras absolutas
- GitHub é a fonte de verdade.
- Não trabalhar só pela memória do chat.
- Não usar GitHub Actions.
- MarketOn/Pais e Filhos são referências, não fonte para copiar código.
- Não inventar dados, métricas, imóveis, usuários, bots, agentes ou resultados.
- Não declarar pronto sem implementar e verificar.
- Não sobrescrever outra frente.
- Não mudar escopo sem registrar no GitHub.

## 2. Definition of Ready
Antes de codar: branch correta; ler `AGENTS.md`, este arquivo, briefing, escopo, arquivo da frente, contratos e status; buscar versão atual dos arquivos; confirmar propriedade dos arquivos; definir menor mudança necessária. Sem isso, não começar.

## 3. Isolamento
- F01 `frente-01`
- F02 `frente-02`
- F03 `frente-03`
- F04 `frente-04`
- F05 `frente-05`
Não trabalhar na `main`, não fazer force push, não reescrever histórico e não editar arquivo de outra frente por conveniência. Arquivos globais pertencem por padrão à F01. Necessidades globais devem ir para `docs/STATUS-FRENTES.md`.

## 4. Anti-conflito
Antes de editar arquivo existente: reler no GitHub, verificar mudanças concorrentes e comparar com a base usada. Havendo conflito: não sobrescrever, não resolver no chute; registrar e deixar para a frente proprietária ou integrador.

## 5. Contratos
Dependências entre módulos devem usar contratos explícitos. Não duplicar tipos centrais, fontes de verdade ou lógica de outro módulo. Alterou contrato compartilhado? Atualizar `docs/CONTRATOS-ENTRE-MODULOS.md`.

## 6. Dados e persistência
Não duplicar entidades, não reescrever migration usada por outra frente, preservar histórico/integridade, confirmar ações destrutivas, não guardar segredos no repo e validar autorização também no backend/dados quando houver.

## 7. Zero mocks permanentes
Mocks só durante construção e devem sair antes do handoff. Sem dado: `0`, empty state, Inbox vazia, integração `não conectado`. Não fingir sucesso ou popular telas com dados fictícios.

## 8. UI/UX
Considerar loading, vazio, erro, sucesso, confirmação destrutiva, responsividade, navegação sem botão morto, textos coerentes, acessibilidade básica e componentes compartilhados.

## 9. Ordem de implementação
Fluxo funcional → persistência → erros/empty state → permissões → responsividade → acabamento visual. Enfeite nunca vem antes do fluxo principal.

## 10. Integrações
WhatsApp e Meta ficam para o final. Até lá: interfaces preparatórias, estado `não conectado`, sem simular envio, sem inventar token e sem bloquear o restante da plataforma.

## 11. Auth/permissões
Cliente final e usuário interno são contextos distintos. Sessão persistente conforme briefing. Permissões por grupo + exceção individual. Esconder botão não substitui autorização. Rotas internas precisam ser protegidas.

## 12. Commits
Pequenos, descritivos e prefixados: `[F05] salesbot: adicionar bloco de condicao`. Evitar `update`, `fix`, `changes`, `final`.

## 13. Validação
Antes do handoff verificar quando disponível: build, TypeScript, lint, imports, rotas, formulários, salvar/editar/excluir, empty state, refresh/persistência, modo sem integrações, responsividade e permissões. O que não foi testado deve ser `NÃO VERIFICADO`.

## 14. Definition of Done
Concluído só quando atende escopo, sem mock permanente, sem quebrar contrato, branch correta, sem segredo, erros/empty state considerados, testes possíveis executados, sem ação principal morta, status atualizado, handoff preenchido e pendências declaradas.

## 15. Handoff
Registrar data/hora, branch, commit, implementações, arquivos/rotas, contratos, testes feitos, itens não testados, bugs, dependências, pedidos de integração e próximo passo.

## 16. Mudança de escopo
A decisão mais recente prevalece. Atualizar conversa/decisões, briefing/escopo quando estrutural, contratos e status das frentes afetadas.

## 17. Integração final
Nenhuma frente integra tudo sozinha. O integrador revisa handoffs, contratos, conflitos, duplicações, build/testes, navegação ponta a ponta, empty/error states, permissões, mocks e desacoplamento de WhatsApp/Meta. Seguir `docs/PENTE-FINO-INTEGRACAO.md`.

## 18. Prioridade
Funcionamento → integridade dos dados → não quebrar outra frente → briefing → velocidade → estética extra.

## 19. Proibições
Branch errada; sobrescrever sem reler; inventar/remover requisito; esconder falha com mock; duplicar entidade; acoplar improvisado; expor segredo; afirmar teste inexistente; marcar concluído com fluxo quebrado; alterar outra frente sem registro; GitHub Actions.

## 20. Resumo
Antes: **ler → branch → status → contratos → arquivos atuais**. Durante: **escopo próprio → commits pequenos → sem mock permanente → sem sobrescrever**. Depois: **build/testes → revisar requisito → status → handoff → declarar o que está pronto e o que falta**.

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
