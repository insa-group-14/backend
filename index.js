// index.js
require('dotenv').config();
const express = require('express');
const { ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');
const connectDB = require('./config/db');

// Connect to Database
connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

// Import route files
const webhookRoutes = require('./routes/webhookRoutes');
const rideRoutes = require('./routes/rideRoutes');
const userRoutes = require('./routes/userRoutes');

// --- MIDDLEWARE & ROUTES ---

app.get('/', (req, res) => {
  res.send('Hello! Your ridesharing backend is running.');
});

// 1. Public webhook routes (needs raw body, so no global express.json() yet)
app.use('/api/webhooks/clerk', webhookRoutes);

// 2. Global JSON parser for all other routes
app.use(express.json());

// 3. Clerk authentication middleware to protect subsequent routes
app.use(ClerkExpressWithAuth());

// 4. Your protected application routes
app.use('/api/rides', rideRoutes);
app.use('/api/users', userRoutes);


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});