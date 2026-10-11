import mongoose from "mongoose";
import dns from "node:dns";

// Windows local development DNS fallback for MongoDB Atlas SRV records
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // ignore if runtime restricts dns.setServers
}

/** Connect with sane timeouts; callers handle failure (startup aborts, readiness fails). */
export async function connectDb(mongoUri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
    maxPoolSize: 20,
    minPoolSize: 2,
    heartbeatFrequencyMS: 10_000,
  });
  return mongoose.connection;
}

export async function disconnectDb() {
  await mongoose.disconnect();
}

export function dbState() {
  // 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
  return mongoose.connection.readyState;
}
