#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST_FILE="$ROOT_DIR/manifest.json"
RELEASE_DIR="$ROOT_DIR/release"

if [[ ! -f "$MANIFEST_FILE" ]]; then
  echo "manifest.json not found: $MANIFEST_FILE" >&2
  exit 1
fi

VERSION="$(python3 - <<'PY'
import json
from pathlib import Path
manifest = json.loads(Path('manifest.json').read_text(encoding='utf-8'))
print(manifest['version'])
PY
)"

PACKAGE_NAME="GEOCopilot-chrome-v${VERSION}.zip"
PACKAGE_PATH="$RELEASE_DIR/$PACKAGE_NAME"

mkdir -p "$RELEASE_DIR"
rm -f "$PACKAGE_PATH"

FILES=(
  manifest.json
  background.js
  content.js
  popup.html
  popup.css
  popup.js
)

if [[ -d "$ROOT_DIR/icons" ]]; then
  FILES+=(icons)
fi

(
  cd "$ROOT_DIR"
  zip -r "$PACKAGE_PATH" "${FILES[@]}"
)

echo "Packaged Chrome extension: $PACKAGE_PATH"
