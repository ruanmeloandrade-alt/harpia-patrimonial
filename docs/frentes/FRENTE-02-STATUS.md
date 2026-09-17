# Frente02 — Status final

Data-base: 17/09/2026
Branch: `frente-02`
Estado executivo: **ESCOPO PRÓPRIO CONCLUÍDO — NÃO BLOQUEAR AS DEMAIS FRENTES**

## Concluído na Frente02

- site público e páginas institucionais;
- catálogo público e detalhe de imóvel consumindo contrato da Frente03;
- busca, filtros, cidade/localização e URL de filtros;
- área do cliente, favoritos, interesses e histórico;
- integração com autenticação da Frente01 sem auth paralelo;
- captura de conversão para Frente04 com nome + WhatsApp obrigatórios;
- pipeline CRM primeiro e continuação para WhatsApp somente após lead aceito;
- confirmação visual de conversão;
- proteção contra dados obsoletos entre contas, reloads concorrentes e clique duplo em favoritos;
- manifesto/matcher único das rotas públicas;
- navegação pública sem monkey-patch global de `window.history`;
- retry real de catálogo e tratamento de rota malformada;
- zero inventário fictício no React atual da Frente02.

## Integração atual

Os arquivos funcionais finais da Frente02 foram sincronizados para a composição da Frente01. O roteador integrado usa o matcher oficial da Frente02, e a composição pública já recebe a fonte de contato/WhatsApp sem hardcode quando houver telefone operacional cadastrado.

## Validações já executadas

- QA lógico documentado com 25 asserções;
- ingestão de lead/RPC exercitada em transação descartável e revertida;
- políticas de favoritos e identidade do lead verificadas;
- `public-lead-ingest` ativo;
- `client-area-data` ativo;
- Security Advisor sem lints no recorte validado.

## Pendências que não pertencem mais à implementação da Frente02

- publicação final da aplicação React no domínio;
- `typecheck`/`build` no ambiente Node `>=24 <25`;
- QA visual desktop/mobile e E2E com dados operacionais reais;
- cadastro do telefone oficial da organização;
- existência de conta real de cliente, item publicado e atendimento real para E2E.

Essas pendências são de integração/operação/validação global e **não devem manter a Frente02 como frente de desenvolvimento aberta**.
