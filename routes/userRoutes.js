// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
const userController = require('../controllers/userController');

router.use(ClerkExpressRequireAuth());

router.get('/me', userController.getCurrentUser);
router.put('/me', userController.updateCurrentUser);
router.put('/driver/availability', userController.toggleDriverAvailability);

module.exports = router;