const mongoose = require('mongoose');

const RideSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
    pickupLocation: { type: Object, required: true },
    destination: { type: Object, required: true },
    status: { type: String, enum: ['searching', 'accepted', 'in-progress', 'completed', 'cancelled'], default: 'searching' },
    fare: { type: Number },
    rideType: {
        type: String,
        enum: ['private', 'shared'],
        required: true,
        default: 'private'
    },
    // ... other fields
});

module.exports = mongoose.model('Ride', RideSchema);
