-- 자동 생성: node scripts/gen-seed.mjs  (여러 번 실행해도 안전)
begin;
insert into public.issues (slug, vol_no, vol_label, badge, date_label, title, subtitle, kpis, notes, status, published_at, created_by)
values ('vol3', 3, '제3호', '제3호 · ONMAUM FIELD LETTER', '2026년 10월', '따뜻한 한 끼, 더 밝아지는 하루', '케냐 마사이 학교에서 전해온 10월의 이야기 — 식탁에서 시작되는 변화와 엘루아나타·올레키마키 학교의 감사 손편지', '[{"val":"4개 학교+","label":"10월 현장 소식 집중 조명"},{"val":"1,006명+","label":"현장 급식 참여 아동"},{"val":"자필 편지","label":"학생·교사 감사 손편지 도착"}]'::jsonb, '["표지: 케냐 마사이 학교에서 전해온 10월의 이야기 (따뜻한 한 끼, 더 밝아지는 하루)","01 식탁에서 시작되는 변화: 잘 먹는 하루가 잘 배우는 하루로 이어지는 교실 풍경","02 현장에서 보내온 진심: 엘루아나타 종합학교 학생 조이스 O. & 교사 제이콥 레리온카 손편지","03 마음이 만나 만드는 내일: 우리의 작은 정성이 아이들의 내일을 여는 다리가 됩니다"]'::jsonb, 'published', now(), 'seed')
on conflict (slug) do nothing;
insert into public.pages (issue_id, edition, position, image_path) select id, 'card', 1, '소식지/3호/KakaoTalk_20261019_152742088_07.jpg' from public.issues where slug = 'vol3' on conflict do nothing;
insert into public.pages (issue_id, edition, position, image_path) select id, 'card', 2, '소식지/3호/KakaoTalk_20261019_152742088_06.jpg' from public.issues where slug = 'vol3' on conflict do nothing;
insert into public.pages (issue_id, edition, position, image_path) select id, 'card', 3, '소식지/3호/KakaoTalk_20261019_152742088_05.jpg' from public.issues where slug = 'vol3' on conflict do nothing;
insert into public.pages (issue_id, edition, position, image_path) select id, 'card', 4, '소식지/3호/KakaoTalk_20261019_152742088_04.jpg' from public.issues where slug = 'vol3' on conflict do nothing;
insert into public.pages (issue_id, edition, position, image_path) select id, 'original', 1, '소식지/2호/KakaoTalk_20261019_144736925.jpg' from public.issues where slug = 'vol3' on conflict do nothing;
insert into public.pages (issue_id, edition, position, image_path) select id, 'original', 2, '소식지/2호/KakaoTalk_20261019_144736925_01.jpg' from public.issues where slug = 'vol3' on conflict do nothing;
insert into public.pages (issue_id, edition, position, image_path) select id, 'original', 3, '소식지/2호/KakaoTalk_20261019_144736925_02.jpg' from public.issues where slug = 'vol3' on conflict do nothing;
insert into public.pages (issue_id, edition, position, image_path) select id, 'original', 4, '소식지/2호/KakaoTalk_20261019_144736925_03.jpg' from public.issues where slug = 'vol3' on conflict do nothing;
insert into public.issues (slug, vol_no, vol_label, badge, date_label, title, subtitle, kpis, notes, status, published_at, created_by)
values ('vol2', 2, '제2호', '제2호 · ONMAUM NEWSLETTER 02', '2026년 9월', '한 끼의 따뜻함이 아이들의 하루를 지킵니다', '케냐 마사이 지역 5개 학교 1,187명 아이들에게 매주 전해진 따뜻한 점심 급식과 투명한 후원금 사용 결산 보고', '[{"val":"5개 학교","label":"인카티·올레키마키·킬루아니 등"},{"val":"1,187명","label":"매주 점심 급식 지원 아동"},{"val":"100% 공개","label":"수입·지출 내역 투명 결산"}]'::jsonb, '["표지: 한 끼의 따뜻함이 아이들의 하루를 지킵니다 (5개 학교 · 1,187명 매주 급식)","학교별 급식 현황: 인카티(353명), 올레키마키(235명), 킬루아니(222명), 일키니에(189명), 엘루아나타(188명)","투명 재정 보고: 후원금 총 수입 286,004원 / 총 지출 281,654원 / 잔액 4,350원 상세 내역","메시지 & 후원 안내: 한 끼가 오늘을 지키고, 교육이 내일을 바꿉니다"]'::jsonb, 'published', now(), 'seed')
on conflict (slug) do nothing;
insert into public.pages (issue_id, edition, position, image_path) select id, 'card', 1, '소식지/3호/KakaoTalk_20261019_152742088_11.jpg' from public.issues where slug = 'vol2' on conflict do nothing;
insert into public.pages (issue_id, edition, position, image_path) select id, 'card', 2, '소식지/3호/KakaoTalk_20261019_152742088_10.jpg' from public.issues where slug = 'vol2' on conflict do nothing;
insert into public.pages (issue_id, edition, position, image_path) select id, 'card', 3, '소식지/3호/KakaoTalk_20261019_152742088_09.jpg' from public.issues where slug = 'vol2' on conflict do nothing;
insert into public.pages (issue_id, edition, position, image_path) select id, 'card', 4, '소식지/3호/KakaoTalk_20261019_152742088_08.jpg' from public.issues where slug = 'vol2' on conflict do nothing;
insert into public.pages (issue_id, edition, position, image_path) select id, 'original', 1, '소식지/3호/KakaoTalk_20261019_152742088_11.jpg' from public.issues where slug = 'vol2' on conflict do nothing;
insert into public.pages (issue_id, edition, position, image_path) select id, 'original', 2, '소식지/3호/KakaoTalk_20261019_152742088_10.jpg' from public.issues where slug = 'vol2' on conflict do nothing;
insert into public.pages (issue_id, edition, position, image_path) select id, 'original', 3, '소식지/3호/KakaoTalk_20261019_152742088_09.jpg' from public.issues where slug = 'vol2' on conflict do nothing;
insert into public.pages (issue_id, edition, position, image_path) select id, 'original', 4, '소식지/3호/KakaoTalk_20261019_152742088_08.jpg' from public.issues where slug = 'vol2' on conflict do nothing;
insert into public.issues (slug, vol_no, vol_label, badge, date_label, title, subtitle, kpis, notes, status, published_at, created_by)
values ('vol1', 1, '제1호', '제1호 · ONMAUM FIRST JOURNEY', '2026년 4월', '온마음의 첫걸음: 케냐 마사이 지역 첫 나눔', '5개월간 모은 소중한 마음(약 150만 원)으로 나망가 올레키마키 초등학교 250명과 마사이 마을 주민 200명에게 전한 첫 특식과 학용품', '[{"val":"450명+","label":"올레키마키 학교 & 마을 주민"},{"val":"약 150만 원","label":"5개월간 모인 첫 온마음"},{"val":"급식+학용품","label":"특식·유니폼·구제식량 전달"}]'::jsonb, '["표지: ONMAUM MAASAI FIRST JOURNEY — 2026년 4월 온마음의 설레는 첫걸음","A WARM MEAL, A FIRST STEP: 나망가 올레키마키 초등학교 약 250명 특식·학용품·유니폼 지원 (56,300 Ksh)","SHARING A MEAL WITH THE VILLAGE: 인근 마사이 마을 주민 약 200명 특식 및 구제식량 나눔 (69,300 Ksh)","ONE MEAL AT A TIME: 5개월간 모인 약 150만 원의 기적, 아이들의 내일을 여는 약속"]'::jsonb, 'published', now(), 'seed')
on conflict (slug) do nothing;
insert into public.pages (issue_id, edition, position, image_path) select id, 'card', 1, '소식지/3호/KakaoTalk_20261019_152742088_03.jpg' from public.issues where slug = 'vol1' on conflict do nothing;
insert into public.pages (issue_id, edition, position, image_path) select id, 'card', 2, '소식지/3호/KakaoTalk_20261019_152742088_02.jpg' from public.issues where slug = 'vol1' on conflict do nothing;
insert into public.pages (issue_id, edition, position, image_path) select id, 'card', 3, '소식지/3호/KakaoTalk_20261019_152742088_01.jpg' from public.issues where slug = 'vol1' on conflict do nothing;
insert into public.pages (issue_id, edition, position, image_path) select id, 'card', 4, '소식지/3호/KakaoTalk_20261019_152742088.jpg' from public.issues where slug = 'vol1' on conflict do nothing;
insert into public.pages (issue_id, edition, position, image_path) select id, 'original', 1, '소식지/1호/KakaoTalk_20261019_144051701.jpg' from public.issues where slug = 'vol1' on conflict do nothing;
insert into public.pages (issue_id, edition, position, image_path) select id, 'original', 2, '소식지/1호/KakaoTalk_20261019_144051701_02.jpg' from public.issues where slug = 'vol1' on conflict do nothing;
insert into public.pages (issue_id, edition, position, image_path) select id, 'original', 3, '소식지/1호/KakaoTalk_20261019_144051701_02 (1).jpg' from public.issues where slug = 'vol1' on conflict do nothing;
insert into public.pages (issue_id, edition, position, image_path) select id, 'original', 4, '소식지/1호/KakaoTalk_20261019_144051701_03.jpg' from public.issues where slug = 'vol1' on conflict do nothing;
insert into public.hearts (no, name, status, published_at) values (1, 'Hyunju Kim', 'published', now()) on conflict (no) do nothing;
insert into public.hearts (no, name, status, published_at) values (2, 'Chulju Kim', 'published', now()) on conflict (no) do nothing;
insert into public.hearts (no, name, status, published_at) values (3, 'Jihoon Kim', 'published', now()) on conflict (no) do nothing;
insert into public.hearts (no, name, status, published_at) values (4, 'Seohyun Kim', 'published', now()) on conflict (no) do nothing;
insert into public.hearts (no, name, status, published_at) values (5, 'Sukhui Yang', 'published', now()) on conflict (no) do nothing;
insert into public.hearts (no, name, status, published_at) values (6, 'Seyeong Jeong', 'published', now()) on conflict (no) do nothing;
insert into public.hearts (no, name, status, published_at) values (7, 'Geumsun Jang', 'published', now()) on conflict (no) do nothing;
insert into public.hearts (no, name, status, published_at) values (8, 'Yongsin Jeong', 'published', now()) on conflict (no) do nothing;
insert into public.hearts (no, name, status, published_at) values (9, 'Seumi Seo', 'published', now()) on conflict (no) do nothing;
insert into public.hearts (no, name, status, published_at) values (10, 'Jumi Lee', 'published', now()) on conflict (no) do nothing;
insert into public.hearts (no, name, status, published_at) values (11, 'Kumja Lee', 'published', now()) on conflict (no) do nothing;
insert into public.hearts (no, name, status, published_at) values (12, 'Jisang Hyun', 'published', now()) on conflict (no) do nothing;
insert into public.hearts (no, name, status, published_at) values (13, 'Donghee Kim', 'published', now()) on conflict (no) do nothing;
insert into public.hearts (no, name, status, published_at) values (14, 'Soyul Lee', 'published', now()) on conflict (no) do nothing;
insert into public.hearts (no, name, status, published_at) values (15, 'Minwon Kang', 'published', now()) on conflict (no) do nothing;
insert into public.hearts (no, name, status, published_at) values (16, 'Soyoon Ye', 'published', now()) on conflict (no) do nothing;
insert into public.hearts (no, name, status, published_at) values (17, 'Sehun Kang', 'published', now()) on conflict (no) do nothing;
insert into public.hearts (no, name, status, published_at) values (18, 'Dongmin Kim', 'published', now()) on conflict (no) do nothing;
insert into public.hearts (no, name, status, published_at) values (19, 'Jungmin Kim', 'published', now()) on conflict (no) do nothing;
insert into public.hearts (no, name, status, published_at) values (20, 'Daon Hwang', 'published', now()) on conflict (no) do nothing;
commit;
