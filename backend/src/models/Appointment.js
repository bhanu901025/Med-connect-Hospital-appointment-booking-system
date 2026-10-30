import mongoose from 'mongoose';

const AppointmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  doctorId: { type: String, required: true, index: true },
  doctorName: { type: String, default: '' },
  patientName: { type: String, required: true },
  patientEmail: { type: String, required: true, index: true },
  patientPhone: { type: String, default: '' },
  date: { type: String, required: true, index: true },
  time: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['upcoming', 'completed', 'cancelled', 'pending'], 
    default: 'upcoming',
    index: true 
  },
  type: { type: String, enum: ['New', 'Follow-up', 'Video', 'In-person'], default: 'In-person' },
  age: { type: String, default: '30' },
  gender: { type: String, default: 'Not specified' },
  problem: { type: String, default: '' },
  fee: { type: Number, default: 800 },
  payment: { type: String, default: 'Paid via Card' },
  notes: { type: String, default: '' },
  prescription: { type: String, default: '' },
  rescheduleHistory: [{
    previousDate: String,
    previousTime: String,
    rescheduledAt: { type: Date, default: Date.now },
    rescheduledBy: String
  }]
}, { timestamps: true });

// Slot protection: Prevent double-booking the same doctor at the same date and time for active appointments
AppointmentSchema.index(
  { doctorId: 1, date: 1, time: 1 }, 
  { unique: true, partialFilterExpression: { status: { $ne: 'cancelled' } } }
);

export default mongoose.model('Appointment', AppointmentSchema);
