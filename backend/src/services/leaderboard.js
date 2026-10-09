import { ProgressEvent, User } from "../models.js";
import { leaderboardFormulaText } from "../config.js";

/**
 * Leaderboard computed strictly from stored qualifying events (BR-09):
 * distinct NEW_PROBLEM_VERIFIED per student + active days in the window.
 * No client-submitted scores are ever accepted (see routes: no such input).
 */
export async function computeLeaderboard(cfg) {
  const { verifiedWeight, activeDayWeight, windowDays, timezone } = cfg.leaderboard;
  const since = new Date(Date.now() - windowDays * 24 * 3_600_000);

  const students = await User.find({ role: "student", accountStatus: "approved" })
    .select("displayName githubLogin githubUserId studentId avatarUrl createdAt")
    .lean();
  const byId = new Map(students.map((s) => [String(s._id), s]));

  const events = await ProgressEvent.find({ occurredAt: { $gte: since } }).lean();
  const perStudent = new Map();
  for (const e of events) {
    const key = String(e.student);
    if (!byId.has(key)) continue;
    let acc = perStudent.get(key);
    if (!acc) {
      acc = { verified: new Set(), days: new Set(), firstVerifiedAt: null };
      perStudent.set(key, acc);
    }
    if (e.eventType === "NEW_PROBLEM_VERIFIED") {
      const problemKey = (e.meta && e.meta.assignmentId) || e.sourceKey;
      acc.verified.add(String(problemKey));
      const t = new Date(e.occurredAt).getTime();
      if (!acc.firstVerifiedAt || t < acc.firstVerifiedAt) acc.firstVerifiedAt = t;
    }
    // Active day in server policy timezone (UTC default; day truncation).
    const day = new Date(e.occurredAt).toISOString().slice(0, 10);
    acc.days.add(day);
  }

  const entries = [...perStudent.entries()].map(([studentId, acc]) => {
    const s = byId.get(studentId);
    const verifiedProblems = acc.verified.size;
    const activeDays = acc.days.size;
    return {
      studentId: s.studentId || studentId,
      displayName: s.displayName,
      githubLogin: s.githubLogin,
      avatarUrl: s.avatarUrl || (s.githubUserId ? `https://avatars.githubusercontent.com/u/${s.githubUserId}?v=4` : null),
      verifiedProblems,
      activeDays,
      score: verifiedProblems * verifiedWeight + activeDays * activeDayWeight,
      firstVerifiedAt: acc.firstVerifiedAt,
    };
  });
  entries.sort((a, b) =>
    b.score - a.score
    || b.verifiedProblems - a.verifiedProblems
    || (a.firstVerifiedAt || Infinity) - (b.firstVerifiedAt || Infinity),
  );
  const ranked = entries.map(({ firstVerifiedAt: _drop, ...e }, i) => ({ rank: i + 1, ...e }));
  return {
    formula: leaderboardFormulaText(cfg),
    window: `Last ${windowDays} days · server timezone ${timezone}`,
    entries: ranked,
  };
}
