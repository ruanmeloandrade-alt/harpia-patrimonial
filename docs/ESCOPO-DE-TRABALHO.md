# Hárpia Patrimonial & Co. — Escopo Detalhado de Trabalho

Data-base: 16/09/2026

## 1. Objetivo do projeto

Construir a primeira versão funcional e utilizável da plataforma Hárpia Patrimonial & Co., reunindo:

- site público institucional;
- catálogo imobiliário;
- autenticação de cliente final;
- área do cliente;
- área interna administrativa/operacional;
- CRM configurável;
- Inbox;
- SalesBot visual;
- automações;
- agentes de IA;
- gestão de usuários e permissões;
- dashboard real;
- estrutura de integrações.

A plataforma deve ser independente, centralizada no GitHub e preparada para receber dados e configurações reais após a estrutura ficar pronta.

---

# 2. Marcos de entrega

## Marco A — Demonstração em 16/09/2026 às 16h

Objetivo: ter uma versão substancialmente navegável e com aparência de produto real para apresentação ao cliente.

Prioridades para a demonstração:

- navegação pública funcionando;
- área interna acessível;
- principais módulos visíveis e navegáveis;
- catálogo com fluxo de cadastro/publicação desenhado e funcional quando possível;
- CRM estruturado;
- Inbox estruturada;
- SalesBot visual estruturado;
- agentes de IA estruturados;
- usuários/permissões estruturados;
- dashboard sem dados fictícios;
- configurações e integrações visíveis;
- experiência coerente com a identidade Hárpia.

## Marco B — Entrega operacional em 20/09/2026

Objetivo: versão pronta para receber cadastros reais, configurações operacionais e integrações finais.

## Marco C — Início de uso em 21/09/2026

Objetivo: cliente iniciar uso real com dados, equipe, bots e integrações configurados conforme material enviado posteriormente.

---

# 3. Escopo técnico e de produto

## 3.1. Fundação do projeto

### Entregas

- Repositório GitHub como fonte de verdade.
- Projeto React/Vite funcional.
- Estrutura organizada de frontend e backend necessário.
- Configuração para deploy sem GitHub Actions.
- Variáveis de ambiente separadas do código.
- Estrutura preparada para banco de dados, autenticação, storage e APIs.
- Documentação no próprio repositório.

### Regras

- Não usar GitHub Actions.
- Não colocar segredos no repositório.
- Não copiar código de MarketOn/Pais e Filhos por padrão.
- Usar referências anteriores apenas para acelerar decisões de UX/fluxo.

---

# 4. Site público

## 4.1. Home

Construir a home pública da Hárpia com aparência premium, alinhada ao posicionamento de inteligência patrimonial.

### Deve conter

- hero principal;
- posicionamento institucional;
- busca de imóveis;
- acesso aos principais serviços;
- `Encontre pelo estilo de vida`;
- imóveis/produtos publicados;
- atendimento consultivo;
- parceria DUMU Arquitetura;
- assessoria jurídica;
- conteúdo de investimentos e patrimônio;
- CTA de atendimento;
- acesso à área interna;
- acesso/cadastro do cliente final;
- pop-up de retenção para comprador/lead.

## 4.2. Menu público

- Sobre
- Investimentos
- Leilões
- Assessoria Jurídica
- Arquitetura
- Área Interna
- Ser Atendido Agora!

## 4.3. Páginas institucionais

Criar estrutura para:

- Sobre
- Investimentos
- Leilões
- Assessoria Jurídica
- Arquitetura

O conteúdo pode ser expandido posteriormente conforme materiais enviados pelo cliente.

## 4.4. Referências visuais e de experiência

Usar como referências de navegação/experiência, sem copiar identidade:

- Azuza Imóveis
- Cyrela
- Calper

---

# 5. Catálogo imobiliário público

## 5.1. Busca e filtros

Filtros mínimos:

- finalidade;
- cidade;
- bairro/condomínio/localização;
- lançamento sim/não;
- faixa de preço.

### Regra de localização

Não travar em Rio de Janeiro.

As opções devem ser derivadas dos imóveis efetivamente cadastrados.

## 5.2. Resultado de busca

Cada card deve prever:

- imagem/capa;
- título;
- tipo;
- localização;
- preço;
- características principais;
- status;
- CTA para abrir detalhes;
- ação de salvar/favoritar quando autenticado.

## 5.3. Página de imóvel/produto

Prever:

- galeria de fotos;
- vídeos;
- dados do imóvel;
- localização;
- características;
- valor;
- descrição;
- status;
- empreendimento/unidade quando aplicável;
- CTA de atendimento;
- favoritar/salvar;
- serviços relacionados quando fizer sentido.

---

# 6. Catálogo interno

## 6.1. Tipos de cadastro

- empreendimento/produto;
- unidades do empreendimento;
- imóvel avulso.

## 6.2. Campos e mídias

Prever estrutura para:

- código;
- nome;
- tipo;
- finalidade;
- descrição;
- cidade;
- bairro/condomínio;
- endereço quando necessário;
- faixa/valor;
- características;
- incorporadora/origem;
- fotos;
- vídeos;
- plantas/arquivos quando aplicável;
- status;
- publicação.

## 6.3. Ações obrigatórias

- criar;
- editar;
- publicar;
- pausar;
- marcar como vendido;
- duplicar;
- excluir.

## 6.4. Regras de publicação

- Cadastro interno não significa publicação automática.
- Publicação exige ação explícita.
- Pausado sai do catálogo público sem apagar histórico.
- Vendido deve aparecer como vendido ou sair da vitrine conforme regra de exibição definida, preservando histórico interno.
- Excluir deve exigir confirmação.

---

# 7. Captação de proprietário

## 7.1. Quero vender meu imóvel

Fluxo inicial:

1. CTA no site.
2. Formulário enxuto.
3. Captura de dados.
4. Redirecionamento para WhatsApp com contexto.
5. Atendimento manual pela equipe.

## 7.2. Quero alugar meu imóvel

Mesmo padrão da jornada de venda.

## 7.3. Fora do escopo atual

Não implementar ainda publicação self-service pelo proprietário no estilo OLX.

---

# 8. Cadastro e autenticação do cliente final

## 8.1. Cadastro mínimo

- nome;
- e-mail;
- WhatsApp;
- senha.

## 8.2. Login

- autenticação por e-mail/senha;
- sessão persistente;
- usuário permanece logado até logout explícito ou perda/remoção da sessão.

## 8.3. Navegação sem conta

Permitido:

- navegar no site;
- pesquisar;
- abrir imóveis;
- consumir conteúdo.

## 8.4. Ações que exigem conta

Exemplos:

- favoritar/salvar;
- usar área pessoal;
- persistir interesses;
- acessar recursos individualizados.

---

# 9. Área do cliente final

A área deve ser simples e útil, não um ERP para o comprador.

## Entregas previstas

- perfil;
- favoritos/salvos;
- interesses;
- histórico básico de itens/serviços relacionados;
- atalhos para serviços Hárpia;
- acesso ao atendimento.

## Não incluir agora

- gestão documental complexa;
- troca formal de documentos jurídicos dentro do portal;
- central de financiamento completa.

Esses processos continuam prioritariamente via WhatsApp.

---

# 10. CRM interno

## 10.1. Estrutura

CRM totalmente configurável.

## 10.2. Funis

Administrador pode:

- criar funil;
- renomear funil;
- editar;
- ativar/desativar;
- organizar etapas.

## 10.3. Etapas

Administrador pode:

- criar;
- renomear;
- reordenar;
- remover quando seguro;
- configurar automações.

## 10.4. Lead/cliente

Ficha deve prever:

- nome;
- e-mail;
- telefone/WhatsApp;
- origem;
- produto/imóvel/serviço de interesse;
- responsável;
- etapa;
- tags;
- campos personalizados;
- observações;
- tarefas;
- histórico;
- próximos passos.

## 10.5. Criação automática pelo site

Quando houver cadastro/conversão relevante:

- criar contato/lead;
- registrar origem;
- registrar contexto do imóvel/serviço;
- não disparar mensagem automaticamente.

---

# 11. Automatize

Criar experiência de automação ligada ao CRM.

## Deve permitir estruturar gatilhos para

- criação de lead;
- mudança de etapa;
- alteração de campo;
- adição/remoção de tag;
- ausência de interação;
- eventos futuros definidos pelo sistema.

## Ações possíveis

- iniciar SalesBot;
- chamar agente IA;
- criar tarefa;
- mover etapa;
- alterar campo;
- aplicar tag;
- atribuir responsável;
- chamar webhook/API;
- outras ações extensíveis.

---

# 12. SalesBot

## 12.1. Editor visual

Construir editor por blocos.

## 12.2. Blocos mínimos

- trigger/gatilho;
- condição;
- mensagem;
- espera/delay;
- agente IA;
- mover etapa;
- atribuir responsável;
- tarefa;
- atualizar campo;
- tags;
- webhook/API;
- finalização;
- encadeamento de outro fluxo quando necessário.

## 12.3. Operação

A plataforma deve permitir:

- criar bot;
- editar;
- duplicar;
- ativar;
- pausar;
- excluir;
- visualizar status;
- registrar execuções/logs futuramente.

## 12.4. Regra desta fase

Construir o mecanismo. Não pré-criar os SalesBots operacionais da Hárpia até o usuário enviar a lista/configuração posterior.

---

# 13. Agentes de IA

## 13.1. Cadastro

Permitir:

- criar agente;
- definir nome interno;
- função;
- instruções;
- regras;
- contexto;
- acessos;
- estado ativo/pausado.

## 13.2. Integração interna

Agentes devem poder ser acionados por:

- SalesBot;
- automações;
- Inbox quando aplicável;
- outros eventos futuros.

## 13.3. UX

IA permanece em bastidor. Não criar personagem público/atendente artificial visível ao cliente como requisito inicial.

---

# 14. Inbox

## 14.1. Layout

- lista de conversas à esquerda;
- conversa no centro;
- contexto comercial/CRM à direita.

## 14.2. Recursos de mensagem

Preparar suporte para:

- texto;
- áudio;
- imagem;
- vídeo;
- documento;
- anexo;
- formulário.

## 14.3. Ações de CRM pela Inbox

- editar campos;
- tags;
- responsável;
- etapa do funil;
- visualizar produto/imóvel relacionado;
- visualizar origem;
- próxima ação.

## 14.4. Ações de automação pela Inbox

- iniciar SalesBot;
- pausar SalesBot;
- chamar IA;
- pausar IA.

## 14.5. Regra desta fase

Construir interface e lógica interna necessárias. Conexão real de WhatsApp fica para a etapa final.

---

# 15. Usuários, funções e permissões

## 15.1. Usuários

Permitir posteriormente cadastrar qualquer membro da equipe.

## 15.2. Grupos/funções

Exemplos futuros possíveis:

- administrador;
- gestor;
- corretor;
- jurídico;
- arquitetura;
- marketing.

Não fixar esses grupos como únicos.

## 15.3. Permissões

Permissões por grupo e individuais.

Exemplos de recursos permissionáveis:

- visualizar CRM;
- editar CRM;
- excluir lead;
- visualizar catálogo;
- editar catálogo;
- publicar imóvel;
- excluir produto;
- visualizar Inbox;
- usar SalesBot;
- editar automações;
- gerenciar agentes IA;
- administrar usuários;
- acessar integrações;
- visualizar relatórios.

## 15.4. Exceções individuais

Usuário pode herdar permissões do grupo e receber adicionais/restrições específicas.

---

# 16. Dashboard

## 16.1. Regra absoluta

Nenhum dado fictício.

## 16.2. Estado inicial

Sem dados reais:

- métricas em zero;
- listas vazias;
- empty states claros.

## 16.3. Métricas previstas

- imóveis/produtos ativos;
- leads;
- visitas;
- propostas;
- negociações;
- vendas;
- VGV/pipeline;
- ticket;
- conversão;
- origens;
- performance por produto;
- demanda por região;
- agenda/próximas ações.

Todas devem ser alimentadas por dados reais.

---

# 17. Configurações

Criar área de configurações para:

- dados da empresa;
- usuários;
- grupos/funções;
- permissões;
- campos personalizados;
- parâmetros do CRM;
- integrações;
- IA;
- preferências operacionais.

---

# 18. Integrações

## 18.1. Preparar agora

Criar estrutura de UI/configuração para:

- WhatsApp;
- Meta;
- e-mail;
- APIs externas.

## 18.2. Fazer por último

Conexões reais com:

- WhatsApp;
- Meta.

Motivo: usuário fará call com o cliente antes e quer priorizar plataforma pronta.

---

# 19. Pop-up e retenção

## 19.1. Não fazer

Não usar pop-up de CIB como fluxo principal nesta primeira fase.

## 19.2. Fazer

Criar retenção focada em comprador/lead, especialmente saída do site.

Objetivo:

- capturar lead antes de perder visita;
- direcionar para atendimento;
- preservar contexto da página/imóvel.

---

# 20. Serviços conectados ao posicionamento Hárpia

A plataforma/site deve conseguir representar:

- corretagem;
- locação;
- investimentos;
- leilões;
- flipping;
- arquitetura;
- reformas/obras;
- assessoria jurídica;
- gestão patrimonial.

Esses serviços não precisam virar sistemas independentes. Devem compartilhar clientes, contexto e relacionamento quando fizer sentido.

---

# 21. Regras de dados

- Não criar imóveis reais sem base enviada.
- Não criar funcionários reais sem lista enviada.
- Não criar bots reais sem instrução enviada.
- Não criar prompts reais de IA sem briefing posterior.
- Não preencher dashboard com exemplo fictício.
- Estados vazios são preferíveis a mocks.

---

# 22. Regras de segurança e integridade

- Senhas nunca armazenadas em texto puro.
- Tokens e chaves nunca commitados.
- Permissões verificadas no backend, não só escondidas no frontend.
- Exclusões sensíveis pedem confirmação.
- Preservar histórico quando o correto for pausar/arquivar em vez de apagar.
- Integrações devem ser configuradas por ambiente.

---

# 23. Trabalho paralelo

Como vários chats/agentes trabalharão no repositório:

- todos devem ler `AGENTS.md` primeiro;
- trabalhar em módulos separados sempre que possível;
- buscar versão mais recente dos arquivos antes de alterar;
- fazer commits descritivos e pequenos;
- não substituir mudanças de outro fluxo silenciosamente;
- registrar decisões novas nos documentos do projeto.

---

# 24. Critérios de aceite da plataforma-base

A plataforma-base será considerada pronta quando:

1. Site público navega corretamente.
2. Catálogo público funciona com dados reais ou estados vazios.
3. Cadastro interno de produto/imóvel existe.
4. Publicação/pausa/vendido/duplicação/exclusão existem.
5. Autenticação do cliente final funciona.
6. Área do cliente funciona em escopo enxuto.
7. Área interna tem autenticação e controle de acesso.
8. Usuários/grupos/permissões são configuráveis.
9. CRM permite criar funis e etapas.
10. Leads possuem ficha e contexto.
11. `Automatize` existe como recurso configurável.
12. SalesBot possui editor visual por blocos.
13. Agentes IA podem ser criados/configurados.
14. Inbox possui estrutura operacional prevista.
15. Dashboard não possui mocks e lê dados reais.
16. Configurações e integrações estão preparadas.
17. WhatsApp/Meta podem ser conectados na etapa final sem refazer arquitetura central.
18. Código e decisões estão documentados no GitHub.

---

# 25. Fora do escopo imediato / fase posterior

- Self-service de proprietário publicando imóveis sozinho no estilo OLX.
- Configuração definitiva dos bots da Hárpia antes de receber instruções do usuário.
- Cadastro definitivo da equipe antes de receber lista/permissões.
- Cadastro completo da base de imóveis antes de receber a base.
- Prompts definitivos de agentes IA antes de briefing específico.
- Integração real com WhatsApp e Meta antes da fase final.
- Recursos excessivamente complexos que não sejam necessários para iniciar operação.

---

# 26. Ordem de produção recomendada

1. Consolidar estrutura visual e navegação.
2. Autenticação e base de usuários.
3. Modelo de dados principal.
4. Catálogo interno + catálogo público.
5. CRM configurável.
6. Usuários/grupos/permissões.
7. Dashboard real.
8. Inbox estrutural.
9. SalesBot visual.
10. Automatize.
11. Agentes IA.
12. Área do cliente.
13. Configurações/integrações.
14. Testes de navegação e integridade.
15. Entrada de dados reais.
16. Cadastro de equipe e permissões reais.
17. Criação/configuração dos bots e agentes reais.
18. Integração WhatsApp.
19. Integração Meta.
20. Pente fino final e entrega.
