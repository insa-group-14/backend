const { io } = require("socket.io-client");

const SERVER_URL = "http://localhost:3000";
const MOCK_DRIVER_ID = "689a2600919dd84fd2a39eb1"; 

const driverSocket = io(SERVER_URL);
const riderSocket = io(SERVER_URL);

// --- DRIVER SIMULATION ---
driverSocket.on('connect', () => {
  console.log(`[DRIVER] Connected. Socket ID: ${driverSocket.id}`);
  
  // --- THIS IS THE FIX ---
  // Tell the server this socket wants to be in the 'available-drivers' room
  console.log("[DRIVER] Joining the 'available-drivers' room...");
  driverSocket.emit('join-available-drivers-room');
  // --- END OF FIX ---
});

driverSocket.on('new-ride-request', (ride) => {
  // This will now work because the driver is in the correct room
  console.log(`✅ [DRIVER] Received ride request: ${ride._id}`);
  
  const payload = { rideId: ride._id, driverId: MOCK_DRIVER_ID };
  
  console.log(`[DRIVER] Waiting 3s, then sending 'accept-ride' with:`, payload);
  
  setTimeout(() => {
    driverSocket.emit('accept-ride', payload);
  }, 3000);
});

// --- RIDER SIMULATION (no changes needed) ---
riderSocket.on('connect', () => console.log(`[RIDER] Connected.`));

riderSocket.on('ride-accepted', (rideDetails) => {
    console.log(`\n✅ [RIDER] SUCCESS! Ride accepted. Details:`, rideDetails);
});

global.joinRideRoom = (rideId) => {
  console.log(`[RIDER] Emitting 'join-ride-room' for ride: ride_${rideId}`);
  riderSocket.emit('join-ride-room', rideId);
}

console.log("--> Test client running...");