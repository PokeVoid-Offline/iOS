#!/usr/bin/env node
/**
 * Patch: landscape-canvas-fit.js
 *
 * Ensures the game canvas fits entirely on screen (like PokeRogue's letterbox),
 * with black bars on the sides in landscape rather than content being cut off.
 *
 * Root cause & geometry:
 *   The game is 1920×1080 (16:9). Modern phones in landscape are ~2.17:1 (e.g.
 *   iPhone 15 Pro: 852×393). Since the screen is WIDER than the game, Phaser's
 *   FIT mode naturally letterboxes: canvas fills 100% of screen HEIGHT, with
 *   black bars on the left and right. This is exactly what PokeRogue shows.
 *   The touch controls (dpad left, apad right) sit inside those black bars and
 *   never overlap game content. Perfect.
 *
 *   What breaks it — the notch-fix patch (runs before this one) adds:
 *     body { padding-top: env(safe-area-inset-top); box-sizing: border-box; }
 *   This shifts body content DOWN by the notch height (e.g. 47px on iPhone 14
 *   Pro). Phaser uses window.innerHeight for its scale calculations, so it still
 *   draws a canvas that is 100vh tall. But body is now shifted down by inset-top,
 *   so the canvas bottom falls inset-top pixels BELOW the visible screen edge —
 *   that much of the game is clipped off.
 *
 * Fix:
 *   Rather than fighting body padding, we take #app out of normal flow entirely
 *   by making it position:fixed. It then fills the true viewport independently of
 *   body padding, with explicit insets applied via top/bottom so the status bar
 *   and home-bar areas are respected. Phaser measures #app's clientHeight which
 *   now correctly reflects the available space, so FIT mode scales the canvas to
 *   fit fully on screen with letterbox bars on the sides — identical to PokeRogue.
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

const STYLE_BLOCK = `
  <style id="${MARKER}">
    /*
     * Canvas fit fix.
     *
     * Takes #app out of normal document flow so it fills the true viewport
     * regardless of body padding-top added by the notch-fix patch.
     *
     * top: env(safe-area-inset-top)    — clears the status bar / notch
     * bottom: env(safe-area-inset-bottom) — clears the home indicator
     * left/right: 0                    — full width
     *
     * Phaser measures #app.clientHeight and scales its canvas to FIT inside it.
     * Because modern phones in landscape are wider than 16:9, FIT mode produces
     * natural black bars on the sides — the controls sit in those bars and never
     * overlap game content, matching PokeRogue's layout exactly.
     */
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    #app {
      position: fixed;
      top: env(safe-area-inset-top, 0px);
      bottom: env(safe-area-inset-bottom, 0px);
      left: 0;
      right: 0;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  </style>`;

// Remove the old marker if the previous (broken) version was already applied.
src = src.replace(/<style id="capacitor-landscape-canvas-fix">[\s\S]*?<\/style>\s*/g, "");

const patched = src.replace("</head>", `${STYLE_BLOCK}\n</head>`);

if (patched === src) {
  console.error("ERROR: Replacement produced no change.");
  process.exit(1);
}

fs.writeFileSync(TARGET, patched, "utf8");
console.log(`Injected canvas fit fix into ${TARGET}`);
console.log("Canvas fit fix applied successfully.");