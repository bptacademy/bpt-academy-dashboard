insert into academy_settings (key, value) values
  ('stripe_publishable_key', 'pk_live_51SQF2UCryzcsryG9zluIixJqTmQWDHUGXb8RHDvAXRxDj4TLl15h9GozGnrDz9T0deLT5mZwOWr4cnrB87WmyaNI00LiUT7BL5')
on conflict (key) do update set value = excluded.value, updated_at = now();
