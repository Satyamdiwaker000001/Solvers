import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "src", "styles", "globals.css"),
  "utf8",
);

function token(name) {
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(m, `design token --color-${name} missing from globals.css (UI spec §3.1)`);
  return m[1];
}

function luminance(hex) {
  const c = [0, 2, 4]
    .map((i) => parseInt(hex.slice(i + 1, i + 3), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function ratio(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

describe("color contrast (WCAG AA, normal text >= 4.5)", () => {
  const pairs = [
    ["ink on canvas", "ink", "canvas"],
    ["ink on surface", "ink", "surface"],
    ["muted on surface", "muted", "surface"],
    ["white on primary (buttons)", "surface", "primary"],
    ["primary on white (links)", "primary", "surface"],
    ["primary on subtle (selected nav)", "primary", "primary-subtle"],
    ["success on success-bg", "success", "success-bg"],
    ["warning on warning-bg", "warning", "warning-bg"],
    ["danger on danger-bg", "danger", "danger-bg"],
  ];
  for (const [label, fg, bg] of pairs) {
    it(`${label} passes`, () => {
      const r = ratio(token(fg), token(bg));
      assert.ok(r >= 4.5, `${label}: ${r.toFixed(2)} < 4.5`);
    });
  }
});
