#!/usr/bin/env python3
"""Fabrique cine-theme.css : le ciné de Maison, recoloré pour l'app Ciné Azami (cine.html), à partir de styles.css.
Chaque règle de styles.css qui contient une couleur de la « salle obscure » (prune, rouge, brun) est recopiée,
préfixée par html.cine-seul, avec les couleurs bleues de Ciné Azami. À relancer après chaque changement de
styles.css (le faire avant sw-manifest.py) : python3 outils/cine-theme.py"""
import os, re
racine = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(racine, 'styles.css'), encoding='utf-8').read()

# prune / rouge / brun de la salle  ->  bleu nuit, vert envie, jaune pop-corn
HEX = {
    '#54395B': '#6CBBFA', '#3A2840': '#2E8EE6', '#2A1C15': '#17306B', '#120A14': '#1F72C8', '#C9B7C6': '#E4F2FF',
    '#FBF3E9': '#FFFFFF', '#FAF3E8': '#FFFFFF', '#E7505A': '#3CD38A', '#F7C948': '#FFC83D', '#F2C14E': '#FFC83D',
    '#4A3350': '#4FAEF7', '#E8DCE6': '#EAF4FF', '#E0CFB8': '#E4F2FF', '#2C1E31': '#2885DB', '#241828': '#45ABF7',
    '#A893A6': '#ADD3F5', '#140C17': '#2479D3', '#FF7A85': '#B9DAF6', '#FFD7DC': '#DAF6E8', '#7A5A80': '#5FA4EC',
    '#4A2233': '#2885DB', '#33233A': '#2E8EE6', '#FFB0B8': '#A8EDC8', '#FFC0C6': '#CBF3DD', '#FF8C97': '#7BE0AE',
    '#FF5C6A': '#25B873', '#8E1E2A': '#1FA466', '#3E2A44': '#2E8EE6', '#2A1C30': '#2885DB', '#221626': '#2479D3',
    '#1E1218': '#2885DB', '#F2E6EE': '#EAF4FF', '#4A2230': '#2885DB', '#1A1016': '#2885DB', '#8A6512': '#E0A21A',
    '#D94A3D': '#3CD38A', '#B83A30': '#1FA466', '#3A2A20': '#2885DB', '#4A372B': '#2E8EE6', '#2A1C22': '#2479D3',
    '#5A2B3A': '#6CC4FF', '#8E1E2A': '#1FA466', '#E44B55': '#3CD38A', '#C43A44': '#1FA466',
}
HEXL = {k.lower(): v for k, v in HEX.items()}
RGBA = {  # rgba(r,g,b, a) : on garde l'opacité
    (231, 80, 90): (72, 217, 138), (42, 28, 21): (31, 114, 200), (58, 40, 64): (40, 133, 219), (18, 10, 20): (31, 114, 200),
    (74, 51, 80): (46, 142, 230), (36, 24, 40): (40, 133, 219), (26, 16, 22): (31, 114, 200), (217, 74, 61): (72, 217, 138),
    (247, 201, 72): (255, 201, 60), (10, 6, 8): (15, 53, 112), (20, 12, 23): (31, 114, 200),
}

def recolor(t):
    t2 = re.sub(r'#[0-9A-Fa-f]{6}\b', lambda m: HEXL.get(m.group(0).lower(), m.group(0)), t)
    def rg(m):
        r, g, b = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if (r, g, b) in RGBA: nr, ng, nb = RGBA[(r, g, b)]; return f'rgba({nr}, {ng}, {nb},{m.group(4)})'
        return m.group(0)
    return re.sub(r'rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,([^)]*)\)', rg, t2)

def prefixe(sel):
    out = []
    for s in sel.split(','):
        s = s.strip()
        if not s: continue
        if s in (':root', 'html'): out.append('html.cine-seul'); continue
        if s.startswith('html'):   # html[data-theme…] .x : on ajoute la classe à html
            out.append('html.cine-seul' + s[4:]); continue
        if s.startswith(':root'): out.append('html.cine-seul' + s[5:]); continue
        out.append('html.cine-seul ' + s)
    return ', '.join(out)

def blocs(t):
    """Découpe en (sélecteur, corps) au premier niveau, en gardant les @media imbriqués."""
    i, n = 0, len(t)
    while i < n:
        j = t.find('{', i)
        if j < 0: break
        sel = t[i:j].strip()
        d, k = 1, j + 1
        while k < n and d:
            if t[k] == '{': d += 1
            elif t[k] == '}': d -= 1
            k += 1
        yield sel, t[j + 1:k - 1]
        i = k

def traite(t):
    t = re.sub(r'/\*.*?\*/', '', t, flags=re.S)
    out = []
    for sel, corps in blocs(t):
        if sel.startswith('@font-face') or sel.startswith('@keyframes') or sel.startswith('@import'): continue
        if sel.startswith('@'):
            inner = traite(corps)
            if inner: out.append(f'{sel} {{\n{inner}\n}}')
            continue
        # seulement les déclarations qui changent de couleur : le reste (opacité, taille…) garde ses règles d'origine
        decl = [d for d in re.split(r';(?![^(]*\))', corps) if d.strip()]
        garde = [recolor(d).strip() for d in decl if recolor(d) != d or d.strip().startswith('--') and recolor(d) != d]
        if garde: out.append(f'{prefixe(sel)} {{ {"; ".join(garde)}; }}')
    return '\n'.join(out)

# le brun le plus sombre de la salle sert à la fois de fond et d'encre : bleu profond en fond, bleu encre en texte
def encre(t):
    return re.sub(r'([\w-]+)\s*:\s*([^;{}]*?)#17306B', lambda m: f"{m.group(1)}: {m.group(2)}{'#2479D3' if re.match(r'^(background(-color)?|--surface[\w-]*|--seal[\w-]*|--card|--plum)$', m.group(1)) else '#0F3570'}", t)
css = '/* Généré par outils/cine-theme.py depuis styles.css : ne pas modifier à la main. */\n' + encre(traite(src)) + '\n'
open(os.path.join(racine, 'cine-theme.css'), 'w', encoding='utf-8').write(css)
print(f'cine-theme.css : {css.count(chr(10))} lignes')
