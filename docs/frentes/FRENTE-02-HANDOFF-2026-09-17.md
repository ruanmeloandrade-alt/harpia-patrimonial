# Frente02 — Handoff 17/09/2026

Branch: `frente-02`

## Estado funcional

A implementação própria da Frente02 está fechada no escopo atual: site público, catálogo público via contrato da F03, área do cliente, favoritos, captação vender/alugar, retenção, conversão para CRM e continuação opcional para WhatsApp.

## Ajustes finais desta rodada

- unificado o reconhecimento de rotas públicas em `src/features/public-site/routes.ts`;
- removido monkey-patch global de `history.pushState`/`replaceState` e substituído por evento explícito da F02;
- fluxo de conversão passou a devolver aceite explícito, evitando falso sucesso quando o contato ainda precisa ser capturado;
- filtro cidade → localização alinhado entre home e catálogo;
- e-mail de captação mantido opcional, coerente com o contrato F04 que exige nome + WhatsApp;
- removido `Front02ClientAccountShell`, camada duplicada e desnecessária diante da rota `/cliente` já consumida pela integração existente;
- nenhum arquivo global/F01/F03/F04 foi alterado nesta finalização.

## Bloqueios fora da Frente02

- publicação React integrada atual ainda não é a publicação antiga da `gh-pages`;
- build/typecheck não executados nesta sessão porque o ambiente local não possui acesso de rede ao checkout e o projeto proíbe GitHub Actions;
- E2E depende de dados reais mínimos: cliente, imóvel publicado, lead/atendimento e telefone oficial.

## Não declarar como validado

- build/typecheck;
- navegador desktop/mobile;
- E2E ponta a ponta;
- WhatsApp real.

A F02 não deve criar dados fictícios nem invadir ownership de outra frente para forçar essas validações.
