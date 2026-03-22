import mongoose from 'mongoose';

const volunteerSchema = new mongoose.Schema({
    name: String,
    skills: [String],
    location: String,
    availability: [String]
});

export default mongoose.models.Volunteer || mongoose.model('Volunteer', volunteerSchema);
