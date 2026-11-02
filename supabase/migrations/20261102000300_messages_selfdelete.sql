-- 글쓴이 본인 삭제(방명록식 비밀번호). 해시만 저장, 공개 읽기에서 제외
alter table public.messages add column if not exists delete_pw_hash text;
alter table public.messages add column if not exists self_deletable boolean
  generated always as (delete_pw_hash is not null) stored;

-- 열 단위 읽기 권한: 해시 열은 anon/authenticated 모두 못 읽음
revoke select on public.messages from anon, authenticated;
grant select (id, author_name, body, status, heart_no, self_deletable, moderated_by, moderated_at, created_at)
  on public.messages to anon, authenticated;

-- 직접 INSERT 금지 → 작성은 submit_message RPC로만 (해시 우회 방지)
drop policy if exists messages_submit on public.messages;
revoke insert on public.messages from anon, authenticated;

create table if not exists public.message_delete_attempts (
  message_id uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists message_delete_attempts_idx on public.message_delete_attempts (message_id, created_at);
alter table public.message_delete_attempts enable row level security;
revoke all on public.message_delete_attempts from anon, authenticated;

create or replace function public.submit_message(p_name text, p_body text, p_pw text, p_heart_no int default null)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_pw is null or char_length(p_pw) not between 4 and 20 then
    raise exception 'ONMAUM_PW' using errcode = 'P0001';
  end if;
  insert into public.messages (author_name, body, heart_no, status, delete_pw_hash)
  values (left(coalesce(p_name, ''), 40), left(coalesce(p_body, ''), 500), p_heart_no, 'pending',
          extensions.crypt(p_pw, extensions.gen_salt('bf')));
end $$;

create or replace function public.delete_own_message(p_id uuid, p_pw text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare h text;
begin
  select delete_pw_hash into h from public.messages where id = p_id;
  if h is null then return false; end if;
  if (select count(*) from public.message_delete_attempts
      where message_id = p_id and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'ONMAUM_TRIES' using errcode = 'P0001';
  end if;
  if extensions.crypt(coalesce(p_pw, ''), h) = h then
    delete from public.messages where id = p_id;
    delete from public.message_delete_attempts where message_id = p_id;
    return true;
  end if;
  insert into public.message_delete_attempts (message_id) values (p_id);
  return false;
end $$;

revoke all on function public.submit_message(text, text, text, int) from public;
revoke all on function public.delete_own_message(uuid, text) from public;
grant execute on function public.submit_message(text, text, text, int) to anon, authenticated;
grant execute on function public.delete_own_message(uuid, text) to anon, authenticated;
delete from public.message_delete_attempts where created_at < now() - interval '1 day';
