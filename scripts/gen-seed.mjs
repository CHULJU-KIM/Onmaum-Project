// 사용법: node scripts/gen-seed.mjs > supabase/seed.sql
// 현재 index.html 의 1~3호 소식지와 Onmaum Heart 1~20을 그대로 DB로 옮기는 SQL을 만듭니다.
import { extractStatic } from './extract-static.mjs';
const { issues, hearts } = extractStatic();
const q = (v) => v == null ? 'null' : "'" + String(v).replace(/'/g, "''") + "'";
const j = (v) => q(JSON.stringify(v)) + '::jsonb';
const out = ['-- 자동 생성: node scripts/gen-seed.mjs  (여러 번 실행해도 안전)', 'begin;'];
for (const it of issues) {
  const no = parseInt(it.vol.replace(/\D/g, ''), 10);
  out.push(`insert into public.issues (slug, vol_no, vol_label, badge, date_label, title, subtitle, kpis, notes, status, published_at, created_by)
values (${q(it.id)}, ${no}, ${q(it.vol)}, ${q(it.badge)}, ${q(it.date)}, ${q(it.title)}, ${q(it.subtitle)}, ${j(it.kpis)}, ${j(it.notes)}, 'published', now(), 'seed')
on conflict (slug) do nothing;`);
  for (const [edition, list] of [['card', it.pagesCard], ['original', it.pagesOriginal]]) {
    (list || []).forEach((p, i) => out.push(`insert into public.pages (issue_id, edition, position, image_path) select id, '${edition}', ${i + 1}, ${q(p)} from public.issues where slug = ${q(it.id)} on conflict do nothing;`));
  }
}
for (const [no, name] of hearts) {
  out.push(`insert into public.hearts (no, name, status, published_at) values (${no}, ${q(name)}, 'published', now()) on conflict (no) do nothing;`);
}
out.push('commit;');
console.log(out.join('\n'));
