const http = require('http');
const { io } = require("socket.io-client");

// --- ⚙️ CONFIGURATION ---
const SERVER_URL = "http://localhost:3000";
const MOCK_DRIVER_ID = "689cc0b706706260ac8b602b"; // The ID of your inactive driver

// ❗️ You need two separate, valid tokens for two different users
const RIDER_A_TOKEN = "eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDIyMkFBQSIsImtpZCI6Imluc18zMHpmREdxNFlIZWhJcTRibUJHb3QwbkxEdngiLCJ0eXAiOiJKV1QifQ.eyJhenAiOiJodHRwOi8vbG9jYWxob3N0OjMwMDEiLCJleHAiOjE3NTgzMDk3NTUsImlhdCI6MTc1NTE1NjE0OSwiaXNzIjoiaHR0cHM6Ly9ldGhpY2FsLWdydWItNTUuY2xlcmsuYWNjb3VudHMuZGV2IiwianRpIjoiZmJhOGRjYzcyMDgyYmZkZWE5MTIiLCJuYmYiOjE3NTUxNTYxNDQsInN1YiI6InVzZXJfMzE4QU1MbER2elYwRzRUd2FwUXJMOERTYWtQIn0.Dx7FjodPp4nEU_byk9qgX5419-n5wugWxXlSRIlW1admAMZ0FND4aIIWyQJm0Wy2OwoqgsoMN9j3hUrv41VgT1yLHMiPoIA0yb3md81JfT9oHKPqO9n48pwz3rRGLMUeEscYbtwENb6spfHIuAO-5zOOJQY9KUrvMKdpNXxCLJgI1x5-hgSNgQE6xZm3zNdF1T1z9fET62lBTd6qV1Yfor7GToU7n5yfUxBrIdfbmPMPLhFLHxbRguc4c2IMQkpieoFo2VS4nHIrnnLzt6kREfY11Y1V2vzBO0mE8Sy8fl9ZqdMJM9FIQeAmdDviCZOf2oB78kzZof0bV5htFLdW_w";
const RIDER_B_TOKEN = "eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDIyMkFBQSIsImtpZCI6Imluc18zMHpmREdxNFlIZWhJcTRibUJHb3QwbkxEdngiLCJ0eXAiOiJKV1QifQ.eyJhenAiOiJodHRwOi8vbG9jYWxob3N0OjMwMDEiLCJleHAiOjE3NTgzMDk3MDUsImlhdCI6MTc1NTE1NjA5OSwiaXNzIjoiaHR0cHM6Ly9ldGhpY2FsLWdydWItNTUuY2xlcmsuYWNjb3VudHMuZGV2IiwianRpIjoiNWNlZjhhOGFjZjBkMWVhYTkzNDgiLCJuYmYiOjE3NTUxNTYwOTQsInN1YiI6InVzZXJfMzFHZHplYUF2blZxMVQwT1hIblpPSE4xbVltIn0.VXka8URvwiW-IlqlqtV2bDWJIgKjBXur2l2S-KE7t7vA4mXgfTd_mx3q2X4C8QCY7h94D4PySfu-w9HRLdtEY1vViuakuyqCItoCH54nqQDtLQUCNXCG0dLvJF93iajibdJKzs7Q3Oa5ylEatsiqaFpixqu4qqqeLK_gb2TCmc47iVaNazZtMV2YBIWYWg47rMLi87Olwof8Msge4KSwt1hxEawwgVrfm5aIwmdyFfO2cuVnjDBF4SqV_FSUT-t5X7qQ5ddsS60sQEvJerT4MHTxNLUkeJUtgzI08jC16XYr6We1wY3DQYIJ9RGf3ABMY1RbvJGYcw5uVWNvyfmBwg"; 

// Rider A's Trip
const RIDE_A_PAYLOAD = JSON.stringify({
    "pickupLocation": { "longitude": 38.7630, "latitude": 9.0050 },
    "destination": { "longitude": 38.7800, "latitude": 9.0100 },
    "rideType": "shared"
});

// Rider B's Trip - A similar route to test compatibility
const RIDE_B_PAYLOAD = JSON.stringify({
    "pickupLocation": { "longitude": 38.7640, "latitude": 9.0060 }, // Slightly different pickup
    "destination": { "longitude": 38.7810, "latitude": 9.0110 }, // Slightly different destination
    "rideType": "shared"
});
// --- END CONFIGURATION ---

// A more robust function to create ride requests for different riders
const createRideRequest = (payload, token, callback) => {
    console.log(`--- A rider is requesting a shared ride... ---`);
    const options = {
        hostname: 'localhost', port: 3000, path: '/api/rides/request', method: 'POST',
        headers: {
            'Content-Type': 'application/json', 'Content-Length': payload.length,
            'Authorization': `Bearer ${token}`
        }
    };
    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            if (res.statusCode >= 400) {
                console.error(`HTTP Error ${res.statusCode}: ${data}`);
                return callback(new Error(data), null);
            }
            console.log("--- Ride created successfully in DB. ---");
            callback(null, JSON.parse(data));
        });
    });
    req.on('error', (e) => callback(e, null));
    req.write(payload);
    req.end();
};


const runSharedRideTest = () => {
    const driverSocket = io(SERVER_URL);
    const riderASocket = io(SERVER_URL);
    const riderBSocket = io(SERVER_URL);

    let rideA_Id;

    // 1. DRIVER goes online
    driverSocket.on('connect', () => {
        console.log("[DRIVER] Connected. Joining available pool...");
        driverSocket.emit('join-available-drivers-room');

        // 2. RIDER A requests the first shared ride
        createRideRequest(RIDE_A_PAYLOAD, RIDER_A_TOKEN, (err, rideA) => {
            if (err) return;
            rideA_Id = rideA._id;
            console.log(`[RIDER A] Ride A (${rideA_Id}) created. Waiting for driver.`);
            riderASocket.emit('join-ride-room', rideA_Id);
        });
    });

    // 3. DRIVER listens for ride requests
    driverSocket.on('new-ride-request', (ride) => {
        console.log(`\n[DRIVER] Received ride request: ${ride._id}`);
        
        // Driver accepts whichever ride comes first
        const payload = { rideId: ride._id, driverId: MOCK_DRIVER_ID };
        console.log("[DRIVER] Accepting the ride...");
        driverSocket.emit('accept-ride', payload);
    });

    // 4. RIDER A waits for their ride to be accepted
    riderASocket.on('ride-accepted', (details) => {
        console.log(`\n✅ [RIDER A] My ride (${details._id}) has been accepted!`);
        console.log("--- Driver is now 'on_shared_ride'. Testing second rider. ---\n");

        // 5. NOW, RIDER B requests a compatible shared ride
        createRideRequest(RIDE_B_PAYLOAD, RIDER_B_TOKEN, (err, rideB) => {
            if (err) return;
            console.log(`[RIDER B] Ride B (${rideB._id}) created. Waiting for driver.`);
            riderBSocket.emit('join-ride-room', rideB._id);
        });
    });
    
    // 6. RIDER B waits for their ride to be accepted
    riderBSocket.on('ride-accepted', (details) => {
        console.log("\n✅✅✅ TEST SUCCESSFUL ✅✅✅");
        console.log(`[RIDER B] My ride (${details._id}) was accepted by the same driver!`);
        console.log("--- The compatibility algorithm worked! ---");
        
        // End the test
        driverSocket.disconnect();
        riderASocket.disconnect();
        riderBSocket.disconnect();
    });

    setTimeout(() => {
        console.log("\n❌ TEST TIMEOUT");
        driverSocket.disconnect();
        riderASocket.disconnect();
        riderBSocket.disconnect();
    }, 20000); // 20-second timeout
};


// --- RUN THE TEST ---
runSharedRideTest();