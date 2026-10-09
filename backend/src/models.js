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
    role: { type: String, enum: ["student", "admin"], default: "student", required: true },
    accountStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
      required: true,
      index: true,
    },
    studentId: { type: String, unique: true, sparse: true, index: true },
    folder: { type: String, default: "" },
  },
  { timestamps: true },
);
export const User = mongoose.model("User", userSchema);

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
    status: { type: String, enum: ["active", "archived"], default: "active", required: true, index: true },
    targets: { type: [targetSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);
assignmentSchema.index({ status: 1, type: 1 });
assignmentSchema.index({ "targets.student": 1 });
export const Assignment = mongoose.model("Assignment", assignmentSchema);

/**
 * SUBMISSION + verification artifacts. Written by the (deferred) ingestion
 * pipeline; the API only reads them for reports/leaderboard. Kept so the
 * data model matches the approved ERD and leaderboard math is testable.
 */
const submissionSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    assignment: { type: Schema.Types.ObjectId, ref: "Assignment", required: true, index: true },
    repository: { type: String, default: "" },
    commitSha: { type: String, required: true },
    path: { type: String, default: "" },
    status: { type: String, default: "observed" },
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
    firstObservedAt: { type: Date, default: Date.now, required: true },
  },
  { timestamps: false },
);
submissionSchema.index({ student: 1, assignment: 1, commitSha: 1 }, { unique: true });
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
    // Worker bookkeeping (populated by services/evidence.js; never secrets).
    processedAt: { type: Date, default: null },
    commitSha: { type: String, default: "" },
    branch: { type: String, default: "" },
    retryable: { type: Boolean, default: false },
    error: { type: String, default: "", maxlength: 2000 },
  },
  { timestamps: false },
);
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
