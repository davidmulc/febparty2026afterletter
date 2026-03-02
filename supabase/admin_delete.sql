-- 1) Generate a bcrypt hash for your admin password (run once, copy output):
-- select crypt('use-a-long-random-password-here', gen_salt('bf'));
--
-- 2) Paste the resulting hash below and run this full file.

create extension if not exists pgcrypto;

create or replace function public.verify_admin_password(admin_password text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  stored_hash text := '$2a$06$nZAP1bIXhmnBuM5te6Y3r.62.uZE9QyHs/3QSvBCzAaVsjZMtNhz.';
begin
  if stored_hash = '$2a$06$nZAP1bIXhmnBuM5te6Y3r.62.uZE9QyHs/3QSvBCzAaVsjZMtNhz.' then
    return false;
  end if;

  return crypt(admin_password, stored_hash) = stored_hash;
end;
$$;

create or replace function public.delete_memory_with_password(memory_id uuid, admin_password text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.verify_admin_password(admin_password) then
    return false;
  end if;

  delete from public.memories where id = memory_id;
  return found;
end;
$$;

grant execute on function public.verify_admin_password(text) to anon;
grant execute on function public.delete_memory_with_password(uuid, text) to anon;
