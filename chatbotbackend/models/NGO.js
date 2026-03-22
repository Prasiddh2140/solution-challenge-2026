import mongoose from 'mongoose';

const ngoSchema = new mongoose.Schema({
    name: String,
    description: String,
    location: String,
    contact_email: String,
    categories: [String]
});

export default mongoose.models.NGO || mongoose.model('NGO', ngoSchema);
