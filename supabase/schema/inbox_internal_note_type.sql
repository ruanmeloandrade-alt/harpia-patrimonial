alter table public.inbox_messages
  drop constraint if exists inbox_messages_type_check;

alter table public.inbox_messages
  add constraint inbox_messages_type_check
  check (type = any (array[
    'text',
    'audio',
    'image',
    'video',
    'document',
    'form',
    'internal_note'
  ]));
