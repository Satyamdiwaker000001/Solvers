import { Counter } from "../models.js";

/** Allocate the next stable internal student ID (STU0001, …) atomically. */
export async function nextStudentId(folderRoot = "students/") {
  const doc = await Counter.findOneAndUpdate(
    { _id: "student" },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  ).lean();
  const id = `STU${String(doc.seq).padStart(4, "0")}`;
  return { studentId: id, folder: `${folderRoot}${id}` };
}
