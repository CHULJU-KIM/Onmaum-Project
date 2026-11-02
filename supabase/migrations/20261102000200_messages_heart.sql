-- 하트 카드에서 남긴 한마디: 어느 카드에서 왔는지 (선택). 카드 삭제 시 비움
alter table public.messages add column if not exists heart_no int
  references public.hearts(no) on update cascade on delete set null;

-- 스팸 방지 + 없는 카드 번호는 조용히 비움
create or replace function public.messages_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.author_name := btrim(new.author_name);
  new.body := btrim(new.body);
  if new.heart_no is not null and not exists (select 1 from public.hearts where no = new.heart_no and status = 'published') then
    new.heart_no := null;
  end if;
  if (select count(*) from regexp_matches(new.body || ' ' || new.author_name,
        '(https?://|www\.|[a-z0-9-]+\.(com|net|org|kr|io|ru|cn|xyz|top|info|biz|co)\M)', 'gi')) >= 2 then
    raise exception 'ONMAUM_LINKS' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.messages
             where body = new.body and created_at > now() - interval '10 minutes') then
    raise exception 'ONMAUM_DUP' using errcode = 'P0001';
  end if;
  if (select count(*) from public.messages
      where status = 'pending' and created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'ONMAUM_BUSY' using errcode = 'P0001';
  end if;
  return new;
end $$;

-- 텔레그램 알림에 카드 표시
create or replace function public.messages_notify()
returns trigger language plpgsql security definer set search_path = public, extensions, vault as $$
declare tok text; ids text; cid text; txt text; card text;
begin
  begin
    select decrypted_secret into tok from vault.decrypted_secrets where name = 'onmaum_telegram_token';
    select decrypted_secret into ids from vault.decrypted_secrets where name = 'onmaum_telegram_chat_ids';
    if tok is null or ids is null then return new; end if;
    if new.heart_no is not null then
      select '💛 Onmaum Heart ' || no || ' · ' || name || ' 카드에서' into card from public.hearts where no = new.heart_no;
    end if;
    txt := '💬 [온마음] 새 응원 메시지가 도착했어요' || chr(10) ||
           coalesce(card || chr(10), '') ||
           '보낸 분: ' || new.author_name || chr(10) ||
           '“' || left(new.body, 80) || case when char_length(new.body) > 80 then '…' else '' end || '”' || chr(10) ||
           '검토하기: https://withonmaum.org/admin/';
    foreach cid in array string_to_array(replace(ids, ' ', ''), ',') loop
      if cid <> '' then
        perform net.http_post(
          url := 'https://api.telegram.org/bot' || tok || '/sendMessage',
          body := jsonb_build_object('chat_id', cid, 'text', txt, 'disable_web_page_preview', true),
          headers := '{"Content-Type":"application/json"}'::jsonb);
      end if;
    end loop;
  exception when others then
    raise warning 'onmaum telegram notify skipped: %', sqlerrm;
  end;
  return new;
end $$;
revoke all on function public.messages_guard() from public, anon, authenticated;
revoke all on function public.messages_notify() from public, anon, authenticated;
