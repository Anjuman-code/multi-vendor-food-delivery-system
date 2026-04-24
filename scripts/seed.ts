import { createRequire } from 'node:module';
import path from 'node:path';
import { UserRole, AddressType } from '../backend/src/config/constants';
import CustomerProfile from '../backend/src/models/CustomerProfile';
import MenuItem from '../backend/src/models/MenuItem';
import Restaurant from '../backend/src/models/Restaurant';
import User from '../backend/src/models/User';
import VendorProfile from '../backend/src/models/VendorProfile';

const backendRequire = createRequire(
  path.resolve(__dirname, '../backend/package.json'),
);

backendRequire('dotenv/config');
const mongoose = backendRequire('mongoose') as typeof import('mongoose');

const ADMIN_USER = {
  email: 'admin@seed.com',
  password: 'Admin@123456',
  firstName: 'System',
  lastName: 'Admin',
  role: UserRole.ADMIN,
  isEmailVerified: true,
  isPhoneVerified: true,
  isActive: true,
} as const;

const VENDOR_USER = {
  email: 'vendor@seed.com',
  password: 'Vendor@123456',
  firstName: 'Vendor',
  lastName: 'Owner',
  role: UserRole.VENDOR,
  isEmailVerified: true,
  isPhoneVerified: true,
  isActive: true,
} as const;

const REGULAR_USER = {
  email: 'customer@seed.com',
  password: 'Customer@123456',
  firstName: 'Regular',
  lastName: 'User',
  role: UserRole.CUSTOMER,
  isEmailVerified: true,
  isPhoneVerified: true,
  isActive: true,
} as const;

const VENDOR_PROFILE = {
  businessName: 'Seed Vendor',
  businessLicense: 'SEED-LICENSE-001',
  taxId: 'SEED-TAX-001',
  isVerified: true,
} as const;

const RESTAURANT = {
  name: 'Seed Kitchen',
  description: 'A minimal test restaurant for deterministic local development.',
  address: {
    street: '123 Seed Street',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1207',
    country: 'Bangladesh',
  },
  contactInfo: {
    phone: '+8801700000100',
    email: 'seed-kitchen@seed.com',
  },
  cuisineType: ['Bangladeshi'],
  images: {
    logo: 'https://example.com/seed-kitchen-logo.jpg',
    coverPhoto: 'https://example.com/seed-kitchen-cover.jpg',
    gallery: [],
  },
  approvalStatus: 'approved' as const,
  isActive: true,
} as const;

const MENU_ITEM = {
  name: 'Seed Chicken Biryani',
  description: 'Single deterministic menu item for test orders.',
  price: 320,
  isAvailable: true,
  preparationTime: 20,
} as const;

const seedDatabase = async (): Promise<void> => {
  const mongoDbUri = process.env.MONGODB_URI;

  if (!mongoDbUri) {
    throw new Error('MONGODB_URI is not defined in environment variables.');
  }

  await mongoose.connect(mongoDbUri);

  try {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database handle is undefined after connecting.');
    }

    await db.dropDatabase();

    const admin = await User.create(ADMIN_USER);

    const vendorUser = await User.create(VENDOR_USER);
    const restaurant = await Restaurant.create(RESTAURANT);

    await VendorProfile.create({
      userId: vendorUser._id,
      restaurantIds: [restaurant._id],
      ...VENDOR_PROFILE,
    });

    await MenuItem.create({
      restaurantId: restaurant._id,
      ...MENU_ITEM,
    });

    const regularUser = await User.create(REGULAR_USER);
    await CustomerProfile.create({ userId: regularUser._id });

    const [
      adminCount,
      vendorCount,
      vendorProfileCount,
      restaurantCount,
      menuItemCount,
      regularUserCount,
      totalUserCount,
    ] = await Promise.all([
      User.countDocuments({ role: UserRole.ADMIN }),
      User.countDocuments({ role: UserRole.VENDOR }),
      VendorProfile.countDocuments({}),
      Restaurant.countDocuments({}),
      MenuItem.countDocuments({}),
      User.countDocuments({ role: UserRole.CUSTOMER }),
      User.countDocuments({}),
    ]);

    if (adminCount !== 1)
      throw new Error(`Expected 1 admin, got ${adminCount}.`);
    if (vendorCount !== 1)
      throw new Error(`Expected 1 vendor user, got ${vendorCount}.`);
    if (vendorProfileCount !== 1)
      throw new Error(`Expected 1 vendor profile, got ${vendorProfileCount}.`);
    if (restaurantCount !== 1)
      throw new Error(`Expected 1 restaurant, got ${restaurantCount}.`);
    if (menuItemCount !== 1)
      throw new Error(`Expected 1 menu item, got ${menuItemCount}.`);
    if (regularUserCount !== 1)
      throw new Error(`Expected 1 regular user, got ${regularUserCount}.`);
    if (totalUserCount !== 3)
      throw new Error(`Expected 3 total users, got ${totalUserCount}.`);

    console.log('Minimal seed completed successfully.');
    console.log(
      'Seeded entities: 1 admin, 1 vendor profile, 1 restaurant, 1 menu item, 1 regular user.',
    );
  } finally {
    await mongoose.connection.close();
  }
};

seedDatabase().catch((error: unknown) => {
  console.error('Error seeding database:', error);
  process.exit(1);
});