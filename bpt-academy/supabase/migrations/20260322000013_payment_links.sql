insert into academy_settings (key, value) values
  ('stripe_payment_link_amateur', 'https://buy.stripe.com/bJeaEW6fN90geZM2IPffy02')
on conflict (key) do update set value = excluded.value, updated_at = now();
