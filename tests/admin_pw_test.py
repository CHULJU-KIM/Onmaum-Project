import asyncio, os, sys
from playwright.async_api import async_playwright
BASE = os.environ.get('BASE', 'http://localhost:8799'); OUT = '/workspace/onmaum/shots/admin-pw'
fails = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m); c or fails.append(m)
async def run(b, w):
    pg = await b.new_page(viewport={'width': w, 'height': 900}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(BASE + '/admin/'); await pg.wait_for_selector('#pwLoginForm', state='visible')
    check(await pg.locator('#pwPassword').is_visible(), f'[{w}] 비밀번호 칸 표시')
    check(not await pg.locator('#loginForm').is_visible(), f'[{w}] 링크 로그인은 접힘')
    await pg.screenshot(path=f'{OUT}/login_{w}.png', full_page=True)
    await pg.click('#showLinkLogin')
    check(await pg.locator('#loginEmail').is_visible(), f'[{w}] 링크 로그인 펼침')
    await pg.screenshot(path=f'{OUT}/login_link_open_{w}.png', full_page=True)
    await pg.click('#showLinkLogin')
    await pg.fill('#pwEmail', 'zztest-nobody@example.com'); await pg.fill('#pwPassword', 'wrong-pass-123')
    await pg.click('#pwLoginBtn')
    await pg.wait_for_function("document.getElementById('loginMsg').className==='msg-err'", timeout=15000)
    t = await pg.inner_text('#loginMsg'); print('  msg:', t)
    check('맞지 않아요' in t, f'[{w}] 틀린 비밀번호 한국어 오류')
    await pg.screenshot(path=f'{OUT}/login_wrong_{w}.png', full_page=True)
    # demo: password panel
    await pg.goto(BASE + '/admin/?demo=1'); await pg.wait_for_timeout(800)
    await pg.click('#tabs button[data-tab=password]')
    check(await pg.locator('#pwForm').is_visible(), f'[{w}] 비밀번호 패널 표시')
    await pg.fill('#pwNew', 'short'); await pg.fill('#pwConfirm', 'short'); await pg.evaluate("document.getElementById('pwForm').requestSubmit()")
    check('8자' in await pg.inner_text('#pwMsg'), f'[{w}] 8자 미만 거절')
    await pg.fill('#pwNew', 'abcdefgh1'); await pg.fill('#pwConfirm', 'abcdefgh2'); await pg.click('#pwSave')
    check('서로 달라요' in await pg.inner_text('#pwMsg'), f'[{w}] 불일치 거절')
    await pg.screenshot(path=f'{OUT}/pw_mismatch_{w}.png', full_page=True)
    await pg.fill('#pwNew', 'abcdefgh1'); await pg.fill('#pwConfirm', 'abcdefgh1'); await pg.click('#pwSave')
    await pg.wait_for_timeout(300)
    check('저장했어요' in await pg.inner_text('#pwMsg'), f'[{w}] 저장 성공 메시지')
    await pg.screenshot(path=f'{OUT}/pw_saved_{w}.png', full_page=True)
    check(not errs, f'[{w}] JS 오류 없음 {errs}'); await pg.close()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for w in (390, 1280): await run(b, w)
        await b.close()
    print('FAILURES:', len(fails)); sys.exit(1 if fails else 0)
asyncio.run(main())
