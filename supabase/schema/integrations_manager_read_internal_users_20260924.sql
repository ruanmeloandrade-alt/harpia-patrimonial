drop policy if exists "profile_select_integrations_manager" on public.user_profiles;
create policy "profile_select_integrations_manager"
on public.user_profiles
for select
to authenticated
using (
  account_type = 'internal'
  and private.user_has_permission((select auth.uid()), 'integrations.manage')
);
