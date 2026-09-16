# Frente05 → Frente01 — integração no shell interno

Data: 16/09/2026
Origem: Frente05
Destino: Frente01

## Estado

A Frente05 já está preparada para ser montada no shell interno da Frente01 sem acesso direto ao estado interno de autenticação.

A API pública é:

```ts
import {
  Front05Workspace,
  buildFront05Access,
  createSupabaseAICredentialVault,
  type Front05Tab,
} from '../features/automations';
```

A Frente01 já possui as permissões usadas pela Frente05:

- `salesbot.view` / `salesbot.manage`
- `automations.view` / `automations.manage`
- `ai.view` / `ai.manage`
- `integrations.view` / `integrations.manage`

## Montagem recomendada

### 1. Criar o acesso a partir do AuthProvider

Dentro de um componente da Frente01 que já esteja sob `AuthProvider`:

```tsx
const auth = useAuth();
const access = buildFront05Access(auth.hasPermission);
const credentialVault = createSupabaseAICredentialVault(requireSupabase());
```

### 2. Rotas internas

Recomendação: manter rotas separadas por módulo para que `InternalRoute` use a permissão de leitura correspondente.

- `/interno/salesbot` → `PERMISSIONS.SALESBOT_VIEW` → `initialTab="salesbot"`
- `/interno/automacoes` → `PERMISSIONS.AUTOMATIONS_VIEW` → `initialTab="automations"`
- `/interno/agentes-ia` → `PERMISSIONS.AI_VIEW` → `initialTab="ai"`
- `/interno/integracoes` → `PERMISSIONS.INTEGRATIONS_VIEW` → `initialTab="integrations"`

Todas podem renderizar o mesmo componente:

```tsx
<Front05Workspace
  initialTab={initialTab}
  access={access}
  credentialVault={credentialVault}
/>
```

O próprio workspace oculta abas sem permissão de `view` e deixa módulos em modo somente leitura quando o usuário possui `view` mas não `manage`.

### 3. Sidebar

Adicionar no `InternalShell` links condicionados pelas mesmas permissões de leitura:

- SalesBot
- Automatize
- Agentes IA
- Integrações

A aba de Execuções não exige uma rota própria; ela aparece dentro do workspace quando o usuário possui `salesbot.view` ou `ai.view`.

## Cofre real de credenciais IA

O backend já foi criado no Supabase da Hárpia:

- schema privado `private_f05`;
- tabela `private_f05.ai_provider_credentials`;
- segredo criptografado em Supabase Vault;
- RPCs `f05_store_ai_secret`, `f05_remove_ai_secret`, `f05_resolve_ai_secret` acessíveis somente por `service_role`;
- Edge Function `ai-credentials`, `ACTIVE`, com `verify_jwt = true`;
- autorização da função exige usuário autenticado + `integrations.manage`.

O frontend nunca recebe o segredo de volta e não persiste API key em `localStorage`.

## Testes já executados pela Frente05

- round-trip real no Vault: salvar → resolver por `secretRef` → remover = OK;
- limpeza do segredo de teste = OK, 0 registros residuais;
- Supabase Security Advisor após as migrations da Frente05 = 0 lints;
- Edge Function `ai-credentials` publicada e `ACTIVE` = OK.

## O que ainda precisa da Frente01

1. Montar as quatro rotas acima no `AppRouter`.
2. Adicionar os links no `InternalShell`.
3. Passar `buildFront05Access(auth.hasPermission)` ao workspace.
4. Passar `createSupabaseAICredentialVault(requireSupabase())` ao workspace.
5. Quando existir o primeiro administrador real, executar o teste E2E de salvar/remover chave pela tela.

A Frente05 não deve editar `AppRouter.tsx` nem `InternalShell.tsx`, pois pertencem à Frente01.
