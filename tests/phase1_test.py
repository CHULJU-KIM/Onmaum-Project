"""1단계 테스트 (Supabase 는 모의 응답으로 대체 — 이 박스엔 Docker 없음)
실행: python3 -m http.server 8799 --directory . &  python3 tests/phase1_test.py
"""
import asyncio, json, os, subprocess, sys, shutil, tempfile
from playwright.async_api import async_playwright
BASE = 'http://localhost:8799'
OUT = 'tests/shots'; os.makedirs(OUT, exist_ok=True)
fx = json.load(open('tests/fixtures.json', encoding='utf-8'))
seed = json.loads(subprocess.check_output(['node', '-e', '''
import("./scripts/extract-static.mjs").then(m=>{const {issues,hearts}=m.extractStatic();
console.log(JSON.stringify({issues:issues.map(i=>({slug:i.id,vol_no:parseInt(i.vol.replace(/\\D/g,"")),vol_label:i.vol,badge:i.badge,date_label:i.date,title:i.title,subtitle:i.subtitle,kpis:i.kpis,notes:i.notes,
 pages:[...i.pagesCard.map((p,k)=>({edition:"card",position:k+1,image_path:p})),...i.pagesOriginal.map((p,k)=>({edition:"original",position:k+1,image_path:p}))]})),
 hearts:hearts.map(([no,name])=>({no,name,card_path:null,message:null}))}))})''']))
seed['hearts'].append({'no': 21, 'name': 'Test Person', 'card_path': '후원인명단/heart-01.jpg', 'message': '작은 마음 보탭니다'})
fails = []
def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond: fails.append(msg)

async def live(b, w):
    pg = await b.new_page(viewport={'width': w, 'height': 900})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.route('**/*.{mp4,mp3}', lambda r: r.abort())
    await pg.route('**/onmaum-config.js', lambda r: r.fulfill(content_type='text/javascript', body='window.ONMAUM_CONFIG={supabaseUrl:"https://mock.supabase.co",supabaseAnonKey:"anon"};'))
    async def rest(route):
        u = route.request.url
        data = seed['issues'] if '/issues' in u else seed['hearts'] if '/hearts' in u else fx['posts'] if '/posts' in u else fx['messages']
        await route.fulfill(status=200, content_type='application/json', body=json.dumps(data), headers={'access-control-allow-origin': '*'})
    await pg.route('https://mock.supabase.co/**', rest)
    await pg.goto(BASE + '/index.html'); await pg.wait_for_timeout(1500)
    check(await pg.locator('#heartsGrid .heart-card').count() == 21, f'[live {w}] 하트 21개 (DB에서 추가된 21번 포함)')
    check(await pg.locator('#heartsGrid .heart-msg').count() == 1, f'[live {w}] 한마디가 카드 아래 표시')
    check(await pg.locator('#stories').is_visible(), f'[live {w}] 현장 이야기 섹션 표시')
    check(await pg.locator('#messages .message-card').count() == 2, f'[live {w}] 메시지 공간 = 승인 메시지 + 하트 한마디')
    check('제3호' in await pg.locator('#issueTabsContainer').inner_text(), f'[live {w}] 소식지 탭 DB 데이터로 렌더')
    check(not errs, f'[live {w}] JS 오류 없음 {errs}')
    await pg.locator('#stories').scroll_into_view_if_needed(); await pg.wait_for_timeout(300)
    await pg.screenshot(path=f'{OUT}/live_stories_{w}.png')
    await pg.locator('#hearts').scroll_into_view_if_needed(); await pg.wait_for_timeout(300)
    await pg.screenshot(path=f'{OUT}/live_hearts_{w}.png')
    await pg.close()

async def broken(b):
    pg = await b.new_page(viewport={'width': 390, 'height': 900})
    await pg.route('**/onmaum-config.js', lambda r: r.fulfill(content_type='text/javascript', body='window.ONMAUM_CONFIG={supabaseUrl:"https://mock.supabase.co",supabaseAnonKey:"anon"};'))
    await pg.route('https://mock.supabase.co/**', lambda r: r.fulfill(status=503, body='paused'))
    await pg.goto(BASE + '/index.html'); await pg.wait_for_timeout(1500)
    check(await pg.locator('#heartsGrid .heart-card').count() == 20 and await pg.locator('#stories').is_hidden(), '[휴면/오류] Supabase 실패 시 정적 데이터 그대로')
    check(await pg.locator('#messages').is_visible() and await pg.locator('#messagesEmpty').is_visible() and await pg.locator('#msgForm').is_visible(), '[메시지] 승인 글 없어도 섹션·빈 안내·작성 폼 표시')
    await pg.fill('#msgName', '봇'); await pg.fill('#msgBody', '스팸'); await pg.evaluate("document.getElementById('msgWebsite').value='x'"); await pg.click('#msgSubmit'); await pg.wait_for_timeout(300)
    check('고맙습니다' in await pg.locator('#msgStatus').inner_text(), '[메시지] 숨은 칸 채운 봇은 저장 없이 조용히 처리')
    await pg.close()

async def admin(b, w):
    pg = await b.new_page(viewport={'width': w, 'height': 900})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(BASE + '/admin/?demo=1'); await pg.wait_for_timeout(800)
    check(await pg.locator('#appView').is_visible(), f'[admin {w}] 관리 화면 표시(연습 모드)')
    await pg.screenshot(path=f'{OUT}/admin_issue_{w}.png', full_page=True)
    await pg.click('[data-tab=heart]'); await pg.fill('#hName', 'Gildong Hong'); await pg.fill('#hMsg', '아이들아 힘내!'); await pg.wait_for_timeout(900)
    check(await pg.input_value('#hNo') == '21', f'[admin {w}] 다음 하트 번호 21 자동')
    await pg.screenshot(path=f'{OUT}/admin_heart_{w}.png', full_page=True)
    await pg.click('[data-act=preview][data-kind=heart]'); await pg.wait_for_timeout(2500)
    fr = pg.frame_locator('#pvFrame')
    check(await fr.locator('#heartsGrid .heart-card').count() == 21, f'[admin {w}] 미리보기에 새 하트 반영(실제 사이트 CSS)')
    await pg.screenshot(path=f'{OUT}/admin_preview_phone_{w}.png')
    await pg.click('#pvPc'); await pg.wait_for_timeout(800)
    await pg.screenshot(path=f'{OUT}/admin_preview_pc_{w}.png')
    await pg.click('#pvClose')
    pg.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
    await pg.click('[data-act=publish][data-kind=heart]'); await pg.wait_for_timeout(1200)
    await pg.click('[data-tab=list]'); await pg.wait_for_timeout(300)
    check('Gildong Hong' in await pg.locator('#allList').inner_text(), f'[admin {w}] 발행 후 목록에 표시')
    await pg.click('[data-tab=story]'); await pg.fill('#pTitle', '테스트 이야기'); await pg.fill('#pBody', '본문')
    await pg.set_input_files('#pFiles', ['우물1호 캄텡고/KakaoTalk_20261030_170729567_07.jpg'])
    await pg.wait_for_timeout(1200)
    check(await pg.locator('#pThumbs .thumb').count() == 1, f'[admin {w}] 사진 자동 축소·썸네일')
    await pg.screenshot(path=f'{OUT}/admin_story_{w}.png', full_page=True)
    check(not errs, f'[admin {w}] JS 오류 없음 {errs}')
    await pg.close()

def bake():
    d = tempfile.mkdtemp()
    for f in ['index.html', 'onmaum-live.js', 'onmaum-config.js', 'sitemap.xml']: shutil.copy(f, d)
    os.makedirs(d + '/scripts'); shutil.copy('scripts/bake.mjs', d + '/scripts')
    data = dict(seed, **fx); json.dump(data, open(d + '/data.json', 'w'))
    subprocess.check_call(['node', d + '/scripts/bake.mjs', '--from', d + '/data.json'])
    h = open(d + '/index.html', encoding='utf-8').read()
    check('엘루아나타 학교에 새 냄비가 도착했어요' in h and '<section class="stories-section" id="stories">' in h, '[bake] 이야기가 정적 HTML에 구워짐(SEO)')
    check('"Test Person"' in h and '작은 마음 보탭니다' in h, '[bake] 하트·한마디 구워짐')
    noenv = {k: v for k, v in os.environ.items() if not k.startswith('SUPABASE')}
    open(d + '/onmaum-config.js', 'w').write('window.ONMAUM_CONFIG = { supabaseUrl: "", supabaseAnonKey: "" };\n')
    r = subprocess.run(['node', d + '/scripts/bake.mjs'], capture_output=True, text=True, env=noenv)
    check(r.returncode == 0 and '정적' in r.stdout, '[bake] 키 없으면 아무것도 안 바꾸고 통과')
    before = {f: open(f, 'rb').read() for f in ('index.html', 'sitemap.xml', 'onmaum-config.js')}
    r = subprocess.run(['node', 'scripts/bake.mjs', '--dry'], capture_output=True, text=True, env=noenv)
    check(r.returncode == 0 and all(open(f, 'rb').read() == b for f, b in before.items()), '[bake] --dry 는 파일을 안 씀 (config 값 사용)')

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for w in (390, 768, 1280):
            await live(b, w); await admin(b, w)
        await broken(b)
        await b.close()
    bake()
    print('\n실패:', len(fails)); sys.exit(1 if fails else 0)
asyncio.run(main())
