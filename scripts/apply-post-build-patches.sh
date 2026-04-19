#!/bin/bash
set -e

SCRIPT_DIR="$(dirname "$0")"
PATCHES_DIR="$SCRIPT_DIR/../patches"

apply_patch() {
  local file="$1"
  local full_path="$PATCHES_DIR/$file"
  echo "Applying: $file"
  if [[ "$file" == *.patch ]]; then
    git -C "pokevoid-src" apply "$full_path"
  elif [[ "$file" == *.js ]]; then
    node "$full_path"
  else
    echo "Unknown file type: $file"
    exit 1
  fi
  echo "Applied: $file"
}

# Post-build patches run after pnpm build, targeting dist/:
apply_patch "notch-fix.js"
apply_patch "capacitor-browser.js"
apply_patch "champion-select-c-button.js"
#apply_patch "landscape-canvas-fit.js"

echo "All post-build patches applied successfully."
