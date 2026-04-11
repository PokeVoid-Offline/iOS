#!/usr/bin/env node

/**
 * Patch: Externalize Capacitor Updater in Vite Config
 * 
 * This patch tells Vite/Rollup to treat @capgo/capacitor-updater as external
 * so it doesn't try to bundle it (fixing the build error)
 * 
 * Use this if you can't remove all import statements for some reason
 */

const fs = require('fs');
const path = require('path');

// Determine target directory
const possibleDirs = ['pokerogue-src', 'pokevoid-src', '.'];
let TARGET_DIR = null;

for (const dir of possibleDirs) {
  if (fs.existsSync(path.join(dir, 'package.json'))) {
    TARGET_DIR = dir;
    break;
  }
}

if (!TARGET_DIR) {
  console.error('Error: Could not find package.json');
  process.exit(1);
}

console.log(`\n========================================`);
console.log(`Patch: Externalize Capacitor Updater`);
console.log(`Target: ${TARGET_DIR}`);
console.log(`========================================\n`);

const viteConfigPath = path.join(TARGET_DIR, 'vite.config.ts');

if (!fs.existsSync(viteConfigPath)) {
  console.error(`Error: ${viteConfigPath} not found`);
  process.exit(1);
}

console.log(`Patching: vite.config.ts`);

let content = fs.readFileSync(viteConfigPath, 'utf-8');
const originalContent = content;

// Check if already externalized
if (content.includes("'@capgo/capacitor-updater'") || content.includes('"@capgo/capacitor-updater"')) {
  console.log(`  ℹ Already externalized, skipping`);
  process.exit(1);
}

// Find the build configuration
const hasBuildConfig = content.includes('build:');

if (hasBuildConfig) {
  // Check if rollupOptions exists
  const hasRollupOptions = content.includes('rollupOptions:');
  
  if (hasRollupOptions) {
    // Check if external exists
    const hasExternal = content.includes('external:');
    
    if (hasExternal) {
      // Add to existing external array
      content = content.replace(
        /external:\s*\[([^\]]*)\]/,
        (match, existing) => {
          const items = existing.trim();
          if (items) {
            return `external: [${items}, '@capgo/capacitor-updater']`;
          } else {
            return `external: ['@capgo/capacitor-updater']`;
          }
        }
      );
    } else {
      // Add external to rollupOptions
      content = content.replace(
        /rollupOptions:\s*\{/,
        `rollupOptions: {\n      external: ['@capgo/capacitor-updater'],`
      );
    }
  } else {
    // Add rollupOptions to build
    content = content.replace(
      /build:\s*\{/,
      `build: {\n    rollupOptions: {\n      external: ['@capgo/capacitor-updater']\n    },`
    );
  }
} else {
  // Add entire build config
  // Find export default defineConfig
  const exportDefaultMatch = content.match(/export default defineConfig\(\{/);
  if (exportDefaultMatch) {
    content = content.replace(
      /export default defineConfig\(\{/,
      `export default defineConfig({\n  build: {\n    rollupOptions: {\n      external: ['@capgo/capacitor-updater']\n    }\n  },`
    );
  } else {
    console.error(`  ✗ Could not find appropriate place to add build config`);
    process.exit(1);
  }
}

if (content !== originalContent) {
  fs.writeFileSync(viteConfigPath, content, 'utf-8');
  console.log(`  ✓ Added @capgo/capacitor-updater to rollupOptions.external`);
  console.log(`\n========================================`);
  console.log(`Patch complete!`);
  console.log(`========================================\n`);
  console.log(`This tells Vite to treat capacitor-updater as external.`);
  console.log(`The import will remain but won't cause build failures.\n`);
} else {
  console.log(`  ℹ No changes needed`);
}

process.exit(1);
