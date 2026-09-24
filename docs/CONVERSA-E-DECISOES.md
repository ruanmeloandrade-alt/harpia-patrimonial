# Hárpia Patrimonial — Registro de Conversa e Decisões

Data de consolidação: 16/09/2026

Este arquivo registra o conteúdo substantivo das conversas do projeto para que outros chats/agentes possam continuar o trabalho sem depender do histórico de uma única conversa.

> Regra: quando uma decisão futura alterar algo deste documento, atualizar o registro.

---

# 1. Briefing inicial enviado pelo cliente

## Referências

- https://www.azuzaimoveis.com/
- https://www.cyrela.com.br/
- https://www.calper.com.br/

## Processo atual

Pergunta: Como funciona hoje o processo desde o momento em que um imóvel entra para a carteira até a venda ser concluída?

Resposta do cliente:

- Produção de conteúdos e imagens.
- Adição nas plataformas.
- Contato do cliente.
- Visita.
- Elaboração do contrato.
- Pagamento do sinal.
- Entrega das chaves.

## Tipos de negócio

Pergunta: Quais tipos de negócio trabalham hoje?

Resposta:

- todos os tipos de imóveis;
- locação e venda;
- assessoria jurídica completa;
- reformas e obras;
- arquitetura;
- flipping;
- gestão patrimonial imobiliária.

Observação do flipping: compram imóvel em leilão para o cliente, reformam e vendem.

## Participantes da venda

Resposta:

- vendedor;
- corretor;
- incorporadora em alguns casos;
- advogado.

Divisão de comissão ocorre em casos com incorporadoras.

## Outros atores acompanhados

- incorporadoras;
- parceiros de arquitetura;
- parceiros de reformas e obras;
- equipe de mídias;
- audiovisual.

## Pós-visita / etapas até a venda

- proposta com projeto completo, arquitetura e solução pronta para morar;
- contraproposta;
- documentação;
- financiamento;
- contrato;
- sinal.

## Principal problema operacional

Agilidade para captar o cliente com eficiência e atender imediatamente.

## Três problemas que a plataforma deve resolver

1. Praticidade em obter informações dos imóveis.
2. Agilidade no atendimento.
3. Organização para um pós-atendimento de excelência.

---

# 2. Site público solicitado

## Cabeçalho

- Sobre
- Investimentos
- Leilões
- Assessoria Jurídica
- Arquitetura
- Área Interna
- Ser Atendido Agora!

## Filtros

- Finalidade
- Cidade
- Localização
- Lançamentos
- Faixa de preço

Faixa citada inicialmente: R$ 250 mil até R$ 20 milhões.

## Conteúdos solicitados

- `Encontre pelo estilo de vida`.
- Falar sobre parceria com DUMU Arquitetura.
- `Atendimento consultivo`.
- Falar sobre assessoria jurídica inclusa para todos os clientes.

## Texto institucional enviado

A Hárpia deve ser posicionada como escritório de inteligência patrimonial, construído a partir de tradição familiar desde 1986, com foco na preservação, expansão e perpetuação do patrimônio.

Frases centrais do material:

- Enquanto o mercado negocia imóveis, a Hárpia orienta e gere decisões.
- Não é somente sobre ativos, mas sobre gerações.
- O patrimônio é tratado como organismo vivo, construído ao longo do tempo.
- O compromisso é aconselhar e recomendar a decisão mais adequada, não apenas viabilizar a venda.

---

# 3. Conteúdos futuros do cliente

Daniel Magalhães informou que:

- a foto dos arquitetos já havia sido escolhida e seria enviada em alta;
- a imagem do advogado era ilustrativa e seriam produzidas fotos reais;
- leilões e investimentos seguiriam formato semelhante e receberiam copy posterior;
- havia inicialmente pedido um pop-up sobre CIB/reforma tributária.

Decisão posterior: o pop-up de CIB foi removido do foco atual. O pop-up deve ser de retenção para comprador/lead que está saindo do site.

---

# 4. Domínio, GitHub e infraestrutura

Decisões:

- Domínio oficial: `harpiapatrimonial.com`.
- Repositório: `ruanmeloandrade-alt/harpia-patrimonial`.
- Todo o projeto será centralizado no GitHub.
- NÃO usar GitHub Actions.
- GitHub é fonte de verdade de código e documentação.
- Hostinger será usada para hospedagem/deploy conforme configuração final.

O repositório foi criado e inicializado com estrutura mínima de React/Vite/Node para permitir implantação.

---

# 5. MarketOn e Pais e Filhos

O usuário foi explícito:

- MarketOn e Pais e Filhos devem servir como base/referência do que já foi construído antes.
- Não copiar código automaticamente.
- Não amarrar a Hárpia à arquitetura desses sistemas.
- Consultar os projetos anteriores para evitar pensar do zero em recursos já validados.
- A plataforma Hárpia precisa ser própria e independente.

A estrutura temporária que a Hárpia usa na MarketOn é um caso à parte e NÃO define os funis fixos da nova plataforma.

---

# 6. Prioridade de produção e datas

Usuário informou:

- 16/09/2026: call com o cliente às 16h.
- Até essa call, deseja uma plataforma substancialmente pronta para visualização/demonstração.
- Meta verbal: cerca de 80% da plataforma apresentável.
- 20/09/2026: entrega final planejada.
- 21/09/2026: cliente deve começar a usar.

Ordem definida:

1. Plataforma primeiro.
2. Depois imóveis, funcionários, permissões, bots e IA.
3. WhatsApp e Meta por último.

Usuário acredita que a plataforma-base pode ser finalizada rapidamente, usando aprendizados de Pais e Filhos/MarketOn como referência.

---

# 7. Usuários internos

Pergunta: Quais perfis de equipe devem entrar?

Resposta do usuário:

- Não cadastrar pessoas agora.
- A plataforma deve permitir que o cliente adicione quem quiser depois.
- O foco é fornecer cadastro e gestão de usuários.

Posteriormente o usuário enviará a lista real de funcionários.

---

# 8. Permissões

Decisão:

- Permissões por grupo/função.
- Também permitir exceções individuais.

Exemplo dado pelo usuário:

- vários corretores podem compartilhar um conjunto-base;
- um corretor específico pode ter recursos extras ou menos permissões.

Portanto, o sistema precisa combinar herança de função + override individual.

---

# 9. Usuário final

O usuário final também deve poder criar conta.

Motivo: Hárpia é plataforma de investimento/patrimônio, não apenas corretagem.

## Cadastro mínimo

Inicialmente foi citado nome, e-mail e WhatsApp. Depois foi corrigido e fechado como:

- nome;
- e-mail;
- WhatsApp;
- senha.

## Sessão

Após login, usuário permanece logado.

Só deve sair por:

- logout explícito;
- remoção/expiração de sessão/cookies.

## Sem conta

Visitante consegue navegar normalmente.

## Com conta

Ações persistentes, como favoritar/salvar, exigem login/cadastro.

---

# 10. Área do cliente final

Pergunta inicial considerava recursos como salvar imóveis, acompanhar visitas, propostas, documentos etc.

A decisão final foi simplificar:

- área do cliente deve ser enxuta;
- serve para navegação, serviços, favoritos/salvos e contexto pessoal;
- atendimento continua via WhatsApp;
- documentos jurídicos/financeiros não precisam de portal documental nesta fase.

O usuário disse expressamente que a área interna operacional é apenas para funcionários da Hárpia.

---

# 11. Catálogo e produtos

Pergunta: produto/empreendimento + unidades e imóvel avulso?

Resposta: sim.

A plataforma deve possuir uma aba `Catálogo` na área interna.

## Regras

- Pode cadastrar empreendimento/produto.
- Pode cadastrar unidades.
- Pode cadastrar apenas um imóvel avulso.
- Não há limite conceitual de quantidade de imóveis.
- A base real será enviada depois.

## Localização

Começa com Rio de Janeiro, mas NÃO deve ficar travado.

Exemplo dado:

- se futuramente houver imóvel no Guarujá, o sistema deve passar a exibir Rio de Janeiro e Guarujá nos filtros.

A lista de localização deve acompanhar dados reais do catálogo.

## Mídia

Catálogo precisa aceitar:

- fotos;
- vídeos.

## Ações básicas

- publicar;
- vendido;
- pausar;
- excluir;
- duplicar;
- editar.

Regra de publicação:

- cadastro não publica sozinho;
- usuário precisa clicar em publicar.

Vendidos precisam refletir no sistema/dashboard. Pausado deixa a área de vendas/exposição, mas preserva registro.

---

# 12. Captação de vendedor/proprietário

Usuário considerou inicialmente uma jornada futura parecida com OLX, em que proprietário publica sozinho.

Decisão final para agora:

- NÃO fazer self-service.
- Focar 100% no modelo manual.

Fluxo:

- `Quero vender meu imóvel` / `Quero alugar meu imóvel`;
- formulário;
- redirecionamento para WhatsApp;
- equipe assume atendimento.

---

# 13. Dashboard

Pergunta: pode haver mock data?

Resposta: NÃO.

Decisão absoluta:

- tudo deve ser real;
- se não houver dados, fica `0` ou vazio;
- nenhum mock na plataforma final.

---

# 14. Pop-up

O usuário decidiu:

- não usar pop-up de CIB nesta fase;
- vendedor já terá botão de venda/locação;
- pop-up faz mais sentido para comprador que está saindo do site;
- referência conceitual: retenção similar ao que foi usado na RB Mídia.

Objetivo: garantir que o lead não seja perdido.

---

# 15. Favoritos e criação de conta

Pergunta: favorito sem conta?

Resposta:

- não;
- para salvar/favoritar, cria conta mínima;
- cadastro deve ser rápido.

---

# 16. CRM e cadastro automático de lead

Quando a pessoa cria conta ou converte pelo site:

- criar cliente/lead no CRM;
- registrar origem;
- registrar imóvel/serviço/contexto.

Porém:

- NÃO mandar mensagem automaticamente só porque o lead foi criado.
- Mensagem depende de configuração/gatilho posterior do SalesBot.

---

# 17. CRM configurável

Pergunta: funis totalmente configuráveis?

Resposta: sim.

Tudo deve ser configurável:

- criar funil;
- renomear;
- criar etapa;
- alterar etapas;
- automações.

Usuário também pediu o conceito `Automatize`, assim como já existia em projetos anteriores.

---

# 18. SalesBot

Pergunta: construtor visual por blocos ou lista simples?

Resposta: construtor visual por blocos, como conceito já validado na MarketOn.

Usuário pediu explicitamente que isso fique registrado para não ser feito `a menos nem a mais`.

## Blocos confirmados

- gatilho;
- condição;
- espera;
- mensagem;
- IA;
- mover etapa;
- atribuir responsável;
- criar tarefa;
- atualizar campo;
- webhook/API.

A plataforma precisa permitir criar bot. Os bots reais serão configurados depois.

---

# 19. IA

Pergunta: agentes configuráveis?

Resposta: sim.

Deve ser possível:

- criar agente;
- dar nome interno;
- definir função;
- instruções;
- acessos;
- gatilhos/pontos em que SalesBot chama agente.

Usuário disse que esse nível de configuração ajuda a transmitir robustez do produto.

Pergunta: cliente final vê persona/nome da IA?

Resposta: não.

Decisão: IA fica totalmente nos bastidores.

---

# 20. Distribuição de leads

Pergunta feita sobre round robin/região/tipo.

Usuário corrigiu a direção:

- isso dependerá dos SalesBots configurados depois;
- não definir regra agora;
- foco é construir plataforma flexível.

Regra geral deste projeto: estrutura primeiro, configuração operacional depois.

---

# 21. Conteúdo real depois da plataforma

Usuário informou que depois enviará:

- lista de imóveis;
- lista de funcionários;
- permissões;
- bots;
- outras configurações.

Portanto, não deve ser criado conteúdo operacional arbitrário agora.

---

# 22. Inbox

Usuário confirmou o conceito de central de atendimento com:

- conversas à esquerda;
- chat no meio;
- contexto do cliente à direita.

Dentro da Inbox deve ser possível:

- enviar texto;
- áudio;
- foto;
- documento;
- outros anexos;
- enviar formulário;
- iniciar SalesBot;
- pausar SalesBot;
- iniciar/chamar agente IA;
- pausar IA;
- alterar campo personalizado;
- alterar tags;
- mudar etapa do funil;
- trabalhar com contexto do CRM.

WhatsApp real será integrado depois.

---

# 23. Configurações e integrações

Pergunta: deixar área preparada mesmo que conexões estejam vazias?

Resposta: sim.

Preparar estrutura para:

- WhatsApp;
- Meta;
- e-mail;
- APIs futuras.

Conexões reais com WhatsApp e Meta serão uma das últimas partes da produção.

---

# 24. Escopo verbal fechado

O usuário confirmou o seguinte princípio:

- `A ordem é constrói, depois configura. Aí integra, testa e entrega.`

Também confirmou:

- site público;
- catálogo;
- área do cliente;
- área interna;
- CRM;
- Inbox;
- SalesBot;
- IA;
- usuários/permissões;
- configurações/integrações;
- sem mock data;
- sem pré-configurações operacionais desnecessárias.

---

# 25. Documentação no próprio GitHub

Usuário pediu expressamente:

- registrar conversas e contexto no repositório;
- registrar imagens/PDFs e materiais relevantes quando forem enviados e tecnicamente apropriados;
- criar regras de trabalho;
- evitar depender apenas do histórico do ChatGPT;
- permitir vários chats trabalhando em paralelo;
- depois um outro fluxo fará pente fino final.

Por isso este repositório passa a ter documentação operacional permanente.

Arquivos principais:

- `AGENTS.md`
- `docs/BRIEFING-CONSOLIDADO.md`
- `docs/ESCOPO-DE-TRABALHO.md`
- `docs/CONVERSA-E-DECISOES.md`

---

# 26. Regra para próximos chats

Qualquer novo chat/agente deve começar lendo os quatro arquivos acima antes de implementar qualquer coisa.

Se encontrar conflito entre implementação existente e documentação, deve:

1. conferir qual decisão é mais recente;
2. preservar o trabalho já válido;
3. não inventar regra operacional;
4. registrar no GitHub qualquer nova decisão confirmada pelo usuário.


---

# 27. Central de Configurações

Decisão consolidada em 24/09/2026:

- Configurações passa a ser o centro único de administração da plataforma.
- Usuários, funções, grupos e permissões não ficam mais como páginas soltas no menu principal.
- Ao cadastrar um usuário interno, o administrador já pode definir grupos e exceções individuais de permissão no mesmo fluxo.
- A rota antiga de Usuários, Permissões e Integrações permanece apenas por compatibilidade, abrindo a aba correspondente dentro de Configurações.
- Preferências do sistema devem ser persistidas e aplicadas de verdade, incluindo tema claro/escuro/sistema, idioma, moeda, fuso horário, formato de data, formato de hora, cor de destaque e modo compacto.
- Configurações também concentra CRM e atendimento, automações, notificações, segurança, dados e privacidade e informações de sistema.
- Integrações deve exibir WhatsApp e provedores de IA atuais, além de Meta, Gmail/Workspace, SMS, Google Analytics, Google Tag Manager e APIs futuras.
- Meta, Gmail/Workspace, SMS, Analytics, Tag Manager e o módulo Marketing permanecem identificados como segunda fase quando ainda não estiverem operacionais.
- Nenhuma preferência que dependa de enforcement de backend pode ser apresentada como ativa apenas porque foi salva na interface. A UI deve deixar explícito quando a configuração está apenas preparada para consumo posterior pelo módulo correspondente.
