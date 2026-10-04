#!/usr/bin/env bash
# Build a single-executable `amo` CLI (Node SEA, ADR-0024): bundle with esbuild → embed rules as an asset → inject into a copy of node.
# Output: dist-sea/amo-<os>-<arch>[.exe] plus SHA256SUMS-<os>-<arch>.txt. Intermediates are removed so the directory holds only
# release assets. Run after `npm run build`.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=dist-sea; rm -rf "$OUT"; mkdir -p "$OUT"
case "$(uname -s)" in
  Linux*) OS=linux ;;
  Darwin*) OS=darwin ;;
  MINGW*|MSYS*|CYGWIN*) OS=windows ;;
  *) echo "unsupported OS: $(uname -s)" >&2; exit 1 ;;
esac
case "$(uname -m)" in
  x86_64|amd64) ARCH=x64 ;;
  arm64|aarch64) ARCH=arm64 ;;
  *) echo "unsupported arch: $(uname -m)" >&2; exit 1 ;;
esac
NAME="amo-$OS-$ARCH"; [ "$OS" = windows ] && NAME="$NAME.exe"
BIN="$OUT/$NAME"

node scripts/bundle-rules-asset.mjs "$OUT/rules.json"
npx esbuild apps/cli/dist/main.js --bundle --platform=node --target=node22 --format=cjs --outfile="$OUT/amo.cjs" --log-level=warning \
  --banner:js="/* Azure Migration Orchestrator CLI — single executable build. Rules embedded from rules/ at build time. */"
cat > "$OUT/sea-config.json" <<JSON
{ "main": "$OUT/amo.cjs", "output": "$OUT/amo.blob", "disableExperimentalSEAWarning": true, "useCodeCache": false,
  "assets": { "rules.json": "$OUT/rules.json" } }
JSON
node --experimental-sea-config "$OUT/sea-config.json"
cp "$(command -v node)" "$BIN"
if [ "$OS" = darwin ]; then codesign --remove-signature "$BIN"; fi
npx postject "$BIN" NODE_SEA_BLOB "$OUT/amo.blob" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 $([ "$OS" = darwin ] && echo "--macho-segment-name NODE_SEA" || true)
if [ "$OS" = darwin ]; then codesign --sign - "$BIN"; fi
chmod +x "$BIN"
rm -f "$OUT/amo.cjs" "$OUT/amo.blob" "$OUT/sea-config.json" "$OUT/rules.json"
( cd "$OUT" && { command -v sha256sum >/dev/null && sha256sum "$NAME" || shasum -a 256 "$NAME"; } > "SHA256SUMS-$OS-$ARCH.txt" )
echo "built $BIN ($(du -h "$BIN" | cut -f1)); checksum in $OUT/SHA256SUMS-$OS-$ARCH.txt; verify: $BIN rules validate"
