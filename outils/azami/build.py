# Azami V4.4 : rig V4.1 conservé (même dessin), mouvement continu à 60 i/s, timing vif, yeux kawaii.
import os
OUT = '/home/claude/maison/azami/v44'
os.makedirs(OUT + '/statiques', exist_ok=True)
SNAP = 'cubic-bezier(.34,1.56,.64,1)'     # arrivée vive avec léger dépassement
SOFT = 'cubic-bezier(.45,0,.55,1)'        # va-et-vient doux
ANT = 'cubic-bezier(.5,0,.75,0)'          # départ qui prend son élan
OUTQ = 'cubic-bezier(.2,.8,.3,1)'         # arrivée amortie
LIN = 'linear'

def kf(name, D, pts):
    """pts : [(t_secondes, 'déclarations css', easing vers le point suivant)]"""
    out = []
    for t, decl, ease in pts:
        p = round(t / D * 100, 3)
        out.append(f"{p}%{{{decl};animation-timing-function:{ease}}}")
    return f"@keyframes {name}{{{''.join(out)}}}"

def rot(a): return f"transform:rotate({a}deg)"
def tr(x=0, y=0, r=0, sx=1, sy=1): return f"transform:translate({x}px,{y}px) rotate({r}deg) scale({sx},{sy})"

ORIG = {  # pivots (transform-box: view-box)
 'character': '255px 402px', 'core': '268px 330px', 'neck': '196px 300px', 'head': '178px 290px',
 'ear-left': '112px 170px', 'ear-right': '231px 170px', 'tail': '339px 296px', 'tail-tip': '377px 214px',
 'eye-l': '146px 211px', 'eye-r': '207px 211px', 'pupils-l': '146px 211px', 'pupils-r': '207px 211px',
 'mouth-open': '177px 262px', 'blush': '177px 245px', 'front-near': '210px 312px', 'front-far': '210px 312px',
 'whiskers': '177px 262px',
}

def drawing(extra_top='', extra_end=''):
    eye = lambda cx, side: f'''<g id="eye-{side}" class="eye"><g transform="translate({cx} 211)">
      <g id="pupils-{side}"><ellipse rx="23" ry="26" fill="#78C8F0"/><ellipse cx="1" cy="4" rx="16" ry="19" fill="#163C5C"/>
      <ellipse cx="0" cy="12" rx="12" ry="6" fill="#4E9FCF" opacity=".55"/><circle cx="-6" cy="-9" r="8" fill="#FFFFFF"/><circle cx="8" cy="8" r="3.6" fill="#FFFFFF"/><circle cx="-11" cy="5" r="1.8" fill="#FFFFFF" opacity=".9"/></g></g></g>'''
    return f'''<g id="ground-shadow"><ellipse cx="252" cy="402" rx="140" ry="16" fill="#39201E" opacity=".12"/></g>
<g id="character">
  <g id="tail">
    <path d="M334 302 C363 286 384 250 377 212" stroke="#39201E" stroke-width="27" stroke-linecap="round" fill="none"/>
    <path d="M336 302 C365 279 379 251 374 226" stroke="#6B403A" stroke-width="4" stroke-linecap="round" fill="none" opacity=".28"/>
    <g id="tail-tip"><path d="M377 213 C370 180 401 171 414 195" stroke="#39201E" stroke-width="27" stroke-linecap="round" fill="none"/></g>
  </g>
  <g id="back-far"><path d="M320 313 Q314 343 322 376" stroke="#DFC49F" stroke-width="26" fill="none" stroke-linecap="round"/><ellipse cx="324" cy="384" rx="19" ry="14" fill="#39201E"/></g>
  <g id="front-far"><path d="M210 309 Q198 344 205 377" stroke="#E6CCA7" stroke-width="27" fill="none" stroke-linecap="round"/><ellipse cx="205" cy="385" rx="19" ry="13" fill="#39201E"/></g>
  <g id="core">
    <ellipse cx="267" cy="297" rx="96" ry="61" fill="#F4DBB4"/>
    <ellipse cx="252" cy="322" rx="71" ry="31" fill="#FFF2D9" opacity=".78"/>
    <ellipse cx="206" cy="296" rx="37" ry="51" transform="rotate(-12 206 296)" fill="#F4DBB4"/>
    <path d="M308 246 Q328 274 332 300" stroke="#F9E4C3" stroke-width="6" opacity=".8" stroke-linecap="round"/>
  </g>
  <g id="back-near"><path d="M324 313 Q332 342 335 377" stroke="#F4DBB4" stroke-width="29" fill="none" stroke-linecap="round"/><ellipse cx="337" cy="384" rx="21" ry="15" fill="#39201E"/></g>
  <g id="neck"><ellipse cx="196" cy="276" rx="39" ry="51" transform="rotate(-10 196 276)" fill="#F4DBB4"/></g>
  <g id="head">
    <g id="ear-left"><path d="M130 178 Q102 124 89 110 Q78 99 81 127 L92 206Z" fill="#39201E"/><path d="M112 175 Q98 145 92 135 L98 181Z" fill="#F2A5AF"/></g>
    <g id="ear-right"><path d="M206 177 Q219 129 239 108 Q250 100 248 131 L253 196Z" fill="#39201E"/><path d="M220 174 Q235 146 241 133 L242 176Z" fill="#F2A5AF"/></g>
    <ellipse cx="176" cy="220" rx="85" ry="87" fill="#F4DBB4"/>
    <path d="M107 220 Q110 184 147 181 Q166 179 174 182 Q194 175 213 183 Q245 190 244 226 Q241 276 179 280 Q114 280 107 237 Q106 229 107 220Z" fill="#5A3A31"/>
    <g id="blush"><ellipse cx="124" cy="246" rx="13" ry="7.5" fill="#F48FA0" opacity=".55"/><ellipse cx="230" cy="246" rx="13" ry="7.5" fill="#F48FA0" opacity=".55"/></g>
    {eye(146, 'l')}
    {eye(207, 'r')}
    <g id="eyes-blink" opacity="0"><path d="M126 213 Q146 219 166 213 M187 213 Q207 219 228 213" stroke="#FFF2D9" stroke-width="7" stroke-linecap="round" fill="none"/></g>
    <g id="eyes-happy" opacity="0"><path d="M127 218 Q146 194 165 218 M188 218 Q207 194 226 218" stroke="#FFF2D9" stroke-width="7.5" stroke-linecap="round" fill="none"/></g>
    <ellipse cx="177" cy="257" rx="28" ry="17" fill="#66403B"/>
    <path d="M167 248 Q177 241 187 248 Q184 256 177 258 Q170 256 167 248Z" fill="#F2A5AF"/>
    <g id="mouth-smile" stroke="#F2A5AF" stroke-width="3.8" stroke-linecap="round" fill="none"><path d="M177 257 V262 M177 262 Q169 272 161 264 M177 262 Q185 272 193 264"/></g>
    <g id="mouth-open" opacity="0"><ellipse cx="177" cy="268" rx="11" ry="13" fill="#8F4357"/><path d="M170 274 Q177 266 184 274 Q177 281 170 274Z" fill="#F6A2B0"/></g>
    <g id="whiskers" stroke="#FFF2D9" stroke-width="4" stroke-linecap="round" fill="none"><path d="M131 260 Q109 251 86 250 M134 270 Q111 268 91 278 M223 261 Q242 250 263 249 M221 271 Q241 270 263 279"/></g>
  </g>
  <g id="front-near"><path d="M211 309 Q203 343 215 375" stroke="#DFC49F" stroke-width="35" fill="none" stroke-linecap="round"/><path d="M211 309 Q203 343 215 375" stroke="#F4DBB4" stroke-width="29" fill="none" stroke-linecap="round"/><ellipse cx="215" cy="385" rx="21" ry="16" fill="#39201E"/><path d="M209 389 L209 394 M220 389 L220 394" stroke="#F2C8A5" stroke-width="2" opacity=".56"/></g>
</g>
{extra_end}'''

def svg(title, desc, css, extra_end='', anim=True):
    base = '*{animation-fill-mode:both}\n' + ''.join(f'#{k}{{transform-box:view-box;transform-origin:{v}}}' for k, v in ORIG.items())
    rm = '@media(prefers-reduced-motion:reduce){*{animation:none!important}}'
    style = base + '\n' + (css + '\n' + rm if anim else '')
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="{title}">
<title>{title}</title><desc>{desc}</desc>
<style><![CDATA[
{style}
]]></style>
{drawing(extra_end=extra_end)}
</svg>
'''

# ---------------------------------------------------------------- Repos (12 s, boucle)
D = 12
A = lambda sel, name, dur=D, it='infinite': f"#{sel}{{animation:{name} {dur}s {it}}}"
css = []
# respiration : cycle de 3 s (4 par boucle), le ventre se gonfle, la tête suit d'un rien
css.append(A('core', 'breathe', 3)); css.append(kf('breathe', 3, [(0, tr(), SOFT), (1.4, tr(0, -1.5, 0, 1.018, 1.03), SOFT), (3, tr(), SOFT)]))
css.append(A('neck', 'breathe-neck', 3)); css.append(kf('breathe-neck', 3, [(0, tr(), SOFT), (1.4, tr(0, -1.8), SOFT), (3, tr(), SOFT)]))
# queue : base qui ondule (4 s), bout qui suit avec retard et fouette
css.append(A('tail', 'tail-sway', 4)); css.append(kf('tail-sway', 4, [(0, rot(0), SOFT), (1.1, rot(-7), SOFT), (2.3, rot(5), SOFT), (3.2, rot(-2), SOFT), (4, rot(0), SOFT)]))
css.append(A('tail-tip', 'tail-tip', D)); css.append(kf('tail-tip', D, [
    (0, rot(0), SOFT), (1.4, rot(-14), SOFT), (2.6, rot(10), SOFT), (3.9, rot(-6), SOFT), (5.0, rot(8), SOFT),
    (6.4, rot(-10), SOFT), (7.6, rot(6), SOFT), (10.8, rot(0), ANT), (11.0, rot(-22), SNAP), (11.25, rot(12), OUTQ), (11.6, rot(0), SOFT), (12, rot(0), LIN)]))
# tête : regarde à droite (les yeux d'abord), revient, puis penche la tête, curieuse
css.append(A('head', 'head', D)); css.append(kf('head', D, [
    (0, tr(), LIN), (2.45, tr(), ANT), (2.6, tr(0, 1.5, -2.5), SNAP), (2.88, tr(3, -1, 9), OUTQ), (4.0, tr(3, -1, 9), ANT),
    (4.12, tr(2, 0, 10.5), SNAP), (4.45, tr(0, 0, -1.5), OUTQ), (4.7, tr(), LIN),
    (6.05, tr(), ANT), (6.2, tr(0, 2, 2), SNAP), (6.55, tr(-2, -6, -7, 1.02, 1.03), OUTQ), (7.3, tr(-2, -6, -7, 1.02, 1.03), ANT), (7.45, tr(0, 1, 1.5, 1.03, .97), SNAP),
    (7.6, tr(0, 0, -2.5), OUTQ), (7.72, tr(0, 0, 2), OUTQ), (7.85, tr(0, 0, -1), OUTQ), (8.0, tr(), LIN),
    (9.0, tr(), ANT), (9.12, tr(0, 1, 2), SNAP), (9.42, tr(-2, 2, -13), OUTQ), (10.4, tr(-2, 2, -13), ANT), (10.52, tr(-1, 1, -14), SNAP), (10.85, tr(0, 0, 1.5), OUTQ), (11.1, tr(), LIN), (12, tr(), LIN)]))
# pupilles : partent avant la tête
for side in 'lr':
    css.append(A(f'pupils-{side}', 'pupils', D))
css.append(kf('pupils', D, [(0, tr(), LIN), (2.3, tr(), OUTQ), (2.42, tr(4.5, -1), LIN), (3.9, tr(4.5, -1), OUTQ), (4.02, tr(), LIN),
    (8.9, tr(), OUTQ), (9.0, tr(-3, 2), LIN), (10.3, tr(-3, 2), OUTQ), (10.42, tr(), LIN), (12, tr(), LIN)]))
# clignements rapides (fermeture 2 images, réouverture qui rebondit), un clignement lent « je t'aime », un double clignement
blinks = [1.2, 5.2, 8.35, 8.62, 11.5]
def eye_kf():
    pts = [(0, tr(), LIN)]
    for b in blinks:
        pts += [(b, tr(), ANT), (b + .06, tr(0, 0, 0, 1.04, .12), LIN), (b + .12, tr(0, 0, 0, 1.04, .12), SNAP), (b + .25, tr(), LIN)]
    # clignement lent (4.4 s) et bâillement (6.2 à 7.4 s) : yeux fermés en arc heureux
    pts += [(4.4, tr(), ANT), (4.62, tr(0, 0, 0, 1.03, .1), LIN), (5.15 - .001, tr(0, 0, 0, 1.03, .1), LIN)]
    pts = sorted(pts, key=lambda x: x[0])
    return pts
eyes = [(0, tr() + ';opacity:1', LIN)]
for b in [1.2, 8.35, 8.62, 11.5]:
    eyes += [(b, tr() + ';opacity:1', ANT), (b + .05, tr(0, 0, 0, 1.04, .3) + ';opacity:1', 'steps(1,end)'), (b + .06, tr(0, 0, 0, 1.04, .12) + ';opacity:0', 'steps(1,end)'),
             (b + .13, tr(0, 0, 0, 1.04, .35) + ';opacity:1', SNAP), (b + .21, tr() + ';opacity:1', LIN)]
CL = lambda: tr(0, 0, 0, 1.03, .1) + ';opacity:0'
eyes += [(4.4, tr() + ';opacity:1', ANT), (4.58, tr(0, 0, 0, 1.03, .3) + ';opacity:1', 'steps(1,end)'), (4.62, CL(), LIN), (5.3, CL(), 'steps(1,end)'), (5.33, tr(0, 0, 0, 1.03, .35) + ';opacity:1', SNAP), (5.46, tr() + ';opacity:1', LIN),
         (6.25, tr() + ';opacity:1', ANT), (6.37, tr(0, 0, 0, 1.03, .3) + ';opacity:1', 'steps(1,end)'), (6.4, CL(), LIN), (7.45, CL(), 'steps(1,end)'), (7.48, tr(0, 0, 0, 1.03, .35) + ';opacity:1', SNAP), (7.6, tr() + ';opacity:1', LIN), (12, tr() + ';opacity:1', LIN)]
eyes.sort(key=lambda x: x[0])
for side in 'lr': css.append(A(f'eye-{side}', 'eye', D))
css.append(kf('eye', D, eyes))
# trait de clignement (bref) et yeux heureux (lent, bâillement)
blk = [(0, 'opacity:0', LIN)]
for b in [1.2, 8.35, 8.62, 11.5]:
    blk += [(b + .059, 'opacity:0', 'steps(1,end)'), (b + .06, 'opacity:1', 'steps(1,end)'), (b + .13, 'opacity:0', 'steps(1,end)')]
blk.append((12, 'opacity:0', LIN))
css.append(A('eyes-blink', 'blink-line', D)); css.append(kf('blink-line', D, sorted(blk, key=lambda x: x[0])))
css.append(A('eyes-happy', 'happy', D)); css.append(kf('happy', D, [(0, 'opacity:0', LIN), (4.61, 'opacity:0', 'steps(1,end)'), (4.62, 'opacity:1', 'steps(1,end)'), (5.33, 'opacity:0', 'steps(1,end)'),
    (6.39, 'opacity:0', 'steps(1,end)'), (6.4, 'opacity:1', 'steps(1,end)'), (7.48, 'opacity:0', 'steps(1,end)'), (12, 'opacity:0', LIN)]))
# bâillement : bouche qui s'ouvre grand puis se referme, le petit sourire disparaît pendant ce temps
css.append(A('mouth-open', 'yawn', D)); css.append(kf('yawn', D, [(0, 'opacity:0;transform:scale(.2)', LIN), (6.2, 'opacity:0;transform:scale(.2)', 'steps(1,end)'),
    (6.22, 'opacity:1;transform:scale(.3)', SNAP), (6.6, 'opacity:1;transform:scale(1.45,1.6)', SOFT), (7.25, 'opacity:1;transform:scale(1.35,1.5)', ANT), (7.42, 'opacity:1;transform:scale(.2)', 'steps(1,end)'),
    (7.44, 'opacity:0;transform:scale(.2)', LIN), (12, 'opacity:0;transform:scale(.2)', LIN)]))
css.append(A('mouth-smile', 'smile', D)); css.append(kf('smile', D, [(0, 'opacity:1', LIN), (6.21, 'opacity:1', 'steps(1,end)'), (6.22, 'opacity:0', 'steps(1,end)'), (7.43, 'opacity:1', LIN), (12, 'opacity:1', LIN)]))
# oreilles : petits tics rapides et indépendants, l'oreille droite pivote vers le bruit avant le regard
css.append(A('ear-right', 'ear-r', D)); css.append(kf('ear-r', D, [(0, rot(0), LIN), (2.05, rot(0), ANT), (2.14, rot(-4), SNAP), (2.3, rot(13), OUTQ), (4.0, rot(12), OUTQ), (4.3, rot(0), LIN),
    (6.15, rot(0), OUTQ), (6.5, rot(8), SOFT), (7.4, rot(8), OUTQ), (7.7, rot(0), LIN), (10.0, rot(0), ANT), (10.08, rot(-9), SNAP), (10.2, rot(3), OUTQ), (10.35, rot(0), LIN), (12, rot(0), LIN)]))
css.append(A('ear-left', 'ear-l', D)); css.append(kf('ear-l', D, [(0, rot(0), LIN), (0.6, rot(0), ANT), (0.68, rot(8), SNAP), (0.8, rot(-3), OUTQ), (0.95, rot(0), LIN),
    (6.15, rot(0), OUTQ), (6.5, rot(-8), SOFT), (7.4, rot(-8), OUTQ), (7.7, rot(0), LIN), (9.1, rot(0), OUTQ), (9.4, rot(-15), OUTQ), (10.4, rot(-14), OUTQ), (10.75, rot(0), LIN),
    (11.7, rot(0), ANT), (11.77, rot(9), SNAP), (11.9, rot(0), LIN), (12, rot(0), LIN)]))
# moustaches : frémissent pendant le bâillement
css.append(A('whiskers', 'whisk', D)); css.append(kf('whisk', D, [(0, tr(), LIN), (6.2, tr(), SNAP), (6.55, tr(0, -2, 0, 1.06, 1), SOFT), (7.3, tr(0, -2, 0, 1.06, 1), SNAP), (7.6, tr(), LIN), (12, tr(), LIN)]))
# tout le corps : petit tassement de contentement après le bâillement
css.append(A('character', 'settle', D)); css.append(kf('settle', D, [(0, tr(), LIN), (7.45, tr(), ANT), (7.6, tr(0, 0, 0, 1.025, .97), SNAP), (7.95, tr(), LIN), (12, tr(), LIN)]))
open(f'{OUT}/azami_v44_repos_anime.svg', 'w').write(svg('Azami V4.4 · Repos', 'Respiration, regard, oreilles, clignement lent, bâillement, tête penchée. Rig V4.1, mouvement continu.', '\n'.join(css)))
open(f'{OUT}/statiques/azami_v44_repos_statique.svg', 'w').write(svg('Azami V4.4 · Repos (statique)', 'Pose neutre.', '', anim=False))

# ---------------------------------------------------------------- Caresse 1 (2,5 s, une fois)
D = 2.5
O = lambda sel, name: f"#{sel}{{animation:{name} {D}s 1 both}}"
c = []
c.append(O('head', 'c-head')); c.append(kf('c-head', D, [
    (0, tr(), ANT), (0.14, tr(0, 3, -3, 1.02, .97), SNAP), (0.42, tr(7, -4, 13, .97, 1.03), OUTQ),
    (0.62, tr(9, -3, 15, 1.06, .95), SOFT), (0.9, tr(6, -5, 11, 1.03, .98), SOFT), (1.2, tr(9, -3, 15, 1.06, .95), SOFT), (1.5, tr(7, -4, 12, 1.03, .98), SOFT),
    (1.85, tr(8, -3, 14, 1.05, .96), ANT), (2.05, tr(-1, 1, -3, .98, 1.02), SNAP), (2.3, tr(0, 0, 1), OUTQ), (2.5, tr(), LIN)]))
c.append(O('neck', 'c-neck')); c.append(kf('c-neck', D, [(0, tr(), ANT), (0.42, tr(4, -3, 5), SOFT), (1.85, tr(4, -3, 5), SNAP), (2.2, tr(), LIN), (2.5, tr(), LIN)]))
c.append(O('core', 'c-core')); c.append(kf('c-core', D, [(0, tr(), ANT), (0.14, tr(0, 2, 0, 1.02, .97), SNAP), (0.5, tr(2, -2, 2, .99, 1.02), SOFT), (1.85, tr(2, -2, 2, .99, 1.02), SNAP), (2.2, tr(), LIN), (2.5, tr(), LIN)]))
# ronronnement : petite vibration du corps entier
vib = [(0, tr(), LIN), (0.6, tr(), LIN)]
t = 0.6; k = 0
while t < 1.8:
    t = round(t + 0.05, 3); k += 1
    vib.append((t, tr(0, 0, 0.9 if k % 2 else -0.9), LIN))
vib += [(1.85, tr(), LIN), (2.5, tr(), LIN)]
c.append(O('character', 'c-purr')); c.append(kf('c-purr', D, vib))
# yeux : fermés en arc heureux pendant toute la caresse, réouverture qui pétille
for side in 'lr': c.append(O(f'eye-{side}', 'c-eye'))
c.append(kf('c-eye', D, [(0, tr() + ';opacity:1', ANT), (0.12, tr(0, 0, 0, 1.03, .35) + ';opacity:1', 'steps(1,end)'), (0.14, tr(0, 0, 0, 1.03, .1) + ';opacity:0', LIN), (1.95, tr(0, 0, 0, 1.03, .1) + ';opacity:0', 'steps(1,end)'), (1.97, tr(0, 0, 0, 1.03, .4) + ';opacity:1', SNAP), (2.09, tr(0, 0, 0, 1.06, 1.06) + ';opacity:1', OUTQ), (2.5, tr() + ';opacity:1', LIN)]))
c.append(O('eyes-happy', 'c-happy')); c.append(kf('c-happy', D, [(0, 'opacity:0', 'steps(1,end)'), (0.14, 'opacity:1', 'steps(1,end)'), (1.97, 'opacity:0', 'steps(1,end)'), (2.5, 'opacity:0', LIN)]))
# joues qui rosissent
c.append(O('blush', 'c-blush')); c.append(kf('c-blush', D, [(0, tr(), OUTQ), (0.5, 'transform:scale(1.25);opacity:1', SOFT), (1.9, 'transform:scale(1.25);opacity:1', OUTQ), (2.5, 'transform:scale(1);opacity:1', LIN)]))
# oreilles : couchées vers l'arrière de plaisir, puis se redressent avec un rebond
c.append(O('ear-left', 'c-earl')); c.append(kf('c-earl', D, [(0, rot(0), ANT), (0.4, rot(-16), SOFT), (1.85, rot(-14), ANT), (2.0, rot(6), SNAP), (2.25, rot(-2), OUTQ), (2.5, rot(0), LIN)]))
c.append(O('ear-right', 'c-earr')); c.append(kf('c-earr', D, [(0, rot(0), ANT), (0.4, rot(16), SOFT), (1.85, rot(14), ANT), (2.0, rot(-6), SNAP), (2.25, rot(2), OUTQ), (2.5, rot(0), LIN)]))
# queue : se dresse et frissonne au bout
c.append(O('tail', 'c-tail')); c.append(kf('c-tail', D, [(0, rot(0), ANT), (0.45, rot(-9), SOFT), (1.9, rot(-9), SNAP), (2.3, rot(2), OUTQ), (2.5, rot(0), LIN)]))
tip = [(0, rot(0), LIN), (0.5, rot(-6), LIN)]
t = 0.5; k = 0
while t < 1.75:
    t = round(t + 0.08, 3); k += 1
    tip.append((t, rot(-12 if k % 2 else -2), SOFT))
tip += [(1.9, rot(-8), SNAP), (2.3, rot(4), OUTQ), (2.5, rot(0), LIN)]
c.append(O('tail-tip', 'c-tip')); c.append(kf('c-tip', D, tip))
c.append(O('whiskers', 'c-whisk')); c.append(kf('c-whisk', D, [(0, tr(), SOFT), (0.5, tr(0, -1.5, 0, 1.05, 1), SOFT), (1.9, tr(0, -1.5, 0, 1.05, 1), SOFT), (2.3, tr(), LIN), (2.5, tr(), LIN)]))
# petits cœurs qui montent
hearts = '''<g id="hearts">
  <g id="h1"><path d="M0 8 C-18 -12 -40 8 0 36 C40 8 18 -12 0 8Z" fill="#F48FA0" transform="translate(300 150)"/></g>
  <g id="h2"><path d="M0 6 C-12 -8 -28 6 0 24 C28 6 12 -8 0 6Z" fill="#F9C849" transform="translate(262 116)"/></g>
  <g id="h3"><path d="M0 6 C-14 -10 -32 6 0 28 C32 6 14 -10 0 6Z" fill="#F48FA0" transform="translate(332 190)"/></g>
</g>'''
for i, (t0, dx) in enumerate([(0.45, 8), (0.8, -6), (1.15, 10)], 1):
    c.append(f"#h{i}{{transform-box:view-box;transform-origin:300px 160px;animation:c-h{i} {D}s 1 both}}")
    c.append(kf(f'c-h{i}', D, [(0, 'opacity:0;transform:translate(0,0) scale(.2)', 'steps(1,end)'), (t0, 'opacity:0;transform:translate(0,0) scale(.2)', SNAP),
        (t0 + .25, f'opacity:1;transform:translate({dx/2}px,-14px) scale(1)', SOFT), (t0 + .9, f'opacity:0;transform:translate({dx}px,-46px) scale(.8)', LIN), (D, 'opacity:0;transform:translate(0,0) scale(.2)', LIN)]))
open(f'{OUT}/caresse_1_anime.svg', 'w').write(svg('Azami V4.4 · Caresse', 'La tête pousse contre une main invisible, yeux heureux, ronronnement, cœurs. Une seule fois, finit sur la pose neutre.', '\n'.join(c), extra_end=hearts))
open(f'{OUT}/statiques/caresse_1_statique.svg', 'w').write(svg('Azami V4.4 · Caresse (statique)', 'Pose neutre.', '', anim=False))
print('ok')
