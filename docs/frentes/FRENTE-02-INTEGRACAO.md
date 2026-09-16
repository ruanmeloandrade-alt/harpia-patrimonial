# Frente02 — Handoff de integração

Data-base: 16/09/2026
Branch de origem: `frente-02`

Este documento descreve como integrar a experiência pública e a área do cliente da Frente02 com os contratos atuais das Frentes01, 03 e 04.

## 1. Entry point da Frente02

Consumir a Frente02 por:

```ts
import {
  PublicExperience,
  createFront01PublicAuthBridge,
  createFront03PublicCatalogReader,
  createFront04ConversionHandler,
  createPublicConversionPipeline,
  createWhatsAppContinuation,
  usePublicFavoritesBridge,
  useClientAreaData,
  publicRouteManifest,
} from './features/public-site';
```

Não importar implementações internas da Frente02 no roteador global.

## 2. Rotas públicas e encaixe com a Frente01

Rotas da Frente02:

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

A Frente01 já possui no `AppRouter`:

- `/entrar`;
- `/cadastro`;
- `/recuperar-senha`;
- `/nova-senha`;
- `/conta` protegido por `ClientRoute`;
- `/interno/entrar` e `/interno/**`.

Integração recomendada:

1. substituir o `PublicPlaceholder` atual de `/` pela experiência da Frente02;
2. encaminhar todas as rotas do `publicRouteManifest` para `PublicExperience`;
3. manter `/entrar`, `/cadastro`, recuperação, redefinição e rotas internas sob responsabilidade da Frente01;
4. preservar o `ClientRoute` da Frente01 como guarda de autenticação;
5. usar `/conta` como entrada protegida/alias e então renderizar ou encaminhar o cliente autenticado para a área `/cliente` da Frente02;
6. não criar outro `AuthProvider`, outra sessão ou outro roteador de autenticação.

`PublicExperience` sincroniza mudanças de `history.pushState`/`replaceState` com navegação para não deixar o estado do roteador global defasado.

## 3. Auth — Frente01

A Frente01 fornece `useAuth()` com sessão, usuário, perfil e estado de autenticação.

A Frente02 fornece:

```ts
const authBridge = createFront01PublicAuthBridge({
  auth,
  requestLogin: () => navigate('/entrar'),
});
```

A rota `/cadastro` também já existe e pode ser usada pela composição quando a ação for explicitamente criar conta.

Regras:

- o adapter só considera perfil ativo do tipo `client` como cliente público;
- e-mail vem do usuário autenticado;
- nome e WhatsApp vêm do perfil real;
- usuário interno não vira cliente público por adaptação;
- não duplicar autenticação.

## 4. Catálogo — Frente03

A Frente03 fornece `PublicCatalogService` com:

- `list(filters)`;
- `getByIdOrCode(value)`;
- `getFilterOptions()`.

Usar:

```ts
const publicCatalogReader = createFront03PublicCatalogReader(publicCatalogService);
```

O adapter da Frente02 já trata:

- `name` → `title`;
- `development | unit | standalone` → rótulo público;
- `sale | rent` → `Venda | Locação`;
- cidade, bairro e condomínio;
- código → slug público;
- lançamentos;
- faixa de preço;
- `lifestyleTag`;
- mídia pública somente `image`/`video`;
- opções globais de filtro;
- relação unidade → empreendimento-pai.

Para unidades, a Frente02 resolve `parentId` pelo próprio `getByIdOrCode(parentId)` e usa o nome real do empreendimento. Não é necessário inventar ou duplicar esse dado.

A home já possui busca rápida real por finalidade, cidade, localização e estilo de vida. O catálogo completo acrescenta lançamento e faixa de preço.

Os filtros públicos são serializados na URL. Links como `/imoveis?cidade=...&estilo=...` podem ser recarregados e compartilhados mantendo a busca.

## 5. CRM — Frente04

A Frente04 fornece `LeadConversionEvent` e `ingestLeadConversion(crm, event)`.

Usar:

```ts
const capture = createFront04ConversionHandler({
  ingest: (event) => ingestLeadConversion(crm, event),
  getCurrentClient: () => authBridge.currentClient,
});
```

Regras preservadas:

- criação de lead não envia mensagem automaticamente;
- imóvel preserva referência real;
- serviço preserva interesse;
- origem, ação, página e metadados seguem para o CRM;
- visitante anônimo não recebe contato fictício.

## 6. CRM primeiro, WhatsApp depois

A Frente02 fornece a composição:

```ts
const continueToWhatsApp = createWhatsAppContinuation({
  phone: realHarpiaPhone,
});

const onConversion = createPublicConversionPipeline({
  capture,
  continueToWhatsApp,
});
```

O telefone deve vir da configuração real da organização. O schema da Frente01 já prevê `organization_settings.phone`; não hardcodar telefone fictício na Frente02.

Ordem obrigatória:

1. registrar conversão no CRM;
2. somente se a captura concluir, abrir WhatsApp com contexto;
3. se a captura falhar, não redirecionar e não perder o lead silenciosamente.

`createWhatsAppContinuation` apenas abre `wa.me` com texto preenchido. Ele não envia mensagem automaticamente.

## 7. Captura de contato anônimo

Quando um visitante anônimo aciona atendimento, retenção ou interesse em imóvel sem nome real:

1. `PublicExperience` abre o modal da Frente02;
2. exige nome e WhatsApp;
3. e-mail é opcional;
4. somente depois envia o evento ao pipeline.

Os formulários `Quero vender` e `Quero alugar` já fornecem contato completo e possuem estado real de envio, sucesso e erro. Eles não exibem falso sucesso quando a conversão não é aceita.

## 8. Favoritos

A Frente02 fornece `usePublicFavoritesBridge` e o contrato `PublicFavoritesStorePort`.

```ts
const favoritesState = usePublicFavoritesBridge({
  clientId: auth.user?.id ?? null,
  catalog: publicCatalogReader,
  store: favoritesStore,
});
```

O `favoritesStore` real deve implementar:

- `list(clientId)`;
- `add(clientId, { itemId, itemSlug })`;
- `remove(clientId, itemId)`.

Requisitos:

- identidade real + item real;
- autorização/RLS quando persistido no Supabase;
- adição idempotente;
- remoção idempotente;
- não usar `localStorage` como persistência definitiva.

O schema atual da Frente01 ainda não possui a tabela compartilhada de favoritos. Essa persistência deve ser criada/definida no ponto de integração apropriado, sem tabela paralela da Frente02.

## 9. Interesses e histórico da Área do Cliente

A Frente02 agora aceita dados reais sem exigir alteração da tela.

A fonte deve implementar:

```ts
interface ClientAreaDataSourcePort {
  load(clientId: string): Promise<{
    interests: ClientInterestView[];
    history: ClientHistoryView[];
  }>;
}
```

Uso:

```ts
const clientAreaData = useClientAreaData({
  clientId: auth.user?.id ?? null,
  source: clientAreaDataSource,
});
```

Depois:

```tsx
<PublicExperience
  auth={authBridge}
  catalog={publicCatalogReader}
  favorites={favoritesState.bridge}
  clientAreaData={clientAreaData}
  onConversion={onConversion}
/>
```

Sem fonte real, interesses e histórico permanecem em empty state. A interface também trata loading e erro.

A fonte pode ser composta a partir do CRM ou de outra camada integrada, desde que os dados estejam realmente vinculados ao `clientId` autenticado. Não criar histórico fictício para demonstração.

## 10. Metadados, navegação e acessibilidade

A Frente02 já entrega:

- `document.title` e meta description por rota;
- fallback público para rota inexistente;
- foco inicial/restauração de foco nos overlays;
- fechamento por `Escape`;
- bloqueio/restauração de scroll em modal/menu;
- estados `aria-busy`, `aria-pressed`, `aria-modal` e descrições de diálogo;
- filtros persistidos na URL;
- busca rápida na home conectada à mesma query do catálogo.

## 11. Checklist obrigatório após merge

Antes de considerar a Frente02 integrada:

- montar `PublicExperience` nas rotas públicas;
- manter `/entrar`, `/cadastro`, `/conta` e `/interno/**` sob a Frente01;
- conectar auth bridge real;
- conectar catálogo real via adapter Frente03;
- validar busca rápida da home com dados reais;
- validar empreendimento/unidade real;
- validar filtros e estilo de vida com dados reais;
- testar refresh e compartilhamento de URL filtrada;
- conectar conversões via Frente04;
- configurar pipeline CRM → WhatsApp com telefone real;
- verificar que falha no CRM impede redirecionamento externo;
- conectar store real de favoritos;
- testar favorito deslogado/logado e remoção;
- conectar fonte real de interesses/histórico quando disponível;
- testar área do cliente com e sem dados;
- testar vender/alugar em sucesso e falha;
- testar captura anônima dos CTAs;
- testar exit-intent;
- testar foco/Escape nos overlays;
- testar navegação desktop/mobile;
- testar rota inexistente;
- testar refresh em rota pública direta;
- validar títulos e descrições das rotas;
- executar build e typecheck no Node exigido pelo projeto;
- validar responsividade real;
- manter como `NÃO VERIFICADO` qualquer item não executado.

## 12. Arquivos da Frente02 que devem ser preservados no merge

- `src/features/public-site/PublicSiteApp.tsx`
- `src/features/public-site/PublicExperience.tsx`
- `src/features/public-site/HomeCatalogSearch.tsx`
- `src/features/public-site/index.ts`
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

Em conflito de merge, preservar a intenção funcional dos módulos de ambas as frentes e adaptar no ponto de composição; não substituir a Frente02 por uma implementação paralela no núcleo.
