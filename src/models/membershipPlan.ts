// models/membershipPlan.ts
import mongoose from 'mongoose'; // Correct: Schema, Document, Model types are part of the default mongoose import

// No need for separate IMembershipPlan interface if you're not using it for strict method/static typing on the model itself,
// but it's good practice if you do. For schema definition alone, this is fine.

const membershipPlanSchema = new mongoose.Schema({ // Correct: using mongoose.Schema
  name: {
    type: String,
    required: [true, "Membership plan name is required."],
    unique: true,
    trim: true
  },
  price: {
    type: Number,
    required: [true, "Membership plan price is required."],
    min: [0, "Price cannot be negative."]
  },
  durationDays: {
    type: Number,
    required: [true, "Membership plan duration (in days) is required."],
    min: [1, "Duration must be at least 1 day."]
  },
  description: {
    type: String,
    trim: true
  },
  benefits: [{
    type: String,
    trim: true
  }],
  discountPercentageServices: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
}, { timestamps: true });

// Correct and crucial pattern for Next.js/serverless:
export default mongoose.models.MembershipPlan || mongoose.model('MembershipPlan', membershipPlanSchema);