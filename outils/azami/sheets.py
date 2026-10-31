# Planches d'images pour vérifier chaque animation : python3 sheets.py scene|reaction [noms...]
import asyncio, sys, io
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw
OUT = '/tmp/claude-0/-home-claude/4f21d33c-8c0c-5645-876d-39ad49a768ec/scratchpad/shots/v44s'
async def sheet(pg, url, D, out, bg, n=24):
    await pg.goto(url); await pg.wait_for_timeout(250)
    times = [round(D * k / n, 2) for k in range(n)]
    ims = []
    for t in times:
        await pg.evaluate(f"document.getAnimations().forEach(a=>{{a.pause(); a.currentTime={int(t*1000)}}})")
        await pg.wait_for_timeout(20)
        ims.append(Image.open(io.BytesIO(await pg.screenshot(omit_background=True))).convert('RGBA'))
    W = 170; cols = 8; rows = (len(ims) + cols - 1) // cols
    c = Image.new('RGBA', (W * cols, (W + 14) * rows), bg); d = ImageDraw.Draw(c)
    for k, (im, t) in enumerate(zip(ims, times)):
        x = (k % cols) * W; y = (k // cols) * (W + 14)
        c.alpha_composite(im.resize((W, W)), (x, y)); d.text((x + 4, y + W), f"{t:.2f}s", fill=(255, 255, 255, 255))
    c.save(out)
async def main(items):
    import os; os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await (await b.new_context(viewport={"width": 512, "height": 512})).new_page()
        for url, D, name in items:
            await sheet(pg, url, D, f'{OUT}/{name}.png', (83, 165, 199, 255))
        await b.close()
if __name__ == '__main__':
    kind = sys.argv[1]; names = sys.argv[2:]
    if kind == 'scene':
        from scenes import anims; base = 'http://localhost:8765/azami/v44/azami_v44_'
    else:
        from reactions import anims; base = 'http://localhost:8765/azami/v44/reactions/'
    items = [(f'{base}{a.name}_anime.svg?{id(a)}', a.D, a.name) for a in anims() if not names or a.name in names]
    asyncio.run(main(items))
