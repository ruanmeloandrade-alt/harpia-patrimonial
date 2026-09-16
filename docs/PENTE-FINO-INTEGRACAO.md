# Hárpia Patrimonial — Protocolo de Integração e Pente Fino

Este documento é destinado ao chat/agente que receberá o projeto depois do trabalho paralelo das cinco frentes.

## Missão

Integrar as cinco branches, resolver conflitos de contrato, testar fluxos de ponta a ponta, remover inconsistências e preparar a versão única para demonstração/entrega.

## Antes de começar

Ler obrigatoriamente:

1. `AGENTS.md`
2. `docs/BRIEFING-CONSOLIDADO.md`
3. `docs/ESCOPO-DE-TRABALHO.md`
4. `docs/CONVERSA-E-DECISOES.md`
5. `docs/FRENTES-DE-TRABALHO.md`
6. `docs/CONTRATOS-ENTRE-MODULOS.md`
7. `docs/STATUS-FRENTES.md`
8. todos os arquivos `docs/frentes/FRENTE-0X.md`

Também deve ler o bloco `Handoff` preenchido por cada frente antes de integrar.

## Branches de origem

- `frente-01`
- `frente-02`
- `frente-03`
- `frente-04`
- `frente-05`

## Ordem recomendada de integração

1. Frente01 — núcleo/auth/RBAC.
2. Frente03 — catálogo/dados/dashboard.
3. Frente02 — site público/cliente.
4. Frente04 — CRM/Inbox.
5. Frente05 — SalesBot/Automatize/IA/integrações.

A ordem pode ser ajustada se os handoffs indicarem dependências diferentes, mas a decisão deve ser registrada.

## Checklist de integração

### Build e estrutura

- projeto instala dependências sem erro;
- build conclui;
- start/deploy funciona;
- nenhuma frente deixou import quebrado;
- rotas não se atropelam;
- providers não estão duplicados;
- componentes compartilhados não possuem cópias divergentes sem necessidade.

### Autenticação

- cadastro cliente: nome, e-mail, WhatsApp e senha;
- login funciona;
- sessão persiste;
- logout funciona;
- usuário interno e cliente final são distinguidos;
- rotas internas estão protegidas;
- permissões são aplicadas de forma consistente.

### Site público

- home e páginas institucionais navegáveis;
- catálogo público usa dados publicados reais;
- filtros não estão presos ao Rio de Janeiro;
- detalhe do imóvel funciona;
- favoritos exigem conta;
- jornadas vender/alugar funcionam;
- pop-up de retenção é comprador, não CIB;
- responsividade revisada.

### Catálogo interno

- produto/empreendimento;
- unidade;
- imóvel avulso;
- foto/vídeo;
- criar/editar/duplicar/publicar/pausar/vendido/excluir;
- item não aparece público antes de publicar;
- pausado preserva histórico;
- vendido preserva estado real.

### Dashboard

- zero mocks;
- sem dado = zero/empty state;
- métricas de catálogo reais;
- métricas CRM conectadas quando disponíveis.

### CRM

- funis configuráveis;
- etapas configuráveis;
- lead completo;
- tags;
- campos personalizados;
- tarefas;
- responsável;
- histórico;
- eventos para automação.

### Inbox

- lista/chat/contexto CRM;
- ações de CRM pelo chat;
- comandos de SalesBot/IA conectados aos contratos reais;
- nenhum WhatsApp fictício marcado como enviado;
- estado de integração externa claramente indicado.

### SalesBot/Automatize/IA

- editor visual;
- blocos mínimos;
- CRUD;
- gatilhos e ações;
- agentes configuráveis;
- bot pode referenciar IA;
- Inbox pode iniciar/pausar bot e IA;
- eventos CRM chegam na camada de automação;
- logs não são fictícios.

### Integrações

Antes da fase final:

- tela/configuração pronta;
- WhatsApp e Meta podem aparecer como não conectados;
- nenhuma credencial inventada;
- nenhum segredo no GitHub.

Na fase final:

- conectar WhatsApp real;
- conectar Meta real;
- validar webhooks/credenciais;
- testar ponta a ponta.

## Checklist de qualidade

- remover mocks restantes;
- remover textos lorem/placeholder que pareçam conteúdo real;
- revisar ortografia Hárpia;
- revisar consistência visual;
- revisar mobile;
- revisar loading/error/empty state;
- revisar ações destrutivas com confirmação;
- revisar permissões;
- revisar segurança básica;
- revisar links e CTAs;
- revisar acessibilidade essencial;
- revisar performance básica;
- revisar console sem erros relevantes.

## Regra de conflito

Quando duas frentes implementarem a mesma responsabilidade:

1. identificar qual frente era proprietária segundo `docs/FRENTES-DE-TRABALHO.md`;
2. preservar a implementação da proprietária como base;
3. incorporar somente melhorias comprovadamente úteis da outra;
4. não manter duas fontes de verdade.

## Resultado esperado

Ao finalizar o pente fino, `main` deve representar uma aplicação única e coerente. Atualizar `docs/STATUS-FRENTES.md` marcando as frentes integradas e registrar pendências reais restantes antes de WhatsApp/Meta/dados operacionais.
