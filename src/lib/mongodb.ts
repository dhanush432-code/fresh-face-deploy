// lib/mongodb.ts
import mongoose from 'mongoose';

// Import all models
import '@/models/Appointment';
import '@/models/customermodel';
import '@/models/ebReadings';
import '@/models/invoice';
import '@/models/loyaltyTransaction';
import '@/models/membershipPlan';
import '@/models/permission';
import '@/models/Procurement';
import '@/models/Product';
import '@/models/ProductBrand';
import '@/models/ProductSubCategory';
import '@/models/role';
import '@/models/ServiceCategory';
import '@/models/ServiceItem';
import '@/models/ServiceSubCategory';
import '@/models/Stylist';
import '@/models/user';



const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

// Use the variable name from global.d.ts
let cached = global.mongooseConnectionCache;

if (!cached) {
  // Initialize the cache on the global object
  cached = global.mongooseConnectionCache = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    console.log("DB: Using cached MongoDB connection.");
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Disable Mongoose's buffering if you manage connections explicitly
      // useNewUrlParser: true, // These are generally default now, but good to be aware of
      // useUnifiedTopology: true,
    };
    console.log("DB: Attempting to establish new MongoDB connection...");
    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongooseInstance) => {
      console.log("DB: New MongoDB connection established successfully.");
      return mongooseInstance;
    }).catch(error => {
        console.error("DB: MongoDB connection promise failed:", error);
        cached.promise = null; // Reset promise on error so it can be retried
        throw error; // Re-throw error to be caught by caller
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    // If the promise was already rejected, this await will throw.
    // The promise is reset in the .catch above, so a new attempt can be made.
    console.error("DB: Awaiting connection promise failed:", e);
    throw e; // Re-throw error
  }
  return cached.conn;
}

export default connectToDatabase;