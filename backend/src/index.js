import dotenv from "dotenv";
import { loadConfig } from "./config.js";
import { connectDb, disconnectDb } from "./db.js";
import { createApp } from "./app.js";
import { startWebhookWorker, stopWebhookWorker } from "./services/evidence.js";
import { RateBucket } from "./models.js";

dotenv.config();

async function main() {
  const cfg = loadConfig();
  await connectDb(cfg.mongoUri);
  console.log(`[backend] MongoDB connected (${cfg.nodeEnv})`);

  if (!cfg.isProd) {
    // Clear any lingering auth rate buckets on dev restart so developers aren't locked out
    await RateBucket.deleteMany({ _id: { $regex: "^rl:auth:" } }).catch(() => {});
  }

  const app = createApp(cfg);
  const server = app.listen(cfg.port, () => {
    console.log(`[backend] Listening on :${cfg.port} (env=${cfg.nodeEnv})`);
  });
  server.requestTimeout = 45_000;
  server.headersTimeout = 15_000;
  server.keepAliveTimeout = 5_000;

  const worker = startWebhookWorker({
    app,
    cfg,
    fetchCommit: (sha) => app.get("github").fetchCommit({ repoFullName: cfg.repo.fullName, sha, token: cfg.github.repoToken }),
  });
  app.set("webhookWorker", worker);

  async function shutdown(signal) {
    console.log(`[backend] ${signal} received — draining...`);
    await stopWebhookWorker();
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
