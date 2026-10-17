# Cadastro de imóvel e ícones sociais, 17/10/2026

## Decisão e publicação

A instrução do usuário é reproduzir as oito páginas de `Harpia_Anuncie_Seu_Imovel_Paleta_Corrigida` e restaurar os quatro PNGs originais, sem recriação. O PDF substitui a antiga orientação de encaminhar o proprietário automaticamente ao WhatsApp.

- Domínio: https://harpiapatrimonial.com/
- Cadastro: https://harpiapatrimonial.com/vender/
- Publicação: branch `gh-pages`, hospedagem existente do GitHub Pages, sem GitHub Actions e sem troca de provedor.
- Ícones: commit `12b967d57d56cffcba6e34da03ab2de50d32f755`.
- Página de cadastro: commit `3f95aae0c967d73a53bf4c2047f6bb4be0a1886e`.
- `main/public/vender/` e `main/public/assets/registration/` preservam o código e os ativos da página. `/alugar/` encaminha para a mesma jornada com escolha explícita da finalidade.
- A publicação estática existente contém alterações posteriores à aplicação React. Não substituir toda a branch `gh-pages` pelo build React ao publicar esta página; atualizar apenas os arquivos revisados.

## Conteúdo e fidelidade

Entrada, identificação, descrição, endereço, previsão de valor, contato, conferência e confirmação seguem a sequência do PDF. Fotografias, marca e elementos da águia foram extraídos do arquivo fornecido. O Garamond08 completo oficial tem os mesmos contornos e métricas dos 55 caracteres presentes no PDF; as fontes e licenças estão em `assets/registration/`.

Os quatro PNGs sociais são arquivos físicos originais, sem `content:url()` e sem filtro. Os controles medem 52 px no desktop e 56 px até 760 px, com intervalo de 12 px. O enquadramento CSS compensa a margem transparente interna dos arquivos sem editar os PNGs.

## Contrato do cadastro

O formulário público chama `public-lead-ingest`, sem exigir login, com chave publicável. A resposta só produz a confirmação quando contém `ok: true` e `leadId`.

- `origin`: `captacao-proprietario`.
- `action`: `owner-property-registration`.
- Contato: nome, celular principal e e-mail opcional.
- Metadados: tipo, venda/locação, descrição, endereço, previsão de valor em BRL com comissão, segundo celular opcional, consentimento e horário.
- Limites sem truncamento silencioso: descrição 12.000 caracteres, endereço 1.500 e nome 180. A função pública v5 amplia somente os dois textos da nova ação; os demais metadados preservam o limite anterior.
- Migração `20261017230346_owner_property_registration_notes.sql`: o RPC cria uma apresentação legível em `notes` para esta origem e ação, juntamente com o lead normalizado e seu JSON legado. Os dados estruturados completos continuam em `source_metadata` e no histórico. Nenhuma nota anterior é alterada.
- O cadastro cria atendimento no CRM e não publica imóvel no catálogo. Não há redirecionamento automático para WhatsApp. O worker de automações já existente permanece condicionado às configurações da plataforma; não foram criadas regras de mensagens.

## Validação executada

- Site público: quatro ícones carregados, alinhados, tamanho 52 px e `filter:none`, conferidos no navegador.
- Cadastro público: entrada e seis etapas percorridas; obrigatórios, celular inválido, campos opcionais vazios, revisão, edição e preservação dos dados conferidos no navegador em desktop.
- Os arquivos da página, módulo de envio e política de privacidade retornaram HTTP 200.
- Endpoint real: OPTIONS 200 e POST vazio 400 com CORS correto, sem criar atendimento.
- `node scripts/test-owner-registration.mjs`: aprovado para dados completos, telefones, BRL, consentimento, identidade reservada, limites, conversões existentes, confirmação válida e falhas de rede. Os testes não fazem requisições externas.
- RPC real em transação encerrada com ROLLBACK: descrição de 12.000 e endereço de 1.500 caracteres preservados em metadados, histórico, estado do CRM e notas. Valor em formato brasileiro e segundo celular presentes; notas normalizadas e legadas iguais. Conversões de outras origens mantêm notas vazias. Registros de teste não persistiram.
- `npm run typecheck`, `npm run build` e `git diff --check`: aprovados. Aviso preexistente de bundle principal acima de 500 kB.

## Limites da verificação

Não foi enviado um cadastro fictício válido pelo endpoint público, pois isso criaria atendimento e acionaria o worker existente. A persistência foi validada pelo RPC real com rollback e o tratamento da resposta foi testado isoladamente. A tela de confirmação foi implementada a partir do PDF; não foi acionada por cadastro real durante o QA.

A adaptação móvel está implementada. O navegador desta sessão não oferece controle de viewport e bloqueou a abertura do arquivo local de verificação. Portanto, a inspeção visual de celular não é declarada concluída. O teste visual no navegador foi feito em desktop, com largura de 1363 px; a referência do PDF mede 1440 × 900.
