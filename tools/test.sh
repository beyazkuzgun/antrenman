#!/usr/bin/env bash
# Kullanım: tools/test.sh  → JS sözdizimi + sahte hesapla uçtan uca duman testi (headless Chrome gerekir).
set -e
cd "$(dirname "$0")/.."
for f in *.js; do node --check "$f"; done && echo "OK   JS sözdizimi"
T=$(mktemp -d); cp -r . "$T"; cd "$T"
sed 's#<script src="sync.js"></script>#<script src="tools/fake-sync.js"></script>#' index.html > t_index.html
cp tools/smoke.html t_smoke.html
python3 -m http.server 8765 >/dev/null 2>&1 & S=$!; trap 'kill $S 2>/dev/null; rm -rf "$T"' EXIT; sleep 1
node tools/cdp.mjs http://localhost:8765/t_smoke.html 15000 | tee /tmp/antrenman-test.txt
! grep -q '^FAIL\|^EXC\|^ERR' /tmp/antrenman-test.txt
