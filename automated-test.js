const http = require('http');
const { io } = require("socket.io-client");

// --- ⚙️ CONFIGURATION ---
const SERVER_URL = "http://localhost:3000";
const MOCK_DRIVER_ID = "689a2c51919dd84fd2a39eb8"; // Use your actual driver ID
const CLERK_AUTH_TOKEN = "eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDIyMkFBQSIsImtpZCI6Imluc18zMHpmREdxNFlIZWhJcTRibUJHb3QwbkxEdngiLCJ0eXAiOiJKV1QifQ.eyJhenAiOiJodHRwOi8vbG9jYWxob3N0OjMwMDEiLCJleHAiOjE3NTgwNDkxMDMsImlhdCI6MTc1NDg5NTUwMywiaXNzIjoiaHR0cHM6Ly9ldGhpY2FsLWdydWItNTUuY2xlcmsuYWNjb3VudHMuZGV2IiwianRpIjoiMmNjN2NhZGViYzJiODQzNDZkY2MiLCJuYmYiOjE3NTQ4OTU0OTgsInN1YiI6InVzZXJfMzE4QU1MbER2elYwRzRUd2FwUXJMOERTYWtQIn0.HzEmefIj89Llzs78LNhhzPPH1zkE9mBhfjnp9p_Bw2Axdk8MuZBEPufkxAfxB338xTlNbSI1rC0zv6GjNV6ElADG1k9PdsqKZtGxJB4CTUkePF6JYPSYlSSdQfBAh_0i5YbDogtpuFKaA-Dkn_RATEyUop0ezvgYrDMjTr80xhFSxOzEsf3uTNh2xH0x76TZ_CIzeDnCCwPGzDUzQNPtuXvHJK0RVpzYrvfMxHc4H2Z4gLCjTnryKZm0W-7SgAYJdJIvpZjEhC64-lklH2dfI4vt1k4MfBB9GFRGUw5NJJZ1J427rMsIjmlYDwYlZzxgBaEoV8tC8GPLsXAJeIko4g"; // ❗️ Get a fresh token


const RIDE_REQUEST_PAYLOAD = JSON.stringify({
    "pickupLocation": { "longitude": 38.7630, "latitude": 9.0050 },
    "destination": { "longitude": 38.7800, "latitude": 9.0100 },
    "rideType": "shared"
});

// --- END CONFIGURATION ---

const createRideRequest = (rideIdListener) => {
    console.log(`--- Step 2: Rider is requesting a '${JSON.parse(RIDE_REQUEST_PAYLOAD).rideType}' ride via HTTP POST... ---`);
    const options = {
        hostname: 'localhost', port: 3000, path: '/api/rides/request', method: 'POST',
        headers: {
            'Content-Type': 'application/json', 'Content-Length': RIDE_REQUEST_PAYLOAD.length,
            'Authorization': `Bearer ${CLERK_AUTH_TOKEN}`
        }
    };
    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            if (res.statusCode >= 400) {
                console.error(`HTTP Error ${res.statusCode}: ${data}`);
                process.exit(1);
            }
            console.log("--- Step 2 Success: Ride created successfully. ---");
            const newRide = JSON.parse(data);
            rideIdListener(newRide._id);
        });
    });
    req.on('error', (e) => console.error("Request Error:", e));
    req.write(RIDE_REQUEST_PAYLOAD);
    req.end();
};

const runTest = () => {
    const driverSocket = io(SERVER_URL);
    const riderSocket = io(SERVER_URL);
    let testCompleted = false;

    // Setup DRIVER first
    driverSocket.on('connect', () => {
        console.log("[DRIVER] Connected. Joining available pool...");
        driverSocket.emit('join-available-drivers-room');
        
        // Now that the driver is ready, setup the RIDER
        setupRider();
    });

    driverSocket.on('new-ride-request', (ride) => {
        console.log(`\n--- Step 3: Driver received ride request: ${ride._id} ---`);
        const payload = { rideId: ride._id, driverId: MOCK_DRIVER_ID };
        console.log("--- Step 4: Driver is now accepting the ride... ---");
        driverSocket.emit('accept-ride', payload);
    });

    // This function is called only after the driver is connected
    const setupRider = () => {
        riderSocket.on('connect', () => {
            console.log("[RIDER] Connected.");
            // --- Step 1: Rider creates the ride AFTER driver is ready ---
            createRideRequest((rideId) => {
                console.log(`[RIDER] Captured Ride ID: ${rideId}. Joining room...`);
                riderSocket.emit('join-ride-room', rideId);
            });
        });

        riderSocket.on('ride-accepted', (details) => {
            console.log("\n✅✅✅ TEST SUCCESSFUL ✅✅✅");
            console.log("[RIDER] My ride has been accepted!");
            testCompleted = true;
            driverSocket.disconnect();
            riderSocket.disconnect();
        });
    };

    // Failsafe timeout
    setTimeout(() => {
        if (!testCompleted) {
            console.log("\n❌❌❌ TEST FAILED ❌❌❌");
            console.log("Timeout: The 'ride-accepted' event was not received within 15 seconds.");
            driverSocket.disconnect();
            riderSocket.disconnect();
        }
    }, 15000);
};

// --- RUN THE TEST ---
runTest();