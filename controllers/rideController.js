const Ride = require('../models/Ride');
const User = require('../models/User');
const Driver = require('../models/Driver'); // Import the Driver model

exports.requestRide = async (req, res) => {
    console.log('[DEBUG] 1. Entered requestRide function.');

    const clerkId = req.auth.userId;
    const { pickupLocation, destination } = req.body;

    if (!pickupLocation || !pickupLocation.longitude || !pickupLocation.latitude) {
        console.log('[DEBUG] FAILED at validation. Missing pickupLocation.');
        return res.status(400).json({ message: "Invalid or missing pickupLocation." });
    }
    
    console.log('[DEBUG] 2. Validation passed. Pickup location:', pickupLocation);

    try {
        const user = await User.findOne({ clerkId });
        if (!user) {
            console.log('[DEBUG] FAILED: User not found in DB.');
            return res.status(404).json({ message: 'User not found.' });
        }

        console.log('[DEBUG] 3. Found user in database:', user._id);
        console.log('[DEBUG] 4. Starting search for nearby drivers...');

        const nearbyDrivers = await Driver.find({
            currentLocation: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [pickupLocation.longitude, pickupLocation.latitude]
                    },
                    $maxDistance: 5000 // 5 kilometers
                }
            },
            isAvailable: true
        });

        console.log(`[DEBUG] 5. Database query finished. Found ${nearbyDrivers.length} drivers.`);

        if (nearbyDrivers.length === 0) {
            console.log('[DEBUG] FAILED: No available drivers found.');
            return res.status(404).json({ message: 'No available drivers found near you.' });
        }

        console.log('[DEBUG] 6. Creating new ride document...');
        const newRide = new Ride({
            user: user._id,
            pickupLocation,
            destination,
            status: 'searching',
        });
        await newRide.save();

        console.log('[DEBUG] 7. Saved new ride to database:', newRide._id);
        console.log('[DEBUG] 8. Emitting socket event and sending response...');
        
        req.io.to('available-drivers').emit('new-ride-request', newRide);
        
        res.status(201).json(newRide);
        console.log('[DEBUG] 9. Response sent successfully!');

    } catch (error) {
        console.error('[DEBUG] CRITICAL ERROR in try/catch block:', error);
        res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

/**
 * @desc    Logic for a driver to accept a ride.
 * @param   {object} io - The Socket.IO server instance.
 * @param   {object} data - Data from the socket event, should include { rideId, driverId }.
 */
exports.acceptRide = async (io, data) => {
    try {
        const { rideId, driverId } = data;

        // 1. Find the ride and ensure it's still available
        const ride = await Ride.findById(rideId);

        if (!ride || ride.status !== 'searching') {
            // Ride is already taken or cancelled
            console.log(`Ride ${rideId} is no longer available.`);
            // Optionally, emit a message back to the specific driver who tried to accept it
            return;
        }

        // 2. Find the driver and set them to unavailable
        const driver = await Driver.findByIdAndUpdate(driverId, { isAvailable: false });
        if (!driver) {
            console.error(`Driver with ID ${driverId} not found.`);
            return;
        }

        // 3. Update the ride with the driver's ID and change status
        ride.driver = driver._id;
        ride.status = 'accepted';
        await ride.save();

        // 4. Populate the driver and user details to send to the rider
        const acceptedRideDetails = await Ride.findById(rideId)
            .populate({
                path: 'driver',
                populate: {
                    path: 'user',
                    select: 'firstName profilePictureUrl' // Send only what's needed
                }
            })
            .populate({
                path: 'user',
                select: 'clerkId' // We need this to find the rider's socket
            });

        // 5. Notify the original rider
        // This requires mapping a user ID to a socket ID.
        // A simple (but not perfectly scalable) way is to store it on connection.
        const riderClerkId = acceptedRideDetails.user.clerkId;
        
        // This assumes you have a way to get the rider's socket.
        // We will improve this mapping in the next step.
        // For now, let's broadcast to a "room" the rider would be in.
        io.to(`ride_${rideId}`).emit('ride-accepted', acceptedRideDetails);
        
        console.log(`Ride ${rideId} accepted by Driver ${driverId}. Notifying Rider ${riderClerkId}.`);

    } catch (error) {
        console.error("Error in acceptRide:", error);
    }
};

/**
 * @desc    Handles a driver starting a trip
 */
exports.startTrip = async (io, data) => {
    try {
        const { rideId } = data;
        const ride = await Ride.findByIdAndUpdate(
            rideId,
            { status: 'in-progress', startTime: new Date() },
            { new: true }
        );

        if (ride) {
            // Notify the rider in the specific ride room
            io.to(`ride_${rideId}`).emit('trip-started', ride);
            console.log(`Trip ${rideId} has officially started.`);
        }
    } catch (error) {
        console.error("Error starting trip:", error);
    }
};

/**
 * @desc    Handles a driver ending a trip
 */
exports.endTrip = async (io, data) => {
    try {
        const { rideId } = data;

        const ride = await Ride.findByIdAndUpdate(
            rideId,
            { status: 'completed', endTime: new Date() },
            { new: true }
        ).populate('driver');

        if (ride && ride.driver) {
            // Make the driver available for new rides
            await Driver.findByIdAndUpdate(ride.driver._id, { isAvailable: true });

            // Notify the rider the trip is over
            io.to(`ride_${rideId}`).emit('trip-completed', ride);
            console.log(`Trip ${rideId} has ended. Driver ${ride.driver._id} is now available.`);
        }
    } catch (error) {
        console.error("Error ending trip:", error);
    }
};

/**
 * @desc    Handles cancelling a trip
 */
exports.cancelTrip = async (io, data) => {
    try {
        const { rideId, cancelledBy } = data; // cancelledBy could be 'rider' or 'driver'

        const ride = await Ride.findByIdAndUpdate(
            rideId,
            { status: 'cancelled' },
            { new: true }
        ).populate('driver');

        if (ride) {
            // If a driver was assigned, make them available again
            if (ride.driver) {
                await Driver.findByIdAndUpdate(ride.driver._id, { isAvailable: true });
            }

            // Notify everyone in the ride room that it's been cancelled
            io.to(`ride_${rideId}`).emit('trip-cancelled', { ride, cancelledBy });
            console.log(`Trip ${rideId} was cancelled by ${cancelledBy}.`);
        }
    } catch (error) {
        console.error("Error cancelling trip:", error);
    }
};