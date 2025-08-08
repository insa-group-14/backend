const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    vehicleDetails: { type: String },
    available: { type: Boolean, default: false },
    currentLocation: { type: Object },
    // ... other fields
});

module.exports = mongoose.model('Driver', DriverSchema);