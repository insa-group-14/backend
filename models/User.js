const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    clerkId: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    phoneNumber: {
        type: String,
        default: '',
    },
    profilePictureUrl: {
        type: String,
        default: '',
    },
    // This field is critical for your app's logic
    userType: {
        type: String,
        enum: ['rider', 'driver'],
        default: 'rider',
    },
    // This will link to a separate Driver model for vehicle info, etc.
    driverDetails: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
    },
    averageRating: {
        type: Number,
        default: 5,
    },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);