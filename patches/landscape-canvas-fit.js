#!/usr/bin/env node
/**
 * Patch: landscape-canvas-fit.js
 *
 * Prevents the game canvas from being obscured by on-screen touch controls
 * in landscape orientation on mobile devices.
 *
 * Root cause:
 *   The game uses Phaser.Scale.FIT + CENTER_BOTH at a 1920×1080 (16:9) resolution.
 *   In landscape on a phone (also ~16:9), Phaser sizes the canvas to fill the full
 *   viewport height.  The touch controls (#dpad, #apad) are position:fixed and
 *   sit on top of the canvas — they don't push it up.  This means the bottom
 *   portion of the canvas (party row, action buttons, etc.) is hidden behind
 *   the controls.
 *
 * Fix:
 *   Constrain #app to a max-height that leaves room for the controls layer,
 *   and ensure html/body don't scroll. Phaser's FIT mode will then scale the
 *   canvas down to fit within that reduced height, keeping all game content
 *   fully visible above the controls.
 *
 *   We use a CSS custom property (--controls-height-landscape) so the value is
 *   easy to tweak.  The default (10vh) is enough to clear the dpad/apad buttons
 *   in landscape without wasting excessive screen space.
 *
 *   We also fix a secondary issue: in portrait mode the notch-fix already adds
 *   padding-top to body, but html and body were not explicitly set to 100% height,
 *   which could cause subtle layout shifts.  We normalise that here.
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

const MARKER = "capacitor-landscape-canvas-fix";

if (src.includes(MARKER)) {
  console.log("Landscape canvas fix already present, skipping.");
  process.exit(0);
}

if (!src.includes("</head>")) {
  console.error("ERROR: Could not find </head> in index.html.");
  process.exit(1);
}

const STYLE_BLOCK = `
  <style id="${MARKER}">
    /*
     * Landscape canvas overflow fix.
     *
     * Phaser FIT mode scales the canvas to fill the full viewport height in
     * landscape (phone aspect ratios are close to 16:9).  Touch controls are
     * position:fixed and overlap the bottom of the canvas.
     *
     * By capping #app's height to (100dvh - controls clearance) we give Phaser
     * a smaller container to FIT into, so it scales the canvas down just enough
     * for the controls not to cover any game content.
     *
     * --canvas-controls-clearance: how many px to reserve at the bottom for
     *   the dpad/apad buttons.  Tune this if controls still clip content.
     *   In landscape, --controls-size is 20vh, buttons sit at bottom:1rem,
     *   so ~calc(20vh + 1.5rem) is the safe floor. We use 22vh to add margin.
     */
    @media (orientation: landscape) {
      :root {
        --canvas-controls-clearance: 22vh;
      }

      html, body {
        height: 100%;
        overflow: hidden;
      }

      #app {
        height: calc(100dvh - var(--canvas-controls-clearance));
        max-height: calc(100dvh - var(--canvas-controls-clearance));
        overflow: hidden;
        /* Keep Phaser's canvas centred horizontally */
        display: flex;
        justify-content: center;
        align-items: flex-start;
      }
    }

    /*
     * Portrait: ensure html/body fill the screen properly so the notch-fix
     * padding-top from the earlier patch doesn't cause a scrollbar.
     */
    @media (orientation: portrait) {
      html, body {
        height: 100%;
        overflow: hidden;
      }
    }
  </style>`;

const patched = src.replace("</head>", `${STYLE_BLOCK}\n</head>`);

if (patched === src) {
  console.error("ERROR: Replacement produced no change.");
  process.exit(1);
}

fs.writeFileSync(TARGET, patched, "utf8");
console.log(`Injected landscape canvas fix into ${TARGET}`);
console.log("Landscape canvas fit fix applied successfully.");