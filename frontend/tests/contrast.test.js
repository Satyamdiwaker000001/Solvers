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

describe("approved tracker palette", () => {
  const approved = new Set([
    "#F8FAFC", "#FFFFFF", "#F1F5F9", "#4F46E5", "#4338CA", "#A3E635",
    "#0F172A", "#64748B", "#E2E8F0", "#16A34A", "#D97706", "#DC2626",
    "#94A3B8", "#F59E0B", "#B77945",
  ]);
  const names = [
    "canvas", "surface", "secondary", "primary", "primary-strong",
    "ink", "muted", "border", "success", "warning", "danger", "info"
  ];
  for (const name of names) {
    it(`--color-${name} uses an approved swatch`, () => {
      assert.ok(approved.has(token(name)), `${name} (${token(name)}) is outside the approved tracker palette`);
    });
  }
});
