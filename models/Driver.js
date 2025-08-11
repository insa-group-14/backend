const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    vehicleDetails: { type: String },
    isAvailable: { type: Boolean, default: false },
    // GeoJSON format for location
    currentLocation: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            default: [0, 0]
        }
    },
    // ... other fields
});

// IMPORTANT: Create the geospatial index
DriverSchema.index({ currentLocation: '2dsphere' });

module.exports = mongoose.model('Driver', DriverSchema);