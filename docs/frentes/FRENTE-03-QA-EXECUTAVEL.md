# Frente03 — QA executável de fechamento

Este roteiro fecha somente a Frente03 e deve ser executado na composição integrada (`frente-01`) quando o ambiente Node 24/browser estiver disponível.

## 1. Catálogo interno

- criar empreendimento em rascunho;
- criar unidade vinculada com tipologia obrigatória;
- criar imóvel avulso;
- confirmar que nenhum rascunho aparece no catálogo público;
- editar os três tipos e recarregar a sessão;
- duplicar item e confirmar geração segura de código/id;
- validar bloqueio de unidade apontando para empreendimento vendido;
- validar bloqueio de exclusão/conversão de empreendimento com unidades ativas.

## 2. Publicação e máquina de estados

- publicar empreendimento;
- publicar unidade;
- confirmar unidade pública somente com pai publicado e ativo;
- pausar empreendimento e confirmar ocultação pública das unidades sem perda de histórico;
- republicar empreendimento e confirmar retorno das unidades elegíveis;
- vender todas as unidades;
- vender empreendimento somente depois das unidades;
- confirmar estado `sold` terminal.

## 3. Mídia/Storage

- subir JPEG/PNG/WebP/GIF, MP4/WebM e PDF válidos;
- confirmar rejeição de payload/tipo fora da política;
- cancelar edição após upload ainda não persistido e confirmar limpeza do objeto;
- duplicar item com mídia compartilhada e confirmar que exclusão de uma referência não apaga objeto ainda referenciado;
- confirmar URL pública funcional para mídia persistida.

## 4. Realtime

- abrir duas sessões autenticadas com permissão de catálogo;
- alterar catálogo na sessão A;
- confirmar atualização da sessão B sem refresh manual;
- desmontar a tela/runtime e confirmar encerramento da assinatura sem canais duplicados.

## 5. Catálogo público

- confirmar listagem somente de itens elegíveis;
- confirmar filtros derivados dos dados reais;
- confirmar detalhe por item;
- confirmar relação empreendimento/unidades;
- confirmar preço do empreendimento pela menor unidade publicada com preço, usando preço próprio apenas como fallback quando não houver unidade publicada precificada;
- confirmar que `storagePath` não é exposto no contrato público.

## 6. Dashboard

- confirmar publicados elegíveis;
- confirmar publicados ocultos;
- confirmar estoque ativo sem dupla contagem de empreendimento + unidades;
- confirmar valor de estoque sem itens vendidos;
- confirmar distribuição por cidade/finalidade;
- confirmar leads, origens, próximas ações, demanda regional e interesse por produto quando o CRM fornecer referência real do catálogo;
- confirmar visitas/propostas/negociações/vendas/VGV/ticket/conversão como indisponíveis/zero enquanto não existir contrato semântico explícito para essas métricas;
- confirmar ausência de dados demonstrativos/fictícios.

## 7. Fechamento técnico

Executar na composição integrada:

```bash
npm run typecheck
npm run build
```

Critério: nenhum erro de TypeScript, import, build ou rota relacionado à Frente03.

## 8. Critério de verde

A Frente03 só pode ser marcada como 🟢 quando:

- build/typecheck conjunto passarem;
- fluxo de catálogo interno/público acima passar;
- upload real de mídia passar;
- Realtime em duas sessões passar;
- Dashboard integrado passar;
- não houver regressão de RBAC, empty states ou persistência.

Qualquer item não executado permanece `NÃO VERIFICADO` e impede verde final.
