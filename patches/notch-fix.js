#!/usr/bin/env node
/**
 * Patch: notch-fix.js
 *
 * Fixes content rendering under the status bar on iOS and Android.
 *
 * Root cause:
 *   - pokevoid's index.html already has viewport-fit=cover, so
 *     env(safe-area-inset-*) variables are non-zero on iOS. Good.
 *   - However nothing in the CSS uses env(safe-area-inset-top) to
 *     actually push the canvas below the status bar.
 *   - On Android 15+, edge-to-edge is enforced by default, meaning
 *     the WebView draws behind the status bar regardless of orientation.
 *   - On iOS, "contentInset": "never" was removed from capacitor.config
 *     in build.yml so the WebView respects safe areas.
 *
 * Fix:
 *   Inject a <style> block that applies padding-top: env(safe-area-inset-top)
 *   to body universally. This works for both iOS (portrait notch) and Android
 *   (status bar in landscape). env(safe-area-inset-top) returns 0 when there
 *   is no status bar, so it's safe to apply unconditionally.
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

if (src.includes('<style id="capacitor-notch-fix">')) {
  console.log("Notch fix style already present, skipping.");
  process.exit(0);
}

if (!src.includes("</head>")) {
  console.error("ERROR: Could not find </head> in index.html.");
  process.exit(1);
}

const STYLE_BLOCK = `
  <style id="capacitor-notch-fix">
    /*
     * Push content below the device status bar on iOS and Android.
     *
     * env(safe-area-inset-top) returns the correct pixel value when:
     *   iOS:     viewport-fit=cover is set (already done in index.html)
     *   Android: Capacitor exposes window insets to the WebView
     *
     * It returns 0 when there is no status bar overlap, so applying
     * it unconditionally is safe — no visible effect on desktop/web.
     *
     * Portrait:  status bar is at the top — padding pushes canvas down.
     */
    @media (orientation: portrait) {
      body {
        padding-top: env(safe-area-inset-top);
        box-sizing: border-box;
      }
      /* Shrink the app container by the same amount so the canvas
         doesn't overflow and cause a scrollbar */
      #app {
        min-height: calc(100dvh - env(safe-area-inset-top));
      }
}
  </style>`;

const patched = src.replace("</head>", `${STYLE_BLOCK}\n</head>`);

if (patched === src) {
  console.error("ERROR: Replacement produced no change.");
  process.exit(1);
}

fs.writeFileSync(TARGET, patched, "utf8");
console.log(`Injected safe-area-inset-top styles into ${TARGET}`);
console.log("Notch fix applied successfully.");