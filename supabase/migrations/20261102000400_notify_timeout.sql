-- 텔레그램 알림: 연결 지연 시 5초 타임아웃으로 누락되던 문제 → 20초로 늘림
CREATE OR REPLACE FUNCTION public.messages_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'vault'
AS $function$
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
          headers := '{"Content-Type":"application/json"}'::jsonb,
          timeout_milliseconds := 20000);
      end if;
    end loop;
  exception when others then
    raise warning 'onmaum telegram notify skipped: %', sqlerrm;
  end;
  return new;
end $function$;
revoke all on function public.messages_notify() from public, anon, authenticated;
