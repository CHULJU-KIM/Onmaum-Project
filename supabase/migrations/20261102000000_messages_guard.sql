-- 방문자 메시지 스팸 방지 (공개 작성 폼 연결용)
-- 관리자(승인/숨김 UPDATE)에는 영향 없음: INSERT 에만 적용
create or replace function public.messages_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.author_name := btrim(new.author_name);
  new.body := btrim(new.body);
  -- 링크 2개 이상이면 거절
  if (select count(*) from regexp_matches(new.body || ' ' || new.author_name,
        '(https?://|www\.|[a-z0-9-]+\.(com|net|org|kr|io|ru|cn|xyz|top|info|biz|co)\M)', 'gi')) >= 2 then
    raise exception 'ONMAUM_LINKS' using errcode = 'P0001';
  end if;
  -- 10분 안에 같은 본문이면 거절
  if exists (select 1 from public.messages
             where body = new.body and created_at > now() - interval '10 minutes') then
    raise exception 'ONMAUM_DUP' using errcode = 'P0001';
  end if;
  -- 전체 상한: 10분에 대기 글 20개 초과 금지
  if (select count(*) from public.messages
      where status = 'pending' and created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'ONMAUM_BUSY' using errcode = 'P0001';
  end if;
  return new;
end $$;

revoke all on function public.messages_guard() from public, anon, authenticated;

drop trigger if exists messages_guard on public.messages;
create trigger messages_guard before insert on public.messages
  for each row execute function public.messages_guard();
