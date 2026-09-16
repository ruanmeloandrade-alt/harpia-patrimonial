# Frente01 — Núcleo da plataforma, autenticação, usuários e permissões

Branch obrigatória: `frente-01`

## Missão

Construir a fundação técnica e operacional que todas as outras frentes vão consumir, sem invadir módulos de catálogo, CRM, Inbox, SalesBot, automações ou site público.

## Ler antes de começar

1. `AGENTS.md`
2. `docs/BRIEFING-CONSOLIDADO.md`
3. `docs/ESCOPO-DE-TRABALHO.md`
4. `docs/CONVERSA-E-DECISOES.md`
5. `docs/FRENTES-DE-TRABALHO.md`
6. `docs/CONTRATOS-ENTRE-MODULOS.md`
7. `docs/STATUS-FRENTES.md`

## Escopo exclusivo

### 1. Estrutura base

- organizar shell da aplicação;
- estruturar providers globais;
- definir roteamento base sem construir páginas pertencentes a outras frentes;
- criar tratamento global de loading/error/empty state;
- estabelecer padrões de tipos, serviços e persistência compartilhada;
- garantir que o projeto continue buildando após cada etapa.

### 2. Autenticação do cliente final

Cadastro mínimo obrigatório:

- nome;
- e-mail;
- WhatsApp;
- senha.

Entregar cadastro, login, logout, recovery, sessão persistente, usuário autenticado e guards da área pessoal.

### 3. Autenticação interna / usuários / permissões

Preparar acesso de equipe separado do cliente final; CRUD estrutural de usuários; grupos configuráveis; permissões herdadas; exceções individuais allow/deny; segurança mínima em backend e frontend.

## Arquivos/pastas sob responsabilidade

- `src/app/**`
- `src/core/**`
- `src/shared/**`
- `src/features/auth/**`
- `src/features/users/**`
- `src/features/permissions/**`
- `src/features/settings/core/**`
- bootstrap/providers/roteador/configuração global.

## Fora do escopo

Site público completo, catálogo, CRM, Inbox, SalesBot, Automatize, agentes IA, WhatsApp e Meta reais pertencem às outras frentes/fase final.

## Contratos expostos

- `getCurrentUser`
- `signUpClient`
- `signIn`
- `signOut`
- `isAuthenticated`
- `isInternalUser`
- `hasPermission`
- dados básicos do usuário atual

## Handoff da Frente01 — 16/09/2026

- **Status:** CONCLUÍDA ESTRUTURALMENTE + QA BACKEND AUTH/RBAC APROVADO.
- **Branch:** `frente-01`.
- **Núcleo entregue:** shell/roteamento; `AuthProvider`; sessão; cadastro/login/logout/recovery; separação cliente/equipe; guards; usuários; grupos; RBAC; overrides individuais; configurações; Error Boundary; persistência compartilhada; Supabase tipado; `admin-user`; RLS/hardening.
- **QA real:** admin temporário autenticou com `22` permissões; viewer temporário autenticou com `11` permissões de leitura e `0` de gestão; `auth.getUser()` validou ambas as sessões; todos os dados temporários foram removidos.
- **Bug corrigido no QA:** o hardening lia apenas `request.jwt.claim.role`, incompatível com o formato atual do service key do Supabase. A detecção agora reconhece `request.jwt.claims.role` e `current_setting('role')`, mantendo compatibilidade com o claim legado.
- **Commit do fix:** `af09b2faa7e072125ccb2fc1c91ab74c0d9ab39c`.
- **Security Advisor final:** `0` lints.
- **Backend limpo após QA:** `auth.users=0`, `user_profiles=0`, grupos QA=0, memberships QA=0, overrides QA=0.
- **Contratos públicos:** consumir `src/core/auth/index.ts`, `useAuth()`, guards e `PERMISSIONS`; não criar auth paralelo.
- **Frentes02–05:** totalmente liberadas da dependência estrutural da Frente01.

## Pendências que NÃO bloqueiam as demais frentes

- build/typecheck completo em Node/npm compatível;
- persistência de sessão em navegador real após fechar/reabrir;
- confirmação/recovery por e-mail real;
- redirects finais do Auth no domínio publicado;
- E2E visual no navegador do produto consolidado.

Esses itens são QA final de ambiente/publicação; não representam trabalho estrutural pendente da Frente01.
