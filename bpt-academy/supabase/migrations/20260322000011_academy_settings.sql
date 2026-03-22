-- Academy settings table for admin-configurable values
create table if not exists academy_settings (
  key   text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Insert default bank details (admin can update these in-app)
insert into academy_settings (key, value) values
  ('bank_account_name',   'BPT Academy Ltd'),
  ('bank_sort_code',      '20-12-34'),
  ('bank_account_number', '12345678'),
  ('bank_payment_notes',  'Please use the reference provided. Payments are confirmed within 1–2 business days.')
on conflict (key) do nothing;

-- RLS: anyone authenticated can read; only admins/coaches can write
alter table academy_settings enable row level security;

create policy "Anyone can read settings"
  on academy_settings for select using (auth.role() = 'authenticated');

create policy "Admins can update settings"
  on academy_settings for all using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'coach')
    )
  );
