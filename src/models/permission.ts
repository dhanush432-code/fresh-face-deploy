// models/permission.ts
import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  resource: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  action: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  permission: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  }
}, { timestamps: true });

// Create compound index
permissionSchema.index({ resource: 1, action: 1 });

export default mongoose.models.Permission || mongoose.model('Permission', permissionSchema);