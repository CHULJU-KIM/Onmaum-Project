# 온마음 관리 페이지 연결 방법 (1단계)

> 🔒 **비밀번호·키는 채팅에 절대 붙여넣지 마세요.** 루미도 묻지 않습니다.

## 대표님이 하실 일 (약 5분)

1. **Supabase 가입** — https://supabase.com → `Start your project` → **Continue with GitHub** (CHULJU-KIM 계정)
2. **프로젝트 만들기** — `New project`
   - Name: **onmaum**
   - Database Password: `Generate a password` → 비밀번호 관리자(또는 안전한 곳)에 저장
   - Region: **Northeast Asia (Seoul)**
   - Plan: **Free** → `Create new project`
3. 루미에게 **"onmaum 만들었어"** 라고만 말해 주세요.

## 그다음 연결 (둘 중 하나)

- **A. 루미가 연결** (추천) — 대표님이 루미 화면에서 Supabase 로그인 승인만 눌러주시면, 루미가 Supabase CLI로 표·보안규칙·사진 보관함·기존 1~3호와 하트 1~20을 올리고, Vercel 연동(Supabase Integration)으로 환경변수를 넣습니다.
- **B. 직접 입력** — Supabase `Project Settings > API` 의 `Project URL` 과 `anon public` 키를
  Vercel `onmaum-project > Settings > Environment Variables` 에 넣기
  - `SUPABASE_URL` = Project URL
  - `SUPABASE_ANON_KEY` = anon public 키
  - ⚠️ `service_role` 키는 어디에도 넣지 마세요.

## 관리자 두 분 등록 (한 번만)

1. Supabase `Authentication > Users > Add user > Send invitation` → 두 분 이메일 각각 초대
2. `SQL Editor` 에서 이메일만 바꿔 실행
   ```sql
   insert into public.admin_users (email, display_name) values ('남편@이메일', '김철주');
   insert into public.admin_users (email, display_name) values ('아내@이메일', '배우자');
   ```
3. `Authentication > URL Configuration` → Site URL `https://withonmaum.org`, Redirect URL `https://withonmaum.org/admin/`

## 쓰는 법

- 휴대폰으로 **https://withonmaum.org/admin/** → 이메일 입력 → 메일의 링크 누르면 로그인
- 소식지 / 공지 / 현장 이야기 / 새 하트 중 고르고 → 👀 미리보기(폰·PC) → **발행하기**
- 1~2분 뒤 홈페이지에 반영. 영어 칸은 비워두셔도 돼요(루미가 채움).

## 선택 (나중에)

- 발행 즉시 반영·텔레그램 알림: Vercel `Deploy Hook` 주소와 텔레그램 봇 값을 **Supabase Secrets** 에만 저장 (`VERCEL_DEPLOY_HOOK_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`)
- 휴면 방지·주간 백업: GitHub 저장소 `Settings > Secrets and variables > Actions`
  - Variable `ONMAUM_SUPABASE_ENABLED` = `true`
  - Secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_DB_URL`, `BACKUP_PASSPHRASE` (백업은 암호화되어 저장 — 저장소가 공개라서)

## 연결 전에도 안전한 이유

- 키가 없으면 홈페이지는 **지금과 픽셀 단위로 똑같이** 보입니다 (정적 데이터 사용).
- Supabase가 잠들거나 오류가 나도 4초 안에 포기하고 정적 내용을 보여줍니다.
- 발행된 내용은 배포 때 HTML에 직접 구워져서 검색엔진에도 잡힙니다.

## 응원 메시지 작성 폼 (2026-11-02)
- 홈 "마음을 전하는 한마디"와 /en.html 아래에 작성 폼이 있어요. 글은 '대기'로만 저장되고, 관리자 페이지 "💬 메시지 검토"에서 공개해야 사이트에 보여요(탭 이름 옆 숫자 = 대기 글 수).
- 스팸 방지: 숨은 칸·3초 최소 작성시간·1분 재전송 제한(브라우저) + DB 트리거(`20261102000000_messages_guard.sql`): 링크 2개 이상 거절, 10분 안 같은 본문 거절, 10분에 대기 글 20개 초과 거절.
- 텔레그램 새 글 알림은 아직 없음(2단계).
