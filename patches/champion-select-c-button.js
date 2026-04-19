#!/usr/bin/env node
/**
 * Patch: champion-select-c-button.js
 *
 * Makes the on-screen "C" touch button visible during the Champion Select
 * and Skill Tree screens.
 *
 * Root cause:
 *   index.css hides #apadStats (the "C" / STATS button) for every UI mode
 *   except a hardcoded whitelist:
 *
 *     COMMAND | MODIFIER_SELECT | SHOP_SELECT | FIGHT | BALL | TARGET_SELECT
 *
 *   Champion Select (CHAMPION_SELECT) and Skill Tree (SKILL_TREE) are not in
 *   that list, so the button is hidden even though the game logic responds to
 *   Button.STATS in both handlers (champion-select-ui-handler.ts line 1886,
 *   ui-inputs.ts line 164/229).
 *
 * Fix:
 *   Inject a <style> block that overrides the hide rule for those two modes,
 *   forcing #apadStats back to its default visible state.
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

const MARKER = "capacitor-c-button-fix";

if (src.includes(MARKER)) {
  console.log("C-button fix already present, skipping.");
  process.exit(0);
}

if (!src.includes("</head>")) {
  console.error("ERROR: Could not find </head> in index.html.");
  process.exit(1);
}

const STYLE_BLOCK = `
  <style id="${MARKER}">
    /*
     * Show the on-screen "C" button (apadStats / STATS) during Champion Select
     * and Skill Tree screens.
     *
     * The base CSS rule in index.css hides #apadStats everywhere except a fixed
     * whitelist of battle-related modes.  These two game-specific screens also
     * need the button, so we override the hide here.
     *
     * Using display:flex to match the button's natural display value so it
     * renders identically to when it's shown in battle modes.
     */
    #touchControls[data-ui-mode='CHAMPION_SELECT'] #apad #apadStats,
    #touchControls[data-ui-mode='SKILL_TREE'] #apad #apadStats {
      display: flex !important;
    }
  </style>`;

const patched = src.replace("</head>", `${STYLE_BLOCK}\n</head>`);

if (patched === src) {
  console.error("ERROR: Replacement produced no change.");
  process.exit(1);
}

fs.writeFileSync(TARGET, patched, "utf8");
console.log(`Injected C-button visibility fix into ${TARGET}`);
console.log("Champion Select C-button fix applied successfully.");