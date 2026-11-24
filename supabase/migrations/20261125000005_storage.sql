-- =============================================================================
-- BRN Skins — Storage
-- Buckets públicos para leitura; upload/remoção apenas por administradores.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('banners', 'banners', true, 5242880,  array['image/png', 'image/jpeg', 'image/webp']),
  ('skins',   'skins',   true, 2097152,  array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "storage_public_read_brn"
  on storage.objects for select
  using (bucket_id in ('banners', 'skins'));

create policy "storage_admin_insert_brn"
  on storage.objects for insert to authenticated
  with check (bucket_id in ('banners', 'skins') and public.is_admin());

create policy "storage_admin_update_brn"
  on storage.objects for update to authenticated
  using (bucket_id in ('banners', 'skins') and public.is_admin())
  with check (bucket_id in ('banners', 'skins') and public.is_admin());

create policy "storage_admin_delete_brn"
  on storage.objects for delete to authenticated
  using (bucket_id in ('banners', 'skins') and public.is_admin());
