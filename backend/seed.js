const mongoose = require("mongoose");
require("dotenv").config();

// Import the Restaurant model
const Restaurant = require("./src/models/restaurantModel");

// Mock data for 6 Bangladeshi restaurants
const restaurantsData = [
  {
    name: "Panshi",
    description: "Authentic Kacchi Biryani and traditional Bangladeshi cuisine from Sylhet. Famous for its flavorful rice dishes and tender meat preparations.",
    address: {
      street: "123 Mirpur Road",
      city: "Dhaka",
      state: "Dhaka Division",
      zipCode: "1207",
      country: "Bangladesh"
    },
    contactInfo: {
      phone: "+880 1711-123456",
      email: "info@panshi.com",
      website: "www.panshi.com"
    },
    cuisineType: ["Bangladeshi", "Biryani", "Mughlai"],
    images: {
      logo: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=150&h=150&fit=crop",
      coverPhoto: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop",
      gallery: [
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1556912167-f50a1d068d8d?w=400&h=300&fit=crop"
      ]
    },
    operatingHours: [
      { day: "Monday", openTime: "10:00", closeTime: "22:00", isOpen: true },
      { day: "Tuesday", openTime: "10:00", closeTime: "22:00", isOpen: true },
      { day: "Wednesday", openTime: "10:00", closeTime: "22:00", isOpen: true },
      { day: "Thursday", openTime: "10:00", closeTime: "22:00", isOpen: true },
      { day: "Friday", openTime: "10:00", closeTime: "23:00", isOpen: true },
      { day: "Saturday", openTime: "11:00", closeTime: "23:00", isOpen: true },
      { day: "Sunday", openTime: "11:00", closeTime: "21:00", isOpen: true }
    ],
    isActive: true,
    approvalStatus: "approved",
    rating: { average: 4.7, count: 124 },
    deliveryTime: "30-45 min",
    deliveryFee: 60,
    minimumOrder: 300
  },
  {
    name: "Kacchi Bhai",
    description: "Specializing in authentic Dhaka-style Kacchi Biryani with premium ingredients and traditional cooking methods.",
    address: {
      street: "456 Dhanmondi Road",
      city: "Dhaka",
      state: "Dhaka Division",
      zipCode: "1205",
      country: "Bangladesh"
    },
    contactInfo: {
      phone: "+880 1811-234567",
      email: "contact@kaccibhai.com",
      website: "www.kaccibhai.com"
    },
    cuisineType: ["Bangladeshi", "Biryani", "Traditional"],
    images: {
      logo: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=150&h=150&fit=crop",
      coverPhoto: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&h=400&fit=crop",
      gallery: [
        "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1565557623262-b5c8e26b5cb4?w=400&h=300&fit=crop"
      ]
    },
    operatingHours: [
      { day: "Monday", openTime: "09:00", closeTime: "21:00", isOpen: true },
      { day: "Tuesday", openTime: "09:00", closeTime: "21:00", isOpen: true },
      { day: "Wednesday", openTime: "09:00", closeTime: "21:00", isOpen: true },
      { day: "Thursday", openTime: "09:00", closeTime: "21:00", isOpen: true },
      { day: "Friday", openTime: "09:00", closeTime: "22:00", isOpen: true },
      { day: "Saturday", openTime: "10:00", closeTime: "22:00", isOpen: true },
      { day: "Sunday", openTime: "10:00", closeTime: "20:00", isOpen: true }
    ],
    isActive: true,
    approvalStatus: "approved",
    rating: { average: 4.5, count: 98 },
    deliveryTime: "25-40 min",
    deliveryFee: 50,
    minimumOrder: 250
  },
  {
    name: "Woondaal",
    description: "Modern twist on traditional Bangladeshi cuisine with fusion elements and contemporary presentation.",
    address: {
      street: "789 Gulshan Avenue",
      city: "Dhaka",
      state: "Dhaka Division",
      zipCode: "1212",
      country: "Bangladesh"
    },
    contactInfo: {
      phone: "+880 1611-345678",
      email: "hello@woondaal.com",
      website: "www.woondaal.com"
    },
    cuisineType: ["Bangladeshi", "Fusion", "Contemporary"],
    images: {
      logo: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=150&h=150&fit=crop",
      coverPhoto: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=400&fit=crop",
      gallery: [
        "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1565299507177-b0ac6676234d?w=400&h=300&fit=crop"
      ]
    },
    operatingHours: [
      { day: "Monday", openTime: "11:00", closeTime: "23:00", isOpen: true },
      { day: "Tuesday", openTime: "11:00", closeTime: "23:00", isOpen: true },
      { day: "Wednesday", openTime: "11:00", closeTime: "23:00", isOpen: true },
      { day: "Thursday", openTime: "11:00", closeTime: "23:00", isOpen: true },
      { day: "Friday", openTime: "11:00", closeTime: "00:00", isOpen: true },
      { day: "Saturday", openTime: "12:00", closeTime: "00:00", isOpen: true },
      { day: "Sunday", openTime: "12:00", closeTime: "22:00", isOpen: true }
    ],
    isActive: true,
    approvalStatus: "approved",
    rating: { average: 4.8, count: 156 },
    deliveryTime: "35-50 min",
    deliveryFee: 80,
    minimumOrder: 400
  },
  {
    name: "Sylhet Tea House",
    description: "Authentic Sylheti cuisine and traditional tea house atmosphere with regional specialties.",
    address: {
      street: "321 Old Airport Road",
      city: "Sylhet",
      state: "Sylhet Division",
      zipCode: "3100",
      country: "Bangladesh"
    },
    contactInfo: {
      phone: "+880 1911-456789",
      email: "info@sylhetteahouse.com",
      website: "www.sylhetteahouse.com"
    },
    cuisineType: ["Bangladeshi", "Sylheti", "Tea House"],
    images: {
      logo: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=150&h=150&fit=crop",
      coverPhoto: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&h=400&fit=crop",
      gallery: [
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&h=300&fit=crop"
      ]
    },
    operatingHours: [
      { day: "Monday", openTime: "08:00", closeTime: "22:00", isOpen: true },
      { day: "Tuesday", openTime: "08:00", closeTime: "22:00", isOpen: true },
      { day: "Wednesday", openTime: "08:00", closeTime: "22:00", isOpen: true },
      { day: "Thursday", openTime: "08:00", closeTime: "22:00", isOpen: true },
      { day: "Friday", openTime: "08:00", closeTime: "23:00", isOpen: true },
      { day: "Saturday", openTime: "09:00", closeTime: "23:00", isOpen: true },
      { day: "Sunday", openTime: "09:00", closeTime: "21:00", isOpen: true }
    ],
    isActive: true,
    approvalStatus: "approved",
    rating: { average: 4.6, count: 87 },
    deliveryTime: "20-35 min",
    deliveryFee: 40,
    minimumOrder: 200
  },
  {
    name: "Chillox",
    description: "Popular Bangladeshi fast food chain known for burgers, finger foods, and quick service.",
    address: {
      street: "555 Banani Main Road",
      city: "Dhaka",
      state: "Dhaka Division",
      zipCode: "1213",
      country: "Bangladesh"
    },
    contactInfo: {
      phone: "+880 1511-567890",
      email: "support@chillox.com",
      website: "www.chillox.com"
    },
    cuisineType: ["Fast Food", "Burgers", "Finger Food"],
    images: {
      logo: "https://images.unsplash.com/photo-1565299507177-b0ac6676234d?w=150&h=150&fit=crop",
      coverPhoto: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=400&fit=crop",
      gallery: [
        "https://images.unsplash.com/photo-1565557623262-b5c8e26b5cb4?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&h=300&fit=crop"
      ]
    },
    operatingHours: [
      { day: "Monday", openTime: "10:00", closeTime: "23:00", isOpen: true },
      { day: "Tuesday", openTime: "10:00", closeTime: "23:00", isOpen: true },
      { day: "Wednesday", openTime: "10:00", closeTime: "23:00", isOpen: true },
      { day: "Thursday", openTime: "10:00", closeTime: "23:00", isOpen: true },
      { day: "Friday", openTime: "10:00", closeTime: "00:00", isOpen: true },
      { day: "Saturday", openTime: "10:00", closeTime: "00:00", isOpen: true },
      { day: "Sunday", openTime: "10:00", closeTime: "23:00", isOpen: true }
    ],
    isActive: true,
    approvalStatus: "approved",
    rating: { average: 4.4, count: 210 },
    deliveryTime: "15-25 min",
    deliveryFee: 30,
    minimumOrder: 150
  },
  {
    name: "Nando's Bangladesh",
    description: "International flame-grilled PERi-PERi chicken restaurant with Bangladeshi flavors and spices.",
    address: {
      street: "777 Panthapath",
      city: "Dhaka",
      state: "Dhaka Division",
      zipCode: "1205",
      country: "Bangladesh"
    },
    contactInfo: {
      phone: "+880 1711-678901",
      email: "info@nandosbd.com",
      website: "www.nandosbd.com"
    },
    cuisineType: ["International", "Chicken", "PERi-PERi"],
    images: {
      logo: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=150&h=150&fit=crop",
      coverPhoto: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=400&fit=crop",
      gallery: [
        "https://images.unsplash.com/photo-1565299507177-b0ac6676234d?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1565557623262-b5c8e26b5cb4?w=400&h=300&fit=crop"
      ]
    },
    operatingHours: [
      { day: "Monday", openTime: "11:00", closeTime: "22:00", isOpen: true },
      { day: "Tuesday", openTime: "11:00", closeTime: "22:00", isOpen: true },
      { day: "Wednesday", openTime: "11:00", closeTime: "22:00", isOpen: true },
      { day: "Thursday", openTime: "11:00", closeTime: "22:00", isOpen: true },
      { day: "Friday", openTime: "11:00", closeTime: "23:00", isOpen: true },
      { day: "Saturday", openTime: "12:00", closeTime: "23:00", isOpen: true },
      { day: "Sunday", openTime: "12:00", closeTime: "21:00", isOpen: true }
    ],
    isActive: true,
    approvalStatus: "approved",
    rating: { average: 4.3, count: 175 },
    deliveryTime: "25-35 min",
    deliveryFee: 70,
    minimumOrder: 350
  }
];

// Function to seed the database
const seedRestaurants = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Clear existing restaurants
    await Restaurant.deleteMany({});
    console.log("Cleared existing restaurants");

    // Insert new restaurants
    await Restaurant.insertMany(restaurantsData);
    console.log(`Inserted ${restaurantsData.length} restaurants`);

    // Close the connection
    await mongoose.connection.close();
    console.log("Database seeded successfully");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

// Run the seed function
seedRestaurants();