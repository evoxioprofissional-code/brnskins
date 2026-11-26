-- Zeus x27 (equipamento) ganha categoria própria
insert into public.categories (id, label, badge, sort_order) values
  ('equipment', 'Equipamento', 'EQUIP.', 15)
on conflict (id) do nothing;
