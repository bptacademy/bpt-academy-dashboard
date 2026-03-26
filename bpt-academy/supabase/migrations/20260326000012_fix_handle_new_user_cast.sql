-- Fix handle_new_user trigger: cast text → enum types safely
-- division_type and skill_level are enums — plain text insert fails
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role      user_role;
  v_division  division_type;
  v_skill     skill_level;
  v_div_text  text;
  v_skill_text text;
begin
  -- Role
  begin
    v_role := coalesce(new.raw_user_meta_data->>'role', 'student')::user_role;
  exception when others then
    v_role := 'student';
  end;

  -- Division (safe cast — ignore invalid values)
  v_div_text := new.raw_user_meta_data->>'division';
  begin
    if v_div_text is not null and v_div_text <> '' then
      v_division := v_div_text::division_type;
    end if;
  exception when others then
    v_division := null;
  end;

  -- Skill level (safe cast — ignore invalid values)
  v_skill_text := new.raw_user_meta_data->>'skill_level';
  begin
    if v_skill_text is not null and v_skill_text <> '' then
      v_skill := v_skill_text::skill_level;
    end if;
  exception when others then
    v_skill := null;
  end;

  insert into public.profiles (id, full_name, role, phone, division, skill_level)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    v_role,
    new.raw_user_meta_data->>'phone',
    v_division,
    v_skill
  )
  on conflict (id) do update set
    division    = coalesce(excluded.division,    profiles.division),
    skill_level = coalesce(excluded.skill_level, profiles.skill_level);

  return new;
end;
$$;
