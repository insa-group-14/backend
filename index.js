// index.js
require('dotenv').config();
const express = require('express');
const { ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');
const connectDB = require('./config/db');

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

  // ... your socket event listeners
});

// IMPORTANT: Use `server.listen` instead of `app.listen`
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});