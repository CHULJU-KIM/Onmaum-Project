-- 온마음 프로젝트 · 1단계 스키마
-- 원칙: 방문자는 "발행(published)/승인(approved)"된 것만 읽기. 쓰기는 admin_users 에 등록된 이메일만.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- 관리자
create table public.admin_users (
  email        text primary key check (email = lower(email)),
  display_name text not null,
  created_at   timestamptz not null default now()
);

-- 로그인한 사람이 관리자인지 (RLS 우회 없이 안전하게 확인하기 위한 security definer)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_users
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------- 공통
create type public.pub_status as enum ('draft', 'published');
create type public.msg_status as enum ('pending', 'approved', 'rejected');

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' and new.status::text = 'published' and old.status::text <> 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  if tg_op = 'INSERT' and new.status::text = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------- 소식지
create table public.issues (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,               -- 예: vol4
  vol_no       int  not null unique,               -- 4
  vol_label    text not null,                      -- 제4호
  badge        text,
  date_label   text not null,                      -- 2026년 11월
  title        text not null,
  subtitle     text,
  title_en     text,
  subtitle_en  text,
  kpis         jsonb not null default '[]'::jsonb, -- [{val,label}]
  notes        jsonb not null default '[]'::jsonb, -- ["표지: ..."]
  status       public.pub_status not null default 'draft',
  published_at timestamptz,
  created_by   text default lower(auth.jwt() ->> 'email'),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.pages (
  id         uuid primary key default gen_random_uuid(),
  issue_id   uuid not null references public.issues(id) on delete cascade,
  edition    text not null default 'card' check (edition in ('card', 'original')),
  position   int  not null,
  image_path text not null,   -- 사이트 상대경로(소식지/3호/..) 또는 Storage 공개 URL
  alt        text,
  unique (issue_id, edition, position)
);

-- ---------------------------------------------------------------- 공지 · 현장 이야기
create table public.posts (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('notice', 'story')),
  title        text not null,
  body         text not null default '',
  title_en     text,
  body_en      text,
  images       jsonb not null default '[]'::jsonb,  -- ["https://.../media/posts/..jpg"]
  status       public.pub_status not null default 'draft',
  published_at timestamptz,
  created_by   text default lower(auth.jwt() ->> 'email'),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------- Onmaum Heart
create table public.hearts (
  id           uuid primary key default gen_random_uuid(),
  no           int  not null unique check (no > 0),
  name         text not null,                 -- 남긴 그대로 표기
  card_path    text,                          -- 비우면 후원인명단/heart-NN.jpg
  message      text,                          -- 후원인 한마디 (선택)
  message_en   text,
  status       public.pub_status not null default 'draft',
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------- 응원 메시지 (검토 후 공개)
create table public.messages (
  id           uuid primary key default gen_random_uuid(),
  author_name  text not null check (char_length(author_name) between 1 and 40),
  body         text not null check (char_length(body) between 1 and 500),
  status       public.msg_status not null default 'pending',
  moderated_by text,
  moderated_at timestamptz,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------- 구독자 (자리만, 2단계에서 사용)
create table public.subscribers (
  id           uuid primary key default gen_random_uuid(),
  email        text not null unique check (email = lower(email)),
  status       text not null default 'pending' check (status in ('pending', 'confirmed', 'unsubscribed')),
  token        uuid not null default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  confirmed_at timestamptz
);

-- ---------------------------------------------------------------- 변경 기록
create table public.audit_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  actor      text default lower(auth.jwt() ->> 'email'),
  action     text not null,
  table_name text not null,
  row_id     text,
  data       jsonb
);

create or replace function public.write_audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log(action, table_name, row_id, data)
  values (tg_op, tg_table_name,
          coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id', ''),
          case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['issues', 'posts', 'hearts'] loop
    execute format('create trigger %I_touch before insert or update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
  foreach t in array array['issues', 'pages', 'posts', 'hearts', 'messages', 'admin_users'] loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.write_audit()', t, t);
  end loop;
end $$;

create index on public.issues (status, vol_no desc);
create index on public.pages (issue_id, edition, position);
create index on public.posts (status, published_at desc);
create index on public.hearts (status, no);
create index on public.messages (status, created_at desc);

-- ---------------------------------------------------------------- RLS
alter table public.admin_users enable row level security;
alter table public.issues      enable row level security;
alter table public.pages       enable row level security;
alter table public.posts       enable row level security;
alter table public.hearts      enable row level security;
alter table public.messages    enable row level security;
alter table public.subscribers enable row level security;
alter table public.audit_log   enable row level security;

-- 공개 읽기: 발행된 것만 (관리자는 전부)
create policy issues_read  on public.issues  for select using (status = 'published' or public.is_admin());
create policy pages_read   on public.pages   for select using (
  public.is_admin() or exists (select 1 from public.issues i where i.id = issue_id and i.status = 'published'));
create policy posts_read   on public.posts   for select using (status = 'published' or public.is_admin());
create policy hearts_read  on public.hearts  for select using (status = 'published' or public.is_admin());
create policy messages_read on public.messages for select using (status = 'approved' or public.is_admin());

-- 관리자 쓰기
create policy issues_write  on public.issues  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy pages_write   on public.pages   for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy posts_write   on public.posts   for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy hearts_write  on public.hearts  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy messages_mod  on public.messages for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy messages_del  on public.messages for delete to authenticated using (public.is_admin());
-- 방문자 메시지 접수: 항상 '검토 대기'로만 들어감 (공개 폼은 스팸 방지 붙인 뒤 2단계에서 연결)
create policy messages_submit on public.messages for insert to anon, authenticated
  with check (status = 'pending' and moderated_by is null and moderated_at is null);

-- 관리자 명단 · 구독자 · 기록: 관리자만 읽기. admin_users 쓰기는 SQL Editor(서비스 권한)에서만.
create policy admin_users_read on public.admin_users for select to authenticated using (public.is_admin());
create policy subscribers_admin on public.subscribers for select to authenticated using (public.is_admin());
create policy audit_read on public.audit_log for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------- Storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy media_public_read on storage.objects for select using (bucket_id = 'media');
create policy media_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
create policy media_admin_update on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_admin());
create policy media_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_admin());
