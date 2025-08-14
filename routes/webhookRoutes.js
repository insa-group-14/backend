// routes/webhookRoutes.js
const express = require('express');
const router = express.Router();
const { Webhook } = require('svix');
const User = require('../models/User');

// Use express.raw() to access the raw body for signature verification
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
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
    const body = payload;
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

    if (eventType === 'user.deleted') {
        try {
            const { id } = evt.data;
            const deletedUser = await User.findOneAndDelete({ clerkId: id });

            if (deletedUser) {
                console.log(`User ${deletedUser.firstName} ${deletedUser.lastName} (Clerk ID: ${id}) deleted from database.`);
            } else {
                console.warn(`Attempted to delete user with Clerk ID: ${id}, but they were not found in the database.`);
            }
        } catch (dbError) {
            console.error('Error deleting user from DB:', dbError);
            return res.status(500).json({ error: 'Database error during user deletion' });
        }
    }
    
if (eventType === 'user.updated') {
    try {
        // Destructure all the data you need from the event payload
        const { id, email_addresses, first_name, last_name, image_url } = evt.data;

        // Find the user by their Clerk ID and update their information
        const updatedUser = await User.findOneAndUpdate({ clerkId: id },
            {
                email: email_addresses[0].email_address,
                firstName: first_name,
                lastName: last_name,
                profilePictureUrl: image_url,
            },
            {
                new: true // This option returns the updated document
            }
        )

        if (updatedUser) {
            console.log(`User ${updatedUser.firstName} ${updatedUser.lastName} (Clerk ID: ${id}) updated in the database.`);
        } else {
            console.warn(`Attempted to update user with Clerk ID: ${id}, but they were not found in the database.`);
        }

    } catch (dbError) {
        console.error('Error when updating user info:', dbError)
        return res.status(500).json({ error: 'Database error during updating user info' });
    }
}``

    // You can also handle 'user.updated' and 'user.deleted' events here

    res.status(200).json({ success: true });
});

module.exports = router;