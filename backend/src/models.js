import mongoose from "mongoose";

const { Schema } = mongoose;

/** Atomic counters (stable internal student IDs: STU0001, ...). */
export const Counter = mongoose.model(
  "Counter",
  new Schema({ _id: { type: String, required: true }, seq: { type: Number, default: 0 } }, { versionKey: false }),
);

/**
 * USER — stable internal identity. GitHub numeric ID is the external key
 * (logins can change); role/status are server-side only, never client-set.
 */
const userSchema = new Schema(
  {
    githubUserId: { type: String, required: true, unique: true, index: true },
    githubLogin: { type: String, required: true },
    displayName: { type: String, default: "" },
    avatarUrl: { type: String, default: "", maxlength: 2000 },
    role: { type: String, enum: ["student", "admin"], default: "student", required: true },
    accountStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
      required: true,
      index: true,
    },
    studentId: { type: String, index: true },
    folder: { type: String, default: "" },
  },
  { timestamps: true },
);
userSchema.index(
  { studentId: 1 },
  { unique: true, partialFilterExpression: { studentId: { $type: "string", $gt: "" } }, name: "unique_student_id" },
);
userSchema.index(
  { folder: 1 },
  { unique: true, partialFilterExpression: { folder: { $type: "string", $gt: "" } }, name: "unique_student_folder" },
);
export const User = mongoose.model("User", userSchema);

/** ADMIN_CREDENTIAL — username + one-way password hash; plaintext is never stored. */
const adminCredentialSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 160 },
    passwordHash: { type: String, required: true, select: false, maxlength: 300 },
    active: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);
export const AdminCredential = mongoose.model("AdminCredential", adminCredentialSchema);

/** ACCESS_REQUEST — at most one *pending* request per user (partial unique index). */
const accessRequestSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", required: true, index: true },
    submittedAt: { type: Date, default: Date.now, required: true },
    decidedAt: { type: Date, default: null },
    decidedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reapplyAfter: { type: Date, default: null, index: true },
    note: { type: String, default: "" },
  },
  { timestamps: false },
);
accessRequestSchema.index(
  { user: 1 },
  { unique: true, partialFilterExpression: { status: "pending" }, name: "one_pending_request_per_user" },
);
accessRequestSchema.index({ status: 1, submittedAt: -1 });
export const AccessRequest = mongoose.model("AccessRequest", accessRequestSchema);

/** PROBLEM — problem statement catalog. */
const problemSchema = new Schema(
  {
    problemCode: { type: String, trim: true, uppercase: true, default: "", maxlength: 20 },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    statement: { type: String, required: true, maxlength: 20_000 },
    topic: { type: String, default: "", trim: true, maxlength: 100 },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], default: "Easy", required: true },
    examples: { type: [String], default: [] },
    constraints: { type: [String], default: [] },
    sourceUrl: { type: String, default: "", maxlength: 2000 },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);
problemSchema.index({ status: 1, createdAt: -1 });
problemSchema.index(
  { problemCode: 1 },
  { unique: true, partialFilterExpression: { problemCode: { $type: "string", $gt: "" } }, name: "unique_problem_code" },
);
export const Problem = mongoose.model("Problem", problemSchema);

/** ASSIGNMENT — one definition + per-student target records (BR-04). */
const targetSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    completionStatus: {
      type: String,
      enum: ["not_started", "in_progress", "verified", "needs_review"],
      default: "not_started",
      required: true,
    },
  },
  { _id: false },
);
const assignmentSchema = new Schema(
  {
    problem: { type: Schema.Types.ObjectId, ref: "Problem", required: true, index: true },
    type: { type: String, enum: ["COMMON", "INDIVIDUAL"], required: true, index: true },
    title: { type: String, default: "", trim: true, maxlength: 200 },
    dueAt: { type: Date, default: null },
    instructions: { type: String, default: "", maxlength: 5000 },
    dailyMinimum: { type: Number, default: 0, min: 0, max: 100 },
    status: { type: String, enum: ["active", "archived"], default: "active", required: true, index: true },
    targets: { type: [targetSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);
assignmentSchema.index({ status: 1, type: 1 });
assignmentSchema.index({ "targets.student": 1 });
export const Assignment = mongoose.model("Assignment", assignmentSchema);

/** TRACKING_POLICY — admin-controlled class target used by rolling reports. */
const trackingPolicySchema = new Schema(
  {
    key: { type: String, unique: true, default: "default" },
    dailyMinimum: { type: Number, min: 0, max: 100, default: 1 },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);
export const TrackingPolicy = mongoose.model("TrackingPolicy", trackingPolicySchema);

/**
 * SUBMISSION + verification artifacts. Written by the ingestion
 * pipeline; the API reads them for reports/leaderboard. Unresolved evidence
 * is safely quarantined with student: null rather than guessing identity.
 */
const submissionSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    assignment: { type: Schema.Types.ObjectId, ref: "Assignment", default: null, index: true },
    repository: { type: String, default: "" },
    commitSha: { type: String, required: true },
    path: { type: String, default: "" },
    status: { type: String, default: "observed" },
    sourceType: { type: String, enum: ["push", "pull_request"], default: "push", index: true },
    pullRequestNumber: { type: Number, default: null },
    outcome: {
      type: String,
      enum: ["VERIFIED", "NEEDS_REVIEW", "INCOMPLETE", "CHECK_FAILED", "INGESTION_PENDING", "ANALYSIS_FAILED"],
      default: "INGESTION_PENDING",
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: ["NEW_PROBLEM_VERIFIED", "MEANINGFUL_PROGRESS", "NO_QUALIFYING_CHANGE", "NEEDS_REVIEW", "CHECK_FAILED"],
      default: "NEEDS_REVIEW",
    },
    additions: { type: Number, default: 0 },
    deletions: { type: Number, default: 0 },
    note: { type: String, default: "" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    reviewComment: { type: String, default: "" },
    firstObservedAt: { type: Date, default: Date.now, required: true },
  },
  { timestamps: false },
);
submissionSchema.index(
  { student: 1, assignment: 1, commitSha: 1 },
  {
    unique: true,
    partialFilterExpression: { student: { $type: "objectId" }, assignment: { $type: "objectId" } },
    name: "unique_student_assignment_submission",
  },
);
submissionSchema.index(
  { student: 1, commitSha: 1, path: 1 },
  {
    unique: true,
    partialFilterExpression: { student: { $type: "objectId" }, assignment: null },
    name: "unique_student_unassigned_submission",
  },
);
submissionSchema.index(
  { commitSha: 1, path: 1 },
  { unique: true, partialFilterExpression: { student: null }, name: "unique_unresolved_submission" },
);
export const Submission = mongoose.model("Submission", submissionSchema);

/** PROGRESS_EVENT — qualifying events only; sourceKey unique => idempotent, no double count. */
const progressEventSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    eventType: { type: String, enum: ["NEW_PROBLEM_VERIFIED", "MEANINGFUL_PROGRESS"], required: true },
    sourceKey: { type: String, required: true, unique: true },
    occurredAt: { type: Date, default: Date.now, required: true, index: true },
    meta: { type: Schema.Types.Mixed, default: undefined },
  },
  { timestamps: false },
);
progressEventSchema.index({ student: 1, occurredAt: -1 });
export const ProgressEvent = mongoose.model("ProgressEvent", progressEventSchema);

/** AUDIT_LOG — append-only by convention (no update/delete routes exist). */
const auditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true },
    targetId: { type: String, required: true },
    detail: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now, required: true },
  },
  { timestamps: false },
);
auditLogSchema.index({ createdAt: -1 });
export const AuditLog = mongoose.model("AuditLog", auditLogSchema);

/** WEBHOOK_EVENT — intake ledger + evidence-worker processing states. */
const webhookEventSchema = new Schema(
  {
    deliveryId: { type: String, required: true, unique: true },
    student: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    event: { type: String, default: "" },
    repo: { type: String, default: "" },
    status: {
      type: String,
      enum: ["PENDING", "SEEN", "PROCESSING", "PROCESSED", "FAILED"],
      default: "PENDING",
      required: true,
      index: true,
    },
    receivedAt: { type: Date, default: Date.now, required: true },
    payload: { type: Schema.Types.Mixed, default: null },
    // Worker bookkeeping (populated by services/evidence.js; never secrets).
    processedAt: { type: Date, default: null },
    commitSha: { type: String, default: "" },
    branch: { type: String, default: "" },
    retryable: { type: Boolean, default: false },
    error: { type: String, default: "", maxlength: 2000 },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    nextRetryAt: { type: Date, default: null, index: true },
    claimedAt: { type: Date, default: null },
    leaseExpiresAt: { type: Date, default: null, index: true },
  },
  { timestamps: false },
);
webhookEventSchema.index({ status: 1, leaseExpiresAt: 1, nextRetryAt: 1, receivedAt: 1 });
export const WebhookEvent = mongoose.model("WebhookEvent", webhookEventSchema);

/** RATE_BUCKET — shared fixed-window counters (works across instances). */
const rateBucketSchema = new Schema(
  {
    _id: { type: String, required: true },
    count: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);
rateBucketSchema.index({ expiresAt: 1 }, { expireAfter: 0 });
export const RateBucket = mongoose.model("RateBucket", rateBucketSchema);

/** SLOT — distributed concurrency leases for expensive intake work. */
const slotSchema = new Schema(
  {
    _id: { type: String, required: true },
    count: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now, required: true },
  },
  { versionKey: false },
);
export const Slot = mongoose.model("Slot", slotSchema);
