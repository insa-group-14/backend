// routes/webhookRoutes.js (Corrected)
const express = require('express');
const router = express.Router();
const { Webhook } = require('svix');
const User = require('../models/User');

// This special middleware gets the raw body, which svix needs
router.post('/clerk', express.raw({ type: 'application/json' }), async (req, res) => {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    if (!WEBHOOK_SECRET) {
        return res.status(400).send('Webhook secret not configured.');
    }

    const svix_id = req.headers["svix-id"];
    const svix_timestamp = req.headers["svix-timestamp"];
    const svix_signature = req.headers["svix-signature"];

    if (!svix_id || !svix_timestamp || !svix_signature) {
        return res.status(400).json({ error: 'Error occurred -- no svix headers' });
    }

    // req.body is now a raw buffer, which is what `svix` needs.
    // DO NOT stringify it.
    const body = req.body; 
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

    const { id, email_addresses, first_name, last_name } = evt.data;
    const eventType = evt.type;

    if (eventType === 'user.created') {
        try {
            const newUser = new User({
                clerkId: id,
                email: email_addresses[0].email_address,
                name: `${first_name} ${last_name}`,
            });
            await newUser.save();
            console.log(`New user ${newUser.name} saved to database.`);
        } catch (dbError) {
            console.error('Error saving user to DB:', dbError);
            return res.status(500).json({ error: 'Database error' });
        }
    }

    res.status(200).json({ success: true });
});

module.exports = router;