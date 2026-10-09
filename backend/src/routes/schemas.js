import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Must be a MongoDB ObjectId");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const accessRequestCreateSchema = z.object({
  note: z.string().trim().max(500).optional().default(""),
});

export const problemCreateSchema = z.object({
  title: z.string().trim().min(4).max(200),
  statement: z.string().trim().min(20).max(20_000),
  topic: z.string().trim().max(100).optional().default(""),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional().default("Easy"),
  examples: z.array(z.string().max(2000)).max(50).optional().default([]),
  constraints: z.array(z.string().max(2000)).max(50).optional().default([]),
  sourceUrl: z.string().trim().max(2000).optional().default(""),
  status: z.enum(["draft", "published", "archived"]).optional().default("draft"),
}).strict();

export const problemPatchSchema = problemCreateSchema.partial().strict();

export const assignmentCreateSchema = z.object({
  problemId: objectId,
  type: z.enum(["COMMON", "INDIVIDUAL"]),
  title: z.string().trim().max(200).optional().default(""),
  dueAt: z.string().datetime({ offset: true }).nullable().optional().default(null),
  instructions: z.string().max(5000).optional().default(""),
  studentIds: z.array(objectId).max(500).optional().default([]),
}).strict();

export const reviewSchema = z.object({
  decision: z.enum(["accept", "sendback"]),
  comment: z.string().trim().max(2000).optional().default(""),
}).strict();

export const accessRequestListSchema = paginationSchema.extend({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
});

export const problemListSchema = paginationSchema.extend({
  status: z.enum(["draft", "published", "archived"]).optional(),
});
