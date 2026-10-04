#!/usr/bin/env bash
# Build a single-executable `amo` CLI (Node SEA, ADR-0024): bundle with esbuild → embed rules as an asset → inject into a copy of node.
# Output: dist-sea/amo (Linux/macOS) or dist-sea/amo.exe (Windows). Run after `npm run build`.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=dist-sea; mkdir -p "$OUT"
node scripts/bundle-rules-asset.mjs "$OUT/rules.json"
npx esbuild apps/cli/dist/main.js --bundle --platform=node --target=node22 --format=cjs --outfile="$OUT/amo.cjs" --log-level=warning \
  --banner:js="/* Azure Migration Orchestrator CLI — single executable build. Rules embedded from rules/ at build time. */"
cat > "$OUT/sea-config.json" <<JSON
{ "main": "$OUT/amo.cjs", "output": "$OUT/amo.blob", "disableExperimentalSEAWarning": true, "useCodeCache": false,
  "assets": { "rules.json": "$OUT/rules.json" } }
JSON
node --experimental-sea-config "$OUT/sea-config.json"
BIN="$OUT/amo"; case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) BIN="$OUT/amo.exe";; esac
cp "$(command -v node)" "$BIN"
if [ "$(uname -s)" = "Darwin" ]; then codesign --remove-signature "$BIN"; fi
npx postject "$BIN" NODE_SEA_BLOB "$OUT/amo.blob" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 $([ "$(uname -s)" = "Darwin" ] && echo "--macho-segment-name NODE_SEA" || true)
if [ "$(uname -s)" = "Darwin" ]; then codesign --sign - "$BIN"; fi
chmod +x "$BIN"
echo "built $BIN ($(du -h "$BIN" | cut -f1)); verify: $BIN rules validate"
