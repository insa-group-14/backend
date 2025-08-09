// index.js (Corrected)
require('dotenv').config();
const express = require('express');
const { ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');
const connectDB = require('./config/db');

connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

// Import your route files
const rideRoutes = require('./routes/rideRoutes');
const webhookRoutes = require('./routes/webhookRoutes');

// --- MIDDLEWARE & ROUTES ---

// Test route for the root URL
app.get('/', (req, res) => {
  res.send('Hello! Your ridesharing backend is running.');
});

// Use the webhook router WITHOUT the global json parser.
// The raw body parser is already inside webhookRoutes.js
app.use('/api/webhooks', webhookRoutes);

// The Clerk middleware should come after public routes like webhooks.
app.use(ClerkExpressWithAuth());

// Now, for all routes that need a JSON body (like creating a ride),
// you can apply the middleware directly to that router.
app.use('/api/rides', express.json(), rideRoutes);


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});