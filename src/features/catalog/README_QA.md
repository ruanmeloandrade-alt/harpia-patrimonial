# QA local da Frente03

Os utilitários `catalogQa.ts` e `dashboardQa.ts` existem apenas para validar invariantes da própria Frente03 sem simular dados externos. Eles não substituem o QA integrado de navegador, Storage, Realtime ou CRM.

Regras:

- não persistem dados;
- não criam mocks permanentes;
- não alteram estado;
- não inferem métricas comerciais inexistentes;
- devem usar somente contratos já pertencentes à Frente03.
