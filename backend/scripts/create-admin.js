import "dotenv/config";
import readline from "node:readline";
import { connectDb, disconnectDb } from "../src/db.js";
import { AdminCredential } from "../src/models.js";
import { hashPassword } from "../src/lib/passwords.js";

function question(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(prompt, (answer) => { rl.close(); resolve(answer.trim()); }));
}

function secret(prompt) {
  if (process.env.ADMIN_SETUP_PASSWORD) return Promise.resolve(process.env.ADMIN_SETUP_PASSWORD);
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    let value = "";
    process.stdout.write(prompt);
    input.setRawMode?.(true);
    input.resume();
    const onData = (chunk) => {
      const key = String(chunk);
      if (key === "\u0003") { cleanup(); reject(new Error("Cancelled")); return; }
      if (key === "\r" || key === "\n") { cleanup(); process.stdout.write("\n"); resolve(value); return; }
      if (key === "\u007f" || key === "\b") { value = value.slice(0, -1); return; }
      value += key;
    };
    const cleanup = () => { input.off("data", onData); input.setRawMode?.(false); input.pause(); };
    input.on("data", onData);
  });
}

const username = (process.env.ADMIN_SETUP_USERNAME || await question("Admin username: ")).trim().toLowerCase();
const password = String(await secret("Admin password (min 12 characters): "));
if (!/^[a-z0-9][a-z0-9._@+-]{2,159}$/.test(username)) throw new Error("Username contains unsupported characters");
if (password.length < 12) throw new Error("Password must contain at least 12 characters");

try {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  await connectDb(process.env.MONGODB_URI);
  const adminCount = await AdminCredential.countDocuments();
  if (adminCount >= 2) throw new Error("Maximum of 2 admins are allowed according to SRS.");
  
  const exists = await AdminCredential.exists({ username });
  if (exists) throw new Error(`Admin username already exists: ${username}`);
  await AdminCredential.create({ username, passwordHash: hashPassword(password) });
  console.log(`Admin credential created for ${username}. Plaintext password was not stored. (Total Admins: ${adminCount + 1}/2)`);
} finally {
  await disconnectDb();
}
