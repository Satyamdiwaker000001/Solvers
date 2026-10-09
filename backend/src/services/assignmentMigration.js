/**
 * Assignment & Submission Reconciliation Service (Phase G).
 *
 * Guarantees:
 * - Read-only inspection and diagnostic reporting by default.
 * - Identifies orphaned submissions, invalid assignment references,
 *   unlinked verified progress, and target inconsistencies.
 * - NEVER guesses an assignment or student identity.
 * - NEVER deletes historical submissions or evidence.
 * - NEVER automatically marks records verified.
 * - Idempotent and safe to run in production.
 */

import { Assignment, Problem, ProgressEvent, Submission, User } from "../models.js";

/**
 * Scan Submissions, Assignments, Problems, and ProgressEvents to detect
 * relational inconsistencies, orphaned records, or data anomalies.
 */
export async function detectAssignmentInconsistencies() {
  const [submissions, assignments, progressEvents, users, problems] = await Promise.all([
    Submission.find({}).lean(),
    Assignment.find({}).lean(),
    ProgressEvent.find({}).lean(),
    User.find({}).select("_id role accountStatus").lean(),
    Problem.find({}).select("_id status").lean(),
  ]);

  const userIds = new Set(users.map((u) => String(u._id)));
  const problemIds = new Set(problems.map((p) => String(p._id)));
  const assignmentMap = new Map(assignments.map((a) => [String(a._id), a]));
  const submissionMap = new Map(submissions.map((s) => [String(s._id), s]));

  const invalidStudentReferences = [];
  const invalidAssignmentReferences = [];
  const individualTargetMismatches = [];
  const verifiedWithoutAssignment = [];
  const orphanedProgressEvents = [];
  const assignmentsWithMissingProblems = [];

  // 1. Inspect Submissions
  for (const s of submissions) {
    // Check student reference
    if (s.student && !userIds.has(String(s.student))) {
      invalidStudentReferences.push({
        submissionId: String(s._id),
        invalidStudentId: String(s.student),
        commitSha: s.commitSha,
        path: s.path,
      });
    }

    // Check assignment reference
    if (s.assignment) {
      const asg = assignmentMap.get(String(s.assignment));
      if (!asg) {
        invalidAssignmentReferences.push({
          submissionId: String(s._id),
          invalidAssignmentId: String(s.assignment),
          commitSha: s.commitSha,
          path: s.path,
        });
      } else if (asg.type === "INDIVIDUAL" && s.student) {
        const hasTarget = Array.isArray(asg.targets) && asg.targets.some((t) => String(t.student) === String(s.student));
        if (!hasTarget) {
          individualTargetMismatches.push({
            submissionId: String(s._id),
            assignmentId: String(asg._id),
            studentId: String(s.student),
            reason: "Student submitted to individual assignment not targeting them",
          });
        }
      }
    }

    // Check VERIFIED outcome has both student and assignment
    if (s.outcome === "VERIFIED") {
      if (!s.assignment || !s.student) {
        verifiedWithoutAssignment.push({
          submissionId: String(s._id),
          studentId: s.student ? String(s.student) : null,
          assignmentId: s.assignment ? String(s.assignment) : null,
          commitSha: s.commitSha,
        });
      }
    }
  }

  // 2. Inspect ProgressEvents
  for (const pe of progressEvents) {
    if (!userIds.has(String(pe.student))) {
      orphanedProgressEvents.push({
        eventId: String(pe._id),
        sourceKey: pe.sourceKey,
        invalidStudentId: String(pe.student),
        reason: "ProgressEvent references non-existent student",
      });
    }

    if (pe.sourceKey && pe.sourceKey.startsWith("submission:")) {
      const subId = pe.sourceKey.slice("submission:".length);
      const sub = submissionMap.get(subId);
      if (!sub) {
        orphanedProgressEvents.push({
          eventId: String(pe._id),
          sourceKey: pe.sourceKey,
          reason: "ProgressEvent source submission does not exist",
        });
      } else if (sub.outcome !== "VERIFIED") {
        orphanedProgressEvents.push({
          eventId: String(pe._id),
          sourceKey: pe.sourceKey,
          reason: `ProgressEvent source submission is ${sub.outcome}, not VERIFIED`,
        });
      }
    }
  }

  // 3. Inspect Assignments
  for (const a of assignments) {
    if (a.problem && !problemIds.has(String(a.problem))) {
      assignmentsWithMissingProblems.push({
        assignmentId: String(a._id),
        problemId: String(a.problem),
        title: a.title,
      });
    }
  }

  const hasInconsistencies =
    invalidStudentReferences.length > 0 ||
    invalidAssignmentReferences.length > 0 ||
    individualTargetMismatches.length > 0 ||
    verifiedWithoutAssignment.length > 0 ||
    orphanedProgressEvents.length > 0 ||
    assignmentsWithMissingProblems.length > 0;

  return {
    totalSubmissions: submissions.length,
    totalAssignments: assignments.length,
    totalProgressEvents: progressEvents.length,
    hasInconsistencies,
    summary: {
      invalidStudentReferencesCount: invalidStudentReferences.length,
      invalidAssignmentReferencesCount: invalidAssignmentReferences.length,
      individualTargetMismatchesCount: individualTargetMismatches.length,
      verifiedWithoutAssignmentCount: verifiedWithoutAssignment.length,
      orphanedProgressEventsCount: orphanedProgressEvents.length,
      assignmentsWithMissingProblemsCount: assignmentsWithMissingProblems.length,
    },
    issues: {
      invalidStudentReferences,
      invalidAssignmentReferences,
      individualTargetMismatches,
      verifiedWithoutAssignment,
      orphanedProgressEvents,
      assignmentsWithMissingProblems,
    },
  };
}

/**
 * Reconcile assignment and submission inconsistencies.
 * In dryRun mode (default), returns diagnostic actions without altering records.
 */
export async function reconcileAssignments({ dryRun = true } = {}) {
  const diagnosis = await detectAssignmentInconsistencies();
  const actions = [];

  if (diagnosis.hasInconsistencies) {
    actions.push({
      type: "DIAGNOSIS_WARNING",
      message: "Data inconsistencies detected. Manual administrative review required; historical data is preserved.",
    });
  } else {
    actions.push({
      type: "DIAGNOSIS_OK",
      message: "All assignments, submissions, and progress events have consistent relational integrity.",
    });
  }

  return {
    dryRun,
    diagnosis,
    actions,
  };
}
