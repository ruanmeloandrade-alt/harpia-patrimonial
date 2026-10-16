# Hárpia Patrimonial | Portal Privado do Cliente — implementação 2026-10-16

## Fonte visual e decisão

Referência aprovada pelo usuário: `Harpia_Portal(1).pdf`, 10 telas.

A implementação deve preservar a estrutura visual do PDF, sem reinterpretar a identidade:
1. Visão Geral.
2. Minha Curadoria.
3. Detalhe da Oportunidade.
4. Meu Acompanhamento.
5. Detalhe do Processo.
6. Documentos.
7. Atendimento.
8. Meu Perfil.
9. Primeiro Acesso.
10. Acesso Reservado.

Regra obrigatória: textos/dados demonstrativos do PDF não entram como dados operacionais. Processos, tarefas, documentos, curadoria personalizada, estados e métricas só aparecem quando existirem dados reais. Na ausência, usar estado vazio.

## Publicação

Página real publicada em `gh-pages/cliente/index.html`.

Commit de publicação:
`5b34eef37498fb92b80530ad4b924ae34f962c26`

GitHub Pages:
- execução automática `38955875351`;
- status final: `completed`;
- conclusão: `success`.

A publicação usa um HTML autocontido para impedir dependência de bundle antigo enquanto a integração React final não é promovida à `main`.

## Backend real

Projeto Supabase:
- `desxomqvtjaymwwxivwq` (Harpia Patrimonial).

Edge Function:
- `client-area-data`;
- versão 3;
- status ACTIVE;
- `verify_jwt=true`;
- valida conta autenticada e exige `account_type='client'` + `is_active=true`;
- retorna somente dados vinculados ao cliente autenticado.

Migration aplicada:
- `client_portal_private_area`.

Novas estruturas:
- `client_portal_preferences`;
- `client_documents`;
- bucket privado `client-documents`.

Proteções:
- RLS por `auth.uid()`;
- equipe interna com permissões CRM pode administrar quando aplicável;
- cliente não pode promover arbitrariamente status documental;
- arquivos ficam em bucket privado;
- MIME aceitos: PDF/JPEG/PNG/WEBP;
- limite: 20 MB.

## Fontes reais consumidas

- Supabase Auth: login, cadastro, sessão, logout e recuperação de senha.
- `user_profiles`: nome, WhatsApp, tipo e status da conta.
- `client_portal_preferences`: onboarding e preferências patrimoniais.
- `client_favorites`: imóveis salvos.
- `catalog_items`: catálogo operacional quando houver registros publicados.
- catálogo legado público já existente na `gh-pages`: fallback somente para os imóveis reais já publicados anteriormente; não é tratado como curadoria individual.
- CRM normalizado e, durante a transição, fallback de leitura do estado legado:
  - pipelines;
  - etapas;
  - leads vinculados por `source_metadata.clientId`;
  - tarefas;
  - histórico;
  - produtos relacionados.
- `client_documents`: solicitações e documentos privados.
- `user_notifications`: atualizações reais direcionadas ao usuário.

## Regra de curadoria

Catálogo geral e curadoria individual são distintos.

Um imóvel só recebe tratamento de curadoria individual quando existe relação real no CRM:
- `crm_lead_products`; ou
- interesse de lead do tipo `property` vinculado ao cliente.

Favorito não é automaticamente tratado como indicação da equipe.

## Acompanhamento

Não há porcentagem ou timeline artificial.

As etapas são derivadas do pipeline real do CRM:
- etapa anterior à atual = concluída;
- etapa atual = em andamento;
- etapas posteriores = a iniciar.

A próxima ação vem da primeira tarefa pendente real do lead.

Sem lead/processo vinculado, a área mostra estado vazio.

## Documentos

Estados suportados:
- `requested` = pendente;
- `received` = recebido;
- `review` = em análise;
- `approved` = aprovado.

Upload usa Storage privado e registra metadados em `client_documents`.
Downloads usam URL assinada temporária.

## Perfil e onboarding

O onboarding de três passos segue a tela 09:
- objetivo;
- preferências;
- conclusão.

As respostas são persistidas em `client_portal_preferences`.
Dados cadastrais são atualizados em `user_profiles` e, quando aplicável, no usuário Auth.

## Acesso

A tela 10 usa autenticação Supabase real.
A antiga autenticação por `localStorage` foi retirada da implementação publicada.

O cadastro usa Supabase Auth e cria o perfil de cliente pelo trigger existente `on_auth_user_created`.

## QA executado

- [x] JavaScript do portal: `node --check`.
- [x] busca estática por conteúdo demonstrativo/fake na implementação publicada: nenhum cadastro/processo/imóvel fictício embutido.
- [x] migration aplicada com sucesso.
- [x] Edge Function v3 ACTIVE com JWT obrigatório.
- [x] commit publicado em `gh-pages`.
- [x] deploy GitHub Pages concluído com sucesso.
- [x] fonte da Edge Function e migration versionadas na branch `work/portal-cliente-20261016`.
- [x] cópia do portal versionada em `public/cliente/index.html` na mesma branch.

## NÃO VERIFICADO

- [ ] inspeção visual diretamente no domínio após o deploy;
- [ ] login real com uma conta de cliente existente, porque a base ainda não possui cliente real;
- [ ] cadastro/confirmacão de e-mail real em navegador;
- [ ] upload/download real de documento pela UI com conta real;
- [ ] navegação autenticada ponta a ponta nas 10 telas em produção;
- [ ] `npm run typecheck` e `npm run build` da base React completa.

Não declarar esses itens como concluídos até QA real.

## Estado atual dos dados

Na auditoria antes da implantação:
- `catalog_items`: 0;
- `client_favorites`: 0;
- `crm_leads`: 0;
- `crm_tasks`: 0;
- `crm_history`: 0;
- contas de cliente: 0;
- pipeline real existente: Recepção;
- etapas reais existentes: Entrada do Lead e Lead sem resposta.

Portanto, um primeiro cliente real verá estados vazios nas áreas que ainda não possuem registros operacionais, em vez de conteúdo inventado.

## Continuidade

Branch de origem:
`work/portal-cliente-20261016`

Arquivos principais:
- `public/cliente/index.html`
- `supabase/functions/client-area-data/index.ts`
- `supabase/schema/client_portal_private_area.sql`

Não substituir `/cliente/` por uma versão antiga do `ClientArea.tsx` sem portar todas as 10 telas e contratos reais descritos aqui.
