// controllers/userController.js
const User = require('../models/User');

exports.getCurrentUser = async (req, res) => {
    try {
        const user = await User.findOne({ clerkId: req.auth.userId }).populate('driverDetails');
        console.log(user)
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.updateCurrentUser = async (req, res) => {
    const { firstName, lastName, phoneNumber } = req.body;
    try {
        const user = await User.findOneAndUpdate(
            { clerkId: req.auth.userId },
            { $set: { firstName, lastName, phoneNumber } },
            { new: true }
        );
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
};