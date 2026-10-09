import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const read = (p) => readFileSync(join(root, p), "utf8");

describe("320px responsive layout & alignment constraints", () => {
  it("global stylesheet sets overflow-x containment and word-wrapping", () => {
    const css = read("styles/globals.css");
    assert.match(css, /overflow-x:\s*hidden/, "html/body must prevent unintended horizontal scrolling");
    assert.match(css, /max-width:\s*100%/, "html/body must enforce 100% max-width containment");
    assert.match(css, /overflow-wrap:\s*break-word/, "html/body must allow breaking long text tokens");
    assert.match(css, /-webkit-overflow-scrolling:\s*touch/, "table-scroll must support momentum scrolling on mobile");
  });

  it("metric stat grids fall back to 1 column on screens below sm (320px safe)", () => {
    const files = [
      "features/dashboard/StudentDashboard.jsx",
      "features/dashboard/AdminDashboard.jsx",
      "features/reports/ReportPage.jsx",
      "features/students/StudentsPages.jsx",
    ];

    for (const f of files) {
      const src = read(f);
      assert.match(
        src,
        /grid-cols-1\s+sm:grid-cols-2\s+xl:grid-cols-4/,
        `${f} stat grid must use grid-cols-1 sm:grid-cols-2 to prevent cramped cards at 320px`,
      );
    }
  });

  it("evidence panel wraps long paths and commit hashes cleanly", () => {
    const panel = read("components/data-display/EvidencePanel.jsx");
    assert.match(panel, /items-start/, "file path container must align items to start for multiline paths");
    assert.match(panel, /break-all/, "file path and similarity values must have break-all");
    assert.match(panel, /shortSha/, "commit SHAs must be abbreviated");
  });

  it("welcome banner and problem instructions prevent long path blowouts", () => {
    const studentDash = read("features/dashboard/StudentDashboard.jsx");
    assert.match(studentDash, /break-all.*folder/, "folder path in student banner must have break-all");

    const problems = read("features/problems/ProblemsPages.jsx");
    assert.match(problems, /break-all.*DEFAULT_REPO_NAME/, "problem submission instruction path must have break-all");
  });

  it("dialog container fits narrow viewports and has safe mobile padding", () => {
    const dialog = read("components/ui/Dialog.jsx");
    assert.match(dialog, /p-3\.5\s+sm:p-5/, "dialog must use p-3.5 padding on narrow mobile viewports");
    assert.match(dialog, /scroll-region.*overflow-y-auto/, "dialog body must scroll internally");
  });

  it("auth forms provide safe mobile horizontal padding at 320px", () => {
    const auth = read("features/auth/AuthPages.jsx");
    assert.match(auth, /px-3\s+py-6\s+sm:px-6/, "AuthShell must use px-3 on 320px viewports");
  });
});
