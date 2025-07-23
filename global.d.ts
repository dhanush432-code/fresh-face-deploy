// global.d.ts
import { Mongoose } from 'mongoose';

declare global {
  var mongooseConnectionCache: { // Using a unique variable name for the cache
    conn: Mongoose | null;
    promise: Promise<Mongoose> | null;
  };
}
export {}; // This line makes it a module.