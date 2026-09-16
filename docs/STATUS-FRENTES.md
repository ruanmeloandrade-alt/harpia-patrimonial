# Hárpia Patrimonial — Status das 5 Frentes

Atualizar este arquivo ao iniciar e ao concluir blocos relevantes.

## Frente01 — Núcleo/Auth/Usuários/Permissões

- Branch: `frente-01`
- Status inicial: NÃO INICIADA
- Responsável: chat/agente designado pelo usuário
- Último commit relevante: —
- Entregue: —
- Em andamento: —
- Bloqueios: —
- Próximo passo: iniciar pela leitura da documentação obrigatória.

## Frente02 — Site público/Área do cliente

- Branch: `frente-02`
- Status: EM ANDAMENTO
- Responsável: chat/agente Frente02 designado pelo usuário em 16/09/2026
- Último commit relevante: `ed28574c651995b0ecc35f7aab7b3df2e1712e1d`
- Entregue no bloco atual: contrato consumidor de catálogo público sem mocks; área do cliente enxuta; estrutura pública navegável; home; páginas institucionais; catálogo/filtros; detalhe de imóvel; captação vender/alugar; retenção de comprador; UI responsiva da Frente02.
- Em andamento: validação isolada da camada pública e preparação dos pontos de integração reais com Auth, Catálogo e CRM.
- Bloqueios: `App.tsx`/bootstrap e roteador raiz pertencem à Frente01; contratos reais de Auth, catálogo publicado e criação de lead ainda não estão integrados nesta branch.
- Próximo passo: validar os arquivos da Frente02, corrigir qualquer erro encontrado e preparar handoff parcial para integração sem declarar a frente concluída.

## Frente03 — Catálogo interno/Dashboard

- Branch: `frente-03`
- Status inicial: NÃO INICIADA
- Responsável: chat/agente designado pelo usuário
- Último commit relevante: —
- Entregue: —
- Em andamento: —
- Bloqueios: —
- Próximo passo: iniciar pela leitura da documentação obrigatória.

## Frente04 — CRM/Inbox

- Branch: `frente-04`
- Status inicial: NÃO INICIADA
- Responsável: chat/agente designado pelo usuário
- Último commit relevante: —
- Entregue: —
- Em andamento: —
- Bloqueios: —
- Próximo passo: iniciar pela leitura da documentação obrigatória.

## Frente05 — SalesBot/Automatize/IA/Integrações

- Branch: `frente-05`
- Status inicial: NÃO INICIADA
- Responsável: chat/agente designado pelo usuário
- Último commit relevante: —
- Entregue: —
- Em andamento: —
- Bloqueios: —
- Próximo passo: iniciar pela leitura da documentação obrigatória.

---

# Pedidos entre frentes

Use esta seção quando uma frente precisar que outra altere um arquivo ou contrato que não pertence ao seu escopo.

Formato obrigatório:

- Data/hora:
- Origem:
- Destino:
- Necessidade:
- Arquivo/contrato afetado:
- Motivo:
- Urgência:
- Status: PENDENTE / EM ANDAMENTO / RESOLVIDO

- Data/hora: 16/09/2026 11:51 BRT
- Origem: Frente02
- Destino: Frente01 / integrador
- Necessidade: montar `PublicSiteApp` no bootstrap/roteador raiz e expor as rotas públicas da Frente02 sem mover a propriedade do arquivo global.
- Arquivo/contrato afetado: `src/App.tsx` e/ou roteador raiz definido pela Frente01.
- Motivo: `App.tsx`, providers e roteamento global são arquivos protegidos da Frente01; a Frente02 já criou a experiência pública em `src/features/public-site/**` e não deve sobrescrever o bootstrap.
- Urgência: ALTA — necessário para a experiência pública aparecer na aplicação integrada.
- Status: PENDENTE

- Data/hora: 16/09/2026 11:51 BRT
- Origem: Frente02
- Destino: Frente03
- Necessidade: disponibilizar implementação real do contrato de catálogo publicado para substituir `emptyPublicCatalogReader`.
- Arquivo/contrato afetado: contrato de catálogo publicado definido em `docs/CONTRATOS-ENTRE-MODULOS.md`.
- Motivo: a Frente02 não pode duplicar repositório/banco do catálogo nem usar imóveis fictícios.
- Urgência: ALTA
- Status: PENDENTE

- Data/hora: 16/09/2026 11:51 BRT
- Origem: Frente02
- Destino: Frente04
- Necessidade: expor contrato real de criação de lead/evento de conversão para CTAs e formulários do site.
- Arquivo/contrato afetado: contrato `Criação de lead pelo site` em `docs/CONTRATOS-ENTRE-MODULOS.md`.
- Motivo: formulários e CTAs da Frente02 devem registrar conversões sem disparar mensagem automática e sem simular integração.
- Urgência: ALTA
- Status: PENDENTE

---

# Pendências de integração global

Registrar aqui somente itens que dependem de merge ou decisão entre duas ou mais frentes.

- Integrar autenticação da Frente01 com área do cliente da Frente02.
- Integrar catálogo publicado da Frente03 com busca pública da Frente02.
- Integrar eventos de conversão da Frente02 com criação de lead da Frente04.
- Integrar métricas CRM da Frente04 no dashboard da Frente03.
- Integrar comandos Inbox da Frente04 com SalesBot/IA da Frente05.
- Integrar eventos CRM da Frente04 com Automatize da Frente05.
- Conectar WhatsApp e Meta somente na fase final.

---

# Critério de status

- NÃO INICIADA: nenhuma implementação relevante começou.
- EM ANDAMENTO: há trabalho ativo na branch.
- BLOQUEADA: depende de decisão ou contrato externo.
- PRONTA PARA INTEGRAÇÃO: escopo da frente concluído e testado isoladamente.
- INTEGRADA: merge validado no produto conjunto.
