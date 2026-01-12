const mongoose = require("mongoose");

const operatingHoursSchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
    enum: [
      "Monday", "Tuesday", "Wednesday", "Thursday", 
      "Friday", "Saturday", "Sunday"
    ]
  },
  openTime: {
    type: String, // Format: "HH:MM" (e.g., "09:00")
    required: true
  },
  closeTime: {
    type: String, // Format: "HH:MM" (e.g., "22:00")
    required: true
  },
  isOpen: {
    type: Boolean,
    default: true
  }
});

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Restaurant name is required"],
    trim: true,
    maxlength: [100, "Restaurant name cannot exceed 100 characters"]
  },
  description: {
    type: String,
    required: [true, "Description is required"],
    trim: true,
    maxlength: [500, "Description cannot exceed 500 characters"]
  },
  address: {
    street: {
      type: String,
      required: [true, "Street address is required"],
      trim: true
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true
    },
    zipCode: {
      type: String,
      required: [true, "Zip code is required"],
      trim: true
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true
    },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  contactInfo: {
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true
    },
    website: {
      type: String,
      trim: true,
      lowercase: true
    }
  },
  cuisineType: [{
    type: String,
    required: [true, "At least one cuisine type is required"],
    trim: true
  }],
  images: {
    logo: {
      type: String,
      required: [true, "Logo image URL is required"],
      trim: true
    },
    coverPhoto: {
      type: String,
      required: [true, "Cover photo URL is required"],
      trim: true
    },
    gallery: [{
      type: String,
      trim: true
    }]
  },
  operatingHours: [operatingHoursSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  approvalStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },
  rating: {
    average: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  },
  deliveryTime: {
    type: String, // e.g., "25-35 min"
    default: "30-45 min"
  },
  deliveryFee: {
    type: Number,
    default: 0
  },
  minimumOrder: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to update the updatedAt field
restaurantSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Restaurant", restaurantSchema);