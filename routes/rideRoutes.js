// routes/rideRoutes.js
const express = require('express');
const router = express.Router();
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');

// This route is now protected.
// If a user is not logged in, Clerk will return a 401 Unauthorized error.
router.post('/request', ClerkExpressRequireAuth(), (req, res) => {
  // You can access the authenticated user's ID from req.auth
  const { userId } = req.auth;

  console.log(`User ${userId} is requesting a ride.`);

  // Your logic to create a ride request...
  res.json({ message: `Ride requested by user ${userId}` });
});

// This route is public and does not require authentication
router.get('/prices', (req, res) => {
    res.json({ price_per_km: 1.5 });
});

module.exports = router;
