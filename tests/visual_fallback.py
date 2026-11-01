import sys, asyncio
from playwright.async_api import async_playwright
tag=sys.argv[1]; url=sys.argv[2] if len(sys.argv)>2 else 'http://localhost:8799/index.html'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    for w in (390,768,1280):
      pg=await b.new_page(viewport={'width':w,'height':900})
      errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
      await pg.route('**/*.{mp4,mp3}', lambda r: r.abort())
      await pg.goto(url, wait_until='load'); await pg.wait_for_timeout(1500)
      await pg.add_style_tag(content='*{animation:none!important;transition:none!important} video{visibility:hidden}')
      await pg.evaluate("document.querySelectorAll('.reveal,.fade-in').forEach(e=>e.classList.add('visible','in-view','active'))")
      await pg.wait_for_timeout(300)
      h=await pg.evaluate('Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)')
      await pg.set_viewport_size({'width':w,'height':min(h,30000)}); await pg.wait_for_timeout(1200)
      await pg.screenshot(path=f'tests/shots/{tag}_{w}.png', full_page=True)
      print(tag,w,'errors:',errs)
      await pg.close()
    await b.close()
asyncio.run(main())
