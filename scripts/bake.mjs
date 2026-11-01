// 배포 직전 실행 (Vercel Build Command: node scripts/bake.mjs)
// Supabase 의 "발행된" 데이터를 index.html 에 직접 구워 넣어 → 검색엔진·느린 폰·Supabase 휴면 때도 내용이 보이게 합니다.
// 환경변수 SUPABASE_URL / SUPABASE_ANON_KEY 가 없으면 아무것도 바꾸지 않고 끝납니다(지금 상태 그대로 배포).
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const L = require('../onmaum-live.js');
const root = new URL('../', import.meta.url);
const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.SUPABASE_ANON_KEY || '';
const dry = process.argv.includes('--from') ? JSON.parse(readFileSync(process.argv[process.argv.indexOf('--from') + 1], 'utf8')) : null;

if (!dry && (!url || !key)) { console.log('[bake] SUPABASE 설정 없음 → 정적 파일 그대로 배포'); process.exit(0); }

async function get(path) {
  const r = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.json();
}
let data;
try {
  data = dry || {
    issues: await get('issues?select=*,pages(*)&status=eq.published&order=vol_no.desc'),
    hearts: await get('hearts?select=no,name,card_path,message,message_en&status=eq.published&order=no'),
    posts: await get('posts?select=*&status=eq.published&order=published_at.desc&limit=12'),
    messages: await get('messages?select=author_name,body,created_at&status=eq.approved&order=created_at.desc&limit=30'),
  };
} catch (e) {
  console.warn('[bake] Supabase 읽기 실패 → 정적 파일 그대로 배포:', e.message);
  process.exit(0); // 배포는 절대 막지 않음
}

const file = new URL('index.html', root);
let html = readFileSync(file, 'utf8');
const swap = (re, text) => { if (!re.test(html)) throw new Error('marker missing ' + re); html = html.replace(re, () => text); };
if (data.issues?.length) {
  swap(/\/\*NEWSLETTERS_DATA_START\*\/[\s\S]*?\/\*NEWSLETTERS_DATA_END\*\//,
    `/*NEWSLETTERS_DATA_START*/\n    const NEWSLETTERS_DATA = ${JSON.stringify(L.toIssues(data.issues), null, 2)};\n    /*NEWSLETTERS_DATA_END*/`);
}
if (data.hearts?.length) {
  swap(/\/\*HEARTS_DATA_START\*\/[\s\S]*?\/\*HEARTS_DATA_END\*\//,
    `/*HEARTS_DATA_START*/\n    const ONMAUM_HEARTS = ${JSON.stringify(L.toHearts(data.hearts))};\n    /*HEARTS_DATA_END*/`);
}
const stories = L.storiesHtml(data.posts || []);
swap(/<!--STORIES_START-->[\s\S]*?<!--STORIES_END-->/, `<!--STORIES_START-->${stories}<!--STORIES_END-->`);
if (stories) html = html.replace('<section class="stories-section" id="stories" hidden>', '<section class="stories-section" id="stories">');
const msgs = L.messagesHtml(data.messages || [], data.hearts || []);
swap(/<!--MESSAGES_START-->[\s\S]*?<!--MESSAGES_END-->/, `<!--MESSAGES_START-->${msgs}<!--MESSAGES_END-->`);
if (msgs) html = html.replace('<section class="messages-section" id="messages" hidden>', '<section class="messages-section" id="messages">');
writeFileSync(file, html);

if (url && key) {
  writeFileSync(new URL('onmaum-config.js', root),
    `window.ONMAUM_CONFIG = ${JSON.stringify({ supabaseUrl: url, supabaseAnonKey: key })};\n`);
}
// sitemap lastmod 갱신
try {
  const sm = new URL('sitemap.xml', root);
  const today = new Date().toISOString().slice(0, 10);
  writeFileSync(sm, readFileSync(sm, 'utf8').replace(/<lastmod>[^<]*<\/lastmod>/g, `<lastmod>${today}</lastmod>`));
} catch {}
console.log(`[bake] 완료: 소식지 ${data.issues?.length || 0} · 하트 ${data.hearts?.length || 0} · 이야기 ${data.posts?.length || 0} · 메시지 ${data.messages?.length || 0}`);
