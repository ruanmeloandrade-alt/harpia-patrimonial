# Frente02 — Handoff de integração

Data-base: 16/09/2026
Branch de origem: `frente-02`

Este documento descreve como integrar a experiência pública e a área do cliente da Frente02 com os contratos atuais das Frentes01, 03 e 04.

## 1. Caminho recomendado — shell único

A Frente02 exporta `Front02IntegrationShell`, que recebe os ports reais e monta internamente Auth, catálogo, CRM, favoritos, dados do cliente e continuação para WhatsApp.

```tsx
import { Front02IntegrationShell } from './features/public-site';

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
```

Todos os itens opcionais têm fallback honesto:

- sem `crmIngest`, a interface não simula criação de lead;
- sem `favoritesStore`, não persiste favorito falsamente;
- sem `clientAreaDataSource`, interesses/histórico ficam em empty state;
- sem `whatsappPhone`, não existe redirecionamento externo fictício.

O shell não cria serviço pertencente a outra frente. Ele apenas compõe os ports recebidos.

## 2. Entry point de baixo nível

Para integração manual ou testes, continuam exportados:

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

Não importar implementações internas diretamente no roteador global.

## 3. Rotas públicas e encaixe com a Frente01

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

A Frente01 já possui:

- `/entrar`;
- `/cadastro`;
- `/recuperar-senha`;
- `/nova-senha`;
- `/conta` protegido por `ClientRoute`;
- `/interno/entrar` e `/interno/**`.

Integração:

1. substituir o placeholder público atual pela Frente02;
2. encaminhar `publicRouteManifest` para a experiência pública;
3. manter autenticação e rotas internas sob a Frente01;
4. preservar `ClientRoute` como guarda;
5. usar `/conta` como entrada protegida/alias para a área `/cliente`;
6. não criar outro `AuthProvider` ou outra sessão.

A Frente02 também expõe “Minha conta” no header desktop e “Área do cliente” no mobile/rodapé.

## 4. Auth — Frente01

`Front01AuthContextPort` consome:

- `user.id`;
- `user.email`;
- perfil;
- autenticação;
- tipo de conta.

`user.id` é usado somente como identidade real para favoritos e dados pessoais; a Frente02 não conhece Supabase diretamente.

```ts
const authBridge = createFront01PublicAuthBridge({
  auth,
  requestLogin: () => navigate('/entrar'),
});
```

A rota `/cadastro` já existe para criação explícita de conta.

## 5. Catálogo — Frente03

Usar:

```ts
const publicCatalogReader = createFront03PublicCatalogReader(publicCatalogService);
```

O adapter cobre:

- título/tipo/finalidade;
- cidade/bairro/condomínio;
- código/slug;
- lançamento e preço;
- estilo de vida;
- imagem/vídeo;
- opções estáveis de filtros;
- relação unidade → empreendimento-pai via `parentId` + `getByIdOrCode`.

A home possui busca real por finalidade, cidade, localização e estilo de vida. O catálogo completo acrescenta lançamento e faixa de preço.

Filtros ficam na URL e suportam refresh/compartilhamento.

## 6. CRM — Frente04

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
- visitante anônimo não recebe contato fictício.

## 7. CRM primeiro, WhatsApp depois

```ts
const continueToWhatsApp = createWhatsAppContinuation({
  phone: realHarpiaPhone,
});

const onConversion = createPublicConversionPipeline({
  capture,
  continueToWhatsApp,
});
```

O número deve ser oficial e injetado na composição a partir de configuração confiável. O schema da Frente01 prevê `organization_settings.phone`, mas o integrador deve respeitar a política de acesso dessa configuração; não expor nem inventar dado para contornar RLS.

Ordem obrigatória:

1. CRM registra;
2. somente após sucesso abre WhatsApp;
3. falha no CRM interrompe a continuação.

A função apenas abre `wa.me` com contexto preenchido; não envia mensagem automaticamente.

## 8. Captura de contato e proprietário

Visitante anônimo em CTA/retensão/interesse:

1. abre modal;
2. nome + WhatsApp obrigatórios;
3. e-mail opcional;
4. depois segue para o pipeline.

`Quero vender` e `Quero alugar` possuem formulário enxuto com estado `idle/busy/success/error` e não exibem falso sucesso.

## 9. Favoritos

```ts
const favoritesState = usePublicFavoritesBridge({
  clientId: auth.user?.id ?? null,
  catalog: publicCatalogReader,
  store: favoritesStore,
});
```

`PublicFavoritesStorePort` exige:

- `list(clientId)`;
- `add(clientId, { itemId, itemSlug })`;
- `remove(clientId, itemId)`.

Requisitos do store real:

- usuário real + imóvel real;
- autorização/RLS;
- adição/remoção idempotentes;
- sem `localStorage` definitivo.

A persistência compartilhada ainda precisa ser criada/definida no ponto apropriado da integração.

## 10. Interesses e histórico da Área do Cliente

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

A tela trata dados, loading, erro e ausência de conteúdo. Histórico que referencia imóvel pode abrir o item real pelo slug.

Não inventar histórico/interesses para demonstração.

## 11. Detalhe do imóvel

O detalhe já prevê:

- galeria;
- vídeo;
- características;
- localização/valor/status;
- empreendimento/unidade;
- favorito;
- CTA de atendimento;
- serviços relacionados reais: Investimentos, Assessoria Jurídica e Arquitetura.

## 12. Metadados, navegação e acessibilidade

Já implementado:

- título/meta description por rota;
- 404 pública;
- foco e restauração de foco;
- Escape e scroll lock em overlays;
- `aria-busy`, `aria-pressed`, `aria-modal`;
- filtros na URL;
- busca rápida da home.

## 13. Checklist após merge

- montar shell/experiência nas rotas públicas;
- preservar rotas de Auth/Internal da Frente01;
- conectar catálogo real;
- validar busca da home e catálogo com dados reais;
- validar unidade/empreendimento;
- testar URL filtrada/reload;
- conectar CRM;
- configurar WhatsApp oficial;
- testar falha CRM sem redirecionamento;
- conectar store real de favoritos;
- testar favorito deslogado/logado/removido;
- conectar dados do cliente quando disponíveis;
- testar área do cliente com/sem dados;
- testar vender/alugar sucesso/falha;
- testar captura anônima e exit-intent;
- testar overlays por teclado;
- testar desktop/mobile;
- testar 404 e refresh direto;
- executar build/typecheck no Node exigido pelo projeto;
- manter `NÃO VERIFICADO` onde não houver execução real.

## 14. Arquivos a preservar no merge

- `src/features/public-site/Front02IntegrationShell.tsx`
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

Em conflito, adaptar no ponto de composição e preservar a intenção funcional de ambas as frentes; não substituir a Frente02 por implementação paralela no núcleo.
