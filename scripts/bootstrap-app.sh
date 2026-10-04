#!/usr/bin/env bash
# Clone (or reuse) the upstream product as a sibling checkout at the pinned release, build it and assemble its packages so this
# repository's file: links resolve (ADR-0028 interim contract). Usage: APP_REF=v0.2.0 bash scripts/bootstrap-app.sh
set -euo pipefail
APP_REF="${APP_REF:-v0.2.0}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/../HCW-AzMigrateOrchestrator_App"
if [ ! -d "$DIR" ]; then
  git clone --depth 1 --branch "$APP_REF" "https://github.com/saulpatinojr/HCW-AzMigrateOrchestrator_App.git" "$DIR"
else
  echo "using existing $DIR ($(git -C "$DIR" describe --tags --always 2>/dev/null || echo untagged)); expected release $APP_REF"
fi
(cd "$DIR" && npm ci && npm run build)
echo "upstream packages ready at $DIR/dist-packages"
