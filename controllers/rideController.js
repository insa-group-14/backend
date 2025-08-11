// controllers/rideController.js
const Ride = require('../models/Ride');
const User = require('../models/User');

/**
 * @route   POST /api/rides/request
 * @desc    Create a new ride request
 * @access  Private
 */
exports.requestRide = async (req, res) => {
    // req.auth.userId is the Clerk user ID, available from the middleware
    const clerkId = req.auth.userId;

    // The frontend should send the pickup and destination coordinates in the body
    const { pickupLocation, destination } = req.body;

    if (!pickupLocation || !destination) {
        return res.status(400).json({ message: 'Pickup location and destination are required.' });
    }

    try {
        // Find the user in your database using their Clerk ID
        const user = await User.findOne({ clerkId: clerkId });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Create a new ride document
        const newRide = new Ride({
            user: user._id, // Link to your internal User model's ID
            pickupLocation,
            destination,
            status: 'searching', // Initial status
            // Fare can be calculated here or later
        });

        await newRide.save();

        // Respond with the newly created ride object
        // You'll likely want to use WebSockets here later to notify drivers
        res.status(201).json(newRide);

    } catch (error) {
        console.error('Error creating ride request:', error);
        res.status(500).json({ message: 'Server error while creating ride request.' });
    }
};

/**
 * @route   GET /api/rides/prices
 * @desc    Get the current price per kilometer
 * @access  Public
 */
exports.getPrices = (req, res) => {
    // This can be made more dynamic later
    res.json({ price_per_km: 1.50 });
};