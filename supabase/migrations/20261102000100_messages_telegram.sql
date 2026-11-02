-- 새 응원 메시지(대기) → 텔레그램 알림. 비밀값은 이 파일에 없음:
-- Vault 에 'onmaum_telegram_token'(봇 토큰), 'onmaum_telegram_chat_ids'(쉼표로 구분한 chat_id) 를 따로 넣음 (SETUP-KO.md 참고)
create extension if not exists pg_net;

create or replace function public.messages_notify()
returns trigger language plpgsql security definer set search_path = public, extensions, vault as $$
declare tok text; ids text; cid text; txt text;
begin
  begin
    select decrypted_secret into tok from vault.decrypted_secrets where name = 'onmaum_telegram_token';
    select decrypted_secret into ids from vault.decrypted_secrets where name = 'onmaum_telegram_chat_ids';
    if tok is null or ids is null then return new; end if;
    txt := '💬 [온마음] 새 응원 메시지가 도착했어요' || chr(10) ||
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
    raise warning 'onmaum telegram notify skipped: %', sqlerrm; -- 알림 실패가 글 접수를 막지 않음
  end;
  return new;
end $$;

revoke all on function public.messages_notify() from public, anon, authenticated;

drop trigger if exists messages_notify on public.messages;
create trigger messages_notify after insert on public.messages
  for each row when (new.status = 'pending') execute function public.messages_notify();
