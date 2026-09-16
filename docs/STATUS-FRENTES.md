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
- Status: BLOQUEADA PARA INTEGRAÇÃO / VALIDAÇÃO REAL
- Responsável: chat/agente Frente02 designado pelo usuário em 16/09/2026
- Último commit funcional relevante: `5135c8aa2a33fb3da75036e0abaf46e850ccd170`
- Entregue: home pública com busca real; páginas institucionais; catálogo/filtros/detalhe; tipologia real da Frente03; filtros sanitizados e persistidos em URL; relação unidade → empreendimento; serviços relacionados; área do cliente; favoritos com loading/erro/retry; interesses/histórico por fonte real; retenção; vender/alugar com estado real; Minha conta/menu mobile; acessibilidade de overlays; captura de contato; metadados por rota; adapters Auth/Catálogo/CRM; bloqueio de conversão sem contato; pipeline CRM → WhatsApp; validação do número internacional; `Front02IntegrationShell`; handoff e semáforo atualizados.
- Independências concluídas: no pente-fino atual não restou implementação funcional conhecida da Frente02 que possa ser concluída isoladamente sem invadir ownership de outra frente, inventar persistência ou simular integração.
- Validação executada: releitura no GitHub dos arquivos gravados; conferência de ownership/branch; conferência dos contratos atuais das Frentes01/03/04; revisão estrutural dos adapters, shell, estados vazios/loading/erro/retry, navegação, filtros e fluxos de conversão.
- NÃO VERIFICADO: build/typecheck do produto conjunto; execução ponta a ponta com branches integradas; store/tabela real de favoritos; dados persistidos reais da área do cliente; WhatsApp oficial; responsividade visual em navegador/dispositivos.
- Bloqueios/dependências: montagem no `AppRouter` e bootstrap pertence à Frente01/integrador; persistência compartilhada de favoritos ainda não existe; catálogo/CRM reais precisam ser instanciados após merge; backend real e telefone oficial são externos à F2.
- Próximo passo: aguardar integração. Assim que o produto conjunto estiver montado, executar build/typecheck/E2E em Node `>=24 <25`, testar desktop/mobile e corrigir regressões pertencentes à Frente02 antes de alterar o status.

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
- Necessidade: substituir o placeholder público e montar `Front02IntegrationShell`/`PublicExperience` nas rotas de `publicRouteManifest`, preservando `/entrar`, `/cadastro`, `/conta` e `/interno/**` do núcleo.
- Arquivo/contrato afetado: `src/app/AppRouter.tsx`, providers globais e composição de rotas.
- Motivo: a Frente02 já entrega shell único, auth bridge e experiência pública; não deve sobrescrever arquivos globais da Frente01.
- Urgência: ALTA.
- Status: PENDENTE DE INTEGRAÇÃO

- Data/hora: 16/09/2026 11:51 BRT
- Origem: Frente02
- Destino: Frente03 / integrador
- Necessidade: instanciar `PublicCatalogService` real por `createFront03PublicCatalogReader` após merge.
- Arquivo/contrato afetado: catálogo público da Frente03 + `src/features/public-catalog/front03Adapter.ts`.
- Motivo: adapter da Frente02 já cobre filtros, estilo de vida, `typology` e empreendimento-pai; falta composição/teste com dados reais.
- Urgência: ALTA.
- Status: PENDENTE DE INTEGRAÇÃO

- Data/hora: 16/09/2026 11:51 BRT
- Origem: Frente02
- Destino: Frente04 / integrador
- Necessidade: instanciar `createFront04ConversionHandler` sobre o CRM real e, quando existir fonte real, fornecer interesses/histórico associados ao cliente.
- Arquivo/contrato afetado: `LeadConversionEvent`/`ingestLeadConversion` + portas da área do cliente.
- Motivo: captura, bloqueio sem contato, pipeline e UI da Frente02 já estão preparados sem simular mensagem ou histórico.
- Urgência: ALTA para conversões; MÉDIA para histórico.
- Status: PENDENTE DE INTEGRAÇÃO

- Data/hora: 16/09/2026
- Origem: Frente02
- Destino: Frente01 / integrador de dados
- Necessidade: definir persistência real de favoritos vinculando usuário autenticado + item real do catálogo, compatível com `PublicFavoritesStorePort`.
- Arquivo/contrato afetado: contrato de favoritos/interesses e futura camada de persistência/RLS.
- Motivo: UX, estados e bridge estão prontos, mas o schema compartilhado ainda não possui a persistência definitiva; a Frente02 não criará banco paralelo.
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
- BLOQUEADA: depende de decisão, contrato, integração ou validação externa à frente.
- PRONTA PARA INTEGRAÇÃO: escopo da frente concluído e testado isoladamente.
- INTEGRADA: merge validado no produto conjunto.
