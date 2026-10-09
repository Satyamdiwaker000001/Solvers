import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatDate, formatDateTime, timeUntil, shortSha, truncateMiddle,
  VERIFICATION_META, ACCOUNT_STATUS_META,
} from "../src/lib/format.js";

describe("format helpers", () => {
  it("formats dates and guards bad input", () => {
    assert.match(formatDate("2026-09-06T23:59:00Z"), /2026/);
    assert.match(formatDateTime("2026-09-06T23:59:00Z"), /2026/);
    assert.equal(formatDate(null), "—");
    assert.equal(formatDate("not-a-date"), "—");
    assert.equal(formatDateTime(undefined), "—");
  });

  it("computes human countdowns for the demo lock display", () => {
    const now = new Date("2026-10-09T00:00:00Z");
    assert.equal(timeUntil("2026-10-09T14:30:00Z", now), "14h 30m");
    assert.equal(timeUntil("2026-10-09T00:20:00Z", now), "20m");
    assert.equal(timeUntil("2026-10-11T01:00:00Z", now), "2d 1h");
    assert.equal(timeUntil("2026-10-08T23:00:00Z", now), "now");
    assert.equal(timeUntil(null, now), "—");
  });

  it("shortens commit SHAs and long paths without losing identity", () => {
    assert.equal(shortSha("a91f3c4e2b07"), "a91f3c4");
    assert.equal(shortSha(null), "—");
    const long = "students/STU001/binary-search/rotated-search.cpp";
    const t = truncateMiddle(long, 24);
    assert.ok(t.length <= 24 && t.includes("…"));
    assert.equal(truncateMiddle("short", 24), "short");
  });

  it("covers every verification + account state used by the UI", () => {
    for (const o of ["VERIFIED", "NEEDS_REVIEW", "INCOMPLETE", "CHECK_FAILED", "INGESTION_PENDING", "ANALYSIS_FAILED"]) {
      assert.ok(VERIFICATION_META[o]?.label, `missing meta for ${o}`);
      assert.ok(VERIFICATION_META[o]?.hint, `missing hint for ${o}`);
    }
    for (const s of ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]) {
      assert.ok(ACCOUNT_STATUS_META[s]?.label, `missing meta for ${s}`);
    }
  });
});
