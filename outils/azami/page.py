import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await (await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1)).new_page()
        errs = []; pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        await pg.goto('http://localhost:8765/essai-v44.html'); await pg.wait_for_timeout(2500)
        print('overflow', await pg.evaluate('document.documentElement.scrollWidth'), 'broken', await pg.evaluate("[...document.images].filter(i=>!i.naturalWidth).map(i=>i.src)"), errs)
        await pg.screenshot(path='/tmp/claude-0/-home-claude/4f21d33c-8c0c-5645-876d-39ad49a768ec/scratchpad/shots/v44s/_page.png', full_page=True)
        await pg.click('#theme [data-t=brun]'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='/tmp/claude-0/-home-claude/4f21d33c-8c0c-5645-876d-39ad49a768ec/scratchpad/shots/v44s/_page_brun.png', clip={'x':0,'y':1500,'width':390,'height':900})
        await b.close()
asyncio.run(main())
