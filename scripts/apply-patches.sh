#!/bin/bash
set -e

SCRIPT_DIR="$(dirname "$0")"
PATCHES_DIR="$SCRIPT_DIR/../patches"
TARGET_DIR="pokevoid-src"

apply_patch() {
  local file="$1"
  local full_path="$PATCHES_DIR/$file"
  echo "Applying: $file"
  if [[ "$file" == *.patch ]]; then
    git -C "$TARGET_DIR" apply "$full_path"
  elif [[ "$file" == *.js ]]; then
    node "$full_path"
  else
    echo "Unknown file type: $file"
    exit 1
  fi
  echo "Applied: $file"
}

apply_submodule_patch() {
  local file="$1"
  local submodule="$2"
  local full_path="$PATCHES_DIR/$file"
  echo "Applying: $file to $TARGET_DIR/$submodule"
  git -C "$TARGET_DIR/$submodule" apply "$full_path"
  echo "Applied: $file"
}

# Add patch files here:
# apply_patch "01-fix-something.patch"

# CRITICAL: Remove Capacitor Updater for offline builds
#apply_patch "remove-capacitor-updater.js"

apply_patch "noZoom.patch"


echo "All patches applied successfully."
