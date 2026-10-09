import mongoose from "mongoose";
import { Assignment, Problem, User } from "../models.js";
import { badRequest, forbidden, notFound } from "../middleware/errors.js";
import { recordAudit } from "../middleware/audit.js";

/** Assignments may only reference published problems (publish-then-assign). */
async function getPublishedProblem(problemId) {
  const problem = await Problem.findById(problemId);
  if (!problem) throw notFound("Problem not found");
  if (problem.status !== "published") {
    throw badRequest("Only published problems can be assigned; publish the problem first");
  }
  return problem;
}

async function resolveIndividualTargets(studentIds) {
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw badRequest("Individual assignments require at least one student", [{ path: "studentIds", message: "Select at least one approved student" }]);
  }
  const unique = [...new Set(studentIds.map(String))];
  const students = await User.find({ _id: { $in: unique }, role: "student" });
  const byId = new Map(students.map((s) => [String(s._id), s]));
  const bad = [];
  for (const id of unique) {
    const s = byId.get(id);
    if (!s) bad.push({ id, reason: "unknown student" });
    else if (s.accountStatus !== "approved") bad.push({ id, reason: `account is ${s.accountStatus}, not approved` });
  }
  if (bad.length > 0) {
    throw badRequest("One or more selected students are invalid or not approved", bad);
  }
  return unique.map((id) => ({ student: byId.get(id)._id, completionStatus: "not_started" }));
}

async function resolveCommonTargets() {
  const students = await User.find({ role: "student", accountStatus: "approved" }).select("_id").lean();
  if (students.length === 0) {
    throw badRequest("No approved students to assign; approve students before publishing common work");
  }
  return students.map((s) => ({ student: s._id, completionStatus: "not_started" }));
}

/**
 * Create an assignment. COMMON fans out to every approved student (one
 * definition, per-student target records — BR-04). INDIVIDUAL targets exactly
 * the validated selection (BR-05).
 */
export async function createAssignment({ adminUser, problemId, type, title = "", dueAt = null, instructions = "", studentIds = [] }) {
  const problem = await getPublishedProblem(problemId);
  const targets = type === "COMMON" ? await resolveCommonTargets() : await resolveIndividualTargets(studentIds);
  const assignment = await Assignment.create({
    problem: problem._id,
    type,
    title: String(title || "").slice(0, 200),
    dueAt,
    instructions: String(instructions || "").slice(0, 5000),
    status: "active",
    targets,
    createdBy: adminUser._id,
  });
  await recordAudit({
    actorId: adminUser._id,
    action: "ASSIGNMENT_CREATE",
    targetType: "assignment",
    targetId: assignment._id,
    detail: `${type} assignment of problem ${problem._id} to ${targets.length} student(s).`,
  });
  return assignment.toObject();
}

function serializeAssignment(a, { forStudentId = null } = {}) {
  const targets = Array.isArray(a.targets) ? a.targets : [];
  const visibleTargets = forStudentId
    ? targets.filter((t) => String(t.student && t.student._id ? t.student._id : t.student) === String(forStudentId))
    : targets;
  return {
    id: String(a._id),
    problemId: String(a.problem),
    problem: a.problem && a.problem.title ? {
      id: String(a.problem._id),
      title: a.problem.title,
      topic: a.problem.topic,
      difficulty: a.problem.difficulty,
      statement: a.problem.statement || "",
      examples: a.problem.examples || [],
      constraints: a.problem.constraints || [],
      sourceUrl: a.problem.sourceUrl || "",
    } : undefined,
    type: a.type,
    title: a.title || "",
    dueAt: a.dueAt || null,
    instructions: a.instructions || "",
    status: a.status,
    targets: visibleTargets.map((t) => ({
      studentId: String(t.student && t.student._id ? t.student._id : t.student),
      completionStatus: t.completionStatus,
    })),
    targetCount: targets.length,
    createdAt: a.createdAt,
  };
}

/** Students see common work + their own individual targets; other students' targets are hidden. */
export async function listAssignmentsForUser(user) {
  const docs = await Assignment.find({
    status: "active",
    $or: [{ type: "COMMON" }, { "targets.student": user._id }],
  })
    .populate("problem", "title topic difficulty statement examples constraints sourceUrl")
    .sort({ createdAt: -1 })
    .lean();
  // COMMON assignments apply to every approved student by definition; an
  // explicit target row is only required for INDIVIDUAL ones.
  return docs.filter((a) => a.type === "INDIVIDUAL"
    ? a.targets.some((t) => String(t.student) === String(user._id))
    : true).map((a) => serializeAssignment(a, { forStudentId: user._id }));
}

export async function getAssignmentForUser(user, assignmentId) {
  if (!mongoose.isValidObjectId(assignmentId)) throw notFound("Assignment not found");
  const doc = await Assignment.findById(assignmentId).populate("problem").lean();
  if (!doc || doc.status !== "active") throw notFound("Assignment not found");
  const entitled = doc.type === "COMMON"
    || doc.targets.some((t) => String(t.student) === String(user._id));
  if (!entitled) throw forbidden("FORBIDDEN", "You are not assigned this work");
  return serializeAssignment(doc, { forStudentId: user._id });
}

export async function listAssignmentsForAdmin({ page, limit }) {
  const filter = {};
  const total = await Assignment.countDocuments(filter);
  const docs = await Assignment.find(filter)
    .populate("problem", "title topic difficulty statement examples constraints sourceUrl")
    .populate("targets.student", "displayName githubLogin studentId")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  return { docs: docs.map((a) => serializeAssignment(a)), total };
}

export { serializeAssignment };
