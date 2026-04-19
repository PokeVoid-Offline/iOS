#!/usr/bin/env node
/**
 * Patch: landscape-canvas-fit.js
 *
 * Fixes the game canvas being clipped at the bottom in landscape orientation.
 *
 * Root cause:
 *   The notch-fix patch (which runs before this one) unconditionally adds:
 *     body { padding-top: env(safe-area-inset-top); box-sizing: border-box; }
 *   This is correct in portrait — it pushes the canvas below the notch/status bar.
 *
 *   In landscape, the notch/Dynamic Island inset moves to the LEFT and RIGHT sides
 *   of the screen — NOT the top. env(safe-area-inset-top) is 0 (or near 0) in
 *   landscape on virtually all iOS and Android devices. Despite this, some devices
 *   still report a small non-zero inset-top in landscape, and that padding-top
 *   shifts the body down — clipping the canvas bottom off screen.
 *
 *   Additionally, the game is 1920x1080 (16:9) and modern phones in landscape are
 *   ~2.17:1 (wider than 16:9). Phaser FIT mode therefore fits the canvas to the
 *   screen HEIGHT with natural black bars left and right — exactly like PokeRogue.
 *   The dpad sits in the left black bar, apad in the right. This works perfectly
 *   as long as body padding-top is 0 in landscape.
 *
 * Fix:
 *   A single CSS rule resetting body padding-top to 0 in landscape only.
 *   Portrait behaviour is completely unchanged.
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

const MARKER = "capacitor-canvas-fit-fix";

if (src.includes(MARKER)) {
  console.log("Canvas fit fix already present, skipping.");
  process.exit(0);
}

if (!src.includes("</head>")) {
  console.error("ERROR: Could not find </head> in index.html.");
  process.exit(1);
}

// Clean up old broken versions of this patch if present.
src = src.replace(/<style id="capacitor-landscape-canvas-fix">[\s\S]*?<\/style>\s*/g, "");
src = src.replace(/<style id="capacitor-canvas-fit-fix">[\s\S]*?<\/style>\s*/g, "");

const STYLE_BLOCK = `
  <style id="${MARKER}">
    /*
     * In landscape, reset the body padding-top that the notch-fix patch adds.
     *
     * Portrait:  env(safe-area-inset-top) correctly pushes content below the
     *            notch/status bar — the notch-fix padding-top is correct there.
     *
     * Landscape: the notch inset moves to the sides (left/right), not the top.
     *            Any non-zero padding-top shifts the canvas down and clips its
     *            bottom off screen. Resetting to 0 lets Phaser FIT mode use the
     *            full viewport height, producing natural black bars on the sides
     *            where the touch controls sit — matching PokeRogue's layout.
     */
    @media (orientation: landscape) {
      body {
        padding-top: 0 !important;
      }
    }
  </style>`;

const patched = src.replace("</head>", `${STYLE_BLOCK}\n</head>`);

if (patched === src) {
  console.error("ERROR: Replacement produced no change.");
  process.exit(1);
}

fs.writeFileSync(TARGET, patched, "utf8");
console.log(`Injected canvas fit fix into ${TARGET}`);
console.log("Canvas fit fix applied successfully.");