# Frente02 — Handoff de integração

Data-base: 16/09/2026
Branch de origem: `frente-02`

Este documento descreve como integrar a experiência pública e a área do cliente da Frente02 com os contratos que já existem nas Frentes01, 03 e 04.

## 1. Entry point da Frente02

O integrador deve consumir a Frente02 por:

```ts
import {
  PublicExperience,
  createFront01PublicAuthBridge,
  createFront03PublicCatalogReader,
  createFront04ConversionHandler,
  publicRouteManifest,
} from './features/public-site';
```

Não é necessário importar arquivos internos da Frente02 diretamente.

## 2. Rotas públicas

Manifesto exportado por `publicRouteManifest`:

- `/`
- `/sobre`
- `/investimentos`
- `/leiloes`
- `/assessoria-juridica`
- `/arquitetura`
- `/imoveis`
- `/imoveis/:slug`
- `/vender`
- `/alugar`
- `/cliente`

A montagem no roteador raiz continua sendo responsabilidade da Frente01/integrador.

`PublicExperience` sincroniza alterações de `history.pushState`/`replaceState` com evento de navegação para não deixar o estado do roteador global defasado durante a navegação pública.

## 3. Integração com Auth — Frente01

A Frente01 já fornece `useAuth()` com `user`, `profile`, `isAuthenticated` e sessão real.

A Frente02 fornece:

```ts
createFront01PublicAuthBridge({ auth, requestLogin })
```

Regras:

- não criar outro provider de autenticação;
- não criar segunda sessão;
- `requestLogin` deve usar o roteador da Frente01 para abrir a rota real de login/cadastro definida no núcleo;
- o adapter só considera `profile.account_type === 'client'` e perfil ativo como cliente final público;
- e-mail vem do usuário autenticado; nome/WhatsApp vêm do perfil real.

A Frente01 possui páginas de login/cadastro e o roteador deve decidir a rota final durante a integração. Não hardcodar uma rota nova dentro da Frente02.

## 4. Integração com catálogo — Frente03

A Frente03 já fornece `PublicCatalogService` com:

- `list(filters)`;
- `getByIdOrCode(value)`;
- tipos próprios do catálogo.

Os modelos são diferentes por responsabilidade. A Frente02 NÃO deve substituir ou duplicar os tipos da Frente03.

Usar:

```ts
const publicCatalogReader = createFront03PublicCatalogReader(publicCatalogService);
```

O adapter traduz, entre outros:

- `name` → `title`;
- `development | unit | standalone` → rótulo público;
- `sale | rent` → `Venda | Locação`;
- `location.city/neighborhood/condominium` → campos de apresentação pública;
- `code` → slug público;
- `isLaunch` ↔ filtro `launch` da experiência pública;
- mídia pública somente `image`/`video`.

Depois passar:

```tsx
<PublicExperience catalog={publicCatalogReader} />
```

### Ponto ainda dependente de integração

A Frente03 expõe `parentId` para unidades, mas o contrato público atual não traz o nome do empreendimento-pai. Não inventar título do empreendimento na Frente02. Se a demonstração exigir essa relação nominal, o integrador/F03 deve enriquecer o contrato público com o rótulo real do pai.

## 5. Integração com CRM — Frente04

A Frente04 já fornece:

- `LeadConversionEvent`;
- `ingestLeadConversion(crm, event)`;
- retorno com `automaticMessageSent: false`.

A Frente02 fornece:

```ts
const onConversion = createFront04ConversionHandler({
  ingest: (event) => ingestLeadConversion(crm, event),
  getCurrentClient: () => authBridge.currentClient,
});
```

Depois passar:

```tsx
<PublicExperience onConversion={onConversion} />
```

Regras preservadas:

- nenhum lead recebe mensagem automaticamente só por ter sido criado;
- conversões de imóvel preservam referência do imóvel;
- serviços preservam o serviço de interesse;
- origem, ação, página e metadados seguem para o CRM;
- visitante anônimo não gera contato fictício.

## 6. Captura de contato anônimo

Quando um visitante anônimo aciona atendimento/retensão/interesse e ainda não há nome real:

1. `PublicExperience` intercepta a conversão;
2. abre modal da Frente02;
3. exige nome e WhatsApp;
4. e-mail é opcional;
5. somente depois encaminha `PublicSiteConversion` ao handler do CRM.

Formulários `Quero vender` e `Quero alugar` já produzem contato e não precisam desta etapa adicional.

## 7. Favoritos

A Frente02 possui a experiência e o contrato `PublicFavoritesBridge`.

A persistência final deve respeitar o contrato geral:

- somente cliente autenticado persiste favorito;
- favorito vincula identidade real + item real do catálogo;
- remoção idempotente;
- visitante sem conta deve ir para login/cadastro;
- não usar `localStorage` como persistência definitiva se a camada real estiver disponível.

A persistência concreta deve ser conectada no pente fino sem criar banco/repositório duplicado dentro da Frente02.

## 8. Área do cliente

`ClientArea` recebe:

- perfil real do auth bridge;
- lista real de favoritos;
- handlers de navegação e atendimento.

Interesses e histórico permanecem em empty state enquanto não houver dados reais relacionados. Não preencher para demonstração com dados fictícios.

## 9. Integrações externas

WhatsApp/Meta reais não pertencem a este handoff imediato.

Até a fase final:

- CTAs produzem eventos internos;
- CRM registra contexto quando integrado;
- não simular envio de WhatsApp;
- não inventar números, tokens, IDs ou sucesso de mensagem.

## 10. Checklist obrigatório após merge

Antes de considerar Frente02 integrada:

- montar `PublicExperience` nas rotas públicas;
- conectar auth bridge real;
- conectar catálogo real via adapter Frente03;
- conectar conversões via adapter Frente04;
- conectar favoritos reais;
- executar build;
- executar verificação TypeScript/lint se configurados;
- testar home e páginas institucionais;
- testar filtros com dados reais;
- testar detalhe do imóvel;
- testar favorito deslogado e logado;
- testar área do cliente;
- testar vender/alugar;
- testar captura anônima dos CTAs;
- testar exit-intent;
- testar navegação desktop/mobile;
- testar rota inexistente;
- testar refresh em rota pública direta;
- validar responsividade real;
- manter como `NÃO VERIFICADO` qualquer item que não tenha sido executado.

## 11. Arquivos que o integrador não deve apagar

- `src/features/public-site/PublicSiteApp.tsx`
- `src/features/public-site/PublicExperience.tsx`
- `src/features/public-site/index.ts`
- `src/features/public-site/front01AuthAdapter.ts`
- `src/features/public-site/front04ConversionAdapter.ts`
- `src/features/public-site/public-site.css`
- `src/features/public-site/public-experience.css`
- `src/features/public-catalog/contracts.ts`
- `src/features/public-catalog/front03Adapter.ts`
- `src/features/client-area/ClientArea.tsx`

Se houver conflito durante merge, preservar a intenção funcional dos dois lados e adaptar no ponto de composição; não substituir o módulo da Frente02 por implementação paralela no núcleo.
