# Correção de abertura dos gatilhos na pipeline

## Falha e alteração

O nome da etapa, o cartão vazio “Adicione o primeiro gatilho aqui” e o fundo
da etapa não tinham um evento que abrisse o seletor. Somente o botão
“+ Adicionar gatilho” executava esse comando.

O nome e o cartão vazio agora são botões com rótulo acessível. O clique
direto no fundo da etapa também abre o seletor. As três entradas exigem
permissão de administração; no bundle que possui abas, o nome só abre o
seletor na aba Gatilhos. Cliques em elementos filhos não ativam o fundo,
preservando os controles de editar, excluir e administrar etapas.

## Publicação

- Branch de produção: `gh-pages`.
- Commit: `b5f65ef48faf15cd1e2194cbb11258fd3cf31918`.
- Principal: `assets/index-pipeline-triggers-0f51dcf24a90.js`.
- Fallback: `assets/index-pipeline-triggers-6f25c6a94e12.js`.
- Os pontos de entrada HTML usam os novos nomes para atualizar o cache.

O bundle principal publicado contém ações em massa mais recentes que o
componente em `main`. Para preservar essas funções, a publicação aplicou
somente as três mudanças equivalentes aos bundles existentes. O script
`scripts/patch-pipeline-trigger-entrypoints.py` verifica o SHA-256 dos
arquivos de origem e exige uma única correspondência para cada alteração.
A correção correspondente também está em `CrmWorkspaceCore.tsx`.

## Verificação

O teste `scripts/test-pipeline-trigger-entrypoints.cjs` extrai por AST as
funções exatas dos bundles e executa os handlers com elementos React reais
e adaptadores locais de hooks, providers e geometria. Não executa o bundle
inteiro nem usa API, gravação, armazenamento persistente ou dados reais.

```sh
node scripts/test-pipeline-trigger-entrypoints.cjs ../harpia-published/assets/index-DuJgOasb.js
node scripts/test-pipeline-trigger-entrypoints.cjs ../harpia-published/assets/index-pipeline-triggers-0f51dcf24a90.js
node scripts/test-pipeline-trigger-entrypoints.cjs ../harpia-published/assets/index-pipeline-triggers-6f25c6a94e12.js
```

O primeiro comando deve falhar nos três acessos corrigidos. O principal
corrigido passou nas dez verificações; o fallback passou em nove, com uma
não aplicável por não possuir ações em massa. Foram verificados abertura
do seletor, configuração de SalesBot e Pausar SalesBot, cancelamento,
permissões, modo de ações em massa, propagação de eventos e edição de
gatilhos existentes. `npm run typecheck` e a análise de sintaxe dos dois
bundles também passaram.

Esses testes são de execução isolada dos componentes. A sessão do navegador
disponível nesta tarefa abriu a tela de login e não permitiu uma conferência
visual autenticada da pipeline. Isso não deve ser descrito como teste na
conta do usuário.
