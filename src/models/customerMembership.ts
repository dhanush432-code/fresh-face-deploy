// models/customerMembership.ts
import mongoose from 'mongoose';

const customerMembershipSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    // The compound index below is more efficient, so we don't need index: true here anymore.
  },
  membershipPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MembershipPlan',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Expired', 'Cancelled', 'PendingPayment'],
    default: 'Active',
    // The compound index below is more efficient, so we don't need index: true here anymore.
  },
  pricePaid: {
    type: Number,
    required: true
  },
  originalInvoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    sparse: true
  },
}, { timestamps: true });


// ===> ADD THIS COMPOUND INDEX <===
// This index is optimized for your API query that finds active memberships for a customer.
// It makes finding a document by customerId, status, and endDate range extremely fast.
customerMembershipSchema.index({ customerId: 1, status: 1, endDate: 1 });


export default mongoose.models.CustomerMembership || mongoose.model('CustomerMembership', customerMembershipSchema);