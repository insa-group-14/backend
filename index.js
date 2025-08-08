// server.js
require('dotenv').config(); // Load environment variables
const express = require('express');
const { ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');

const app = express();
const PORT = process.env.PORT || 3001;

// Add the Clerk middleware.
// This will attach user information to the request object.
app.use(ClerkExpressWithAuth());

app.use(express.json());

// Your routes will go here...
const rideRoutes = require('./routes/rideRoutes');
app.use('/api/rides', rideRoutes);


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
