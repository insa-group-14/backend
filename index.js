// index.js
require('dotenv').config();
const express = require('express');
const { ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');
const connectDB = require('./config/db');
const rideController = require("./controllers/rideController")

// --- Real-time Setup ---
const http = require('http');
const { Server } = require("socket.io");
// --- End Real-time Setup ---

connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

// --- Socket.IO Integration ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3001", // Replace with your frontend's URL
    methods: ["GET", "POST"]
  }
});
// --- End Socket.IO Integration ---

// Import route files
const webhookRoutes = require('./routes/webhookRoutes');
const rideRoutes = require('./routes/rideRoutes');
const userRoutes = require('./routes/userRoutes');
const Driver = require('./models/Driver');

// --- MIDDLEWARE & ROUTES ---
app.get('/', (req, res) => {
  res.send('Hello! Your ridesharing backend is running.');
});
app.use('/api/webhooks', webhookRoutes);
app.use(express.json());
app.use(ClerkExpressWithAuth());

// --- ADD THIS MIDDLEWARE ---
// This makes the `io` object available on all request objects
app.use((req, res, next) => {
  req.io = io;
  next();
});
// --- END OF NEW MIDDLEWARE ---

app.use('/api/rides', rideRoutes);
app.use('/api/users', userRoutes);

// --- Socket.IO Connection Logic ---
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // --- ROOMS ---
  socket.on('join-ride-room', (rideId) => {
      socket.join(`ride_${rideId}`);
      console.log(`Socket ${socket.id} joined room for ride ${rideId}`);
  });

  // Listen for drivers who want to join the pool of available drivers
  socket.on('join-available-drivers-room', () => {
      socket.join('available-drivers');
      console.log(`Socket ${socket.id} has joined the 'available-drivers' room.`);
  });

  // --- LOCATION ---
  socket.on('update-location', async (data) => {
    const { driverId, location, rideId } = data; // driver's app should also send rideId
    await Driver.findByIdAndUpdate(driverId, {
        currentLocation: {
            type: 'Point',
            coordinates: [location.longitude, location.latitude]
        }
    });
    // Now broadcast to the specific ride room
    io.to(`ride_${rideId}`).emit('driver-location-updated', { driverId, location });
  });

  // --- LIFECYCLE EVENTS ---
  socket.on('accept-ride', (data) => {
    rideController.acceptRide(io, data);
  });

  socket.on('start-trip', (data) => {
    rideController.startTrip(io, data);
  });

  socket.on('end-trip', (data) => {
    rideController.endTrip(io, data);
  });

  socket.on('cancel-trip', (data) => {
    rideController.cancelTrip(io, data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});
// --- End Socket.IO Connection Logic ---

// IMPORTANT: Use `server.listen` instead of `app.listen`
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});