# F05 → F01 — hardening do `ai-model-invoke`

Data original: 16/09/2026
Atualização: 17/09/2026
Origem: Frente05
Destino: Frente01

## Status atual

O hardening que motivou este patch já aparece implantado na versão atual da Edge Function `ai-model-invoke` do projeto Supabase.

Confirmado em 17/09/2026:

- bloqueio de CGNAT `100.64.0.0/10`;
- bloqueio de redes privadas/reservadas IPv4 e IPv6;
- resolução DNS e rejeição de destino privado;
- `redirect: 'manual'`;
- timeout explícito de 30 segundos;
- rejeição de respostas 300–399;
- credencial resolvida apenas no backend;
- autorização por usuário interno/permissões no runtime interativo.

Portanto, a lacuna original deste documento está **RESOLVIDA no backend implantado**.

## Observação de sincronização

A branch `frente-01` ainda deve absorver o snapshot/hardening atual da Frente05 conforme o PR #1 para manter código versionado e backend implantado coerentes.

Não é necessário reimplementar este patch do zero. O trabalho de integração deve preservar a versão endurecida já implantada e sincronizar o código correspondente.

## Referência histórica

O adapter F05 em `src/features/integrations/providerAdapters.ts` permanece com o mesmo contrato de segurança:

- HTTPS obrigatório;
- localhost/`.local` bloqueados;
- IPv4 privadas/link-local bloqueadas;
- CGNAT bloqueado;
- IPv6 local/privado literal bloqueado;
- redirect manual;
- timeout de 30 segundos;
- respostas 300–399 rejeitadas.

Status final deste item:

- F05 adapter: 🟢
- `ai-model-invoke` implantado: 🟢
- sincronização de branches F05 → F01: 🟠
