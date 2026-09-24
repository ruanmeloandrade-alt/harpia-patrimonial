# Consolidação de fonte da Hárpia

Data: 24/09/2026

Base da consolidação: `0c5c0736230ef5685dd46bc2438b5e6e8c1ee5b6`

Objetivo: tornar a `main` uma fonte confiável do sistema realmente operado, sem reintroduzir versões antigas de CRM, Inbox, SalesBot, automações ou homepage.

## Incorporado

1. Serviço persistente Node/Baileys em `services/whatsapp-connector`, vindo da frente F08 mais atual.
2. Schemas base e hardening de WhatsApp que já existem no banco de produção.
3. Schema da frente Meta Leads que já existe no banco de produção.
4. Código exato das Edge Functions ativas que estavam em produção e ausentes da `main`.
5. Função de diagnóstico do conector versionada no mesmo estado implantado.

## Edge Functions sincronizadas do ambiente real

ai-key-autoconfigure: versão 1, verify_jwt=true, sha256=3e7514121d4faed3ba318654d337e1224efca81c8a5c6bafe1dcf97ea98c7027
meta-lead-control: versão 2, verify_jwt=true, sha256=9d97d18e9ef34c70fdc94270e05551632cb0a155f3b750ee9464fcfe0c7c1901
meta-lead-webhook: versão 3, verify_jwt=false, sha256=0a807d8780fc451bd20beb4a049df1f12d9b9f2fe43d4027f695343e949260e8
claim-first-admin: versão 1, verify_jwt=true, sha256=3b9713c5e3ae6b82d90849a84bb6faa626dacd408aab6af265390389d249e86a
f01-bootstrap-qa: versão 13, verify_jwt=true, sha256=0c34ad06636de67e13d9abbaf9380d67a8917bd1ace5e9fa80feea1a56d61b9a
whatsapp-connector-diagnose: versão 4, verify_jwt=true, sha256=a5ee02c420e862574cb2cb3bd7984436582ed10eceb0e50bae4c7bb588a375cb

## Fora deste commit

1. Áudio da Inbox. O áudio está deliberadamente fora deste trabalho.
2. `f08-pair-bridge` e `f08-pair-page`. Esses endpoints legados continuam implantados, mas o código implantado contém segredo estático. Eles não foram copiados para Git. Devem ser aposentados ou substituídos por implementação sem segredo embutido antes de serem versionados.
3. Nenhum arquivo atual de homepage foi alterado.
4. Nenhum arquivo atual de CRM, Inbox, SalesBot ou automações da `main` foi substituído por versão de branch antiga.

## Regra para próximas frentes

Antes de alterar um módulo, usar a `main` atual como base. Para WhatsApp, considerar também `services/whatsapp-connector` como parte do sistema oficial. Mudanças de Supabase que forem aplicadas em produção devem entrar no Git no mesmo trabalho.
