// models/Driver.js

const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    vehicleDetails: { type: String },
    isAvailable: { type: Boolean, default: false },
    rideStatus: {
        type: String,
        enum: ['inactive', 'on_private_ride', 'on_shared_ride'],
        default: 'inactive'
    },
    rideQueue: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ride'
    }],
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
});

// IMPORTANT: Create the geospatial index
DriverSchema.index({ currentLocation: '2dsphere' });

module.exports = mongoose.model('Driver', DriverSchema);