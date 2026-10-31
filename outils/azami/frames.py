import asyncio, sys
from playwright.async_api import async_playwright
from PIL import Image
import io
async def sheet(pg, url, times, out, bg):
    await pg.goto(url); await pg.wait_for_timeout(300)
    ims=[]
    for t in times:
        await pg.evaluate(f"document.getAnimations().forEach(a=>{{a.pause(); a.currentTime={int(t*1000)}}})")
        await pg.wait_for_timeout(30)
        ims.append(Image.open(io.BytesIO(await pg.screenshot(omit_background=True))).convert('RGBA'))
    W=200; cols=6; rows=(len(ims)+cols-1)//cols
    c=Image.new('RGBA',(W*cols,(W+16)*rows),bg)
    from PIL import ImageDraw
    d=ImageDraw.Draw(c)
    for k,(im,t) in enumerate(zip(ims,times)):
        x=(k%cols)*W; y=(k//cols)*(W+16)
        c.alpha_composite(im.resize((W,W)),(x,y)); d.text((x+4,y+W),f"{t:.2f}s",fill=(255,255,255,255))
    c.save(out)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await (await b.new_context(viewport={"width":512,"height":512})).new_page()
        base='http://localhost:8765/azami/v44/'
        await sheet(pg, base+'azami_v44_repos_anime.svg', [0,1.26,2.5,2.9,3.5,4.2,4.9,6.3,6.7,7.5,9.6,11.2], '../shots/v44_repos.png', (83,165,199,255))
        await sheet(pg, base+'caresse_1_anime.svg', [0,0.14,0.42,0.7,1.0,1.3,1.6,1.9,2.05,2.2,2.35,2.5], '../shots/v44_caresse.png', (74,54,39,255))
        await b.close()
asyncio.run(main())
