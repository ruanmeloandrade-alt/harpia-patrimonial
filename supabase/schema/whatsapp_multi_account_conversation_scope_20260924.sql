-- Multi-conta WhatsApp: conversa e mensagem isoladas por conta de canal.

drop index if exists public.inbox_conversations_provider_thread_uidx;

create unique index if not exists inbox_conversations_provider_account_thread_uidx
  on public.inbox_conversations(provider, channel_account_id, external_thread_id)
  where external_thread_id is not null and channel_account_id is not null;

-- A função de ingestão canônica recebe a conta de canal para impedir mistura
-- de conversas quando o mesmo contato fala com números diferentes.
-- A definição de produção foi aplicada em 2026-09-24.
