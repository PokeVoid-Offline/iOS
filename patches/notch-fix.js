#!/usr/bin/env node
/**
 * Patch: notch-fix.js
 *
 * Fixes content rendering under the iOS notch/status bar.
 *
 * Root cause analysis:
 *   - pokevoid's index.html already has viewport-fit=cover, so safe-area
 *     CSS variables are non-zero. That's not the problem.
 *   - The problem is that nothing in the CSS actually *uses*
 *     env(safe-area-inset-top) to push the game canvas down.
 *   - body and #app both start at y=0, so the Phaser canvas draws
 *     directly under the status bar on notched iPhones.
 *
 * Fix:
 *   Inject a <style> block into the built index.html that applies
 *   padding-top: env(safe-area-inset-top) to body in portrait mode,
 *   and padding-top: 0 in landscape (where the notch is on the side
 *   and the game fills the full width correctly).
 *
 *   We also patch the #app flex container to use min-height correctly
 *   so the canvas re-centers after the body padding is applied.
 *
 * Targets: pokevoid-src/dist/index.html
 */

const fs = require("fs");
const path = require("path");

const TARGET = path.join("pokevoid-src", "dist", "index.html");

if (!fs.existsSync(TARGET)) {
  console.error(`ERROR: Could not find target file: ${TARGET}`);
  console.error("Make sure this runs after the build step (dist/ must exist).");
  process.exit(1);
}

let src = fs.readFileSync(TARGET, "utf8");

const STYLE_BLOCK = `
  <style id="capacitor-notch-fix">
    /* Push content below the iOS status bar / notch in portrait mode.
       viewport-fit=cover is already set, so env(safe-area-inset-top)
       returns the correct non-zero value on notched devices.
       In landscape the notch is on the side and no top padding is needed. */
    @media (orientation: portrait) {
      body {
        padding-top: env(safe-area-inset-top);
      }
    }
    @media (orientation: landscape) {
      body {
        padding-top: 0;
      }
    }
    /* Ensure the app container fills remaining height after body padding */
    #app {
      min-height: calc(100dvh - env(safe-area-inset-top));
    }
  </style>`;

// Inject just before </head>
if (src.includes('<style id="capacitor-notch-fix">')) {
  console.log("Notch fix style already present, skipping.");
  process.exit(0);
}

if (!src.includes("</head>")) {
  console.error("ERROR: Could not find </head> in index.html.");
  process.exit(1);
}

const patched = src.replace("</head>", `${STYLE_BLOCK}\n</head>`);

if (patched === src) {
  console.error("ERROR: Replacement produced no change.");
  process.exit(1);
}

fs.writeFileSync(TARGET, patched, "utf8");
console.log(`Injected safe-area-inset-top styles into ${TARGET}`);
console.log("Notch fix applied successfully.");
console.log("");
console.log("NOTE: Also ensure capacitor.config.json does NOT have");
console.log('  "contentInset": "never" — that overrides safe area handling.');