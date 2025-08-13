const http = require('http');
const { io } = require("socket.io-client");

// --- ⚙️ CONFIGURATION ---
const SERVER_URL = "http://localhost:3000";
const MOCK_DRIVER_ID = "689cc0b706706260ac8b602b"; // The ID of your inactive driver

// ❗️ You need two separate, valid tokens for two different users
const RIDER_A_TOKEN = "eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDIyMkFBQSIsImtpZCI6Imluc18zMHpmREdxNFlIZWhJcTRibUJHb3QwbkxEdngiLCJ0eXAiOiJKV1QifQ.eyJhenAiOiJodHRwOi8vbG9jYWxob3N0OjMwMDEiLCJleHAiOjE3NTgyNTY4NjAsImlhdCI6MTc1NTEwMzI2MCwiaXNzIjoiaHR0cHM6Ly9ldGhpY2FsLWdydWItNTUuY2xlcmsuYWNjb3VudHMuZGV2IiwianRpIjoiNDMxOWZmYTViYTg1NjM0NGNhNjQiLCJuYmYiOjE3NTUxMDMyNTUsInN1YiI6InVzZXJfMzFFeFowTldEbWlkeHVCMFRUS1V1NTd5Z2dMIn0.QgtvEqbZnPGIjC8hhM5iuB-8c8UbIIHUGn3ZQGJRbQFW9Q8reTdDmrNWuO_4lZvtsRvG7pgJuTqHpI_7sYb5HVfIaGyq0-CTJuYU8KJHRsc8cn9XaBFKXuQ3my84ZfxDqJmxrHvytyBMRQJvK1-vL6wR0bzqDW41yQBuqBLVw7Bl3kcPzePGK8GogBzGMIsbhCd9tfUeKUXt2KbkU-qP65kfc0QpccYncpX_Vvfxs0jIprjALEJddrRbqN84aBva46L_W72ejZ296UWmh0ibjuZuBLSkUkCNSKNyc8F7C6xsqS08LoJnTgPHLPzdpvUyAvL2K-nxwmPSZhZAYfxhvA";
const RIDER_B_TOKEN = "eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDIyMkFBQSIsImtpZCI6Imluc18zMHpmREdxNFlIZWhJcTRibUJHb3QwbkxEdngiLCJ0eXAiOiJKV1QifQ.eyJhenAiOiJodHRwOi8vbG9jYWxob3N0OjMwMDEiLCJleHAiOjE3NTgwNDkxMDMsImlhdCI6MTc1NDg5NTUwMywiaXNzIjoiaHR0cHM6Ly9ldGhpY2FsLWdydWItNTUuY2xlcmsuYWNjb3VudHMuZGV2IiwianRpIjoiMmNjN2NhZGViYzJiODQzNDZkY2MiLCJuYmYiOjE3NTQ4OTU0OTgsInN1YiI6InVzZXJfMzE4QU1MbER2elYwRzRUd2FwUXJMOERTYWtQIn0.HzEmefIj89Llzs78LNhhzPPH1zkE9mBhfjnp9p_Bw2Axdk8MuZBEPufkxAfxB338xTlNbSI1rC0zv6GjNV6ElADG1k9PdsqKZtGxJB4CTUkePF6JYPSYlSSdQfBAh_0i5YbDogtpuFKaA-Dkn_RATEyUop0ezvgYrDMjTr80xhFSxOzEsf3uTNh2xH0x76TZ_CIzeDnCCwPGzDUzQNPtuXvHJK0RVpzYrvfMxHc4H2Z4gLCjTnryKZm0W-7SgAYJdJIvpZjEhC64-lklH2dfI4vt1k4MfBB9GFRGUw5NJJZ1J427rMsIjmlYDwYlZzxgBaEoV8tC8GPLsXAJeIko4g"; 

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