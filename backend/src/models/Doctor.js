import mongoose from 'mongoose';

const DoctorSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  specialty: { type: String, required: true, index: true },
  experience: { type: Number, default: 5 },
  rating: { type: Number, default: 4.8 },
  reviews: { type: Number, default: 0 },
  reviewsCount: { type: Number, default: 0 },
  hospital: { type: String, default: 'MedConnect Care Center' },
  fee: { type: Number, default: 800 },
  image: { type: String, default: '' },
  education: { type: String, default: 'MD / MBBS' },
  about: { type: String, default: '' },
  languages: { type: [String], default: ['English', 'Hindi'] },
  location: { type: String, default: 'Delhi', index: true },
  availableToday: { type: Number, default: 6 },
  availableSlots: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'approved',
    index: true 
  }
}, { timestamps: true });

export default mongoose.model('Doctor', DoctorSchema);
