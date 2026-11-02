import asyncio, os, sys, json
from playwright.async_api import async_playwright
BASE = os.environ.get('BASE', 'http://localhost:8799'); OUT = '/workspace/onmaum/shots/selfdelete'
TID = os.environ['TID']; REAL = '265c627a-5ad0-4479-bbd4-d6877b6e6ded'
fails = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m); c or fails.append(m)
async def run(b, w, do_delete):
    pg = await b.new_page(viewport={'width': w, 'height': 900}); errs = []; sent = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    async def fake(route):
        sent.append(json.loads(route.request.post_data)); await route.fulfill(status=204, body='')
    await pg.route('**/rpc/submit_message', fake)
    await pg.goto(BASE + '/'); await pg.wait_for_selector(f'[data-msg-id="{TID}"]', timeout=15000)
    check(await pg.locator(f'[data-msg-id="{REAL}"]').count() == 0 and 'ZZTEST' in await pg.inner_text('#messagesList'), f'[{w}] 해시 없는 실제 글엔 삭제 링크 없음')
    check(await pg.locator('#msgForm [name=delete_pw]').count() == 1, f'[{w}] 본문 폼에 삭제용 비밀번호')
    await pg.locator('#msgForm').scroll_into_view_if_needed()
    await pg.screenshot(path=f'{OUT}/form_{w}.png')
    await pg.fill('#msgName', 'ZZTEST'); await pg.fill('#msgBody', 'zz form test'); await pg.wait_for_timeout(3100)
    await pg.click('#msgForm [type=submit]')
    check('4~20' in await pg.inner_text('#msgForm .msg-status'), f'[{w}] 비밀번호 없으면 안내')
    await pg.fill('#msgForm [name=delete_pw]', '5678'); await pg.click('#msgForm [type=submit]'); await pg.wait_for_timeout(600)
    check(sent and sent[-1].get('p_pw') == '5678' and sent[-1]['p_name'] == 'ZZTEST', f'[{w}] RPC로 전송(비번 포함)')
    check('전해졌어요' in await pg.inner_text('#msgForm .msg-status'), f'[{w}] 접수 안내')
    # heart modal
    await pg.evaluate("window.openMessageModal(1,'Test',null)")
    check(await pg.locator('#msgModal.active [name=delete_pw]').is_visible(), f'[{w}] 하트 모달에도 비밀번호')
    await pg.screenshot(path=f'{OUT}/heart_modal_{w}.png'); await pg.keyboard.press('Escape')
    card = pg.locator(f'[data-msg-id="{TID}"]'); await card.scroll_into_view_if_needed()
    await pg.screenshot(path=f'{OUT}/list_{w}.png')
    await card.locator('[data-selfdel]').click()
    await pg.fill('#msgDelModal [name=pw]', '0000'); await pg.click('#msgDelModal [type=submit]')
    await pg.wait_for_function("document.querySelector('#msgDelModal .msg-status').textContent.length>0", timeout=10000)
    check('맞지 않아요' in await pg.inner_text('#msgDelModal .msg-status'), f'[{w}] 틀린 비번 안내')
    await pg.screenshot(path=f'{OUT}/delete_wrong_{w}.png')
    if do_delete:
        await pg.fill('#msgDelModal [name=pw]', '4321'); await pg.click('#msgDelModal [type=submit]')
        await pg.wait_for_selector('.msg-gentle', timeout=10000)
        check(await card.count() == 0, f'[{w}] 맞는 비번 → 목록에서 사라짐')
        await pg.screenshot(path=f'{OUT}/delete_ok_{w}.png')
    else:
        await pg.keyboard.press('Escape')
    check(not errs, f'[{w}] JS 오류 없음 {errs}'); await pg.close()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        await run(b, 1280, False); await run(b, 390, True)
        await b.close()
    print('FAILURES:', len(fails)); sys.exit(1 if fails else 0)
asyncio.run(main())
