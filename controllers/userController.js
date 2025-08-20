// controllers/userController.js
const Driver = require('../models/Driver');
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

exports.toggleDriverAvailability = async (req, res) => {
    try {
        const user = await User.findOne({ clerkId: req.auth.userId });
        if (!user || user.userType !== 'driver' || !user.driverDetails) {
            return res.status(403).json({ message: 'User is not a driver.' });
        }

        const driver = await Driver.findById(user.driverDetails);
        driver.isAvailable = !driver.isAvailable; // Toggle the status
        await driver.save();

        res.json({ isAvailable: driver.isAvailable });

    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.becomeDriver = async (req, res) => {
    try {
        const user = await User.findOne({ clerkId: req.auth.userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Prevent switching back or creating duplicate driver entries
        if (user.userType === 'driver' && user.driverDetails) {
            return res.status(400).json({ message: 'User is already a driver.' });
        }

        // Create a new Driver document
        const newDriver = new Driver({
            user: user._id,
            // You can add default vehicle details here later
        });
        await newDriver.save();

        // Update the User document
        user.userType = 'driver';
        user.driverDetails = newDriver._id;
        await user.save();

        console.log(`User ${user.firstName} is now a driver.`);
        res.json({ message: 'Successfully registered as a driver!', user });

    } catch (error) {
        console.error("Error in becomeDriver:", error);
        res.status(500).json({ message: 'Server error while becoming a driver.' });
    }
};