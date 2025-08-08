import mongoose from 'mongoose';

// --- Location Schema (reusable) ---
const locationSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
  },
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
});

// --- User Schema ---
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['rider', 'driver'],
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    // Driver-specific information
    licenseNumber: {
      type: String,
      required: function() { return this.role === 'driver'; },
      unique: true,
    },
    vehicle: {
      type: {
        type: String,
        required: function() { return this.role === 'driver'; },
      },
      model: {
        type: String,
        required: function() { return this.role === 'driver'; },
      },
      color: {
        type: String,
        required: function() { return this.role === 'driver'; },
      },
    },
    driverStatus: {
      type: String,
      enum: ['online', 'offline', 'on_trip'],
      default: 'offline',
      required: function() { return this.role === 'driver'; },
    },
    // Geolocation for driver/rider
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0], // [longitude, latitude]
      },
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ currentLocation: '2dsphere' }); // Create geospatial index

const User = mongoose.model('User', userSchema);

// --- Ride Schema ---
const rideSchema = new mongoose.Schema(
  {
    rider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    pickupLocation: {
      type: locationSchema,
      required: true,
    },
    dropoffLocation: {
      type: locationSchema,
      required: true,
    },
    // Handle on-the-way pickups
    additionalPassengers: [
      {
        passenger: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        dropoffLocation: locationSchema,
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    fare: {
      type: Number,
      required: true,
    },
    startTime: Date,
    endTime: Date,
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

const Ride = mongoose.model('Ride', rideSchema);

// --- Review Schema ---
const reviewSchema = new mongoose.Schema(
  {
    ride: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      required: true,
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    comment: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Review = mongoose.model('Review', reviewSchema);

export { User, Ride, Review };
