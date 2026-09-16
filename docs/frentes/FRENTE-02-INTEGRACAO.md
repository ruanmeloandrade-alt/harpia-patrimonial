# Frente02 — Handoff de integração

Data-base: 16/09/2026
Branch de origem: `frente-02`
Estado da frente: em andamento — backend real disponível; montagem/QA integrado pendentes

Este documento descreve como integrar a experiência pública e a área do cliente da Frente02 com os contratos atuais das Frentes01, 03 e 04.

## 1. Caminho recomendado — experiência pública

A Frente02 exporta `Front02IntegrationShell`, que recebe os ports reais e monta internamente Auth, catálogo, CRM, favoritos, dados do cliente e continuação para WhatsApp.

```tsx
import {
  Front02IntegrationShell,
  matchesFront02PublicRoute,
} from './features/public-site';

if (matchesFront02PublicRoute(pathname)) {
  return (
    <Front02IntegrationShell
      auth={auth}
      requestLogin={() => navigate('/entrar')}
      catalogService={publicCatalogService}
      crmIngest={(event) => ingestLeadConversion(crm, event)}
      favoritesStore={favoritesStore}
      clientAreaDataSource={clientAreaDataSource}
      whatsappPhone={realHarpiaPhone}
      internalAreaHref="/interno"
    />
  );
}
```

O matcher cobre as rotas estáticas e `/imoveis/:slug`, evitando duplicação de regex no `AppRouter` da Frente01.

## 2. `/conta` protegida — caminho recomendado

A Frente01 já possui `/conta` dentro de `ClientRoute`. A Frente02 agora exporta `Front02ClientAccountShell` para substituir o conteúdo básico sem remover a guarda central.

```tsx
<ClientRoute>
  <Front02ClientAccountShell
    auth={auth}
    requestLogin={() => navigate('/entrar')}
    catalogService={publicCatalogService}
    favoritesStore={favoritesStore}
    clientAreaDataSource={clientAreaDataSource}
    onNavigate={navigate}
    onRequestService={requestService}
  />
</ClientRoute>
```

Não criar outro `AuthProvider`, outra sessão ou outra guarda de rota.

## 3. Entry point de baixo nível

Para integração manual ou testes, continuam exportados:

```ts
import {
  PublicExperience,
  ClientArea,
  createFront01PublicAuthBridge,
  createFront03PublicCatalogReader,
  createFront04ConversionHandler,
  createPublicConversionPipeline,
  createSupabaseFavoritesStore,
  createWhatsAppContinuation,
  usePublicFavoritesBridge,
  useClientAreaData,
  normalizeCatalogFilters,
  matchesFront02PublicRoute,
  publicRouteManifest,
} from './features/public-site';
```

Não importar implementações internas diretamente no roteador global quando existir export público equivalente.

## 4. Rotas públicas e Frente01

Rotas públicas da Frente02:

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
- `/cliente` como rota compatível/legada da experiência pública.

Rotas da Frente01 que permanecem sob o núcleo:

- `/entrar`;
- `/cadastro`;
- `/recuperar-senha`;
- `/nova-senha`;
- `/conta` protegido por `ClientRoute`;
- `/interno/entrar` e `/interno/**`.

Integração recomendada:

1. substituir `PublicPlaceholder` por `Front02IntegrationShell` nas rotas reconhecidas por `matchesFront02PublicRoute`;
2. manter Auth/Internal sob a Frente01;
3. montar `Front02ClientAccountShell` dentro do `ClientRoute` de `/conta`;
4. opcionalmente encaminhar `/cliente` para `/conta` no produto final, preservando compatibilidade dos links existentes;
5. não criar outro roteador de Auth.

## 5. Auth — Frente01

`Front01AuthContextPort` consome:

- `user.id`;
- `user.email`;
- perfil;
- autenticação;
- tipo de conta.

O contrato foi conferido contra o `AuthContextValue` atual da Frente01. `user.id` é a identidade real usada para dados persistentes.

```ts
const authBridge = createFront01PublicAuthBridge({
  auth,
  requestLogin: () => navigate('/entrar'),
});
```

O backend dedicado da Hárpia já está ativo. O bloqueio não é mais criação de backend/Auth; é montagem e QA real.

## 6. Favoritos — Supabase real

A Frente01 já versionou e aplicou `public.client_favorites` no Supabase da Hárpia.

Estrutura observada:

- `client_id uuid` → FK `user_profiles(id)`;
- `item_id uuid` → FK `catalog_items(id)`;
- `item_slug text`;
- PK `(client_id,item_id)`;
- RLS habilitado;
- SELECT/INSERT/DELETE limitados ao dono autenticado;
- INSERT também exige cliente ativo e item publicado.

Validações executadas pela Frente02:

- Security Advisor: 0 lints;
- RLS ativo;
- constraints confirmadas no banco;
- `anon` vê 0 linhas;
- role `authenticated` sem identidade vê 0 linhas;
- nenhum usuário/imóvel fictício foi criado.

A Frente02 fornece o adapter:

```ts
const favoritesStore = createSupabaseFavoritesStore(requireSupabase());
```

Antes disso, a Frente01 deve regenerar `src/core/supabase/database.types.ts`, pois o arquivo versionado observado ainda não contém `catalog_items`/`client_favorites`, embora os tipos atuais gerados do projeto real já contenham essas tabelas.

`createSupabaseFavoritesStore` usa:

- `list(clientId)`;
- `add(clientId, { itemId, itemSlug })`;
- `remove(clientId, itemId)`;
- chave composta idempotente;
- validação de UUID;
- nenhum `localStorage` definitivo.

A camada F02 trata loading, erro, retry e atualização do estado.

## 7. Catálogo — Frente03

Usar:

```ts
const publicCatalogReader = createFront03PublicCatalogReader(publicCatalogService);
```

O adapter cobre:

- título/tipo/finalidade;
- `typology` real quando disponível;
- cidade/bairro/condomínio;
- código/slug;
- lançamento e preço;
- estilo de vida;
- imagem/vídeo;
- opções estáveis de filtros;
- relação unidade → empreendimento-pai via `parentId` + `getByIdOrCode`.

A home possui busca real por finalidade, cidade, localização e estilo de vida. O catálogo completo acrescenta lançamento e faixa de preço.

Filtros ficam na URL e suportam refresh/compartilhamento. `normalizeCatalogFilters` rejeita valores inválidos, NaN, números negativos e lançamento fora do contrato.

## 8. CRM — Frente04

```ts
const capture = createFront04ConversionHandler({
  ingest: (event) => ingestLeadConversion(crm, event),
  getCurrentClient: () => authBridge.currentClient,
});
```

Regras:

- criar lead não envia mensagem automaticamente;
- referência do imóvel/serviço é preservada;
- origem, ação, página e metadados seguem para o CRM;
- visitante anônimo não recebe contato fictício;
- ausência de contato válido gera falha explícita.

O contrato foi conferido contra `LeadConversionEvent`/`ingestLeadConversion` atuais da Frente04.

## 9. CRM primeiro, WhatsApp depois

```ts
const continueToWhatsApp = createWhatsAppContinuation({
  phone: realHarpiaPhone,
});

const onConversion = createPublicConversionPipeline({
  capture,
  continueToWhatsApp,
});
```

Ordem obrigatória:

1. CRM registra;
2. somente após sucesso abre WhatsApp;
3. falta de contato ou falha no CRM interrompe a continuação;
4. não existe envio automático de mensagem.

O número deve ser oficial, em formato internacional com DDI.

## 10. Captura de contato e proprietário

Visitante anônimo em CTA/retensão/interesse:

1. abre modal;
2. nome + WhatsApp obrigatórios;
3. e-mail opcional;
4. depois segue para o pipeline.

`Quero vender` e `Quero alugar` possuem formulário enxuto com estado `idle/busy/success/error` e não exibem falso sucesso.

## 11. Interesses e histórico da Área do Cliente

```ts
const clientAreaData = useClientAreaData({
  clientId: auth.user?.id ?? null,
  source: clientAreaDataSource,
});
```

A fonte implementa:

```ts
interface ClientAreaDataSourcePort {
  load(clientId: string): Promise<{
    interests: ClientInterestView[];
    history: ClientHistoryView[];
  }>;
}
```

A tela trata dados, loading, erro, retry e ausência de conteúdo. Não inventar histórico/interesses.

## 12. Detalhe do imóvel

O detalhe já prevê:

- galeria;
- vídeo;
- tipologia/características;
- localização/valor/status;
- empreendimento/unidade;
- favorito;
- CTA de atendimento;
- serviços relacionados reais: Investimentos, Assessoria Jurídica e Arquitetura.

## 13. Metadados, navegação e acessibilidade

Já implementado:

- título/meta description por rota;
- 404 pública;
- foco e restauração de foco;
- Escape e scroll lock em overlays;
- `aria-busy`, `aria-pressed`, `aria-modal`;
- filtros na URL;
- busca rápida da home;
- matcher de rotas para o AppRouter.

## 14. Checklist após montagem

- regenerar `database.types.ts` da Frente01;
- montar `Front02IntegrationShell` nas rotas públicas;
- montar `Front02ClientAccountShell` em `/conta` dentro de `ClientRoute`;
- ligar client Supabase oficial ao `createSupabaseFavoritesStore`;
- conectar catálogo real;
- testar catálogo/filtros/detalhe com dados reais;
- testar favorito deslogado/logado/removido/persistido após nova sessão;
- conectar CRM;
- configurar WhatsApp oficial;
- testar falha CRM sem redirecionamento;
- conectar dados do cliente quando disponíveis;
- testar vender/alugar e retenção;
- testar overlays por teclado;
- testar desktop/mobile;
- testar 404 e refresh direto;
- executar build/typecheck no Node exigido pelo projeto;
- manter `NÃO VERIFICADO` onde não houver execução real.

## 15. Arquivos a preservar no merge

- `src/features/public-site/Front02IntegrationShell.tsx`
- `src/features/public-site/Front02ClientAccountShell.tsx`
- `src/features/public-site/PublicSiteApp.tsx`
- `src/features/public-site/PublicExperience.tsx`
- `src/features/public-site/HomeCatalogSearch.tsx`
- `src/features/public-site/index.ts`
- `src/features/public-site/routes.ts`
- `src/features/public-site/supabaseFavoritesStore.ts`
- `src/features/public-site/catalogQuery.ts`
- `src/features/public-site/conversionPipeline.ts`
- `src/features/public-site/front01AuthAdapter.ts`
- `src/features/public-site/front04ConversionAdapter.ts`
- `src/features/public-site/whatsappContinuation.ts`
- `src/features/public-site/usePublicFavoritesBridge.ts`
- `src/features/public-site/public-site.css`
- `src/features/public-site/public-experience.css`
- `src/features/public-site/public-polish.css`
- `src/features/public-catalog/contracts.ts`
- `src/features/public-catalog/front03Adapter.ts`
- `src/features/client-area/ClientArea.tsx`
- `src/features/client-area/useClientAreaData.ts`

Em conflito, adaptar no ponto de composição e preservar a intenção funcional de ambas as frentes; não substituir a Frente02 por implementação paralela no núcleo.
