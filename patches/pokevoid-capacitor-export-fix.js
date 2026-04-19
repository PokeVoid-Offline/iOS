#!/usr/bin/env node
/**
 * Patch: pokevoid-capacitor-export-fix.js
 *
 * Fixes save data export in Capacitor native builds (iOS + Android).
 *
 * Problem:
 *   iOS and Android require a genuine DOM user gesture to open a share sheet.
 *   Phaser's touch pipeline doesn't qualify — tapping the in-game "Export Data"
 *   button leaves the touch system in a locked state and the share sheet either
 *   fails silently or causes button spam.
 *
 * Solution:
 *   On native platforms, instead of immediately downloading, we inject a
 *   fullscreen DOM overlay with a real HTML button. The user taps it — a
 *   genuine DOM gesture — and the file is saved from that tap.
 *
 * Platform differences:
 *   iOS   — write to DOCUMENTS directory, then open share sheet so the user
 *           can save to Files app. Extension is preserved via UTI registration.
 *   Android — write directly to EXTERNAL_STORAGE (public Downloads folder).
 *           Skip the share sheet entirely: Android share sheet doesn't know
 *           the .prsv type so it only shows useless options (Print, Google).
 *           Instead show a success message with the save location.
 *
 * Targets: pokevoid-src/src/system/game-data.ts
 */

const fs = require("fs");
const path = require("path");

const TARGET = path.join("pokevoid-src", "src", "system", "game-data.ts");

if (!fs.existsSync(TARGET)) {
  console.error(`ERROR: Could not find target file: ${TARGET}`);
  console.error("Make sure this script is run from the repo root.");
  process.exit(1);
}

let src = fs.readFileSync(TARGET, "utf8");

const ORIGINAL = `                const blob = new Blob([encryptedData.toString()], { type: "text/json" });
                const link = document.createElement("a");
                link.href = window.URL.createObjectURL(blob);
                link.download = downloadName;
                link.click();
                link.remove();`;

const REPLACEMENT = `                const cap = (window as any).Capacitor;
                if (cap?.isNativePlatform?.()) {
                  // On iOS/Android, blob URL downloads don't work in the Capacitor WebView.
                  // We show a fullscreen DOM overlay with a real button so the OS sees a
                  // genuine user gesture (required for share sheets on iOS).
                  const base64 = btoa(unescape(encodeURIComponent(encryptedData.toString())));
                  const platform = cap.getPlatform?.() ?? "ios";

                  // --- Build overlay ---
                  const overlay = document.createElement("div");
                  overlay.id = "cap-export-overlay";
                  Object.assign(overlay.style, {
                    position:       "fixed",
                    inset:          "0",
                    zIndex:         "99999",
                    display:        "flex",
                    flexDirection:  "column",
                    alignItems:     "center",
                    justifyContent: "center",
                    background:     "rgba(0,0,0,0.72)",
                    fontFamily:     "sans-serif",
                  });

                  const label = document.createElement("p");
                  label.textContent = \`Save \${downloadName}\`;
                  Object.assign(label.style, {
                    color:        "#fff",
                    fontSize:     "18px",
                    marginBottom: "24px",
                    textAlign:    "center",
                    padding:      "0 24px",
                  });

                  const btn = document.createElement("button");
                  btn.textContent = platform === "android" ? "💾 Save to Downloads" : "📁 Save to Files";
                  Object.assign(btn.style, {
                    padding:      "18px 40px",
                    fontSize:     "20px",
                    fontWeight:   "bold",
                    background:   "#6e3ef5",
                    color:        "#fff",
                    border:       "none",
                    borderRadius: "12px",
                    cursor:       "pointer",
                    marginBottom: "16px",
                    minWidth:     "200px",
                  });

                  const cancelBtn = document.createElement("button");
                  cancelBtn.textContent = "Cancel";
                  Object.assign(cancelBtn.style, {
                    padding:      "12px 32px",
                    fontSize:     "16px",
                    background:   "transparent",
                    color:        "#aaa",
                    border:       "1px solid #aaa",
                    borderRadius: "8px",
                    cursor:       "pointer",
                  });

                  const removeOverlay = () => overlay.parentNode?.removeChild(overlay);

                  btn.addEventListener("click", () => {
                    btn.disabled = true;
                    btn.textContent = "Saving\u2026";

                    const Filesystem = cap.Plugins?.Filesystem;
                    const Share = cap.Plugins?.Share;
                    if (!Filesystem) {
                      console.error("Capacitor Filesystem plugin not available.");
                      removeOverlay();
                      return;
                    }

                    if (platform === "android") {
                      // Android: write directly to the public Downloads folder.
                      // Skipping the share sheet because Android doesn't know the
                      // .prsv file type, so it only shows useless options like Print.
                      Filesystem.requestPermissions();
                      Filesystem.writeFile({
                        path: \`Download/PokeVoid/\${downloadName}\`,
                        data: base64,
                        directory: "EXTERNAL_STORAGE",
                      }).then(() => {
                        removeOverlay();
                        // Show brief confirmation
                        const toast = document.createElement("div");
                        toast.textContent = \`✓ Saved to Downloads/PokeVoid/\${downloadName}\`;
                        Object.assign(toast.style, {
                          position:     "fixed",
                          bottom:       "40px",
                          left:         "50%",
                          transform:    "translateX(-50%)",
                          background:   "rgba(0,0,0,0.85)",
                          color:        "#fff",
                          padding:      "14px 24px",
                          borderRadius: "10px",
                          fontSize:     "15px",
                          zIndex:       "99999",
                          textAlign:    "center",
                          maxWidth:     "90vw",
                        });
                        document.body.appendChild(toast);
                        setTimeout(() => toast.parentNode?.removeChild(toast), 3500);
                      }).catch((err: any) => {
                        console.error("Android export failed:", err);
                        btn.disabled = false;
                        btn.textContent = "💾 Save to Downloads";
                      });
                    } else {
                      // iOS: write to Documents, then open share sheet so the
                      // user can save to Files app or AirDrop etc.
                      if (!Share) {
                        console.error("Capacitor Share plugin not available.");
                        removeOverlay();
                        return;
                      }
                      Filesystem.writeFile({
                        path: downloadName,
                        data: base64,
                        directory: "DOCUMENTS",
                      }).then(() => {
                        return Filesystem.getUri({ path: downloadName, directory: "DOCUMENTS" });
                      }).then(({ uri }: { uri: string }) => {
                        return Share.share({
                          title: downloadName,
                          url: uri,
                          dialogTitle: \`Save \${downloadName}\`,
                        });
                      }).then(() => {
                        removeOverlay();
                      }).catch((err: any) => {
                        console.error("iOS export failed:", err);
                        removeOverlay();
                      });
                    }
                  });

                  cancelBtn.addEventListener("click", removeOverlay);

                  overlay.appendChild(label);
                  overlay.appendChild(btn);
                  overlay.appendChild(cancelBtn);
                  document.body.appendChild(overlay);

                } else {
                  // Web: original blob download path
                  const blob = new Blob([encryptedData.toString()], { type: "text/json" });
                  const link = document.createElement("a");
                  link.href = window.URL.createObjectURL(blob);
                  link.download = downloadName;
                  link.click();
                  link.remove();
                }`;

if (!src.includes(ORIGINAL)) {
  console.error("ERROR: Could not find the export blob/link pattern in game-data.ts.");
  console.error("The file may have been updated upstream. Manual inspection required.");
  console.error("");
  console.error("Expected to find:");
  console.error(ORIGINAL);
  process.exit(1);
}

const occurrences = src.split(ORIGINAL).length - 1;
if (occurrences > 1) {
  console.warn(`WARNING: Found ${occurrences} occurrences of the export pattern. Patching all of them.`);
}

const patched = src.split(ORIGINAL).join(REPLACEMENT);

if (patched === src) {
  console.error("ERROR: Replacement produced no change. Something went wrong.");
  process.exit(1);
}

fs.writeFileSync(TARGET, patched, "utf8");
console.log(`Patched ${occurrences} occurrence(s) in ${TARGET}`);
console.log("Capacitor export fix applied successfully.");