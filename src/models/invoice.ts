// models/invoice.ts
import mongoose, { Schema, model, models } from 'mongoose';

const lineItemSchema = new Schema({
  itemType: {
    type: String,
    enum: ['service', 'product','fee'],
    required: true
  },
  // --- MODIFIED: Changed from ObjectId to String ---
  // This allows us to store both real IDs and special static IDs like the membership fee.
  itemId: { 
    type: String,
    required: true
  },
  // --- END MODIFICATION ---
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1
  },
  unitPrice: {
    type: Number,
    required: true
  },
  membershipRate: {
    type: Number,
    sparse: true
  },
  finalPrice: {
    type: Number,
    required: true
  },
  // NOTE: The per-item membershipDiscount is a bit redundant since the total is stored
  // on the main invoice. You could consider removing it for simplicity in the future.
  membershipDiscount: { 
    type: Number,
    default: 0
  }
}, { _id: false });

const invoiceSchema = new Schema({
  invoiceNumber: { 
    type: String,
    unique: true,
    sparse: true,
  },
  
  appointmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true,
    index: true
  },
  
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true
  },
  
  stylistId: {
    type: Schema.Types.ObjectId,
    ref: 'Stylist',
    required: true
  },
  
  billingStaffId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  lineItems: [lineItemSchema],
  
  serviceTotal: {
    type: Number,
    required: true,
    default: 0
  },
  
  productTotal: {
    type: Number,
    required: true,
    default: 0
  },
  
  subtotal: {
    type: Number,
    required: true
  },
  
  membershipDiscount: {
    type: Number,
    default: 0
  },
  
  // --- ADDED: To store manual discount details ---
  manualDiscount: {
    type: { // 'fixed' or 'percentage'
      type: String,
      enum: ['fixed', 'percentage', null],
      default: null
    },
    value: { // The value entered by the user (e.g., 10 for 10% or 100 for ₹100)
      type: Number,
      default: 0
    },
    appliedAmount: { // The final calculated discount in Rupees
      type: Number,
      default: 0
    }
  },
  // --- END ADDED SECTION ---

  grandTotal: {
    type: Number,
    required: true
  },
  
  paymentDetails: {
    cash: { type: Number, default: 0, min: 0 },
    card: { type: Number, default: 0, min: 0 },
    upi: { type: Number, default: 0, min: 0 },
    other: { type: Number, default: 0, min: 0 }
  },
  
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Pending', 'Refunded'],
    default: 'Paid'
  },
  
  notes: {
    type: String,
    trim: true
  },
  
  customerWasMember: {
    type: Boolean,
    default: false
  },
  
  membershipGrantedDuringBilling: {
    type: Boolean,
    default: false
  }
  
}, { timestamps: true });

// Pre-save middleware to generate invoice number
invoiceSchema.pre('save', async function(next) {
  if (this.isNew && !this.invoiceNumber) {
    // A robust way to count to avoid race conditions if you have high traffic
    const lastInvoice = await mongoose.model('Invoice').findOne().sort({ createdAt: -1 });
    const lastNumber = lastInvoice && lastInvoice.invoiceNumber ? parseInt(lastInvoice.invoiceNumber.split('-')[1]) : 0;
    this.invoiceNumber = `INV-${String(lastNumber + 1).padStart(6, '0')}`;
  }
  next();
});

const Invoice = models.Invoice || model('Invoice', invoiceSchema);
export default Invoice;