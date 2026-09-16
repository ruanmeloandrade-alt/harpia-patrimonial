# Frente01 — QA do núcleo / autenticação / permissões

Data: 16/09/2026

## Backend validado

- Projeto Supabase: `Harpia Patrimonial`
- Ref: `desxomqvtjaymwwxivwq`
- Região: `sa-east-1`
- Status: `ACTIVE_HEALTHY`
- Projeto MKTon não foi alterado.

## Migrations aplicadas

- `20260916155523_core_auth`
- `20260916155537_core_auth_hardening`
- `20260916155713_core_auth_performance`

## Edge Function

- Nome: `admin-user`
- Status: `ACTIVE`
- Versão observada: `1`
- JWT obrigatório: `true`

## Estrutura do banco observada

Todas com RLS habilitado:

- `user_profiles`
- `permissions`
- `permission_groups`
- `group_permissions`
- `user_group_memberships`
- `user_permission_overrides`
- `organization_settings`

Seed estrutural:

- permissões: `22`
- grupo de sistema `Administrador`: `1`
- permissões allow no grupo Administrador: `22`
- perfis de usuário: `0`

Não foi criado usuário fictício para preencher a plataforma.

## QA de segurança

Supabase Security Advisor após todas as migrations:

- `0` lints.

Teste como role `authenticated` sem identidade/JWT de usuário:

- permissões visíveis: `0`
- grupos visíveis: `0`
- configurações visíveis: `0`
- perfis visíveis: `0`

Teste direto das funções de autorização sem identidade:

- `private.is_internal_user(auth.uid())` → `false`
- `private.user_has_permission(auth.uid(), 'dashboard.view')` → `false`
- `private.user_has_permission(auth.uid(), 'users.manage')` → `false`

Conclusão: possuir apenas o role Postgres `authenticated` sem identidade válida não concede acesso interno nem permissões.

## QA de performance

Advisor inicial apontou:

- 3 FKs sem índice de cobertura;
- policies permissivas duplicadas em SELECT devido a policies `FOR ALL`.

Correções aplicadas em `core_auth_performance`:

- índices das 3 FKs adicionados;
- policies de gestão separadas em `INSERT`, `UPDATE` e `DELETE`;
- policy de leitura permanece única por operação.

Após correção restaram somente `INFO` de índices ainda não utilizados, esperado em banco recém-criado e sem tráfego.

## QA de código/contratos

Implementado/versionado:

- cliente Supabase tipado pelo schema real;
- `database.types.ts` gerado do projeto real;
- contrato público de autenticação;
- constantes compartilhadas de permissão;
- sessão persistente;
- cadastro/login/logout/recovery;
- rotas de cliente e equipe separadas;
- `dashboard.view` aplicado em rota e menu;
- gestão de usuários;
- gestão de grupos;
- herança de permissões;
- exceções individuais allow/deny;
- bloqueio de autoelevação e autodesativação;
- Error Boundary global.

## NÃO VERIFICADO / pendente

Não marcar como verde até execução real:

- build/typecheck completo no ambiente com registry npm disponível;
- cadastro de cliente real;
- confirmação de e-mail real;
- login/logout/refresh real;
- persistência após fechar/reabrir navegador;
- recuperação de senha por e-mail real;
- criação do primeiro administrador real;
- criação de funcionário real pela Edge Function;
- edição/ativação/desativação com contas reais;
- permissões por grupo e exceções individuais com usuários reais;
- configuração de variáveis no ambiente de hospedagem;
- configuração final dos redirect URLs do Auth;
- integração com as demais frentes.

## Regra para integração

Não criar outro sistema de autenticação, usuário ou autorização. Consumir `src/core/auth/index.ts` e `PERMISSIONS` durante o pente fino.
