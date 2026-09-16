# Hárpia Patrimonial — Regras obrigatórias de trabalho

Este arquivo deve ser lido antes de qualquer alteração no projeto.

## 1. Fonte de verdade

- Repositório oficial: `ruanmeloandrade-alt/harpia-patrimonial`.
- Domínio oficial: `harpiapatrimonial.com`.
- GitHub é a fonte de verdade de código, documentação, decisões e contexto do projeto.
- NÃO usar GitHub Actions neste projeto.
- Antes de implementar qualquer módulo, ler:
  1. `AGENTS.md`
  2. `docs/REGRAS-DE-PRODUCAO.md`
  3. `docs/BRIEFING-CONSOLIDADO.md`
  4. `docs/ESCOPO-DE-TRABALHO.md`
  5. `docs/CONVERSA-E-DECISOES.md`
  6. `docs/FRENTES-DE-TRABALHO.md`
  7. `docs/CONTRATOS-ENTRE-MODULOS.md`
  8. `docs/STATUS-FRENTES.md`

## 2. Princípio central
A plataforma Hárpia deve ser independente e sustentar a operação de inteligência patrimonial definida no briefing.

## 3. MarketOn e Pais e Filhos
São apenas referências de produto, UX e aprendizados. Não copiar código automaticamente nem criar dependência técnica.

## 4. Dados e mocks
É proibido deixar métricas, leads, imóveis, usuários ou resultados fictícios no produto entregue. Sem dados reais, usar `0` e empty states.

## 5. Plataforma primeiro
Construir plataforma configurável primeiro; depois cadastrar imóveis, funcionários, permissões, bots e agentes. WhatsApp e Meta ficam para a fase final.

## 6. Arquitetura funcional
Site público, catálogo, autenticação/área do cliente, área interna, CRM, Automatize, Inbox, SalesBot visual, agentes IA, usuários/permissões, dashboard real e integrações preparadas.

## 7. Catálogo
Empreendimento/unidades e imóvel avulso; foto/vídeo; criar, editar, publicar, pausar, vendido, duplicar e excluir; publicação explícita; histórico preservado.

## 8. CRM
Funis/etapas configuráveis; lead do site registra origem/contexto e não dispara mensagem automaticamente.

## 9. SalesBot
Construtor visual por blocos: gatilho, condição, espera, mensagem, IA, etapa, responsável, tarefa, campo, tags, webhook/API e encadeamento.

## 10. IA
Configurável e em bastidor; prompts operacionais vêm depois.

## 11. Inbox
Conversas + chat + contexto CRM; preparada para mídias, formulários, SalesBot, IA, tags, responsável e mudança de etapa. WhatsApp real depois.

## 12. Usuários/permissões
Cadastro posterior; grupos/funções + exceções individuais.

## 13. Cliente final
Nome, e-mail, WhatsApp e senha; sessão persistente; navegar sem conta e exigir conta para ações persistentes.

## 14. Site público
Menu, filtros e localização conforme briefing; não travar em Rio de Janeiro.

## 15. Captação
Venda/locação manual via formulário + WhatsApp; sem self-service OLX agora; pop-up CIB fora; retenção focada no comprador.

## 16. Integrações
Preparar WhatsApp, Meta, e-mail e APIs, mas conectar WhatsApp/Meta por último.

## 17. Trabalho paralelo
Antes de alterar arquivo, buscar versão atual; não sobrescrever outra frente; commits pequenos; decisões de produto devem ser documentadas.

## 18. Prazo
16/09 demonstração; 20/09 entrega planejada; 21/09 início de uso.

## 19. Critério de decisão
Escolher a solução mais simples, estável e extensível que cumpra o requisito.

## 20. Cinco frentes
Quando o usuário disser `Atue na Frente01` a `Frente05`: ler `docs/FRENTES-DE-TRABALHO.md` e `docs/frentes/FRENTE-0X.md`, trabalhar na branch correspondente, respeitar propriedade de arquivos, registrar dependências/status e preencher handoff.

Branches: F01 `frente-01`, F02 `frente-02`, F03 `frente-03`, F04 `frente-04`, F05 `frente-05`.

Arquivos globais pertencem por padrão à Frente01. Depois das cinco frentes seguir `docs/PENTE-FINO-INTEGRACAO.md`.

## 21. Regras de produção e qualidade
`docs/REGRAS-DE-PRODUCAO.md` é obrigatório. Todo agente deve cumprir Definition of Ready, isolamento de branch, contratos explícitos, anti-conflito, zero mocks permanentes, commits identificados, validação real, Definition of Done e handoff. Se um teste não foi executado, registrar `NÃO VERIFICADO`. É proibido afirmar sucesso sem validação real.
