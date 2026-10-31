import asyncio, sys
from playwright.async_api import async_playwright
async def main(html, out, w):
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await (await b.new_context(viewport={"width":w,"height":600})).new_page()
        await pg.goto('http://localhost:8765/'); await pg.set_content(open(html).read()); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=out, full_page=True); await b.close()
asyncio.run(main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv)>3 else 1190))
