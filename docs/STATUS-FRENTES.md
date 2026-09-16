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
- Último commit relevante: `5f588221233f76509b1802a863ec4da85117774b`
- Entregue no bloco atual: home pública com busca real; páginas institucionais; catálogo/filtros/detalhe; filtros persistidos em URL; relação unidade → empreendimento resolvida pelo serviço real; área do cliente com favoritos/interesses/histórico preparados para dados reais; retenção; vender/alugar com estado real; menu mobile; acessibilidade de overlays; captura de contato; metadados por rota; adapters Auth/Catálogo/CRM; pipeline CRM → WhatsApp; continuação contextual de WhatsApp sem número fictício; bridge de favoritos; handoff e semáforo atualizados.
- Validação executada: releitura no GitHub; conferência de ownership/branch; conferência dos contratos atuais das Frentes01/03/04; revisão estrutural dos adapters, navegação, estados vazios e fluxos de conversão.
- NÃO VERIFICADO: build/typecheck do produto conjunto; execução ponta a ponta com branches integradas; store real de favoritos; dados reais de interesses/histórico; responsividade visual em navegador/dispositivos.
- Em andamento: pente-fino de código próprio e preparação do merge.
- Bloqueios/dependências: montagem no `AppRouter` pertence à Frente01/integrador; persistência compartilhada de favoritos ainda não existe; instâncias reais de catálogo/CRM entram após merge; telefone real vem da configuração final.
- Próximo passo: continuar fechando itens independentes; depois do merge executar build/typecheck/E2E no Node `>=24 <25` e corrigir regressões antes de alterar o status.

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

- Data/hora: 16/09/2026 11:51 BRT
- Origem: Frente02
- Destino: Frente01 / integrador
- Necessidade: substituir o placeholder público atual e montar `PublicExperience` nas rotas de `publicRouteManifest`, preservando `/entrar`, `/cadastro`, `/conta` e `/interno/**` do núcleo.
- Arquivo/contrato afetado: `src/app/AppRouter.tsx`, providers globais e composição de rotas.
- Motivo: a Frente02 já entrega entrypoint, auth bridge e sincronização de navegação; não deve sobrescrever arquivo global da Frente01.
- Urgência: ALTA.
- Status: EM ANDAMENTO

- Data/hora: 16/09/2026 11:51 BRT
- Origem: Frente02
- Destino: Frente03 / integrador
- Necessidade: instanciar `PublicCatalogService` real por `createFront03PublicCatalogReader` após merge.
- Arquivo/contrato afetado: catálogo público da Frente03 + `src/features/public-catalog/front03Adapter.ts`.
- Motivo: adapter da Frente02 já cobre filtros, estilo de vida e resolução do empreendimento-pai; falta somente composição/teste com dados reais.
- Urgência: ALTA.
- Status: EM ANDAMENTO

- Data/hora: 16/09/2026 11:51 BRT
- Origem: Frente02
- Destino: Frente04 / integrador
- Necessidade: instanciar `createFront04ConversionHandler` sobre o CRM real e, quando existir fonte real, fornecer dados de interesses/histórico associados ao cliente.
- Arquivo/contrato afetado: `LeadConversionEvent`/`ingestLeadConversion` + portas da área do cliente.
- Motivo: captura, pipeline e UI da Frente02 já estão preparados sem simular mensagem ou histórico.
- Urgência: ALTA para conversões; MÉDIA para histórico.
- Status: EM ANDAMENTO

- Data/hora: 16/09/2026
- Origem: Frente02
- Destino: Frente01 / integrador de dados
- Necessidade: definir persistência real de favoritos vinculando usuário autenticado + item real do catálogo, compatível com `PublicFavoritesStorePort`.
- Arquivo/contrato afetado: contrato de favoritos/interesses e futura camada de persistência/RLS.
- Motivo: UX e bridge estão prontos, mas o schema atual não possui tabela compartilhada de favoritos; a Frente02 não criará persistência definitiva paralela.
- Urgência: MÉDIA/ALTA antes da entrega operacional.
- Status: PENDENTE

---

# Pendências de integração global

- Integrar autenticação/rotas da Frente01 com a experiência e área do cliente da Frente02.
- Instanciar catálogo publicado da Frente03 na busca pública da Frente02.
- Integrar eventos de conversão da Frente02 com criação de lead da Frente04.
- Definir persistência real de favoritos cliente + catálogo.
- Integrar fonte real de interesses/histórico quando houver vínculo disponível.
- Integrar métricas CRM da Frente04 no dashboard da Frente03.
- Integrar comandos Inbox da Frente04 com SalesBot/IA da Frente05.
- Integrar eventos CRM da Frente04 com Automatize da Frente05.
- Configurar WhatsApp/Meta reais somente na fase final, com dados oficiais.

---

# Critério de status

- NÃO INICIADA: nenhuma implementação relevante começou.
- EM ANDAMENTO: há trabalho ativo na branch.
- BLOQUEADA: depende de decisão ou contrato externo.
- PRONTA PARA INTEGRAÇÃO: escopo da frente concluído e testado isoladamente.
- INTEGRADA: merge validado no produto conjunto.
