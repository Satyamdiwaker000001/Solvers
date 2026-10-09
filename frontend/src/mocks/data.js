/**
 * REALISTIC MOCK DATA — frontend only.
 *
 * These records simulate what the future backend (GET /api/v1/...) will return.
 * Nothing here is persisted: mutations update in-memory copies so the UI can
 * demonstrate success/empty/error states. Do NOT treat this as real auth or storage.
 *
 * Backend contract reference: 06-api-spec.md, 05-data-model.md.
 */

export const CENTRAL_REPO = {
  fullName: "college-org/dsa-practice",
  branch: "main",
  folderRoot: "students/",
};

export const students = [
  { id: "STU001", displayName: "Aarav Sharma", githubLogin: "aarav-codes", githubUserId: "10240111", status: "APPROVED", folder: "students/STU001", streakDays: 12, joinedAt: "2026-07-14T09:00:00Z" },
  { id: "STU002", displayName: "Diya Patel", githubLogin: "diya-dev", githubUserId: "10240222", status: "APPROVED", folder: "students/STU002", streakDays: 9, joinedAt: "2026-07-14T09:00:00Z" },
  { id: "STU003", displayName: "Kabir Singh", githubLogin: "kabirsingh", githubUserId: "10240333", status: "APPROVED", folder: "students/STU003", streakDays: 6, joinedAt: "2026-07-15T09:00:00Z" },
  { id: "STU004", displayName: "Meera Nair", githubLogin: "meera-nair", githubUserId: "10240444", status: "APPROVED", folder: "students/STU004", streakDays: 11, joinedAt: "2026-07-15T09:00:00Z" },
  { id: "STU005", displayName: "Arjun Rao", githubLogin: "arjunrao", githubUserId: "10240555", status: "APPROVED", folder: "students/STU005", streakDays: 3, joinedAt: "2026-07-22T09:00:00Z" },
  { id: "STU006", displayName: "Ishita Verma", githubLogin: "ishita-v", githubUserId: "10240666", status: "APPROVED", folder: "students/STU006", streakDays: 7, joinedAt: "2026-07-22T09:00:00Z" },
  { id: "STU007", displayName: "Rohan Gupta", githubLogin: "rohan-g", githubUserId: "10240777", status: "APPROVED", folder: "students/STU007", streakDays: 1, joinedAt: "2026-08-02T09:00:00Z" },
  { id: "STU008", displayName: "Ananya Iyer", githubLogin: "ananya-iyer", githubUserId: "10240888", status: "APPROVED", folder: "students/STU008", streakDays: 5, joinedAt: "2026-08-02T09:00:00Z" },
];

export const problems = [
  {
    id: "PS-0001", title: "Two Sum", topic: "Arrays", difficulty: "Easy",
    statement: "Given an array of integers nums and an integer target, return indices of the two numbers that add up to target. Each input has exactly one solution.",
    examples: ["Input: nums = [2,7,11,15], target = 9 → Output: [0,1]"],
    constraints: ["2 ≤ nums.length ≤ 10⁴", "Exactly one valid answer exists"],
    sourceUrl: "https://example.com/problems/two-sum", status: "PUBLISHED",
    createdBy: "prof. Rao", createdAt: "2026-08-10T10:00:00Z",
  },
  {
    id: "PS-0002", title: "Binary Search in Rotated Array", topic: "Binary Search", difficulty: "Medium",
    statement: "Search for target in a rotated sorted array in O(log n) time. Return the index, or -1 if absent.",
    examples: ["Input: nums = [4,5,6,7,0,1,2], target = 0 → Output: 4"],
    constraints: ["1 ≤ nums.length ≤ 5000", "All values unique"],
    sourceUrl: "", status: "PUBLISHED", createdBy: "prof. Rao", createdAt: "2026-08-18T10:00:00Z",
  },
  {
    id: "PS-0003", title: "Valid Parentheses", topic: "Stacks", difficulty: "Easy",
    statement: "Given a string s containing just the characters '()[]{}', determine if the input string is valid.",
    examples: ["Input: s = \"()[]{}\" → Output: true"],
    constraints: ["1 ≤ s.length ≤ 10⁴"],
    sourceUrl: "", status: "PUBLISHED", createdBy: "prof. Iyer", createdAt: "2026-08-25T10:00:00Z",
  },
  {
    id: "PS-0004", title: "Longest Substring Without Repeating Characters", topic: "Sliding Window", difficulty: "Medium",
    statement: "Given a string s, find the length of the longest substring without repeating characters.",
    examples: ["Input: s = \"abcabcbb\" → Output: 3"],
    constraints: ["0 ≤ s.length ≤ 5·10⁴"],
    sourceUrl: "", status: "PUBLISHED", createdBy: "prof. Iyer", createdAt: "2026-09-08T10:00:00Z",
  },
  {
    id: "PS-0005", title: "Merge K Sorted Lists", topic: "Linked List", difficulty: "Hard",
    statement: "Merge k sorted linked lists into one sorted linked list and return it.",
    examples: ["Input: lists = [[1,4,5],[1,3,4],[2,6]] → Output: [1,1,2,3,4,4,5,6]"],
    constraints: ["k == lists.length", "0 ≤ k ≤ 10⁴"],
    sourceUrl: "", status: "DRAFT", createdBy: "prof. Rao", createdAt: "2026-09-28T10:00:00Z",
  },
  {
    id: "PS-0006", title: "Course Schedule", topic: "Graphs", difficulty: "Medium",
    statement: "There are numCourses courses with prerequisites. Determine whether all courses can be finished.",
    examples: ["Input: numCourses = 2, prerequisites = [[1,0]] → Output: true"],
    constraints: ["1 ≤ numCourses ≤ 2000"],
    sourceUrl: "", status: "PUBLISHED", createdBy: "prof. Iyer", createdAt: "2026-09-20T10:00:00Z",
  },
];

export const assignments = [
  { id: "ASG-0001", problemId: "PS-0001", type: "COMMON", title: "Week 1 · Arrays warm-up", dueAt: "2026-09-06T23:59:00Z", status: "ACTIVE", instructions: "Push your solution under arrays/ in your folder. Map it in manifest.json.", targets: ["STU001","STU002","STU003","STU004","STU005","STU006","STU007","STU008"] },
  { id: "ASG-0002", problemId: "PS-0002", type: "COMMON", title: "Week 3 · Binary search", dueAt: "2026-09-20T23:59:00Z", status: "ACTIVE", instructions: "O(log n) solution required; include a brief complexity note as a comment.", targets: ["STU001","STU002","STU003","STU004","STU005","STU006","STU007","STU008"] },
  { id: "ASG-0003", problemId: "PS-0003", type: "COMMON", title: "Week 4 · Stacks", dueAt: "2026-09-27T23:59:00Z", status: "ACTIVE", instructions: "Any language accepted.", targets: ["STU001","STU002","STU003","STU004","STU005","STU006","STU007","STU008"] },
  { id: "ASG-0004", problemId: "PS-0004", type: "INDIVIDUAL", title: "Stretch · Sliding window (Arjun)", dueAt: "2026-10-12T23:59:00Z", status: "ACTIVE", instructions: "Catch-up assignment after late start.", targets: ["STU005"] },
  { id: "ASG-0005", problemId: "PS-0006", type: "INDIVIDUAL", title: "Stretch · Graphs (Rohan)", dueAt: "2026-10-15T23:59:00Z", status: "ACTIVE", instructions: "BFS/DFS with visited-set explanation.", targets: ["STU007"] },
  { id: "ASG-0006", problemId: "PS-0004", type: "COMMON", title: "Week 5 · Sliding window", dueAt: "2026-10-04T23:59:00Z", status: "ACTIVE", instructions: "Class-wide follow-up.", targets: ["STU001","STU002","STU003","STU004","STU005","STU006","STU007","STU008"] },
];

/** Submissions keyed by student; outcome follows 07-github-verification.md taxonomy. */
export const submissions = [
  { id: "SUB-101", studentId: "STU001", assignmentId: "ASG-0001", commitSha: "a91f3c4e2b07d19a6c44f01ab23cd45e6f789012", path: "students/STU001/arrays/two-sum.cpp", outcome: "VERIFIED", eventType: "NEW_PROBLEM_VERIFIED", observedAt: "2026-09-02T14:22:00Z", filesChanged: 1, additions: 46, deletions: 2, note: "Hash-map O(n) solution with complexity comment." },
  { id: "SUB-102", studentId: "STU001", assignmentId: "ASG-0002", commitSha: "b72e1a90c4d55f21e93a07c14bd92f00a1c3344", path: "students/STU001/binary-search/rotated-search.cpp", outcome: "VERIFIED", eventType: "NEW_PROBLEM_VERIFIED", observedAt: "2026-09-15T18:05:00Z", filesChanged: 1, additions: 61, deletions: 0, note: "Pivot + binary search, edge cases covered." },
  { id: "SUB-103", studentId: "STU001", assignmentId: "ASG-0003", commitSha: "c83f2b11d6e66a32f04b18d25ce03a11b2d4455", path: "students/STU001/stacks/valid-parentheses.py", outcome: "VERIFIED", eventType: "NEW_PROBLEM_VERIFIED", observedAt: "2026-09-22T11:40:00Z", filesChanged: 1, additions: 34, deletions: 0, note: "" },
  { id: "SUB-104", studentId: "STU001", assignmentId: "ASG-0002", commitSha: "d94a3c22e7f77b43a15c29e36df14b22c3e5566", path: "students/STU001/binary-search/rotated-search.cpp", outcome: "VERIFIED", eventType: "MEANINGFUL_PROGRESS", observedAt: "2026-09-16T09:12:00Z", filesChanged: 1, additions: 12, deletions: 8, note: "Follow-up refactor after review." },
  { id: "SUB-201", studentId: "STU002", assignmentId: "ASG-0001", commitSha: "e05b4d33f8a88c54b26d30f47ea25c33d4f6677", path: "students/STU002/arrays/two-sum.py", outcome: "VERIFIED", eventType: "NEW_PROBLEM_VERIFIED", observedAt: "2026-09-03T10:02:00Z", filesChanged: 1, additions: 28, deletions: 0, note: "" },
  { id: "SUB-202", studentId: "STU002", assignmentId: "ASG-0002", commitSha: "f16c5e44a9b99d65c37e41a58fb36d44e5a7788", path: "students/STU002/binary-search/rotated.cpp", outcome: "NEEDS_REVIEW", eventType: "NEEDS_REVIEW", observedAt: "2026-09-16T20:44:00Z", filesChanged: 1, additions: 58, deletions: 1, note: "", similarity: { score: 0.91, against: "students/STU003/binary-search/rotated.cpp", detail: "Structural similarity 0.91 — shared boilerplate plus near-identical pivot logic. Requires professor review; not a misconduct verdict." } },
  { id: "SUB-203", studentId: "STU002", assignmentId: "ASG-0003", commitSha: "a27d6f55b0a00e76d48f52b69ac47e55f6b8899", path: "students/STU002/stacks/valid-parentheses.py", outcome: "VERIFIED", eventType: "NEW_PROBLEM_VERIFIED", observedAt: "2026-09-23T08:15:00Z", filesChanged: 1, additions: 31, deletions: 0, note: "" },
  { id: "SUB-301", studentId: "STU003", assignmentId: "ASG-0001", commitSha: "b38e7a66c1b11f87e59a63c70bd58f66a7c9900", path: "students/STU003/arrays/two-sum.cpp", outcome: "VERIFIED", eventType: "NEW_PROBLEM_VERIFIED", observedAt: "2026-09-02T16:50:00Z", filesChanged: 1, additions: 52, deletions: 0, note: "" },
  { id: "SUB-302", studentId: "STU003", assignmentId: "ASG-0002", commitSha: "c49f8b77d2c22a98f60b74d81ce69a77b8d0011", path: "students/STU003/binary-search/rotated.cpp", outcome: "VERIFIED", eventType: "NEW_PROBLEM_VERIFIED", observedAt: "2026-09-14T13:30:00Z", filesChanged: 1, additions: 55, deletions: 0, note: "" },
  { id: "SUB-401", studentId: "STU004", assignmentId: "ASG-0001", commitSha: "d50a9c88e3d33b09a71c85e92df70b88c9e1122", path: "students/STU004/arrays/two-sum.java", outcome: "VERIFIED", eventType: "NEW_PROBLEM_VERIFIED", observedAt: "2026-09-03T09:20:00Z", filesChanged: 1, additions: 48, deletions: 0, note: "" },
  { id: "SUB-402", studentId: "STU004", assignmentId: "ASG-0003", commitSha: "e61b0d99f4e44c10b82d96f03ea81c99d0f2233", path: "students/STU004/stacks/valid-parentheses.java", outcome: "CHECK_FAILED", eventType: "CHECK_FAILED", observedAt: "2026-09-24T15:02:00Z", filesChanged: 1, additions: 40, deletions: 0, note: "", checkFailure: "Configured compile check failed: missing bracket-balance helper (javac exit 1). Fix and push again." },
  { id: "SUB-501", studentId: "STU005", assignmentId: "ASG-0001", commitSha: "f72c1e00a5f55d21c93e07a14fb92d00e1a3344", path: "students/STU005/arrays/two-sum.py", outcome: "INCOMPLETE", eventType: "NO_QUALIFYING_CHANGE", observedAt: "2026-09-25T12:00:00Z", filesChanged: 1, additions: 9, deletions: 0, note: "Skeleton pushed; solve() body empty — insufficient evidence." },
  { id: "SUB-502", studentId: "STU005", assignmentId: "ASG-0004", commitSha: "a83d2f11b6a66e32d04f18b25ac03e11c2b4455", path: "students/STU005/sliding-window/longest-substring.py", outcome: "INGESTION_PENDING", eventType: "NEEDS_REVIEW", observedAt: "2026-10-07T19:31:00Z", filesChanged: 1, additions: 37, deletions: 0, note: "Evidence received; verification worker still queued." },
  { id: "SUB-601", studentId: "STU006", assignmentId: "ASG-0001", commitSha: "b94e3a22c7b77f43e15a29c36bd14f22d3c5566", path: "students/STU006/arrays/two-sum.cpp", outcome: "VERIFIED", eventType: "NEW_PROBLEM_VERIFIED", observedAt: "2026-09-04T10:44:00Z", filesChanged: 1, additions: 44, deletions: 0, note: "" },
  { id: "SUB-602", studentId: "STU006", assignmentId: "ASG-0001", commitSha: "c05f4b33d8c88a54f26b30d47ca25a33e4f6677", path: "students/STU006/arrays/two-sum.cpp", outcome: "VERIFIED", eventType: "NO_QUALIFYING_CHANGE", observedAt: "2026-09-05T10:10:00Z", filesChanged: 1, additions: 2, deletions: 2, note: "Comment-only edit flagged as non-qualifying — correctly NOT counted as a second solved problem (FR-PROG-02)." },
  { id: "SUB-701", studentId: "STU007", assignmentId: "ASG-0001", commitSha: "d16a5c44e9d99e65a37c41e58db36e44f5e7788", path: "students/STU007/arrays/two-sum.py", outcome: "VERIFIED", eventType: "NEW_PROBLEM_VERIFIED", observedAt: "2026-09-28T17:26:00Z", filesChanged: 1, additions: 30, deletions: 0, note: "" },
  { id: "SUB-801", studentId: "STU008", assignmentId: "ASG-0001", commitSha: "e27b6d55f0e00c76e48d52f69cc47f55a6f8899", path: "students/STU008/arrays/two-sum.py", outcome: "VERIFIED", eventType: "NEW_PROBLEM_VERIFIED", observedAt: "2026-09-03T14:55:00Z", filesChanged: 1, additions: 33, deletions: 0, note: "" },
  { id: "SUB-802", studentId: "STU008", assignmentId: "ASG-0003", commitSha: "f38c8e66a1f11b87a59f63a70ed58c66d7e9900", path: "students/STU008/stacks/valid-parentheses.py", outcome: "VERIFIED", eventType: "NEW_PROBLEM_VERIFIED", observedAt: "2026-09-23T09:48:00Z", filesChanged: 1, additions: 29, deletions: 0, note: "" },
];

export const accessRequests = [
  { id: "REQ-9001", githubLogin: "newbie-dev-99", githubUserId: "10999111", status: "PENDING", submittedAt: "2026-10-08T10:14:00Z", decidedAt: null, decidedBy: null, reapplyAfter: null, note: "2nd-year CSE; referral: STU002." },
  { id: "REQ-9002", githubLogin: "algo-fan-42", githubUserId: "10999222", status: "PENDING", submittedAt: "2026-10-08T16:40:00Z", decidedAt: null, decidedBy: null, reapplyAfter: null, note: "Transfer student; awaiting enrollment confirmation." },
  { id: "REQ-9003", githubLogin: "loop-learner", githubUserId: "10999333", status: "REJECTED", submittedAt: "2026-10-07T09:00:00Z", decidedAt: "2026-10-08T09:05:00Z", decidedBy: "prof. Rao", reapplyAfter: "2026-10-09T09:05:00Z", note: "Incomplete enrollment details." },
  { id: "REQ-9004", githubLogin: "diya-dev", githubUserId: "10240222", status: "APPROVED", submittedAt: "2026-07-13T09:00:00Z", decidedAt: "2026-07-14T08:00:00Z", decidedBy: "prof. Iyer", reapplyAfter: null, note: "" },
];

export const auditLog = [
  { id: "AUD-01", actor: "prof. Rao", action: "ACCESS_APPROVE", targetType: "access-request", targetId: "REQ-9004", createdAt: "2026-07-14T08:00:00Z", detail: "Approved diya-dev after enrollment check." },
  { id: "AUD-02", actor: "prof. Iyer", action: "PROBLEM_PUBLISH", targetType: "problem", targetId: "PS-0004", createdAt: "2026-09-08T10:00:00Z", detail: "Published PS-0004 as common assignment ASG-0006." },
  { id: "AUD-03", actor: "prof. Rao", action: "ASSIGNMENT_CREATE", targetType: "assignment", targetId: "ASG-0004", createdAt: "2026-09-26T11:00:00Z", detail: "Individual assignment to STU005 (catch-up)." },
  { id: "AUD-04", actor: "prof. Rao", action: "ACCESS_REJECT", targetType: "access-request", targetId: "REQ-9003", createdAt: "2026-10-08T09:05:00Z", detail: "Rejected loop-learner; 24h reapply lock until 09 Oct 09:05 UTC." },
];

/** 14-day qualifying-activity series (derived, never raw commits). */
export const activitySeries = [
  { day: "Sep 26", verified: 1, progress: 1, review: 0 },
  { day: "Sep 27", verified: 0, progress: 2, review: 0 },
  { day: "Sep 28", verified: 1, progress: 0, review: 0 },
  { day: "Sep 29", verified: 2, progress: 1, review: 0 },
  { day: "Sep 30", verified: 1, progress: 1, review: 1 },
  { day: "Oct 01", verified: 3, progress: 0, review: 0 },
  { day: "Oct 02", verified: 1, progress: 2, review: 0 },
  { day: "Oct 03", verified: 0, progress: 1, review: 1 },
  { day: "Oct 04", verified: 2, progress: 1, review: 0 },
  { day: "Oct 05", verified: 1, progress: 0, review: 0 },
  { day: "Oct 06", verified: 2, progress: 2, review: 0 },
  { day: "Oct 07", verified: 1, progress: 1, review: 1 },
  { day: "Oct 08", verified: 0, progress: 2, review: 0 },
  { day: "Oct 09", verified: 1, progress: 0, review: 0 },
];

/** Leaderboard inputs pre-computed from qualifying events (FR-LB-03). */
export const leaderboardFormula =
  "Score = 10 × distinct verified problems + 2 × active days (7-day window). Tie-break: more verified → earlier first verification.";

export const leaderboard = [
  { rank: 1, studentId: "STU001", verifiedProblems: 3, activeDays: 6, score: 42, trend: "+1" },
  { rank: 2, studentId: "STU004", verifiedProblems: 2, activeDays: 5, score: 30, trend: "0" },
  { rank: 3, studentId: "STU002", verifiedProblems: 2, activeDays: 4, score: 28, trend: "-1" },
  { rank: 4, studentId: "STU008", verifiedProblems: 2, activeDays: 3, score: 26, trend: "+2" },
  { rank: 5, studentId: "STU003", verifiedProblems: 2, activeDays: 2, score: 24, trend: "-1" },
  { rank: 6, studentId: "STU006", verifiedProblems: 1, activeDays: 3, score: 16, trend: "0" },
  { rank: 7, studentId: "STU007", verifiedProblems: 1, activeDays: 1, score: 12, trend: "new" },
  { rank: 8, studentId: "STU005", verifiedProblems: 0, activeDays: 1, score: 2, trend: "0" },
];

export function studentById(id) {
  return students.find((s) => s.id === id);
}

export function problemById(id) {
  return problems.find((p) => p.id === id);
}

export function assignmentById(id) {
  return assignments.find((a) => a.id === id);
}
