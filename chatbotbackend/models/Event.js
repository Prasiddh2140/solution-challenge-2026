import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: String,
  ngoId: mongoose.Schema.Types.ObjectId,
  date: Date,
  location: String,
  required_skills: [String],
  status: { type: String, default: 'open' }
});

export default mongoose.models.Event || mongoose.model('Event', eventSchema);
