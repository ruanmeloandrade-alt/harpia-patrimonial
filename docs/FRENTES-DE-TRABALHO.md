# Hárpia Patrimonial — Plano de Trabalho em 5 Frentes

Data-base: 16/09/2026

Este documento define como cinco chats/agentes devem trabalhar em paralelo sem depender do histórico de conversa e sem disputar os mesmos módulos.

## Regra de entrada

Quando o usuário disser `Atue na Frente01`, `Frente02`, `Frente03`, `Frente04` ou `Frente05`, o agente deve:

1. ler `AGENTS.md`;
2. ler `docs/BRIEFING-CONSOLIDADO.md`;
3. ler `docs/ESCOPO-DE-TRABALHO.md`;
4. ler `docs/CONVERSA-E-DECISOES.md`;
5. ler este arquivo;
6. ler o arquivo específico da frente em `docs/frentes/`;
7. buscar o estado mais recente do GitHub antes de alterar qualquer arquivo;
8. trabalhar somente no escopo da sua frente, salvo necessidade de integração explicitamente documentada.

## Estratégia de paralelização

Cada frente possui uma branch própria:

- Frente01 → `frente-01`
- Frente02 → `frente-02`
- Frente03 → `frente-03`
- Frente04 → `frente-04`
- Frente05 → `frente-05`

Nenhuma frente deve desenvolver diretamente na `main` durante a fase paralela. A integração será feita posteriormente por um chat/agente de revisão e pente fino.

## Divisão macro

### Frente01 — Núcleo da plataforma, autenticação, usuários e permissões

Responsável por:

- arquitetura base da aplicação;
- shell/layout interno compartilhado;
- roteamento base;
- autenticação;
- cadastro/login/sessão do cliente final;
- autenticação da equipe interna;
- usuários internos;
- grupos/funções;
- permissões por grupo e exceções individuais;
- configurações estruturais da empresa;
- contratos/tipos compartilhados essenciais;
- camada base de persistência e serviços comuns;
- estados vazios e tratamento global de erros/carregamento.

Não é responsável pelo conteúdo público, catálogo imobiliário, CRM, Inbox, SalesBot ou agentes de IA.

### Frente02 — Site público e área do cliente

Responsável por:

- home pública;
- páginas institucionais;
- menu público;
- busca pública de imóveis;
- filtros;
- página pública de imóvel/produto;
- estilo de vida;
- CTAs de atendimento;
- `Quero vender meu imóvel`;
- `Quero alugar meu imóvel`;
- pop-up de retenção de comprador;
- favoritos/salvos;
- área do cliente final;
- perfil e interesses básicos;
- experiência pública responsiva.

Consome autenticação da Frente01 e catálogo publicado da Frente03, sem assumir propriedade desses módulos.

### Frente03 — Catálogo interno, publicação e dashboard

Responsável por:

- catálogo administrativo;
- produtos/empreendimentos;
- unidades;
- imóveis avulsos;
- fotos e vídeos;
- estados rascunho/publicado/pausado/vendido;
- criar, editar, duplicar, publicar, pausar, vender e excluir;
- camada de dados do catálogo;
- disponibilização de dados publicados para o site público;
- dashboard com métricas reais e zero mocks;
- empty states do dashboard;
- métricas baseadas em dados reais disponíveis.

Não é responsável pelo CRM, SalesBot ou área pública além dos contratos de dados necessários.

### Frente04 — CRM e Inbox operacional

Responsável por:

- CRM configurável;
- funis;
- etapas;
- leads/contatos;
- ficha do lead;
- origem e contexto de imóvel/serviço;
- tags;
- campos personalizados;
- responsáveis;
- tarefas e próximos passos;
- histórico;
- Kanban/movimentação de etapas;
- criação de lead a partir de eventos do site via contrato de integração;
- Inbox com lista de conversas, chat e contexto CRM;
- ações de CRM diretamente na Inbox;
- estrutura para texto, áudio, imagem, vídeo, documento e formulário;
- comandos para iniciar/pausar SalesBot e IA por interface/contrato, sem implementar o motor desses módulos.

Não conecta WhatsApp real nesta fase.

### Frente05 — SalesBot, Automatize, agentes de IA e integrações preparatórias

Responsável por:

- construtor visual de SalesBot por blocos;
- CRUD de bots;
- blocos mínimos definidos no escopo;
- `Automatize`;
- gatilhos e ações configuráveis;
- agentes de IA configuráveis;
- chamadas abstratas entre automações, bots e IA;
- status/ativação/pausa;
- preparação de logs/execuções;
- tela/estrutura de integrações;
- placeholders/configuração para WhatsApp, Meta, e-mail e APIs;
- contratos que permitam à Inbox iniciar/pausar bot e IA;
- contratos que permitam ao CRM disparar automações.

As conexões reais com WhatsApp e Meta ficam para a fase final e não devem bloquear esta frente.

---

# Propriedade de arquivos e prevenção de conflito

A arquitetura final pode evoluir, mas durante o trabalho paralelo deve respeitar os seguintes limites.

## Frente01 possui

- `src/app/**`
- `src/core/**`
- `src/shared/**`
- `src/features/auth/**`
- `src/features/users/**`
- `src/features/permissions/**`
- `src/features/settings/core/**`
- arquivos globais de bootstrap, providers e configuração compartilhada

## Frente02 possui

- `src/features/public-site/**`
- `src/features/public-catalog/**`
- `src/features/client-area/**`
- páginas públicas e componentes exclusivos da experiência pública

## Frente03 possui

- `src/features/catalog/**`
- `src/features/dashboard/**`
- serviços/repositórios/tipos específicos de produtos, unidades, imóveis e mídia

## Frente04 possui

- `src/features/crm/**`
- `src/features/inbox/**`
- serviços/repositórios/tipos específicos de lead, funil, etapa, tarefa, tag e conversa

## Frente05 possui

- `src/features/automations/**`
- `src/features/salesbot/**`
- `src/features/ai-agents/**`
- `src/features/integrations/**`

## Arquivos compartilhados protegidos

Por padrão, somente a Frente01 deve editar:

- `package.json`;
- arquivos de bootstrap global;
- configuração global de build;
- providers globais;
- roteador raiz;
- CSS/tokens globais;
- tipos compartilhados de nível de aplicação.

Se outra frente precisar alterar um desses arquivos, deve registrar a necessidade em `docs/STATUS-FRENTES.md` na seção `Pedidos entre frentes`, sem sobrescrever cegamente o arquivo.

---

# Contratos entre frentes

Os módulos devem se integrar por contratos claros, não por acesso acidental ao estado interno de outra frente.

Os contratos mínimos estão definidos em `docs/CONTRATOS-ENTRE-MODULOS.md`.

Resumo:

- Frente02 consome catálogo publicado fornecido pela Frente03.
- Frente02 solicita criação/atualização de cliente via autenticação da Frente01.
- Eventos relevantes do site podem solicitar criação de lead na Frente04.
- Frente04 expõe contexto de lead/conversa para a Inbox e para automações.
- Frente05 recebe eventos do CRM e executa ações abstratas configuradas.
- Frente04 pode solicitar início/pausa de SalesBot/IA por contrato da Frente05.
- Frente03 fornece métricas de catálogo ao dashboard; CRM fornece métricas comerciais quando integrado.

---

# Regras de desenvolvimento paralelo

1. Não usar dados fictícios para mascarar funcionalidades faltantes.
2. Se não houver dado real, exibir zero ou empty state.
3. Não cadastrar imóveis, funcionários, bots ou agentes reais sem material posterior do usuário.
4. MarketOn e Pais e Filhos são referência, não fonte de código a copiar.
5. Não usar GitHub Actions.
6. Não inserir segredos no GitHub.
7. Cada frente deve manter commits pequenos e descritivos.
8. Antes de alterar arquivo, buscar a versão mais recente da sua branch.
9. Não reescrever módulo pertencente a outra frente.
10. Quando depender de outra frente, criar interface/contrato local mínimo e registrar o ponto de integração.
11. Ao terminar uma etapa, atualizar `docs/STATUS-FRENTES.md` e o bloco `Handoff` do arquivo da própria frente.
12. O chat de integração/pente fino é responsável por resolver contratos e merges, não por redescobrir requisitos.

---

# Prioridade temporal

## Para demonstração de 16/09/2026

Priorizar aparência real, navegação coerente e fluxos estruturais visíveis, sem usar mocks enganosos.

## Para entrega de 20/09/2026

Todos os módulos do escopo devem estar integrados e aptos a receber dados/configurações reais.

## Para uso a partir de 21/09/2026

Após a plataforma estrutural estar pronta, entram:

- imóveis reais;
- funcionários;
- permissões reais;
- SalesBots reais;
- agentes e prompts reais;
- WhatsApp;
- Meta;
- testes finais de operação.

---

# Ordem de integração recomendada

1. Frente01 — núcleo/autenticação/RBAC.
2. Frente03 — catálogo e dados publicados.
3. Frente02 — site público e área do cliente consumindo os contratos reais.
4. Frente04 — CRM/Inbox.
5. Frente05 — automações/SalesBot/IA.
6. Pente fino global.
7. Integrações reais WhatsApp e Meta.
8. Cadastro dos dados reais e testes de aceite.

Essa ordem de integração não impede o desenvolvimento paralelo nas cinco branches.
