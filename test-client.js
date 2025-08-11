const { io } = require("socket.io-client");

// --- CONFIGURATION ---
const SERVER_URL = "http://localhost:3000";
const MOCK_DRIVER_ID = "YOUR_MOCK_DRIVER_ID_FROM_MONGO"; // <-- IMPORTANT: Replace this

// Create two separate connections to simulate two different users
const driverSocket = io(SERVER_URL);
const riderSocket = io(SERVER_URL);

// --- DRIVER SIMULATION ---
driverSocket.on('connect', () => {
  console.log(`[DRIVER] Connected with socket ID: ${driverSocket.id}`);
});

driverSocket.on('new-ride-request', (ride) => {
  console.log(`[DRIVER] Received new ride request:`, ride);
  
  console.log(`[DRIVER] Pretending to think for 3 seconds...`);
  setTimeout(() => {
    console.log(`[DRIVER] Accepting ride ${ride._id}...`);
    driverSocket.emit('accept-ride', {
      rideId: ride._id,
      driverId: MOCK_DRIVER_ID,
    });
  }, 3000);
});

driverSocket.on('disconnect', () => {
  console.log("[DRIVER] Disconnected");
});


// --- RIDER SIMULATION ---
riderSocket.on('connect', () => {
    console.log(`[RIDER] Connected with socket ID: ${riderSocket.id}`);
});

// This function will be called manually after the ride is created via Postman
function joinRideRoom(rideId) {
    console.log(`[RIDER] Joining room for ride ${rideId}...`);
    riderSocket.emit('join-ride-room', rideId);
}

riderSocket.on('ride-accepted', (rideDetails) => {
    console.log(`[RIDER] SUCCESS! My ride has been accepted:`, rideDetails);
});

riderSocket.on('trip-cancelled', (data) => {
    console.log(`[RIDER] Ride was cancelled by ${data.cancelledBy}`);
});


// --- Instructions ---
console.log("Test client running. Please use Postman to create a ride request.");
console.log("After creating the ride, manually call joinRideRoom('the_new_ride_id_from_postman') in this console.");

// Make the function available in the terminal for manual triggering
global.joinRideRoom = joinRideRoom;