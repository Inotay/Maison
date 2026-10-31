# python3 rend.py module [noms…] : planches d'images des animations d'un module.
import asyncio, sys, importlib
sys.path.insert(0, '.')
import sheets
mod = importlib.import_module(sys.argv[1]); names = sys.argv[2:]
items = []
for a in mod.anims():
    if names and a.name not in names: continue
    base = 'http://localhost:8765/azami/v44/' + ('azami_v44_' if a.loop else 'reactions/')
    items.append((f'{base}{a.name}_anime.svg?{id(a)}', a.D, a.name))
asyncio.run(sheets.main(items))
