// 관리자 페이지에서 "발행" 후 호출 → (1) Vercel 재배포(정적 HTML 굽기) (2) 텔레그램 알림
// 비밀값은 모두 Supabase Secrets 에만:  VERCEL_DEPLOY_HOOK_URL, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const auth = req.headers.get('Authorization') ?? '';
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  });
  // 관리자 확인 (RLS 기준 is_admin)
  const { data: ok, error } = await sb.rpc('is_admin');
  if (error || ok !== true) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: cors });

  const body = await req.json().catch(() => ({}));
  const result: Record<string, unknown> = {};

  const hook = Deno.env.get('VERCEL_DEPLOY_HOOK_URL');
  if (hook) {
    const r = await fetch(hook, { method: 'POST' });
    result.deploy = r.ok ? 'started' : `failed ${r.status}`;
  } else result.deploy = 'not-configured';

  const tg = Deno.env.get('TELEGRAM_BOT_TOKEN'), chat = Deno.env.get('TELEGRAM_CHAT_ID');
  if (tg && chat) {
    const text = `🧡 온마음 홈페이지에 새 글이 발행됐어요\n${body.kind ?? ''} · ${body.title ?? ''}\n1~2분 뒤 반영: https://onmaum-project.vercel.app/`;
    const r = await fetch(`https://api.telegram.org/bot${tg}/sendMessage`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
    });
    result.telegram = r.ok ? 'sent' : `failed ${r.status}`;
  } else result.telegram = 'not-configured';

  return new Response(JSON.stringify(result), { headers: { ...cors, 'content-type': 'application/json' } });
});
