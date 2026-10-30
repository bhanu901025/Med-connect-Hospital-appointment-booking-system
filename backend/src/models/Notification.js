import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  userEmail: { type: String, required: true, index: true, lowercase: true, trim: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['appointment', 'prescription', 'verification', 'reschedule', 'cancellation', 'system'], 
    default: 'system' 
  },
  referenceId: { type: String, default: '' },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Notification', NotificationSchema);
