// controllers/fareController.js
const mbxDirections = require('@mapbox/mapbox-sdk/services/directions');
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
const directionsClient = mbxDirections({ accessToken: MAPBOX_ACCESS_TOKEN });

// --- PRICING CONSTANTS (in Ethiopian Birr - ETB) ---
const BASE_FARE = 50;
const PER_KILOMETER_RATE = 15;
const PER_MINUTE_RATE = 2;
const MINIMUM_FARE = 100;
const SHARED_RIDE_DISCOUNT = 0.40; // 20% discount

/**
 * Calculates the fare based on distance, duration, and ride type.
 */
const calculateFare = (distance, duration, rideType) => {
    // distance is in meters, convert to kilometers
    const distanceInKm = distance / 1000;
    // duration is in seconds, convert to minutes
    const durationInMinutes = duration / 60;

    let estimatedFare = BASE_FARE + (distanceInKm * PER_KILOMETER_RATE) + (durationInMinutes * PER_MINUTE_RATE);

    if (rideType === 'shared') {
        estimatedFare *= (1 - SHARED_RIDE_DISCOUNT);
    }

    // Ensure the fare is not below the minimum
    return Math.max(estimatedFare, MINIMUM_FARE);
};

/**
 * Provides a fare estimate to the user before they request a ride.
 */
exports.getFareEstimate = async (req, res) => {
    const { pickupLocation, destination, rideType } = req.body;

    if (!pickupLocation || !destination || !rideType) {
        return res.status(400).json({ message: 'Missing pickup, destination, or rideType.' });
    }

    try {
        const request = {
            profile: 'driving-traffic',
            waypoints: [
                { coordinates: [pickupLocation.longitude, pickupLocation.latitude] },
                { coordinates: [destination.longitude, destination.latitude] }
            ]
        };

        const response = await directionsClient.getDirections(request).send();
        const route = response.body.routes[0];

        if (!route) {
            return res.status(404).json({ message: 'Could not calculate a route for the given locations.' });
        }

        const { distance, duration } = route;
        const finalFare = calculateFare(distance, duration, rideType);

        res.json({
            estimatedFare: finalFare.toFixed(2), // Format to two decimal places
            distance: distance, // in meters
            duration: duration, // in seconds
        });

    } catch (error) {
        console.error("Error getting fare estimate:", error.message);
        res.status(500).json({ message: 'Server error while calculating fare.' });
    }
};

// We export this so it can be used in the rideController
exports.calculateFare = calculateFare;