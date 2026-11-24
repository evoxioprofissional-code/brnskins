-- =============================================================================
-- BRN Skins — dados de referência do domínio CS2 (não são dados demonstrativos)
-- =============================================================================

insert into public.categories (id, label, badge, sort_order) values
  ('rifle',  'Rifle',   'RIFLE',   1),
  ('sniper', 'Sniper',  'SNIPER',  2),
  ('pistol', 'Pistola', 'PISTOLA', 3),
  ('smg',    'SMG',     'SMG',     4),
  ('heavy',  'Pesada',  'PESADA',  5),
  ('knife',  'Faca',    'FACA',    6),
  ('gloves', 'Luvas',   'LUVAS',   7),
  ('agent',  'Agentes', 'AGENTE',  8)
on conflict (id) do nothing;

insert into public.rarities (id, name, label, color, sort_order) values
  ('consumer',      'Consumer Grade',   'Nível Consumidor', '#b0c3d9', 1),
  ('industrial',    'Industrial Grade', 'Nível Industrial', '#5e98d9', 2),
  ('milspec',       'Mil-Spec Grade',   'Nível Militar',    '#4b69ff', 3),
  ('restricted',    'Restricted',       'Restrito',         '#8847ff', 4),
  ('classified',    'Classified',       'Secreto',          '#d32ce6', 5),
  ('covert',        'Covert',           'Oculto',           '#eb4b4b', 6),
  ('extraordinary', 'Extraordinary',    'Extraordinário',   '#eb4b4b', 7),
  ('master',        'Master',           'Mestre (Agente)',  '#eb4b4b', 8),
  ('contraband',    'Contraband',       'Contrabando',      '#e4ae39', 9)
on conflict (id) do nothing;

insert into public.conditions (code, name, label, min_float, max_float) values
  ('FN', 'Factory New',    'Nova de Fábrica',    0.00, 0.07),
  ('MW', 'Minimal Wear',   'Pouco Usada',        0.07, 0.15),
  ('FT', 'Field-Tested',   'Testada em Campo',   0.15, 0.38),
  ('WW', 'Well-Worn',      'Bem Desgastada',     0.38, 0.45),
  ('BS', 'Battle-Scarred', 'Veterana de Guerra', 0.45, 1.00)
on conflict (code) do nothing;

-- Configurações iniciais (whatsapp_phone é público para montar o link wa.me)
insert into public.settings (key, value, is_public) values
  ('store',          '{"storeName":"BRN Skins","supportHours":"Todos os dias, 10h às 23h","defaultDelivery":"~1h","showSteamComparison":true}', true),
  ('whatsapp_phone', '""', true),
  ('whatsapp_texts', '{"greeting":"Olá, BRN Skins! Quero finalizar este pedido:","footer":"Aguardo o link de pagamento e o trade."}', true)
on conflict (key) do nothing;
