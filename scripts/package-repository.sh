#!/usr/bin/env bash
# Create hcw-azmigrateorchestrator-addon.zip with repository files at the archive root (no nested parent directory).
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-hcw-azmigrateorchestrator-addon.zip}"
rm -f "$OUT"
zip -qr "$OUT" . \
  -x ".git/*" "node_modules/*" "*/node_modules/*" "dist/*" "*/dist/*" "dist-sea/*" "*.tsbuildinfo" ".local/*" ".env" ".env.*" \
     "coverage/*" "data/*" "*.tfstate" "*.tfstate.*" ".terraform/*" "*/.terraform/*" "*.log" "__pycache__/*" "*.pyc" ".DS_Store" "$OUT" \
  -i "*" 
# zip's -i "*" with -x list above; re-add allowed .env.example explicitly (excluded by the .env.* pattern)
zip -q "$OUT" .env.example
echo "wrote $OUT ($(du -h "$OUT" | cut -f1)), $(unzip -l "$OUT" | tail -1 | awk '{print $2}') files"
unzip -l "$OUT" | awk 'NR>3 {print $4}' | grep -E '^(\.git/|node_modules/|.*/dist/|\.env$)' && { echo "ERROR: excluded path leaked into archive"; exit 1; } || true
