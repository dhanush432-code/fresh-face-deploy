// models/customermodel.ts
import mongoose, { Document, Model, Schema } from 'mongoose';
import { encrypt, decrypt, createSearchHash } from '@/lib/crypto';

export interface ICustomer extends Document {
  // --- Encrypted Fields ---
  name: string;
  phoneNumber: string;
  email?: string;
     
  // --- Search & Index Fields ---
  phoneHash: string;
  searchableName: string;
  last4PhoneNumber?: string;
  phoneSearchIndex: string[]; // --- ADD THIS --- For type safety

  // --- Other Existing Fields ---
  dob?: Date;
  survey?: string;
  loyaltyPoints: number;
  isMembership: boolean;
  membershipBarcode?: string;
  membershipPurchaseDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  gender?: 'male' | 'female' | 'other';

  // --- Methods ---
  toggleMembership(status?: boolean, customBarcode?: string): Promise<ICustomer>;
}

export interface ICustomerModel extends Model<ICustomer> {
  findByBarcode(barcode: string): Promise<ICustomer | null>;
  checkBarcodeExists(barcode: string): Promise<boolean>;
}

const customerSchema = new Schema({
  // --- Sensitive Fields ---
  name: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  email: { 
    type: String, 
    required: false,
    unique: true,
    sparse: true
  },

  // --- Search & Index Fields ---
  phoneHash: { type: String, required: true, unique: true, index: true },
  searchableName: { type: String, required: true,index: true, lowercase: true },
  last4PhoneNumber: { type: String, index: true },

  // --- ADD THIS ---
  // This new field will store the array of searchable hashes.
  // The 'index: true' is critical for making searches fast.
  phoneSearchIndex: {
    type: [String],
    index: true,
  },

  // --- Other Existing Fields ---
  dob: { type: Date, required: false },
  survey: { type: String, required: false, trim: true },
  loyaltyPoints: { type: Number, default: 0, min: 0 },
  isMembership: { type: Boolean, default: false, index: true },
  membershipBarcode: { type: String, unique: true, sparse: true, index: true },
  membershipPurchaseDate: { type: Date, sparse: true },
  isActive: { type: Boolean, default: true, index: true },
  gender: { type: String, enum: ['male', 'female', 'other'], required: false, lowercase: true },
}, { timestamps: true });

// --- Mongoose Middleware for Decryption (NO CHANGES NEEDED HERE) ---
// The phoneSearchIndex field contains hashes, not encrypted data,
// so it does NOT need to be added to this decryption logic.
const decryptFields = (doc: any) => {
  if (doc) {
    if (doc.name) doc.name = decrypt(doc.name);
    if (doc.email) doc.email = decrypt(doc.email);
    if (doc.phoneNumber) doc.phoneNumber = decrypt(doc.phoneNumber);
  }
};

customerSchema.post('findOne', decryptFields);
customerSchema.post('find', (docs) => docs.forEach(decryptFields));
customerSchema.post('findOneAndUpdate', decryptFields);

// --- Existing Methods & Statics (Unchanged) ---
customerSchema.methods.toggleMembership = function (this: ICustomer, status = true, customBarcode?: string): Promise<ICustomer> {
  // ... (no changes here)
  this.isMembership = status;
  if (status) {
    this.membershipPurchaseDate = new Date();
    if (customBarcode) {
      this.membershipBarcode = customBarcode.trim().toUpperCase();
    }
  } else {
    this.membershipBarcode = undefined;
  }
  return this.save();
};

customerSchema.statics.findByBarcode = function (this: ICustomerModel, barcode: string): Promise<ICustomer | null> {
  // ... (no changes here)
  return this.findOne({
    membershipBarcode: barcode.trim().toUpperCase(),
    isMembership: true,
    isActive: true
  });
};

customerSchema.statics.checkBarcodeExists = function (this: ICustomerModel, barcode: string): Promise<boolean> {
  // ... (no changes here)
  return this.exists({
    membershipBarcode: barcode.trim().toUpperCase(),
    isActive: true
  }).then(result => !!result);
};

const Customer = (mongoose.models.Customer as ICustomerModel) ||
  mongoose.model<ICustomer, ICustomerModel>('Customer', customerSchema);

export default Customer;