# python3 zoom.py fichier.svg t1 t2 … → planche de grandes images à ces instants
import asyncio, sys, io
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw
async def main(url, times, out):
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await (await b.new_context(viewport={"width": 512, "height": 512})).new_page()
        await pg.goto(url); await pg.wait_for_timeout(250); ims = []
        for t in times:
            await pg.evaluate(f"document.getAnimations().forEach(a=>{{a.pause(); a.currentTime={int(t*1000)}}})"); await pg.wait_for_timeout(20)
            ims.append(Image.open(io.BytesIO(await pg.screenshot(omit_background=True))).convert('RGBA'))
        W = 330; cols = 4; rows = (len(ims) + cols - 1) // cols
        c = Image.new('RGBA', (W * cols, (W + 16) * rows), (83, 165, 199, 255)); d = ImageDraw.Draw(c)
        for k, (im, t) in enumerate(zip(ims, times)):
            x = (k % cols) * W; y = (k // cols) * (W + 16); c.alpha_composite(im.resize((W, W)), (x, y)); d.text((x + 4, y + W), f'{t:.2f}s', fill=(255, 255, 255, 255))
        c.save(out); await b.close()
f = sys.argv[1]; ts = [float(x) for x in sys.argv[2:]]
base = 'http://localhost:8765/azami/v44/' + f
asyncio.run(main(base + '?z', ts, '/tmp/claude-0/-home-claude/4f21d33c-8c0c-5645-876d-39ad49a768ec/scratchpad/shots/v44s/_zoom.png'))
