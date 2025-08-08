const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    clerkId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String },
    isDriver: { type: Boolean, default: false },
    // ... other fields
});

module.exports = mongoose.model('User', UserSchema);
