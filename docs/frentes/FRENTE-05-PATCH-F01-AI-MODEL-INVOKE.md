# F05 → F01 — hardening do `ai-model-invoke`

Data: 16/09/2026
Origem: Frente05
Destino: Frente01
Prioridade: antes do verde final de integração IA

## Motivo

O adapter server-side da F05 foi endurecido para rejeitar endpoints inseguros e redirects automáticos. O `supabase/functions/ai-model-invoke/index.ts` canônico da F01 ainda está um passo atrás desse contrato.

## Divergências observadas na F01

No estado observado em 16/09/2026:

1. `isPrivateIpv4(...)` não bloqueia CGNAT `100.64.0.0/10`.
2. `fetch(request.url, request.init)` usa comportamento padrão de redirect.
3. Uma URL pública pode responder 30x para destino interno; o executor pode seguir esse redirect automaticamente.
4. Não há timeout explícito no fetch do provedor.

## Contrato já aplicado na F05

`src/features/integrations/providerAdapters.ts` agora:

- exige HTTPS;
- bloqueia localhost/`.local`;
- bloqueia IPv4 privadas/link-local;
- bloqueia CGNAT `100.64.0.0/10`;
- bloqueia IPv6 local/privado literal;
- usa `redirect: 'manual'`;
- usa timeout de 30 segundos;
- rejeita respostas 300–399 antes de interpretar o corpo.

Teste executado: `F05_PROVIDER_ENDPOINT_SECURITY_TEST_OK`.

## Patch esperado na F01

No helper IPv4 do `ai-model-invoke`, adicionar:

```ts
if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
```

No `fetch` do provedor, usar pelo menos:

```ts
const providerResponse = await fetch(request.url, {
  ...request.init,
  redirect: 'manual',
  signal: AbortSignal.timeout(30000),
});

if (providerResponse.status >= 300 && providerResponse.status < 400) {
  return response({
    status: 'failed',
    reason: 'Redirecionamentos do provedor IA não são permitidos.',
  }, 502);
}
```

Manter a validação server-side mesmo que a UI já valide o endpoint. A UI não é fronteira de segurança.

## Status

- F05 adapter: 🟢 corrigido e testado.
- F01 `ai-model-invoke`: 🟠 aguardando absorção do hardening.
