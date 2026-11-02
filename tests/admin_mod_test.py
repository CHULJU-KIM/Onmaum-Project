import asyncio, sys
from playwright.async_api import async_playwright
BASE='http://localhost:8799'; OUT='/workspace/onmaum/shots/selfdelete'; fails=[]
def check(c,m): print(('PASS ' if c else 'FAIL ')+m); c or fails.append(m)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        for w in (390,1280):
            pg=await b.new_page(viewport={'width':w,'height':900}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
            dlg=[]; pg.on('dialog', lambda d: (dlg.append(d.message), asyncio.ensure_future(d.accept())))
            await pg.goto(BASE+'/admin/?demo=1'); await pg.wait_for_timeout(800)
            await pg.click('#tabs button[data-tab=messages]')
            n=await pg.locator('#msgList .item').count()
            await pg.locator('#msgList button[data-mod=approved]').first.click(); await pg.wait_for_timeout(300)
            check('공개했어요' in await pg.inner_text('#toast'), f'[{w}] 공개 토스트')
            await pg.locator('#msgList button[data-mod=rejected]').first.click(); await pg.wait_for_timeout(300)
            check('숨겼어요' in await pg.inner_text('#toast'), f'[{w}] 숨김 토스트')
            await pg.screenshot(path=f'{OUT}/admin_review_{w}.png', full_page=True)
            await pg.locator('#msgList button[data-del]').first.click(); await pg.wait_for_timeout(400)
            check(dlg and '되돌릴 수 없어요' in dlg[-1], f'[{w}] 삭제 확인창')
            check(await pg.locator('#msgList .item').count()==n-1 or n==1, f'[{w}] 삭제 반영')
            fe=await pg.evaluate("[__onmaumFriendlyError({message:'ONMAUM_DUP'}),__onmaumFriendlyError({message:'new row violates row-level security policy for table \"messages\"'})]")
            check(all('ONMAUM' not in x and 'row-level' not in x for x in fe), f'[{w}] 오류 한국어 변환 {fe}')
            check(not errs, f'[{w}] JS 오류 없음 {errs}'); await pg.close()
        await b.close()
    print('FAILURES:',len(fails)); sys.exit(1 if fails else 0)
asyncio.run(main())
