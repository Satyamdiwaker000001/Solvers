import "dotenv/config";
import { connectDb, disconnectDb } from "../src/db.js";
import { Problem } from "../src/models.js";
import { nextProblemCode } from "../src/lib/problemIds.js";

try {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  await connectDb(process.env.MONGODB_URI);
  const docs = await Problem.find({ $or: [{ problemCode: { $exists: false } }, { problemCode: "" }] }).sort({ createdAt: 1, _id: 1 });
  for (const problem of docs) {
    problem.problemCode = await nextProblemCode();
    await problem.save();
    console.log(`${problem.problemCode} -> ${problem.title}`);
  }
  console.log(`Backfilled ${docs.length} problem code(s).`);
} finally {
  await disconnectDb();
}
