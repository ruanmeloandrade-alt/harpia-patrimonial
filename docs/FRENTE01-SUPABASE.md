# Frente01 — Supabase dedicado da Hárpia

## Regra absoluta

A Hárpia usa projeto Supabase próprio. **Não usar o projeto MKTon**.

## Projeto ativo

- Nome: `Harpia Patrimonial`
- Project ref: `desxomqvtjaymwwxivwq`
- Organização: `Marketing11`
- Região: `sa-east-1` (São Paulo)
- URL: `https://desxomqvtjaymwwxivwq.supabase.co`
- Status verificado em 16/09/2026: `ACTIVE_HEALTHY`
- Custo informado na criação: US$ 0/mês

A chave publishable foi obtida pelo conector para configuração do ambiente, mas **não deve ser commitada no GitHub**. `service_role` nunca vai para frontend.

## Estrutura versionada

- Cliente frontend: `src/core/supabase/client.ts`
- Tipos gerados do schema real: `src/core/supabase/database.types.ts`
- Contrato público de autenticação: `src/core/auth/index.ts`
- Chaves compartilhadas de permissão: `src/core/auth/permissions.ts`
- Variáveis esperadas: `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`
- Schema base: `supabase/schema/core_auth.sql`
- Endurecimento de segurança: `supabase/schema/core_auth_hardening.sql`
- Otimizações do advisor: `supabase/schema/core_auth_performance.sql`
- Edge Function administrativa: `supabase/functions/admin-user/index.ts`
- JWT obrigatório: `supabase/functions/admin-user/config.toml`

## Migrations aplicadas no projeto real

1. `20260916155523_core_auth`
2. `20260916155537_core_auth_hardening`
3. `core_auth_performance` — aplicada após os advisors para índices de FKs e separação das policies de escrita.

## Backend efetivamente ativado

- schema do núcleo aplicado;
- RLS habilitado em todas as tabelas públicas da Frente01;
- 22 permissões-base cadastradas;
- grupo estrutural `Administrador` criado;
- grupo `Administrador` recebeu as 22 permissões-base;
- nenhum usuário real ou fictício foi cadastrado;
- Edge Function `admin-user` publicada e `ACTIVE`;
- `verify_jwt = true` confirmado na função publicada;
- URL e chave publishable do projeto recuperadas;
- tipos TypeScript gerados do schema real e versionados.

## Validações executadas

### Security Advisor

Resultado após migrations: **0 lints de segurança**.

### Performance Advisor

Os avisos úteis iniciais foram corrigidos:

- índice para `group_permissions.permission_id`;
- índice para `user_group_memberships.group_id`;
- índice para `user_permission_overrides.permission_id`;
- policies `FOR ALL` separadas em `INSERT`, `UPDATE` e `DELETE` para não duplicar avaliação em `SELECT`.

Após a correção, restaram apenas avisos `INFO` de `unused_index`, esperados porque o banco acabou de ser criado e ainda não possui tráfego.

### Teste de isolamento por RLS

Foi executada consulta como role `authenticated` **sem usuário/JWT identificado**. Resultado:

- permissões visíveis: `0`;
- grupos visíveis: `0`;
- configurações visíveis: `0`;
- perfis visíveis: `0`.

Isso confirma que a camada de dados não expõe o núcleo interno apenas por possuir o papel `authenticated` sem identidade válida.

### Seed estrutural verificado

- `permissions`: 22;
- grupo `administrador`: 1;
- permissões `allow` do grupo `administrador`: 22;
- perfis de usuário: 0.

## Bootstrap do primeiro administrador

Não existe credencial administrativa hardcoded no repositório. O primeiro administrador deve ser criado conscientemente quando os dados reais forem fornecidos.

Fluxo:

1. criar a conta real pelo cadastro/Auth;
2. com acesso administrativo ao banco, alterar `public.user_profiles.account_type` para `internal`;
3. associar o `user_id` ao grupo cujo `slug = 'administrador'` em `public.user_group_memberships`;
4. a partir daí, a própria plataforma pode cadastrar e administrar os demais usuários.

## Segurança implementada

- RLS habilitado em todas as tabelas públicas deste núcleo;
- autorização usa perfil e tabelas de permissão, não `user_metadata`;
- cliente final criado pelo gatilho sempre nasce como `client`, independentemente do metadata enviado pelo navegador;
- grupo + exceção individual (`allow`/`deny`), com negação individual prevalecendo;
- alteração de `account_type` e `is_active` protegida por trigger;
- usuário interno não pode desativar/rebaixar a própria conta pela Data API;
- associação de grupos exige `users.manage` + `roles.manage` e não pode alterar a própria conta;
- exceção individual exige `users.manage` + `roles.manage` e não pode ser usada para autoelevação;
- grupo `Administrador` é estrutural e não pode ser desativado/excluído;
- `dashboard.view` é validado também na rota `/interno`, não apenas no menu;
- `service_role` fica somente no ambiente server-side da Edge Function;
- criação de usuário interno exige `users.manage`; atribuição de grupo também exige `roles.manage`;
- redefinição de senha exige sessão/recovery válida antes da troca.

## Ainda pendente

- configurar `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no ambiente do deploy quando a hospedagem for consolidada;
- configurar URLs/redirects de Auth no ambiente final de hospedagem;
- criar o primeiro administrador real quando os dados forem fornecidos;
- executar teste ponta a ponta com contas reais: cadastro, confirmação de e-mail, login, refresh, logout, recuperação de senha, grupos, exceções e criação de funcionário;
- validar build/typecheck no ambiente de execução quando o registry npm estiver acessível;
- integrar identidade/autorização com as demais frentes no pente fino.

## Integração com outras frentes

Outras frentes devem consumir identidade e autorização pelo contrato público de `src/core/auth/index.ts`.

Capacidades disponíveis:

- `useAuth()` para usuário, perfil, sessão e permissões efetivas;
- `ClientRoute` para área autenticada do cliente;
- `InternalRoute` para área interna e permissão por módulo;
- `PERMISSIONS` para evitar strings divergentes entre módulos.

Não criar outro sistema de login, outra tabela de usuário ou outra fonte de verdade para permissões.
