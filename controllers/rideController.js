// controllers/rideController.js
const Ride = require('../models/Ride');
const User = require('../models/User');
const Driver = require('../models/Driver');
const { calculateFare } = require('./fareController'); 

const mbxDirections = require('@mapbox/mapbox-sdk/services/directions');
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
const directionsClient = mbxDirections({ accessToken: MAPBOX_ACCESS_TOKEN });

const MAX_DELAY_SECONDS = 300;

exports.requestRide = async (req, res) => {
    const { pickupLocation, destination, rideType } = req.body;
    const clerkId = req.auth.userId;
    // ... validation ...

    try {
        const user = await User.findOne({ clerkId });
        if (!user) return res.status(404).json({ message: 'User not found.' });

        let drivers = [];
        if (rideType === 'shared') {
            drivers = await findCompatibleSharedRides(pickupLocation, destination);
            if (drivers.length === 0) {
                drivers = await findInactiveDrivers(pickupLocation);
            }
        } else { // 'private' ride
            drivers = await findInactiveDrivers(pickupLocation);
        }

        if (drivers.length === 0) {
            return res.status(404).json({ message: 'No available drivers found.' });
        }

        const newRide = new Ride({
            user: user._id,
            pickupLocation,
            destination,
            status: 'searching',
            rideType: rideType,
        });
        await newRide.save();
        
        req.io.to('available-drivers').emit('new-ride-request', newRide);
        res.status(201).json(newRide);

    } catch (error) {
        console.error('Error in requestRide:', error);
        res.status(500).json({ message: 'Server error.', error: error.message });
    }
};


async function findCompatibleSharedRides(newRiderPickup, newRiderDestination) {
    const compatibleDrivers = [];
    const activeSharedDrivers = await Driver.find({
        rideStatus: 'on_shared_ride',
        currentLocation: {
            $near: {
                $geometry: { type: "Point", coordinates: [newRiderPickup.longitude, newRiderPickup.latitude] },
                $maxDistance: 5000
            }
        }
    }).populate('rideQueue');

    for (const driver of activeSharedDrivers) {
        
        const currentWaypoints = [
            { coordinates: driver.currentLocation.coordinates },
            ...driver.rideQueue.map(ride => ({ coordinates: [ride.destination.longitude, ride.destination.latitude] }))
        ];

        
        if (currentWaypoints.length < 2) {
            continue;
        }
        
       
        const newWaypoints = [
            ...currentWaypoints,
            { coordinates: [newRiderPickup.longitude, newRiderPickup.latitude] },
            { coordinates: [newRiderDestination.longitude, newRiderDestination.latitude] }
        ];

        try {
            
            const currentRouteRequest = directionsClient.getDirections({
                profile: 'driving-traffic',
                waypoints: currentWaypoints
            }).send();

            const newRouteRequest = directionsClient.getDirections({
                profile: 'driving-traffic',
                waypoints: newWaypoints
            }).send();
            
            const [currentRouteResponse, newRouteResponse] = await Promise.all([
                currentRouteRequest,
                newRouteRequest
            ]);

            const currentDuration = currentRouteResponse.body.routes[0].duration;
            const newDuration = newRouteResponse.body.routes[0].duration;
            
            
            const delay = newDuration - currentDuration;
            if (delay <= MAX_DELAY_SECONDS) {
                compatibleDrivers.push(driver);
            }

        } catch (e) {
            console.error("Mapbox API Error:", e.message);
        }
    }
    
    return compatibleDrivers;
}


async function findInactiveDrivers(location) {
    return Driver.find({
        currentLocation: {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: [location.longitude, location.latitude]
                },
                $maxDistance: 10000 
            }
        },
        rideStatus: 'inactive' 
    });
}



exports.acceptRide = async (io, data) => {
    try {
        const { rideId, driverId } = data;
        const ride = await Ride.findById(rideId);

        if (!ride || ride.status !== 'searching') {
            return;
        }
        
        const updateData = {
            rideStatus: ride.rideType === 'private' ? 'on_private_ride' : 'on_shared_ride',
            $push: { rideQueue: ride._id } 
        };
        const driver = await Driver.findByIdAndUpdate(driverId, updateData);
        
        if (!driver) {
            console.error(`Driver with ID ${driverId} not found.`);
            return;
        }

        ride.driver = driver._id;
        ride.status = 'accepted';
        await ride.save();

        const acceptedRideDetails = await Ride.findById(rideId).populate('driver');
        io.to(`ride_${rideId}`).emit('ride-accepted', acceptedRideDetails);
        
        console.log(`Ride ${rideId} (${ride.rideType}) accepted by Driver ${driverId}.`);

    } catch (error) {
        console.error("Error in acceptRide:", error);
    }
};

// --- NEW `startTrip` FUNCTION ---
exports.startTrip = async (io, data) => {
    try {
        const { rideId } = data;
        const ride = await Ride.findByIdAndUpdate(
            rideId,
            { status: 'in-progress', startTime: new Date() },
            { new: true }
        );

        if (ride) {
            io.to(`ride_${rideId}`).emit('trip-started', ride);
            console.log(`Trip ${rideId} has started.`);
        }
    } catch (error) {
        console.error("Error starting trip:", error);
    }
};


exports.endTrip = async (io, data) => {
    try {
        const { rideId } = data;

        
        const rideToComplete = await Ride.findById(rideId);
        if (!rideToComplete) return;

        
        const directionsResponse = await directionsClient.getDirections({
            profile: 'driving-traffic',
            waypoints: [
                { coordinates: [rideToComplete.pickupLocation.longitude, rideToComplete.pickupLocation.latitude] },
                { coordinates: [rideToComplete.destination.longitude, rideToComplete.destination.latitude] }
            ]
        }).send();
        
        const route = directionsResponse.body.routes[0];
        const finalFare = calculateFare(route.distance, route.duration, rideToComplete.rideType);
        

        const ride = await Ride.findByIdAndUpdate(
            rideId,
            { 
                status: 'completed', 
                endTime: new Date(),
                fare: finalFare.toFixed(2) 
            },
            { new: true }
        ).populate('driver');

        if (ride && ride.driver) {
            
            const driver = await Driver.findByIdAndUpdate(
                ride.driver._id,
                { $pull: { rideQueue: rideId } },
                { new: true }
            );

            
            if (driver && driver.rideQueue.length === 0) {
                driver.rideStatus = 'inactive';
                await driver.save();
                console.log(`Driver ${driver._id} has completed all rides and is now inactive.`);
            }

            io.to(`ride_${rideId}`).emit('trip-completed', ride);
            console.log(`Trip ${rideId} has ended. Final Fare: ${ride.fare} ETB`);
        }
    } catch (error) {
        console.error("Error ending trip:", error);
    }
};

// --- NEW `cancelTrip` FUNCTION ---
exports.cancelTrip = async (io, data) => {
    try {
        const { rideId, cancelledBy } = data; // cancelledBy can be 'rider' or 'driver'

        const ride = await Ride.findByIdAndUpdate(
            rideId,
            { status: 'cancelled' },
            { new: true }
        ).populate('driver');

        if (ride) {
            // If a driver was assigned, update their status
            if (ride.driver) {
                const driver = await Driver.findByIdAndUpdate(
                    ride.driver._id,
                    { $pull: { rideQueue: rideId } },
                    { new: true }
                );

                if (driver && driver.rideQueue.length === 0) {
                    driver.rideStatus = 'inactive';
                    await driver.save();
                }
            }
            
            io.to(`ride_${rideId}`).emit('trip-cancelled', { ride, cancelledBy });
            console.log(`Trip ${rideId} was cancelled by ${cancelledBy}.`);
        }
    } catch (error) {
        console.error("Error cancelling trip:", error);
    }
};