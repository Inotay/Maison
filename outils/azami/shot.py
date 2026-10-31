import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await (await b.new_context(viewport={"width":860,"height":560}, device_scale_factor=2)).new_page()
        html = "<body style='margin:0;font:700 14px sans-serif'>" + "".join(
          f"<div style='display:flex;background:{bg}'>" + "".join(f"<div style='width:215px;text-align:center;color:{fg};padding:6px 0'><img src='azami/v44/var_{v}.svg' style='width:200px;height:200px'><div>{v}</div></div>" for v in 'ABEF') + "</div>"
          for bg, fg in [('#53A5C7', '#1E2F3F'), ('#4A3627', '#F7EFE3')]) + "</body>"
        await pg.goto("http://localhost:8765/"); await pg.set_content(html.replace("src='azami", "src='http://localhost:8765/azami")); await pg.wait_for_timeout(600)
        await pg.screenshot(path="../shots/variants.png", full_page=True); await b.close()
asyncio.run(main())
