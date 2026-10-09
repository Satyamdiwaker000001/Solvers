import dotenv from "dotenv";
import { loadConfig } from "./config.js";
import { connectDb, disconnectDb } from "./db.js";
import { createApp } from "./app.js";

dotenv.config();

async function main() {
  const cfg = loadConfig();
  await connectDb(cfg.mongoUri);
  console.log(`[backend] MongoDB connected (${cfg.nodeEnv})`);

  const app = createApp(cfg);
  const server = app.listen(cfg.port, () => {
    console.log(`[backend] Listening on :${cfg.port} (env=${cfg.nodeEnv})`);
  });

  async function shutdown(signal) {
    console.log(`[backend] ${signal} received — draining...`);
    server.close(async () => {
      try {
        await disconnectDb();
      } finally {
        process.exit(0);
      }
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  }
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error(`[backend] Fatal startup error: ${err.message}`);
  process.exit(1);
});
