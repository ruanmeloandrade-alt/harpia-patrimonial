# Hárpia Patrimonial & Co. | Escopo operacional do SalesBot

Data de consolidação: 24/09/2026

Este documento consolida as decisões funcionais, visuais e operacionais definidas para o SalesBot da Hárpia. Ele deve ser tratado como requisito de produto e critério de aceite. Ajustes posteriores no SalesBot devem preservar os itens já aprovados neste escopo e não podem quebrar Funil de vendas, Agentes IA, Inbox, Calendário ou outros módulos.

## 1. Estrutura da aba SalesBot

Ao clicar em SalesBot no menu do CRM, a primeira tela deve mostrar somente a biblioteca de bots.

A biblioteca deve permitir:

- visualizar todos os SalesBots criados em formato de lista;
- criar um SalesBot do zero;
- editar um SalesBot existente;
- duplicar um SalesBot;
- importar um SalesBot por arquivo JSON compatível;
- exportar um SalesBot por arquivo JSON compatível;
- visualizar status do bot;
- ativar e pausar quando aplicável.

Não pode existir paleta de blocos, configuração de bloco ou construtor misturado à tela de lista.

O botão Novo SalesBot deve abrir o construtor visual. Editar deve abrir o mesmo construtor com o fluxo existente carregado.

## 2. Construtor e aproveitamento de tela

O construtor deve priorizar o canvas e ocupar a maior área possível da tela.

Não deve existir uma coluna fixa de blocos à esquerda.

Não deve existir um painel fixo de configuração à direita.

A configuração de cada bloco deve ficar dentro do próprio bloco no canvas.

A lista de blocos disponíveis deve aparecer somente quando o usuário solicitar um próximo passo. O fluxo esperado é:

1. o SalesBot já inicia com o bloco Iniciar SalesBot;
2. o usuário clica em Próximo passo em uma saída disponível;
3. abre um seletor temporário de tipos de bloco;
4. o usuário escolhe o próximo bloco;
5. o novo bloco é criado diretamente no canvas e já conectado à saída escolhida;
6. o seletor fecha após a escolha.

O construtor deve ter:

- botão para expandir o canvas em tela cheia;
- botão para sair da tela cheia;
- minimapa visível na parte inferior do construtor;
- navegação pelo canvas sem que painéis fixos reduzam a área útil;
- organização automática de blocos quando solicitada;
- linhas e setas visíveis entre todas as conexões.

## 3. Bloco inicial

Todo novo SalesBot deve nascer automaticamente com o bloco Iniciar SalesBot.

O bloco Iniciar SalesBot:

- é obrigatório;
- aparece por padrão ao abrir um bot novo;
- serve somente como ponto inicial visual e lógico;
- não possui configuração operacional;
- não pode ser excluído;
- não precisa de campo de nome;
- deve possuir a saída para o próximo passo.

Bots antigos que não tenham esse bloco devem ser normalizados ao abrir, sem quebrar o restante do fluxo.

## 4. Identificação e edição dos blocos

Não deve existir campo genérico Nome do bloco para o usuário preencher.

O próprio tipo do bloco é a identificação principal, por exemplo Mensagem, Pausa, Condição, Ação, Validação e Distribuição.

A edição deve acontecer dentro do próprio bloco, sem inspector lateral.

Campos de texto devem aceitar digitação contínua. O usuário não pode precisar clicar novamente no campo a cada caractere digitado.

Alterações de conteúdo não podem causar re-renderização que roube o foco do campo durante a digitação.

## 5. Conexões, portas e próximos passos

Todo bloco que pode continuar o fluxo deve nascer com pelo menos uma saída visual.

As saídas devem aparecer como conectores visíveis no próprio bloco, com linha e seta até o bloco de destino.

Ao clicar em Próximo passo de uma saída, o próximo bloco escolhido deve ser criado e conectado automaticamente àquela saída.

Blocos com caminhos múltiplos devem nascer com as saídas correspondentes, sem exigir criação manual de porta.

As conexões precisam ser persistidas junto com o SalesBot e reaparecer corretamente ao reabrir o bot.

## 6. Bloco Mensagem

O bloco Mensagem deve permitir escrever a mensagem enviada ao cliente.

Não deve existir campo Nome do bloco.

A mensagem deve permitir adicionar botões de resposta.

Cada botão deve ter:

- texto configurável;
- uma saída própria no bloco;
- uma rota independente;
- possibilidade de conectar a um próximo bloco diferente dos demais botões.

Além das saídas dos botões, a própria mensagem deve possuir uma saída geral para o caminho sem clique ou continuidade padrão.

Essa saída geral deve permitir tratar situações em que o cliente não escolhe nenhum botão ou quando o fluxo precisa continuar por uma rota geral.

A digitação do texto dos botões e da mensagem deve ser contínua, sem perda de foco a cada caractere.

## 7. Bloco Reagir à mensagem

Deve existir bloco específico para reagir à mensagem do cliente.

O bloco deve oferecer emojis selecionáveis pela interface, sem exigir código digitado.

A reação escolhida deve ser aplicada à mensagem correspondente quando a execução real do canal estiver conectada.

## 8. Bloco Comentário interno

Deve existir bloco Comentário interno.

Esse bloco:

- não envia mensagem ao cliente;
- cria uma nota interna na conversa;
- deve aparecer no Inbox com visualização diferente de uma mensagem comum;
- deve preservar o vínculo com o lead e a conversa.

## 9. Bloco Pausa

O bloco Pausa deve suportar diferentes modos de espera.

Modos obrigatórios:

- cronômetro por segundos;
- cronômetro por minutos;
- cronômetro por horas;
- aguardar resposta do cliente;
- aguardar áudio ser aberto;
- aguardar áudio ser fechado ou concluído;
- aguardar vídeo ser aberto;
- aguardar vídeo ser fechado ou concluído;
- pausar durante o expediente;
- pausar fora do expediente.

Regras de expediente:

- no modo pausar durante o expediente, o fluxo fica pausado enquanto o atendimento estiver dentro do horário configurado e volta a seguir quando o expediente termina;
- no modo pausar fora do expediente, o fluxo fica pausado enquanto estiver fora do horário de atendimento e volta a seguir quando o expediente retorna.

Quando a pausa for por resposta do cliente, a resposta encerra a espera e o fluxo segue imediatamente para o próximo bloco.

## 10. Bloco Ação

O bloco Ação deve oferecer ações prontas por seleção, sem exigir código.

Ações obrigatórias:

- adicionar nota;
- criar tarefa;
- mudar etapa ou status do lead;
- enviar e-mail, identificado como Segunda fase enquanto a integração de e-mail não estiver operacional;
- definir campo;
- definir tag;
- completar tarefa;
- vincular produto;
- mudar usuário responsável.

### 10.1. Criar tarefa

A tarefa criada pelo SalesBot deve aparecer no Calendário da Hárpia, vinculada ao contexto correto.

### 10.2. Mudar etapa ou status

Deve carregar funis e etapas reais do CRM para seleção, sem pedir ID ou código ao usuário.

### 10.3. Definir campo

Deve carregar os campos disponíveis na interface e permitir definir o valor sem expressão técnica.

### 10.4. Definir tag

Deve permitir escolher ou definir a tag pela interface.

### 10.5. Vincular produto

A vinculação de produto deve respeitar a estrutura do módulo Produtos.

Fluxo obrigatório:

1. escolher se o produto pertence a um catálogo ou é produto avulso;
2. se for catálogo, selecionar primeiro o catálogo;
3. depois selecionar somente um produto pertencente ao catálogo escolhido;
4. se for produto avulso, selecionar na lista de produtos avulsos.

Não deve aparecer uma lista única de todos os produtos sem contexto de catálogo.

### 10.6. Mudar usuário responsável

Deve carregar os usuários disponíveis para seleção, sem exigir ID digitado.

## 11. Bloco Condição

O bloco Condição deve ser inteiramente visual e funcional. O usuário não deve escrever código, expressão interna ou estrutura técnica.

Fontes de condição obrigatórias:

- mensagem do cliente;
- comentário do cliente;
- fonte ou origem do lead;
- tag do lead;
- etapa atual;
- campo personalizado.

O bloco deve permitir adicionar várias regras.

As regras devem aceitar lógica E e OU.

Com E, todas as condições configuradas precisam ser atendidas para seguir pela saída positiva.

Com OU, o fluxo pode seguir conforme a ocorrência das alternativas configuradas.

O bloco deve possuir saídas visuais automáticas para os caminhos configurados. No mínimo deve existir caminho positivo e caminho negativo. Quando houver múltiplas alternativas de roteamento, as saídas necessárias devem aparecer no próprio bloco.

A condição precisa ser avaliada de verdade durante a execução do SalesBot, não apenas armazenada visualmente.

## 12. Bloco Validação

O bloco Validação deve ser funcional e configurável sem código.

Tipos obrigatórios de validação:

- é um número;
- número exato;
- número entre X e Y;
- e-mail;
- telefone;
- palavra específica;
- letra específica;
- expressão regular;
- quantidade de caracteres;
- diferente de;
- contém;
- não contém.

O bloco deve nascer com duas saídas visuais:

- Válido;
- Inválido.

Cada saída deve poder conectar a um próximo bloco diferente.

## 13. Bloco Iniciar SalesBot

Além do bloco inicial fixo, deve existir a ação de iniciar outro SalesBot como parte de um fluxo.

O usuário deve selecionar um SalesBot existente pela interface, sem inserir ID técnico.

## 14. Bloco Iniciar Agente IA

Deve existir bloco para iniciar um Agente IA.

A seleção deve carregar os agentes disponíveis e ativos no módulo Agentes IA.

Não deve exigir ID ou código digitado.

## 15. Bloco Distribuição Round Robin

Deve existir bloco de distribuição em formato de roleta, round robin.

O usuário deve conseguir adicionar várias opções ou destinos.

Cada opção cadastrada deve criar automaticamente uma saída visual própria no bloco.

Cada saída deve possuir seu conector e poder ser ligada a um bloco diferente.

A execução deve distribuir sequencialmente entre as opções configuradas, preservando o estado necessário para continuar a rotação nas próximas execuções.

Não é aceitável cadastrar opções sem mostrar para onde cada opção pode ser conectada.

## 16. Bloco Encerrar bot

Deve existir bloco de encerramento para finalizar explicitamente o fluxo.

O bloco não precisa de saída posterior.

## 17. Seleção múltipla e atalhos

O construtor deve suportar seleção múltipla.

Com Ctrl pressionado e arrastando sobre o canvas, o usuário deve conseguir selecionar vários blocos.

Blocos selecionados em conjunto devem poder:

- ser movidos em conjunto;
- ser excluídos em conjunto;
- ser duplicados em conjunto quando aplicável.

Excluir bloco deve ser uma ação direta. Se o usuário clicou em excluir dentro do construtor, não deve abrir pop-up de confirmação a cada exclusão.

### 17.1. Ctrl + D

Ctrl + D deve duplicar o bloco selecionado.

Se houver múltiplos blocos selecionados, Ctrl + D deve duplicar o conjunto selecionado preservando a estrutura interna aplicável e criando novas IDs.

### 17.2. Ctrl + Z

Ctrl + Z deve desfazer ações do construtor em sequência.

O histórico deve contemplar:

- criação de bloco;
- exclusão de bloco;
- movimentação de bloco;
- conexão;
- desconexão;
- edição de configuração;
- adição ou remoção de condição;
- adição ou remoção de botão;
- adição ou remoção de rota;
- organização automática do fluxo.

Ctrl + Shift + Z e Ctrl + Y devem refazer quando suportado.

Enquanto o usuário estiver digitando em input ou textarea, o atalho de desfazer do campo deve continuar funcionando normalmente e não deve disparar o histórico global do construtor.

## 18. Importação, exportação e persistência

O SalesBot deve permitir importar e exportar o fluxo completo em JSON.

O arquivo deve preservar:

- identificação do bot;
- blocos;
- configurações;
- posições;
- conexões;
- rotas;
- botões;
- condições;
- validações;
- saídas múltiplas;
- demais propriedades necessárias para reconstruir o fluxo.

O bot deve ser salvo sem perder foco durante edição de texto.

Reabrir um SalesBot deve reconstruir o mesmo fluxo visual e lógico.

## 19. Critérios de funcionamento real

Não basta exibir controles. Os blocos precisam possuir comportamento real dentro da engine do SalesBot.

Condição e Validação devem avaliar os dados e direcionar a execução para a saída correta.

Distribuição deve executar round robin real.

Pausa por resposta deve continuar o fluxo ao receber a resposta.

Pausas de mídia e expediente devem respeitar os respectivos eventos e horários.

Ação de criar tarefa deve alimentar o Calendário.

Comentário interno deve aparecer como nota no Inbox.

Mudar etapa deve atualizar o lead no Kanban.

Vincular produto deve persistir o produto correto no lead ou contexto operacional.

Mudar responsável deve persistir a nova atribuição.

Iniciar SalesBot e Iniciar Agente IA devem acionar os recursos selecionados.

## 20. Critérios de aceite visual e de UX

O SalesBot só pode ser considerado pronto quando:

1. SalesBot abre na biblioteca de bots, sem blocos fora do construtor.
2. Novo SalesBot e Editar abrem o construtor corretamente.
3. Novo bot já nasce com Iniciar SalesBot.
4. Não existe campo Nome do bloco.
5. Não existe painel fixo de configuração à direita.
6. Não existe paleta fixa de blocos à esquerda.
7. O canvas usa a largura disponível.
8. Próximo passo abre temporariamente a seleção de bloco e conecta o bloco escolhido.
9. Existe botão de tela cheia.
10. Existe minimapa.
11. Todas as conexões exibem linhas e setas claras.
12. Todos os blocos que continuam o fluxo possuem saída visual automática.
13. Mensagem possui saída geral e saída por botão.
14. Condição possui saídas correspondentes aos caminhos configurados.
15. Validação possui Válido e Inválido.
16. Distribuição possui uma saída para cada opção do round robin.
17. Digitação em mensagem, botão e demais campos não perde foco.
18. Ctrl + D duplica seleção.
19. Ctrl + Z desfaz ações do construtor.
20. Ctrl + arrastar permite seleção múltipla.
21. Exclusão de bloco é direta, sem confirmação repetitiva.
22. Ação Vincular produto exige Catálogo depois Produto, ou Produto avulso.
23. Condição e Validação funcionam na execução, não apenas no frontend.
24. Alterações no SalesBot não quebram Funil de vendas, Agentes IA, Inbox, Calendário ou outros módulos.
25. A versão publicada no domínio deve corresponder ao código fonte aprovado e não pode reintroduzir versões antigas do construtor em deploy posterior.

## 21. Regra de publicação e proteção contra regressão

Toda alteração do SalesBot deve ser aplicada na fonte que gera a publicação do domínio.

Não é aceitável corrigir apenas um artefato gerado que será sobrescrito no próximo deploy.

Antes de publicar uma alteração do SalesBot, deve ser validado que:

- Funil de vendas continua abrindo e funcionando;
- biblioteca do SalesBot continua abrindo;
- Novo SalesBot continua abrindo o construtor;
- bots existentes continuam carregando;
- Agentes IA continua abrindo;
- Inbox continua abrindo;
- Calendário continua abrindo;
- não houve sobrescrita de trabalho paralelo.

A publicação deve acontecer após validação, sem depender de uma solicitação posterior para publicar.
