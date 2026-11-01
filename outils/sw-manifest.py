#!/usr/bin/env python3
"""Recalcule l'empreinte (REV) de chaque fichier lourd (icônes, Azami, polices, sons, vendor) dans sw.js.
À lancer avant chaque version : seuls les fichiers dont le contenu a changé seront retéléchargés."""
import hashlib, json, os, re, sys
racine = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rev = {}
for d in ('icons', 'azami', 'fonts', 'sounds', 'vendor'):
    for base, _, fichiers in os.walk(os.path.join(racine, d)):
        for f in fichiers:
            p = os.path.join(base, f)
            rel = './' + os.path.relpath(p, racine).replace(os.sep, '/')
            rev[rel] = hashlib.sha1(open(p, 'rb').read()).hexdigest()[:8]
sw = os.path.join(racine, 'sw.js')
s = open(sw, encoding='utf-8').read()
s2 = re.sub(r'const REV = \{.*?\};', 'const REV = ' + json.dumps(dict(sorted(rev.items())), separators=(',', ':')) + ';', s, count=1, flags=re.S)
if s2 == s and 'const REV = {' not in s: sys.exit('REV introuvable dans sw.js')
open(sw, 'w', encoding='utf-8').write(s2)
print(f'{len(rev)} fichiers, sw.js {len(s2)//1024} Ko')
