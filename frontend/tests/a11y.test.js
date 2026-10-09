import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const read = (p) => readFileSync(join(root, p), "utf8");

function allSourceFiles(dir = root, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) allSourceFiles(p, out);
    else if (/\.(jsx|js|css)$/.test(name)) out.push(p);
  }
  return out;
}

describe("accessibility wiring (static verification)", () => {
  it("global CSS enforces visible focus and reduced motion", () => {
    const css = read("styles/globals.css");
    assert.match(css, /:focus-visible/, "missing :focus-visible rule (UI spec §10)");
    assert.match(css, /prefers-reduced-motion/, "missing reduced-motion rule (UI spec §3.3)");
  });

  it("Dialog traps focus, handles Escape, and restores focus", () => {
    const dialog = read("components/ui/Dialog.jsx");
    assert.match(dialog, /useContainedFocus/, "Dialog must use the focus-containment hook");
    assert.match(dialog, /aria-modal="true"/, "Dialog must be modal-labelled");
    assert.match(dialog, /tabIndex=\{-1\}/, "Dialog panel needs a programmatic-focus fallback");
    const hook = read("hooks/useContainedFocus.js");
    assert.match(hook, /Escape/, "hook must handle Escape");
    assert.match(hook, /previouslyFocused/, "hook must restore focus to the trigger");
    assert.match(hook, /Tab/, "hook must trap Tab navigation");
  });

  it("mobile drawer traps focus and the menu button exposes state", () => {
    const layout = read("layouts/AppLayouts.jsx");
    assert.match(layout, /useContainedFocus/, "drawer must use the focus-containment hook");
    assert.match(layout, /aria-modal="true".*aria-label="Navigation"/, "drawer must be labelled modal");
    assert.match(layout, /Skip to main content/, "skip link required for keyboard users");
    assert.match(layout, /id="main-content"/, "skip-link target required");
    const chrome = read("components/layout/Chrome.jsx");
    assert.match(chrome, /aria-expanded/, "menu button must expose drawer state");
    assert.match(chrome, /aria-controls="mobile-nav"/, "menu button must reference the drawer");
  });

  it("charts stand down when reduced motion is preferred", () => {
    const chart = read("components/data-display/ActivityChart.jsx");
    assert.match(chart, /usePrefersReducedMotion/, "chart must observe the preference");
    assert.match(chart, /isAnimationActive/, "chart animation must be conditional");
  });

  it("status is never color-only (icon + label)", () => {
    const badge = read("components/ui/Badge.jsx");
    assert.match(badge, /Glyph/, "Badge must render an icon alongside the label");
    assert.match(badge, /never color-only|aria-hidden/, "icon must be decorative, text carries meaning");
  });

  it("error retries are localized — no full-page reloads", () => {
    const offenders = allSourceFiles().filter((f) => readFileSync(f, "utf8").includes("window.location.reload"));
    assert.deepEqual(offenders, [], `full-page reload retries in: ${offenders.join(", ")}`);
  });

  it("touch targets meet the 40px minimum on buttons", () => {
    assert.match(read("components/ui/Button.jsx"), /min-h-11/, "primary buttons must be >= 44px");
  });
});

describe("responsive patterns (static verification)", () => {
  it("wide tables never force page overflow", () => {
    const offenders = [];
    for (const f of allSourceFiles()) {
      const src = readFileSync(f, "utf8");
      if (/min-w-\[\d+px\]/.test(src) && !src.includes("table-scroll")) offenders.push(f);
    }
    assert.deepEqual(offenders, [], `fixed-width content outside a scroll region: ${offenders.join(", ")}`);
  });

  it("navigation collapses to a drawer below lg", () => {
    const layout = read("layouts/AppLayouts.jsx");
    assert.match(layout, /hidden w-72/, "desktop sidebar must hide on small screens");
    assert.match(layout, /lg:block/, "sidebar restores at lg");
    assert.match(layout, /lg:hidden/, "drawer must take over on small screens");
  });

  it("dense tables provide a card/list fallback on narrow screens", () => {
    for (const f of [
      "features/leaderboard/Leaderboard.jsx",
      "features/problems/ProblemsPages.jsx",
      "features/students/StudentsPages.jsx",
    ]) {
      const src = read(f);
      assert.match(src, /(lg|xl):hidden/, `${f} needs a narrow-screen representation`);
      assert.match(src, /hidden (p-0 )?(lg|xl):block/, `${f} must reserve tables for wide screens`);
    }
  });

  it("viewport and fluid-type foundations exist", () => {
    assert.match(readFileSync(join(root, "..", "index.html"), "utf8"), /width=device-width/, "viewport meta required");
    assert.match(read("styles/globals.css"), /clamp\(/, "fluid type scale required");
  });
});
