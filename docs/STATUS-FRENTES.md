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
- Último commit relevante: `48e202dd8bb226d34776d09e111bd8a7e55dba2d`
- Entregue no bloco atual: home pública; páginas institucionais; catálogo/filtros/detalhe em empty state real; área do cliente; retenção; vender/alugar; menu mobile; captura de contato anônimo; sincronização de navegação; fallback de rota pública; entrypoint público; adapters reais para Auth da Frente01, catálogo da Frente03 e CRM da Frente04; handoff `docs/frentes/FRENTE-02-INTEGRACAO.md`; semáforo executivo atualizado em `docs/frentes/FRENTE-02-STATUS.md`.
- Validação executada: releitura no GitHub dos arquivos gravados; conferência de ownership/branch; conferência dos contratos reais atualmente implementados nas Frentes01/03/04; revisão estrutural dos fluxos/adapters/empty states; validação TypeScript isolada da instrumentação de `history.pushState`/`replaceState`.
- NÃO VERIFICADO: build integrado; TypeScript/lint no produto conjunto; navegação ponta a ponta com todas as branches; persistência real de favoritos; responsividade visual em navegador/dispositivos.
- Em andamento: revisão final da camada pública e preparação para integração no pente fino.
- Bloqueios: montagem em `App.tsx`/roteador raiz pertence à Frente01; persistência compartilhada de favoritos ainda não foi definida no schema atual; relação nominal unidade → empreendimento-pai ainda não é exposta pelo contrato público atual da Frente03; WhatsApp real permanece fase final.
- Próximo passo: integrar no pente fino com Node compatível com o projeto (`>=24 <25`), executar build/typecheck/testes de fluxo e corrigir regressões antes de alterar o status para PRONTA PARA INTEGRAÇÃO.

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
- Necessidade: montar `PublicExperience` no bootstrap/roteador raiz e expor as rotas listadas em `publicRouteManifest`.
- Arquivo/contrato afetado: `src/App.tsx`, `src/core/router/**` e composição global de providers, propriedade da Frente01.
- Motivo: a Frente02 já entregou o entrypoint, `createFront01PublicAuthBridge`, sincronização de navegação e a experiência pública, mas não deve sobrescrever os arquivos globais da Frente01.
- Urgência: ALTA.
- Status: EM ANDAMENTO

- Data/hora: 16/09/2026 11:51 BRT
- Origem: Frente02
- Destino: Frente03 / integrador
- Necessidade: instanciar o serviço real de catálogo publicado após o merge e passá-lo por `createFront03PublicCatalogReader`; definir como expor o nome real do empreendimento-pai de unidades quando necessário.
- Arquivo/contrato afetado: `PublicCatalogService` da Frente03 + adapter `src/features/public-catalog/front03Adapter.ts` da Frente02.
- Motivo: a Frente03 já expôs contrato real, e a Frente02 já criou o adapter compatível sem duplicar modelo/banco; falta apenas composição e o enriquecimento nominal pai/unidade se exigido na UI.
- Urgência: ALTA.
- Status: EM ANDAMENTO

- Data/hora: 16/09/2026 11:51 BRT
- Origem: Frente02
- Destino: Frente04 / integrador
- Necessidade: instanciar `createFront04ConversionHandler` sobre o contrato real de ingestão de lead da Frente04.
- Arquivo/contrato afetado: `LeadConversionEvent`/`ingestLeadConversion` da Frente04 + `src/features/public-site/front04ConversionAdapter.ts` da Frente02.
- Motivo: a Frente04 já expôs contrato real; a Frente02 já captura contato, preserva contexto e não dispara mensagem automaticamente.
- Urgência: ALTA.
- Status: EM ANDAMENTO

- Data/hora: 16/09/2026
- Origem: Frente02
- Destino: Frente01 / integrador de dados
- Necessidade: definir persistência real de favoritos vinculando usuário autenticado + item real do catálogo.
- Arquivo/contrato afetado: contrato `Favoritos e interesses` em `docs/CONTRATOS-ENTRE-MODULOS.md` e futura camada de persistência.
- Motivo: a UX/bridge da Frente02 está pronta, mas o schema atual da Frente01 não possui tabela de favoritos. A Frente02 não criará persistência definitiva paralela ou localStorage como substituto do vínculo real.
- Urgência: MÉDIA/ALTA antes da entrega operacional.
- Status: PENDENTE

---

# Pendências de integração global

Registrar aqui somente itens que dependem de merge ou decisão entre duas ou mais frentes.

- Integrar autenticação da Frente01 com área do cliente da Frente02.
- Integrar catálogo publicado da Frente03 com busca pública da Frente02.
- Integrar eventos de conversão da Frente02 com criação de lead da Frente04.
- Definir persistência real de favoritos cliente + catálogo.
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
