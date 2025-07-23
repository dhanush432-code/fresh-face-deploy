// models/role.ts
import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  permissions: [{
    type: String,
    required: true
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isSystemRole: {
    type: Boolean,
    default: false // Super admin and other system roles
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
   updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
}, { timestamps: true });

// Index for faster permission checks
roleSchema.index({ name: 1, isActive: 1 });

export default mongoose.models.Role || mongoose.model('Role', roleSchema);