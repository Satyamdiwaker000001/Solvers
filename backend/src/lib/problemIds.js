import { Counter } from "../models.js";

/** Allocate an immutable problem code used by GitHub filenames. */
export async function nextProblemCode() {
  const doc = await Counter.findOneAndUpdate(
    { _id: "problem" },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  ).lean();
  return `PS-${String(doc.seq).padStart(4, "0")}`;
}
