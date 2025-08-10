// routes/webhookRoutes.js
const express = require('express');
const router = express.Router();
const { Webhook } = require('svix');
const User = require('../models/User');

// Use express.raw() to access the raw body for signature verification
router.post('/clerk', express.raw({ type: 'application/json' }), async (req, res) => {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    if (!WEBHOOK_SECRET) {
        console.error('Clerk webhook secret not configured.');
        return res.status(500).send('Webhook secret not configured.');
    }

    // Get the headers
    const svix_id = req.headers["svix-id"];
    const svix_timestamp = req.headers["svix-timestamp"];
    const svix_signature = req.headers["svix-signature"];

    if (!svix_id || !svix_timestamp || !svix_signature) {
        return res.status(400).json({ error: 'Error occurred -- no svix headers' });
    }

    const payload = req.body;
    const body = JSON.stringify(payload);
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt;
    try {
        evt = wh.verify(body, {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        });
    } catch (err) {
        console.error('Error verifying webhook:', err);
        return res.status(400).json({ 'Error': err.message });
    }

    const eventType = evt.type;

    if (eventType === 'user.created') {
        const { id, email_addresses, first_name, last_name, image_url } = evt.data;

        try {
            const newUser = new User({
                clerkId: id,
                email: email_addresses[0].email_address,
                firstName: first_name,
                lastName: last_name,
                profilePictureUrl: image_url,
            });
            await newUser.save();
            console.log(`New user ${first_name} ${last_name} saved to database.`);
        } catch (dbError) {
            console.error('Error saving user to DB:', dbError);
            return res.status(500).json({ error: 'Database error' });
        }
    }

    // You can also handle 'user.updated' and 'user.deleted' events here

    res.status(200).json({ success: true });
});

module.exports = router;