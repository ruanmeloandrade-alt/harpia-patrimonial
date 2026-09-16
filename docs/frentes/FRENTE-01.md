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

Entregar:

- cadastro;
- login;
- logout;
- recuperação/fluxo mínimo de acesso se a stack escolhida suportar;
- sessão persistente;
- usuário permanece logado até logout ou perda da sessão;
- obtenção do usuário autenticado;
- guardas de rota para área pessoal.

### 3. Autenticação interna

Preparar acesso da equipe Hárpia separado logicamente do cliente final.

Não cadastrar funcionários reais agora.

### 4. Usuários internos

Entregar estrutura para:

- criar usuário;
- editar;
- ativar/desativar;
- visualizar status;
- associar função/grupo;
- aplicar exceções individuais de permissão.

### 5. Funções/grupos e permissões

Permissões precisam funcionar em duas camadas:

1. conjunto-base herdado de função/grupo;
2. exceções individuais para permitir ou negar capacidades específicas.

Não fixar corretores, jurídico, marketing etc. como únicas funções possíveis. O administrador deve poder configurar grupos.

### 6. Configurações estruturais

Criar estrutura base para:

- dados da empresa;
- preferências gerais;
- usuários;
- funções;
- permissões;
- campos/configurações compartilhadas quando pertencentes ao núcleo.

Integrações externas pertencem à Frente05.

### 7. Segurança mínima

- nunca colocar segredos no GitHub;
- proteger ações internas por autenticação/permissão;
- não confiar apenas em esconder botão no frontend;
- validar autorização na camada de serviço/backend quando aplicável;
- evitar exposição de dados internos na área pública.

## Arquivos/pastas sob responsabilidade

Preferencialmente:

- `src/app/**`
- `src/core/**`
- `src/shared/**`
- `src/features/auth/**`
- `src/features/users/**`
- `src/features/permissions/**`
- `src/features/settings/core/**`
- bootstrap global;
- providers;
- roteador raiz;
- configuração global necessária.

## Arquivos protegidos que esta frente pode editar

- `package.json`
- arquivos globais de build
- roteador raiz
- providers globais
- CSS/tokens globais

Ao mudar algo que pode afetar outra frente, registrar em `docs/STATUS-FRENTES.md`.

## Fora do escopo

Não construir:

- site público completo;
- catálogo de imóveis;
- dashboard de negócio;
- CRM;
- Inbox;
- SalesBot;
- Automatize;
- agentes IA;
- WhatsApp real;
- Meta real.

## Contratos que deve expor

- `getCurrentUser`
- `signUpClient`
- `signIn`
- `signOut`
- `isAuthenticated`
- `isInternalUser`
- `hasPermission`
- acesso aos dados básicos do usuário atual

Os nomes finais podem variar conforme a arquitetura, mas a capacidade deve existir.

## Critérios de aceite

- cliente consegue criar conta com nome/e-mail/WhatsApp/senha;
- cliente consegue entrar e permanece autenticado;
- área interna não abre para usuário sem permissão;
- administrador pode gerir usuários/grupos/permissões na estrutura criada;
- exceção individual de permissão é suportada;
- nenhuma equipe real é pré-cadastrada;
- não existem credenciais hardcoded;
- build funciona;
- outras frentes conseguem consumir os contratos sem copiar lógica de autenticação.

## Handoff da Frente01 — 16/09/2026

- **Status:** BLOQUEADA PARA VALIDAÇÃO REAL. A parte independente do código está estruturalmente concluída; faltam backend dedicado e testes reais antes de qualquer status verde.
- **Branch:** `frente-01`.
- **Último commit estrutural antes deste handoff:** `6694741cb1ef256023c87dc6cdcd5536e3dcdfd0`.
- **O que foi entregue:** shell/roteamento base; `AuthProvider`; sessão persistente; cadastro, login, logout, recuperação e redefinição de senha; separação cliente/equipe; guards de rota; `dashboard.view` protegido também por URL; Error Boundary global; CRUD estrutural de usuários internos (criar, editar dados operacionais, ativar/desativar); grupos configuráveis (criar, editar, ativar/desativar); permissões herdadas por grupo; exceções individuais allow/deny; dados estruturais da organização; preferências compartilhadas via JSON; métricas reais do núcleo sem mocks; cliente Supabase desacoplado; Edge Function `admin-user`; schema RLS e hardening adicional contra autoelevação/autodesativação.
- **Contratos expostos:** `src/core/auth/index.ts` exporta `AuthProvider`, `useAuth`, `ClientRoute`, `InternalRoute`, tipos públicos e `PERMISSIONS`; demais frentes devem usar esse contrato e não criar auth paralelo.
- **Banco preparado:** `supabase/schema/core_auth.sql` + `supabase/schema/core_auth_hardening.sql`.
- **Edge Function preparada:** `supabase/functions/admin-user/index.ts`, com JWT obrigatório em `config.toml`.
- **O que ficou pendente:** criar/conectar projeto Supabase exclusivo da Hárpia; aplicar os dois scripts SQL; publicar Edge Function; configurar URL/chave publishable; criar conscientemente o primeiro administrador; rodar advisors; testar autenticação, sessão persistente, recuperação, RLS, usuários, grupos e exceções ponta a ponta.
- **Build/testes:** `NÃO VERIFICADOS` integralmente. O ambiente não conseguiu acessar o registry npm para instalar dependências; portanto não declarar build aprovado. A revisão estática foi realizada, mas não substitui build nem teste funcional.
- **Dependências de outras frentes:** integração com a área do cliente da Frente02 e incorporação dos módulos internos das Frentes02–05 no shell ficam para os respectivos handoffs/pente fino. Não invadir esses módulos antes disso.
- **Riscos conhecidos:** sem o Supabase dedicado não existe validação real das policies, função administrativa ou persistência; qualquer mudança futura de chave de permissão deve manter `src/core/auth/permissions.ts`, seed SQL e contratos sincronizados.
- **Instrução para integração:** preservar `src/core/auth/**`, usar `PERMISSIONS` em vez de criar strings divergentes, consumir `useAuth()`/guards e reconciliar o roteador raiz sem substituir a lógica de autenticação silenciosamente.
