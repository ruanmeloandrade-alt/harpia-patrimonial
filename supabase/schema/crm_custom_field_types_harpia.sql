-- Hárpia Patrimonial | campos personalizados do CRM
-- Amplia os tipos de campo e provisiona o conjunto inicial usado no atendimento imobiliário.

alter table public.crm_custom_fields
  drop constraint if exists crm_custom_fields_type_check;

alter table public.crm_custom_fields
  add constraint crm_custom_fields_type_check
  check (type = any (array[
    'text'::text,
    'number'::text,
    'currency'::text,
    'date'::text,
    'datetime'::text,
    'boolean'::text,
    'select'::text,
    'multiselect'::text
  ]));

insert into public.crm_custom_fields (id,name,type,options,active,created_at,updated_at)
values
  ('field_harpia_tipo_imovel','Tipo de imóvel','select','["Apartamento","Casa","Cobertura","Terreno","Comercial","Rural","Outro"]'::jsonb,true,now(),now()),
  ('field_harpia_finalidade','Finalidade','select','["Compra","Aluguel","Investimento"]'::jsonb,true,now(),now()),
  ('field_harpia_faixa_investimento','Faixa de investimento','currency','[]'::jsonb,true,now(),now()),
  ('field_harpia_regiao_interesse','Região de interesse','text','[]'::jsonb,true,now(),now()),
  ('field_harpia_quartos','Quartos desejados','number','[]'::jsonb,true,now(),now()),
  ('field_harpia_visita','Data e hora preferida para visita','datetime','[]'::jsonb,true,now(),now()),
  ('field_harpia_financiamento','Financiamento aprovado','boolean','[]'::jsonb,true,now(),now())
on conflict (id) do update
set name=excluded.name,
    type=excluded.type,
    options=excluded.options,
    active=true,
    updated_at=now();
