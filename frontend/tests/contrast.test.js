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
  const approved = new Set(["#F6F8F7", "#FFFFFF", "#EEF2F0", "#16803C", "#126331", "#DDF4E5", "#17211B", "#66736B", "#DCE5DF", "#E5F6EB", "#B47A1C", "#FFF4D9", "#C34A52", "#FCEBED", "#607B78", "#EAF1EF"]);
  const names = ["canvas", "surface", "secondary", "primary", "primary-strong", "primary-subtle", "ink", "muted", "border", "success", "success-bg", "warning", "warning-bg", "danger", "danger-bg", "info", "info-bg"];
  for (const name of names) {
    it(`--color-${name} uses an approved swatch`, () => {
      assert.ok(approved.has(token(name)), `${name} is outside the approved tracker palette`);
    });
  }
});
