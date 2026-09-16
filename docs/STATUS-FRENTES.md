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
- Status inicial: NÃO INICIADA
- Responsável: chat/agente designado pelo usuário
- Último commit relevante: —
- Entregue: —
- Em andamento: —
- Bloqueios: —
- Próximo passo: iniciar pela leitura da documentação obrigatória.

## Frente03 — Catálogo interno/Dashboard

- Branch: `frente-03`
- Status geral: 🟠 PARCIAL / AGUARDANDO INTEGRAÇÕES E VALIDAÇÃO FINAL
- Responsável: ChatGPT — Frente03
- Último commit funcional relevante: `2ca4606754d538e72d8baa931ad10fa3201cde57`
- Regra visual: 🟢 completo e testável | 🟠 parcial/em andamento | 🔴 não iniciado.
- 🟢 Modelo de domínio do catálogo: empreendimento, unidade, imóvel avulso, tipologia de unidade, finalidade, localização, preço, estilos de vida e mídia.
- 🟢 Repositório local/contrato do catálogo: CRUD, busca, publicação explícita, pausa, vendido, duplicação segura, exclusão lógica, código único e proteção contra unidades órfãs.
- 🟢 Contrato público: somente publicados; listagem, detalhe, unidades do empreendimento, faixa de preço derivada, filtros e opções derivadas de dados reais.
- 🟢 Filtro de preço: empreendimentos com unidades publicadas são filtrados pelos preços reais das unidades; o preço do pai não cria teto/faixa artificial.
- 🟢 Valor de estoque: evita dupla contagem de empreendimento + unidades e exclui vendidos.
- 🟢 Métricas seguras do CRM: leads, origem e próximas tarefas; com `referenceId` real + catálogo também deriva demanda por região e interesse por produto baseado em leads.
- 🟢 Adapter `SupabaseCatalogRepository`: contrato de produção injetável, validações locais, normalização de tipologia e evento comum de atualização; a camada estrutural já foi testada com cliente Supabase simulado em bloco anterior.
- 🟢 Modelo de mídia no catálogo: foto de capa (primeira foto), galeria, vídeos, plantas e documentos; IDs existentes são preservados ao editar URLs já cadastradas.
- 🟠 Schema Supabase/RLS do catálogo: implementação concluída com `catalog.view`, `catalog.manage`, `catalog.publish`, integridade pai/unidade, campos obrigatórios e timestamps de publicação/venda protegidos; ainda precisa ser aplicado e testado no Supabase dedicado real.
- 🟠 `CatalogAdminPage`: fluxo implementado com loading, erro, empty state, CRUD, filtros, mídia e RBAC granular; precisa de build Vite/browser integrado depois das últimas alterações para receber 🟢 como tela final.
- 🟠 `DashboardPage`: fluxo implementado, inclusive disponibilidade explícita de métricas e interesse por produto; precisa de build Vite/browser integrado para receber 🟢 como tela final.
- 🟠 `Front03Workspace`: implementação concluída e desacoplada; depende do shell/roteamento da Frente01 para ser testável no produto conjunto.
- 🟠 Persistência multiusuário real: adapter e schema estão prontos; depende da Frente01 aplicar o schema no projeto Supabase dedicado e injetar o cliente oficial.
- 🟠 Upload/storage binário: associação de mídia por URL permanente está pronta; infraestrutura real de upload/storage ainda depende da camada compartilhada.
- 🟠 Métricas comerciais avançadas: visitas, propostas, negociações, vendas, VGV/pipeline, ticket e conversão dependem de semântica/configuração explícita do CRM; não são inferidas pelo nome de etapas.
- Validação executada neste bloco: typecheck estrito e testes de execução da camada central; tipologia obrigatória; relação empreendimento/unidades; faixa de preço; filtro de preço por unidades; limites globais de preço; proteção contra órfãos; valor de estoque sem dupla contagem; CRM→catálogo para região/produto; métricas disponíveis; zero mocks.
- Resultado dos testes centrais mais recentes: faixa `500000–700000`, filtro `650000–750000` retornando unidade compatível + empreendimento, limites globais `300000–700000`, demanda regional e interesse por produto derivados corretamente.
- 🟠 Build Vite completo: **NÃO VERIFICADO**. O executor disponível nesta sessão usa Node 22 enquanto o repositório exige Node 24, não possui as dependências Vite/React instaladas e o clone/instalação direta ficou bloqueado por resolução de rede. Nenhum build foi declarado como aprovado.
- 🟠 Lint global: **NÃO VERIFICADO** porque esta branch não possui script/configuração de lint no `package.json`.
- 🟠 Teste visual em navegador integrado ao shell: **NÃO VERIFICADO**.
- Próximo passo da Frente03: não há novo bloco funcional independente essencial identificado neste momento; aguardar as integrações abaixo e então executar validação real de Supabase/RBAC/shell/CRM/site público.

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

- Data/hora: 16/09/2026 — sessão atual
- Origem: Frente03
- Destino: Frente01
- Necessidade: integrar os módulos exportados pela Frente03 ao shell/roteador interno.
- Arquivo/contrato afetado: roteador raiz / navegação interna (propriedade da Frente01)
- Motivo: a Frente03 não deve alterar arquivos globais protegidos; entrega `CatalogAdminPage`, `DashboardPage` e `Front03Workspace` desacoplados.
- Urgência: alta para demonstração.
- Status: PENDENTE

- Data/hora: 16/09/2026 — sessão atual
- Origem: Frente03
- Destino: Frente01
- Necessidade: aplicar `src/features/catalog/catalog.schema.sql` no projeto Supabase dedicado da Hárpia após `core_auth.sql` e injetar o cliente oficial no `SupabaseCatalogRepository`.
- Arquivo/contrato afetado: Supabase compartilhado / persistência do catálogo.
- Motivo: finalizar persistência multiusuário e validar RLS sem a Frente03 criar outro cliente Supabase ou editar configuração global.
- Urgência: alta.
- Status: PENDENTE

- Data/hora: 16/09/2026 — sessão atual
- Origem: Frente03
- Destino: Frente01
- Necessidade: mapear `useAuth().hasPermission()` para `catalog.view`, `catalog.manage` e `catalog.publish` ao montar a Frente03.
- Arquivo/contrato afetado: composição do shell/RBAC.
- Motivo: a UI da Frente03 já separa leitura, gestão e publicação; `catalog.manage`/`catalog.publish` também implicam leitura, coerente com RLS.
- Urgência: alta.
- Status: PENDENTE

- Data/hora: 16/09/2026 — sessão atual
- Origem: Frente03
- Destino: Frente04 / Integrador
- Necessidade: permitir composição compartilhada do `CrmService` ou fonte de persistência comum para que `CrmSnapshotMetricsProvider` leia exatamente o mesmo estado usado pela Frente04.
- Arquivo/contrato afetado: `Front04Workspace` / criação da instância `CrmService`.
- Motivo: o dashboard consegue derivar leads/origens/tarefas e, com `interest.referenceId`, região e interesse por produto; precisa consumir a mesma fonte real do CRM sem duplicação.
- Urgência: média/alta.
- Status: PENDENTE

- Data/hora: 16/09/2026 — sessão atual
- Origem: Frente03
- Destino: Frente02 / Integrador
- Necessidade: consumir `PublicCatalogService`/contrato publicado em vez de criar outra fonte de catálogo.
- Arquivo/contrato afetado: busca e detalhe públicos.
- Motivo: manter uma única fonte de verdade e expor apenas itens publicados, incluindo empreendimento/unidades e faixa de preço derivada.
- Urgência: alta.
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

- 🔴 NÃO INICIADO: nenhuma implementação relevante começou.
- 🟠 PARCIAL / EM ANDAMENTO: há trabalho ativo ou falta integração/validação/teste para concluir.
- 🟢 COMPLETO E TESTÁVEL: escopo concluído, validações relevantes executadas e usuário pode testar.
- BLOQUEADA: depende de decisão ou contrato externo.
- PRONTA PARA INTEGRAÇÃO: escopo da frente concluído e testado isoladamente.
- INTEGRADA: merge validado no produto conjunto.
