/**
 * Database reset + seed script.
 *
 * Usage:
 *   npm run db:reset          – drop all collections then seed
 *   npm run db:seed           – seed without dropping (existing seed.ts)
 *
 * What it does:
 *   1. Connects to MongoDB (uses MONGODB_URI from .env)
 *   2. Drops every collection in the database
 *   3. Seeds: Users (admin, vendor, customers, driver) + CustomerProfiles
 *             + Restaurants
 *   4. Disconnects
 *
 * Default credentials (development only):
 *   Admin    → admin@fooddash.com      / Admin@1234
 *   Vendor   → vendor@fooddash.com     / Vendor@1234
 *   Customer → customer@fooddash.com   / Customer@1234
 *   Driver   → driver@fooddash.com     / Driver@1234
 */
import mongoose from "mongoose";
import "dotenv/config";

import User from "./src/models/User";
import CustomerProfile from "./src/models/CustomerProfile";
import VendorProfile from "./src/models/VendorProfile";
import DriverProfile from "./src/models/DriverProfile";
import Restaurant from "./src/models/Restaurant";
import { IRestaurant } from "./src/types";

// ── Pretty logger ──────────────────────────────────────────────

const log = {
  step: (msg: string) => console.log(`\n⏳ ${msg}`),
  done: (msg: string) => console.log(`✅ ${msg}`),
  info: (msg: string) => console.log(`   ${msg}`),
  warn: (msg: string) => console.log(`⚠️  ${msg}`),
  fail: (msg: string) => console.error(`❌ ${msg}`),
  divider: () => console.log("─".repeat(56)),
};

// ── Seed data: Users ───────────────────────────────────────────

const usersData = [
  {
    email: "admin@fooddash.com",
    password: "Admin@1234",
    firstName: "Admin",
    lastName: "User",
    phoneNumber: "+8801700000001",
    role: "admin" as const,
    isEmailVerified: true,
  },
  {
    email: "vendor@fooddash.com",
    password: "Vendor@1234",
    firstName: "Vendor",
    lastName: "User",
    phoneNumber: "+8801700000002",
    role: "vendor" as const,
    isEmailVerified: true,
  },
  {
    email: "customer@fooddash.com",
    password: "Customer@1234",
    firstName: "Rahim",
    lastName: "Ahmed",
    phoneNumber: "+8801700000003",
    role: "customer" as const,
    isEmailVerified: true,
  },
  {
    email: "customer2@fooddash.com",
    password: "Customer@1234",
    firstName: "Fatima",
    lastName: "Begum",
    phoneNumber: "+8801700000004",
    role: "customer" as const,
    isEmailVerified: true,
  },
  {
    email: "driver@fooddash.com",
    password: "Driver@1234",
    firstName: "Karim",
    lastName: "Khan",
    phoneNumber: "+8801700000005",
    role: "driver" as const,
    isEmailVerified: true,
  },
];

// ── Seed data: Restaurants ─────────────────────────────────────

type SeedRestaurant = Omit<IRestaurant, "createdAt" | "updatedAt">;

const restaurantsData: SeedRestaurant[] = [
  {
    name: "Panshi",
    description:
      "Authentic Kacchi Biryani and traditional Bangladeshi cuisine from Sylhet. Famous for its flavorful rice dishes and tender meat preparations.",
    address: {
      street: "123 Mirpur Road",
      city: "Dhaka",
      state: "Dhaka Division",
      zipCode: "1207",
      country: "Bangladesh",
    },
    contactInfo: {
      phone: "+880 1711-123456",
      email: "info@panshi.com",
      website: "www.panshi.com",
    },
    cuisineType: ["Bangladeshi", "Biryani", "Mughlai"],
    images: {
      logo: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=150&h=150&fit=crop",
      coverPhoto:
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop",
      gallery: [
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1556912167-f50a1d068d8d?w=400&h=300&fit=crop",
      ],
    },
    operatingHours: [
      { day: "Monday", openTime: "10:00", closeTime: "22:00", isOpen: true },
      { day: "Tuesday", openTime: "10:00", closeTime: "22:00", isOpen: true },
      { day: "Wednesday", openTime: "10:00", closeTime: "22:00", isOpen: true },
      { day: "Thursday", openTime: "10:00", closeTime: "22:00", isOpen: true },
      { day: "Friday", openTime: "10:00", closeTime: "23:00", isOpen: true },
      { day: "Saturday", openTime: "11:00", closeTime: "23:00", isOpen: true },
      { day: "Sunday", openTime: "11:00", closeTime: "21:00", isOpen: true },
    ],
    isActive: true,
    approvalStatus: "approved",
    rating: { average: 4.7, count: 124 },
    deliveryTime: "30-45 min",
    deliveryFee: 60,
    minimumOrder: 300,
  },
  {
    name: "Kacchi Bhai",
    description:
      "Specializing in authentic Dhaka-style Kacchi Biryani with premium ingredients and traditional cooking methods.",
    address: {
      street: "456 Dhanmondi Road",
      city: "Dhaka",
      state: "Dhaka Division",
      zipCode: "1205",
      country: "Bangladesh",
    },
    contactInfo: {
      phone: "+880 1811-234567",
      email: "contact@kaccibhai.com",
      website: "www.kaccibhai.com",
    },
    cuisineType: ["Bangladeshi", "Biryani", "Traditional"],
    images: {
      logo: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=150&h=150&fit=crop",
      coverPhoto:
        "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&h=400&fit=crop",
      gallery: [
        "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1565557623262-b5c8e26b5cb4?w=400&h=300&fit=crop",
      ],
    },
    operatingHours: [
      { day: "Monday", openTime: "09:00", closeTime: "21:00", isOpen: true },
      { day: "Tuesday", openTime: "09:00", closeTime: "21:00", isOpen: true },
      { day: "Wednesday", openTime: "09:00", closeTime: "21:00", isOpen: true },
      { day: "Thursday", openTime: "09:00", closeTime: "21:00", isOpen: true },
      { day: "Friday", openTime: "09:00", closeTime: "22:00", isOpen: true },
      { day: "Saturday", openTime: "10:00", closeTime: "22:00", isOpen: true },
      { day: "Sunday", openTime: "10:00", closeTime: "20:00", isOpen: true },
    ],
    isActive: true,
    approvalStatus: "approved",
    rating: { average: 4.5, count: 98 },
    deliveryTime: "25-40 min",
    deliveryFee: 50,
    minimumOrder: 250,
  },
  {
    name: "Woondaal",
    description:
      "Modern twist on traditional Bangladeshi cuisine with fusion elements and contemporary presentation.",
    address: {
      street: "789 Gulshan Avenue",
      city: "Dhaka",
      state: "Dhaka Division",
      zipCode: "1212",
      country: "Bangladesh",
    },
    contactInfo: {
      phone: "+880 1611-345678",
      email: "hello@woondaal.com",
      website: "www.woondaal.com",
    },
    cuisineType: ["Bangladeshi", "Fusion", "Contemporary"],
    images: {
      logo: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=150&h=150&fit=crop",
      coverPhoto:
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=400&fit=crop",
      gallery: [
        "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1565299507177-b0ac6676234d?w=400&h=300&fit=crop",
      ],
    },
    operatingHours: [
      { day: "Monday", openTime: "11:00", closeTime: "23:00", isOpen: true },
      { day: "Tuesday", openTime: "11:00", closeTime: "23:00", isOpen: true },
      { day: "Wednesday", openTime: "11:00", closeTime: "23:00", isOpen: true },
      { day: "Thursday", openTime: "11:00", closeTime: "23:00", isOpen: true },
      { day: "Friday", openTime: "11:00", closeTime: "00:00", isOpen: true },
      { day: "Saturday", openTime: "12:00", closeTime: "00:00", isOpen: true },
      { day: "Sunday", openTime: "12:00", closeTime: "22:00", isOpen: true },
    ],
    isActive: true,
    approvalStatus: "approved",
    rating: { average: 4.8, count: 156 },
    deliveryTime: "35-50 min",
    deliveryFee: 80,
    minimumOrder: 400,
  },
  {
    name: "Sylhet Tea House",
    description:
      "Authentic Sylheti cuisine and traditional tea house atmosphere with regional specialties.",
    address: {
      street: "321 Old Airport Road",
      city: "Sylhet",
      state: "Sylhet Division",
      zipCode: "3100",
      country: "Bangladesh",
    },
    contactInfo: {
      phone: "+880 1911-456789",
      email: "info@sylhetteahouse.com",
      website: "www.sylhetteahouse.com",
    },
    cuisineType: ["Bangladeshi", "Sylheti", "Tea House"],
    images: {
      logo: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=150&h=150&fit=crop",
      coverPhoto:
        "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&h=400&fit=crop",
      gallery: [
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&h=300&fit=crop",
      ],
    },
    operatingHours: [
      { day: "Monday", openTime: "08:00", closeTime: "22:00", isOpen: true },
      { day: "Tuesday", openTime: "08:00", closeTime: "22:00", isOpen: true },
      { day: "Wednesday", openTime: "08:00", closeTime: "22:00", isOpen: true },
      { day: "Thursday", openTime: "08:00", closeTime: "22:00", isOpen: true },
      { day: "Friday", openTime: "08:00", closeTime: "23:00", isOpen: true },
      { day: "Saturday", openTime: "09:00", closeTime: "23:00", isOpen: true },
      { day: "Sunday", openTime: "09:00", closeTime: "21:00", isOpen: true },
    ],
    isActive: true,
    approvalStatus: "approved",
    rating: { average: 4.6, count: 87 },
    deliveryTime: "20-35 min",
    deliveryFee: 40,
    minimumOrder: 200,
  },
  {
    name: "Chillox",
    description:
      "Popular Bangladeshi fast food chain known for burgers, finger foods, and quick service.",
    address: {
      street: "555 Banani Main Road",
      city: "Dhaka",
      state: "Dhaka Division",
      zipCode: "1213",
      country: "Bangladesh",
    },
    contactInfo: {
      phone: "+880 1511-567890",
      email: "support@chillox.com",
      website: "www.chillox.com",
    },
    cuisineType: ["Fast Food", "Burgers", "Finger Food"],
    images: {
      logo: "https://images.unsplash.com/photo-1565299507177-b0ac6676234d?w=150&h=150&fit=crop",
      coverPhoto:
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=400&fit=crop",
      gallery: [
        "https://images.unsplash.com/photo-1565557623262-b5c8e26b5cb4?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&h=300&fit=crop",
      ],
    },
    operatingHours: [
      { day: "Monday", openTime: "10:00", closeTime: "23:00", isOpen: true },
      { day: "Tuesday", openTime: "10:00", closeTime: "23:00", isOpen: true },
      { day: "Wednesday", openTime: "10:00", closeTime: "23:00", isOpen: true },
      { day: "Thursday", openTime: "10:00", closeTime: "23:00", isOpen: true },
      { day: "Friday", openTime: "10:00", closeTime: "00:00", isOpen: true },
      { day: "Saturday", openTime: "10:00", closeTime: "00:00", isOpen: true },
      { day: "Sunday", openTime: "10:00", closeTime: "23:00", isOpen: true },
    ],
    isActive: true,
    approvalStatus: "approved",
    rating: { average: 4.4, count: 210 },
    deliveryTime: "15-25 min",
    deliveryFee: 30,
    minimumOrder: 150,
  },
  {
    name: "Nando's Bangladesh",
    description:
      "International flame-grilled PERi-PERi chicken restaurant with Bangladeshi flavors and spices.",
    address: {
      street: "777 Panthapath",
      city: "Dhaka",
      state: "Dhaka Division",
      zipCode: "1205",
      country: "Bangladesh",
    },
    contactInfo: {
      phone: "+880 1711-678901",
      email: "info@nandosbd.com",
      website: "www.nandosbd.com",
    },
    cuisineType: ["International", "Chicken", "PERi-PERi"],
    images: {
      logo: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=150&h=150&fit=crop",
      coverPhoto:
        "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=400&fit=crop",
      gallery: [
        "https://images.unsplash.com/photo-1565299507177-b0ac6676234d?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1565557623262-b5c8e26b5cb4?w=400&h=300&fit=crop",
      ],
    },
    operatingHours: [
      { day: "Monday", openTime: "11:00", closeTime: "22:00", isOpen: true },
      { day: "Tuesday", openTime: "11:00", closeTime: "22:00", isOpen: true },
      { day: "Wednesday", openTime: "11:00", closeTime: "22:00", isOpen: true },
      { day: "Thursday", openTime: "11:00", closeTime: "22:00", isOpen: true },
      { day: "Friday", openTime: "11:00", closeTime: "23:00", isOpen: true },
      { day: "Saturday", openTime: "12:00", closeTime: "23:00", isOpen: true },
      { day: "Sunday", openTime: "12:00", closeTime: "21:00", isOpen: true },
    ],
    isActive: true,
    approvalStatus: "approved",
    rating: { average: 4.3, count: 175 },
    deliveryTime: "25-35 min",
    deliveryFee: 70,
    minimumOrder: 350,
  },
];

// ── Reset + Seed ───────────────────────────────────────────────

const resetAndSeed = async (): Promise<void> => {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    log.fail("MONGODB_URI is not defined in .env");
    process.exit(1);
  }

  try {
    // ── Connect ────────────────────────────────────────────────
    log.step("Connecting to MongoDB…");
    await mongoose.connect(MONGODB_URI);
    log.done(`Connected to ${MONGODB_URI}`);

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database handle is undefined after connect");
    }

    // ── Drop all collections ───────────────────────────────────
    log.step("Dropping all collections…");
    const collections = await db.listCollections().toArray();

    if (collections.length === 0) {
      log.info("No collections to drop (fresh database).");
    } else {
      for (const col of collections) {
        await db.dropCollection(col.name);
        log.info(`Dropped: ${col.name}`);
      }
      log.done(`Dropped ${collections.length} collection(s)`);
    }

    // ── Seed Users ─────────────────────────────────────────────
    log.step("Seeding users…");
    const createdUsers = [];
    for (const userData of usersData) {
      const user = new User(userData);
      await user.save(); // triggers pre-save hook (bcrypt)
      createdUsers.push(user);
      log.info(
        `${user.role.padEnd(8)} → ${user.email} (${user.firstName} ${user.lastName})`,
      );
    }
    log.done(`Seeded ${createdUsers.length} users`);

    // ── Seed Customer Profiles ─────────────────────────────────
    log.step("Seeding customer profiles…");
    const customers = createdUsers.filter((u) => u.role === "customer");
    let customerCount = 0;
    for (const customer of customers) {
      await CustomerProfile.create({ userId: customer._id });
      customerCount++;
    }
    log.done(`Seeded ${customerCount} customer profile(s)`);

    // ── Seed Vendor Profile ────────────────────────────────────
    log.step("Seeding vendor profile…");
    const vendorUser = createdUsers.find((u) => u.role === "vendor");
    if (vendorUser) {
      await VendorProfile.create({
        userId: vendorUser._id,
        businessName: "FoodDash Vendor",
        businessLicense: "BL-2026-00001",
        taxId: "TAX-BD-00001",
        isVerified: true,
      });
      log.done("Seeded 1 vendor profile");
    }

    // ── Seed Driver Profile ────────────────────────────────────
    log.step("Seeding driver profile…");
    const driverUser = createdUsers.find((u) => u.role === "driver");
    if (driverUser) {
      await DriverProfile.create({
        userId: driverUser._id,
        licenseNumber: "DL-2026-99999",
        vehicleType: "motorcycle",
        vehicleNumber: "DHAKA-KA-12-3456",
        isAvailable: true,
        currentLocation: { latitude: 23.8103, longitude: 90.4125 },
        rating: 4.8,
        completedDeliveries: 0,
      });
      log.done("Seeded 1 driver profile");
    }

    // ── Seed Restaurants ───────────────────────────────────────
    log.step("Seeding restaurants…");
    const restaurants = await Restaurant.insertMany(restaurantsData);
    for (const r of restaurants) {
      log.info(`${r.name}`);
    }
    log.done(`Seeded ${restaurants.length} restaurant(s)`);

    // ── Link restaurants to vendor ─────────────────────────────
    if (vendorUser) {
      const restaurantIds = restaurants.map((r) => r._id);
      await VendorProfile.findOneAndUpdate(
        { userId: vendorUser._id },
        { $set: { restaurantIds } },
      );
      log.info(
        `Linked ${restaurantIds.length} restaurant(s) to vendor ${vendorUser.email}`,
      );
    }

    // ── Summary ────────────────────────────────────────────────
    log.divider();
    console.log("\n🎉 Database reset & seeded successfully!\n");
    console.log("Default logins (dev only):");
    console.log("  Admin    → admin@fooddash.com      / Admin@1234");
    console.log("  Vendor   → vendor@fooddash.com     / Vendor@1234");
    console.log("  Customer → customer@fooddash.com   / Customer@1234");
    console.log("  Customer → customer2@fooddash.com  / Customer@1234");
    console.log("  Driver   → driver@fooddash.com     / Driver@1234");
    log.divider();
  } catch (error) {
    log.fail("Seed failed:");
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    log.info("MongoDB connection closed.");
  }
};

resetAndSeed();
