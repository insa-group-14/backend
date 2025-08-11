// routes/rideRoutes.js
const express = require('express');
const router = express.Router();
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
const rideController = require('../controllers/rideController');

// All routes in this file will be protected and require a logged-in user.
router.use(ClerkExpressRequireAuth());

// POST /api/rides/request - The route is now handled by the controller
router.post('/request', rideController.requestRide);

// GET /api/rides/prices (can remain public if you move it out of this router)
// For simplicity, we'll keep it protected for now.
router.get('/prices', rideController.getPrices);


module.exports = router;