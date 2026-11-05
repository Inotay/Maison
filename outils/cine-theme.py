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
    '#54395B': '#3D6BC9', '#3A2840': '#24489A', '#2A1C15': '#17306B', '#120A14': '#102457', '#C9B7C6': '#BBD3FF',
    '#FBF3E9': '#FFFFFF', '#FAF3E8': '#FFFFFF', '#E7505A': '#48D98A', '#F7C948': '#FFC93C', '#F2C14E': '#FFC93C',
    '#4A3350': '#2E5BB8', '#E8DCE6': '#E3ECFF', '#E0CFB8': '#BBD3FF', '#2C1E31': '#1E3D85', '#241828': '#1A3A7A',
    '#A893A6': '#8FAEE8', '#140C17': '#0E1F4D', '#FF7A85': '#9FB4E0', '#FFD7DC': '#D7F7E5', '#7A5A80': '#5A82D6',
    '#4A2233': '#1E3D85', '#33233A': '#24489A', '#FFB0B8': '#A6F0BE', '#FFC0C6': '#C8F5DA', '#FF8C97': '#7BE3A9',
    '#FF5C6A': '#2FBF74', '#8E1E2A': '#22A862', '#3E2A44': '#2E4F9E', '#2A1C30': '#1E3D85', '#221626': '#17306B',
    '#1E1218': '#142A60', '#F2E6EE': '#E3ECFF', '#4A2230': '#1E3D85', '#1A1016': '#142A60', '#8A6512': '#D99A0E',
    '#D94A3D': '#48D98A', '#B83A30': '#22A862', '#3A2A20': '#1E3D85', '#4A372B': '#24489A', '#2A1C22': '#17306B',
    '#5A2B3A': '#2257B0', '#8E1E2A': '#22A862', '#E44B55': '#48D98A', '#C43A44': '#22A862',
}
HEXL = {k.lower(): v for k, v in HEX.items()}
RGBA = {  # rgba(r,g,b, a) : on garde l'opacité
    (231, 80, 90): (72, 217, 138), (42, 28, 21): (23, 48, 107), (58, 40, 64): (36, 72, 154), (18, 10, 20): (16, 36, 87),
    (74, 51, 80): (46, 91, 184), (36, 24, 40): (26, 58, 122), (26, 16, 22): (20, 42, 96), (217, 74, 61): (72, 217, 138),
    (247, 201, 72): (255, 201, 60), (10, 6, 8): (10, 24, 60), (20, 12, 23): (14, 31, 77),
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

css = '/* Généré par outils/cine-theme.py depuis styles.css : ne pas modifier à la main. */\n' + traite(src) + '\n'
open(os.path.join(racine, 'cine-theme.css'), 'w', encoding='utf-8').write(css)
print(f'cine-theme.css : {css.count(chr(10))} lignes')
