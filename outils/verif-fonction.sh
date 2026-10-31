#!/bin/sh
# Vérifie la syntaxe d'une fonction Supabase avant de la déployer (une variable déclarée deux fois, une accolade
# oubliée…). Usage : outils/verif-fonction.sh azami
f="supabase/functions/$1/index.ts"
npx -y -p typescript tsc --noEmit --target es2022 --module esnext --moduleResolution bundler --skipLibCheck --noResolve --noImplicitAny false "$f" 2>&1 | grep -v "Cannot find name 'Deno'\|Cannot find module 'npm:"
echo "vérification de $f terminée"
