import mongoose from "mongoose";

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
