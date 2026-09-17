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

A Hárpia não é apenas uma imobiliária. A plataforma deve sustentar uma operação de inteligência patrimonial, incluindo imóveis, investimentos, leilões/flipping, assessoria jurídica, arquitetura, reformas/obras, gestão patrimonial e relacionamento com o cliente.

## 3. MarketOn e Pais e Filhos

- MarketOn e Pais e Filhos são SOMENTE referências de produto, UX, fluxos e aprendizados anteriores.
- NÃO copiar código automaticamente desses projetos.
- NÃO criar dependência técnica com MarketOn ou Pais e Filhos.
- Usar essas referências para evitar retrabalho e entender comportamentos já validados pelo usuário.
- A plataforma Hárpia deve ser independente.

## 4. Dados e mocks

- É proibido deixar métricas, leads, imóveis, usuários ou resultados fictícios no produto final.
- Enquanto não existirem dados reais, mostrar estado vazio ou valor `0`.
- Todo dado exibido em dashboard deve vir de fonte real quando a camada de dados estiver conectada.
- Não cadastrar imóveis, corretores, funcionários, bots ou agentes reais sem instrução posterior do usuário.

## 5. Plataforma primeiro, configuração depois

Ordem de prioridade definida pelo usuário:

1. Construir a plataforma.
2. Deixar todos os recursos configuráveis.
3. Depois cadastrar imóveis, funcionários, permissões, bots e agentes.
4. WhatsApp e Meta/API ficam para a fase final de integração.

Não pré-configurar regras de distribuição, SalesBots, prompts de IA ou estruturas específicas da operação atual da MarketOn.

## 6. Arquitetura funcional obrigatória

A primeira versão deve contemplar estrutura para:

- Site público institucional e catálogo imobiliário.
- Cadastro/autenticação de cliente final.
- Área do cliente final enxuta.
- Área interna exclusiva da equipe Hárpia.
- Catálogo/produtos/empreendimentos/unidades/imóveis avulsos.
- CRM com funis e etapas configuráveis.
- Botão/área `Automatize` para automações do funil.
- Inbox operacional.
- Construtor visual de SalesBot por blocos.
- Agentes de IA configuráveis.
- Usuários, grupos, funções e permissões.
- Dashboard com métricas reais.
- Configurações e integrações preparadas.

## 7. Regras do catálogo

- Produto/empreendimento pode possuir unidades.
- Também deve existir imóvel avulso.
- Cadastro precisa aceitar foto e vídeo.
- Ações básicas: publicar, pausar, marcar como vendido, editar, duplicar e excluir.
- Cadastro interno não publica automaticamente: a publicação deve ser explícita.
- Status vendido deve refletir no sistema e no catálogo público.
- Pausar remove da exposição pública sem apagar histórico.
- Excluir deve existir como ação explícita e protegida.
- Um único cadastro interno deve alimentar a página pública do imóvel/produto.

## 8. Regras do CRM

- Funis devem ser totalmente configuráveis pelo administrador.
- Etapas podem ser criadas, renomeadas, reordenadas e removidas conforme regras de integridade.
- Leads podem mudar de etapa manualmente e por automação.
- Cadastro de cliente pelo site cria contato/lead no CRM com origem e contexto do imóvel/serviço.
- Criar lead NÃO envia mensagem automaticamente.
- Mensagens automáticas dependem de gatilho/configuração posterior em SalesBot.

## 9. SalesBot

O editor deve ser visual por blocos, no padrão conceitual já validado na MarketOn.

Blocos mínimos previstos:

- gatilho;
- condição;
- espera/delay;
- mensagem;
- agente IA;
- mover etapa;
- atribuir responsável;
- criar tarefa;
- atualizar campo;
- tags;
- webhook/API;
- início/encadeamento de outro fluxo quando aplicável.

A plataforma deve permitir criar e configurar bots, mas os bots operacionais serão definidos depois.

## 10. Agentes de IA

- IA fica em bastidor; o cliente final não precisa ver persona/nome de IA.
- Administrador deve poder criar agentes, nomear, definir função, instruções, regras, acessos e pontos de uso.
- SalesBot/automações poderão chamar agentes.
- Prompts operacionais serão configurados depois da plataforma pronta.

## 11. Inbox

Layout e comportamento esperado:

- Lista de conversas à esquerda.
- Conversa no centro.
- Contexto comercial/CRM à direita.

A Inbox deve prever:

- texto;
- áudio;
- imagem;
- vídeo;
- documento/anexo;
- envio de formulário;
- iniciar/acionar SalesBot;
- pausar SalesBot;
- acionar agente IA;
- pausar agente IA;
- editar campos personalizados;
- tags;
- responsável;
- mudança de etapa do funil;
- contexto do imóvel/produto/serviço.

A conexão real com WhatsApp será feita na etapa final.

## 12. Usuários e permissões

- Não cadastrar equipe real agora.
- Administrador poderá adicionar usuários depois.
- Permissões devem funcionar por grupo/função e também por exceção individual.
- Exemplo: todos os corretores recebem um conjunto-base de permissões; um corretor específico pode ganhar ou perder permissões individualmente.

## 13. Cliente final

Cadastro mínimo:

- nome;
- e-mail;
- WhatsApp;
- senha.

Sessão deve permanecer ativa até logout explícito ou remoção dos dados de sessão/cookies.

Sem conta, visitante pode navegar pelo conteúdo público. Ações que precisam persistir informação, como favoritar/salvar ou iniciar recursos pessoais, exigem conta.

A área do cliente é enxuta e voltada a navegação/serviços/salvos/acompanhamento básico. Documentos e atendimento operacional continuam via WhatsApp/Inbox da equipe, não por um portal documental complexo.

## 14. Site público

Menu-base definido:

- Sobre
- Investimentos
- Leilões
- Assessoria Jurídica
- Arquitetura
- Área Interna
- Ser Atendido Agora!

Filtros do catálogo:

- finalidade;
- cidade;
- localização/bairro/condomínio;
- lançamentos;
- faixa de preço.

Localização NÃO deve ficar travada no Rio de Janeiro. As opções de cidade/localidade devem surgir a partir dos imóveis cadastrados.

## 15. Captação

- Jornada `Quero vender meu imóvel` e equivalente para locação deve ser manual na primeira versão.
- Usuário preenche formulário e segue para WhatsApp com contexto.
- NÃO implementar modelo OLX/self-service para proprietário publicar sozinho nesta primeira entrega.
- Pop-up CIB foi retirado do escopo atual.
- Pop-up de retenção deve focar comprador/lead que demonstra intenção de sair do site, no espírito do mecanismo já usado pela RB Mídia.

## 16. Integrações

Preparar estrutura de configurações para integrações, mas deixar as conexões reais para a etapa final:

- WhatsApp;
- Meta;
- e-mail;
- outras APIs futuras.

## 17. Trabalho paralelo entre chats/agentes

- Antes de alterar um arquivo, buscar a versão mais recente no GitHub.
- Evitar que dois fluxos alterem o mesmo arquivo simultaneamente.
- Fazer mudanças pequenas e com commits descritivos.
- Não sobrescrever trabalho de outro agente sem conferir o conteúdo atual.
- Se uma decisão de produto mudar, atualizar os documentos em `docs/`.
- Ao concluir um módulo, registrar claramente o que foi feito e o que ainda falta.

## 18. Prazo operacional

- 16/09/2026: apresentar na call uma versão visual/navegável substancial da plataforma.
- Meta informal do usuário: aproximadamente 80% da plataforma visual/estrutural pronta para demonstração até a call das 16h.
- 20/09/2026: entrega operacional completa planejada.
- 21/09/2026: início previsto de uso pelo cliente.

## 19. Critério de decisão

Quando houver dúvida entre criar algo sofisticado e entregar algo funcional, escolher o caminho mais simples, estável e extensível que permita cumprir o prazo sem sacrificar a estrutura necessária.

## 20. Regra obrigatória das cinco frentes

O projeto está dividido oficialmente em cinco frentes de trabalho paralelas.

Quando o usuário disser `Atue na Frente01`, `Frente02`, `Frente03`, `Frente04` ou `Frente05`:

1. ler `docs/FRENTES-DE-TRABALHO.md`;
2. ler o arquivo específico em `docs/frentes/FRENTE-0X.md`;
3. trabalhar na branch correspondente;
4. respeitar a propriedade de arquivos definida para a frente;
5. não editar módulo de outra frente sem necessidade de integração registrada;
6. registrar dependências e pedidos em `docs/STATUS-FRENTES.md`;
7. preencher o `Handoff` do arquivo da frente ao concluir;
8. manter o status atualizado no GitHub.

Branches oficiais:

- Frente01 → `frente-01`
- Frente02 → `frente-02`
- Frente03 → `frente-03`
- Frente04 → `frente-04`
- Frente05 → `frente-05`

Arquivos compartilhados como `package.json`, roteador raiz, providers globais, configuração de build e CSS/tokens globais pertencem por padrão à Frente01. Outra frente não deve sobrescrevê-los sem registrar a necessidade e conferir o estado mais recente.

Depois das cinco frentes, o chat/agente de integração deve seguir `docs/PENTE-FINO-INTEGRACAO.md`.

## 21. Regras de produção e qualidade

`docs/REGRAS-DE-PRODUCAO.md` é obrigatório e tem precedência operacional sobre atalhos de implementação.

Todo chat/agente deve obedecer:

- Definition of Ready antes de começar;
- propriedade de arquivos e isolamento de branch;
- contratos explícitos entre módulos;
- regra anti-conflito e releitura do arquivo antes de editar;
- zero mocks permanentes;
- commits pequenos e identificados pela frente;
- validação real antes de declarar algo pronto;
- Definition of Done antes do handoff;
- atualização de status, dependências, testes e pendências no GitHub.

Se um teste não foi executado, registrar `NÃO VERIFICADO`. É proibido afirmar sucesso sem validação real.
