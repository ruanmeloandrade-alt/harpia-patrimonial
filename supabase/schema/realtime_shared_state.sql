-- Hárpia Patrimonial — sincronização operacional em tempo real.
-- Mantém CRM/Inbox e módulos da Frente05 atualizados entre sessões abertas.

alter publication supabase_realtime add table public.platform_module_state;
alter publication supabase_realtime add table public.f05_shared_storage;
