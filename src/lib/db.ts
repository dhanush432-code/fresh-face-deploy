// src/lib/db.ts
import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI!;
if (!MONGO_URI) {
  throw new Error("Please define the MONGO_URI environment variable in .env.local");
}

/**
 * 1) Define the shape of our `global.mongoose` cache:
 */
interface MongooseGlobal {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

/**
 * 2) Tell TypeScript that `globalThis.mongoose` exists and has type `MongooseGlobal`.
 *    Because this file is a module (due to the `import` above), this `declare global`
 *    will correctly merge into the global scope.
 */
declare global {
  var mongoose: MongooseGlobal;
}

console.log("MONGO_URI:", MONGO_URI);


// 3) Initialize `global.mongoose` if it doesn’t already exist (e.g. on first hot reload)
if (!global.mongoose) {
  global.mongoose = { conn: null, promise: null };
}

async function dbConnect(): Promise<typeof mongoose> {
  // 4) If we already connected, reuse that connection
  if (global.mongoose.conn) {
    return global.mongoose.conn;
  }

  // 5) Otherwise, create a new connection promise and store it
  if (!global.mongoose.promise) {
    global.mongoose.promise = mongoose.connect(MONGO_URI).then((m) => m);
  }
  global.mongoose.conn = await global.mongoose.promise;
  return global.mongoose.conn;
}

export default dbConnect;
