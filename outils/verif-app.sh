#!/bin/sh
# Vérifie que chaque fichier JS du client se charge comme module (node --check seul ne voit pas tout).
cd "$(dirname "$0")/.." || exit 1
ok=1
for f in *.js; do
  [ "$f" = "sw.js" ] && { node --check sw.js || ok=0; continue; }
  cp "$f" /tmp/verif-module.mjs && node --check /tmp/verif-module.mjs 2>/tmp/verif-err.txt || { echo "ERREUR $f"; head -5 /tmp/verif-err.txt; ok=0; }
done
[ $ok = 1 ] && echo "modules OK" || exit 1
