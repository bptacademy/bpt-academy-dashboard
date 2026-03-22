-- Drop and recreate the trigger with better error handling
create or replace function handle_new_user()
returns trigger as $$
declare
  user_role_val user_role;
begin
  -- Safely parse role with fallback
  begin
    user_role_val := coalesce(new.raw_user_meta_data->>'role', 'student')::user_role;
  exception when others then
    user_role_val := 'student';
  end;

  insert into public.profiles (id, full_name, role, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    user_role_val,
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Recreate the trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
