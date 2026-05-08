import { createRequire } from 'node:module';
import path from 'node:path';
import { AdminTier, UserRole, VehicleType } from '../backend/src/config/constants';
import CustomerProfile from '../backend/src/models/CustomerProfile';
import DriverProfile from '../backend/src/models/DriverProfile';
import MenuCategory from '../backend/src/models/MenuCategory';
import MenuItem from '../backend/src/models/MenuItem';
import Restaurant from '../backend/src/models/Restaurant';
import User from '../backend/src/models/User';
import VendorProfile from '../backend/src/models/VendorProfile';

const ANSI = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};
const c = (color: string, msg: string) => `${color}${msg}${ANSI.reset}`;

const backendRequire = createRequire(
  path.resolve(__dirname, '../backend/package.json'),
);

backendRequire('dotenv/config');
const mongoose = backendRequire('mongoose') as typeof import('mongoose');

// ─── Seed users ───────────────────────────────────────────────────────────────

const ADMIN_USER = {
  email: 'admin@seed.com',
  password: 'Admin@123456',
  firstName: 'System',
  lastName: 'Admin',
  role: UserRole.ADMIN,
  adminTier: AdminTier.SUPER_ADMIN,
  isEmailVerified: true,
  isPhoneVerified: true,
  isActive: true,
} as const;

const ADMIN_USER_2 = {
  email: 'ops@seed.com',
  password: 'Admin@123456',
  firstName: 'Ops',
  lastName: 'Manager',
  role: UserRole.ADMIN,
  adminTier: AdminTier.ADMIN,
  isEmailVerified: true,
  isPhoneVerified: true,
  isActive: true,
} as const;

const SUPPORT_USER = {
  email: 'support@seed.com',
  password: 'Admin@123456',
  firstName: 'Support',
  lastName: 'Agent',
  role: UserRole.ADMIN,
  adminTier: AdminTier.SUPPORT,
  isEmailVerified: true,
  isPhoneVerified: true,
  isActive: true,
} as const;

const PANSHI_VENDOR_USER = {
  email: 'vendor.panshi@seed.com',
  password: 'Vendor@123456',
  firstName: 'Panshi',
  lastName: 'Owner',
  role: UserRole.VENDOR,
  isEmailVerified: true,
  isPhoneVerified: true,
  isActive: true,
} as const;

const PACH_BHAI_VENDOR_USER = {
  email: 'vendor.pachbhai@seed.com',
  password: 'Vendor@123456',
  firstName: 'Pach Bhai',
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

const DRIVER_USER = {
  email: 'driver@seed.com',
  password: 'Driver@123456',
  firstName: 'Rahim',
  lastName: 'Driver',
  role: UserRole.DRIVER,
  phoneNumber: '+8801911223344',
  isEmailVerified: true,
  isPhoneVerified: true,
  isActive: true,
} as const;

// ─── Panshi Restaurant ────────────────────────────────────────────────────────
// Source: https://www-st.foodpanda.com.bd/restaurant/s1tt/panshi-restaurant
// A beloved traditional Sylheti restaurant known for authentic biryanis and
// home-style dal-rice set meals. Located in the heart of Sylhet city.

const PANSHI_RESTAURANT = {
  name: 'Panshi Restaurant',
  slug: 'panshi-restaurant-sylhet',
  description:
    'A beloved institution in Sylhet since decades, Panshi is celebrated for its authentic kachchi biryani, hearty mutton dishes, and home-style set meals. The kitchen follows time-honoured Sylheti recipes passed down through generations — every plate is a taste of tradition.',
  address: {
    street: 'Zinda Bazar Road',
    area: 'Zinda Bazar',
    district: 'Sylhet',
    coordinates: { lat: 24.8994, lng: 91.8687 },
  },
  location: {
    type: 'Point' as const,
    coordinates: [91.8687, 24.8994] as [number, number],
  },
  contactInfo: {
    phone: '+8801711234567',
    email: 'panshi.sylhet@gmail.com',
  },
  cuisineType: ['Bangladeshi', 'Sylheti', 'Bengali'],
  tags: ['halal', 'family-friendly', 'traditional', 'budget-friendly', 'set-meals'],
  images: {
    logo: 'https://images.foodpanda.com/restaurant/s1tt/logo.jpg',
    coverPhoto: 'https://images.foodpanda.com/restaurant/s1tt/cover.jpg',
    gallery: [
      'https://images.foodpanda.com/restaurant/s1tt/gallery-1.jpg',
      'https://images.foodpanda.com/restaurant/s1tt/gallery-2.jpg',
    ],
  },
  operatingHours: [
    { day: 'Saturday', openTime: '08:00', closeTime: '22:00', isOpen: true },
    { day: 'Sunday', openTime: '08:00', closeTime: '22:00', isOpen: true },
    { day: 'Monday', openTime: '08:00', closeTime: '22:00', isOpen: true },
    { day: 'Tuesday', openTime: '08:00', closeTime: '22:00', isOpen: true },
    { day: 'Wednesday', openTime: '08:00', closeTime: '22:00', isOpen: true },
    { day: 'Thursday', openTime: '08:00', closeTime: '22:00', isOpen: true },
    { day: 'Friday', openTime: '12:00', closeTime: '22:00', isOpen: true },
  ],
  approvalStatus: 'approved' as const,
  isActive: true,
  priceRange: 1 as const,
  deliveryTime: { min: 25, max: 40 },
  deliveryFee: 30,
  minimumOrder: 100,
  serviceOptions: ['delivery', 'dine-in', 'takeaway'] as ('delivery' | 'dine-in' | 'takeaway')[],
  paymentMethods: ['cash', 'bkash', 'nagad'],
  averagePreparationTime: 20,
  rating: { average: 4.1, count: 3842 },
};

// ─── Pach Bhai Restaurant ─────────────────────────────────────────────────────
// Source: https://skip.menu/at/35772-pach-bhai-restaurant
// Rating: 4.3 (16,209 reviews) — one of Sylhet's most popular local eateries.
// Famous for beef khichuri, shatkora beef curry, and fresh prawn dishes.

const PACH_BHAI_RESTAURANT = {
  name: 'Pach Bhai Restaurant',
  slug: 'pach-bhai-restaurant-sylhet',
  description:
    'With over 16,000 reviews and a 4.3-star rating, Pach Bhai is one of Sylhet\'s most-loved eateries. Renowned for its signature Beef Khichuri loaded with fried onions and ghee, the iconic Beef Curry with Shatkora (a Sylheti citrus), and some of the juiciest prawn curries in the city. A true showcase of Sylheti street-food culture.',
  address: {
    street: 'Bandar Bazar',
    area: 'Bandar Bazar',
    district: 'Sylhet',
    coordinates: { lat: 24.9042, lng: 91.8703 },
  },
  location: {
    type: 'Point' as const,
    coordinates: [91.8703, 24.9042] as [number, number],
  },
  contactInfo: {
    phone: '+8801812345678',
    email: 'pachbhai.sylhet@gmail.com',
  },
  cuisineType: ['Bangladeshi', 'Sylheti', 'Bengali'],
  tags: ['halal', 'family-friendly', 'popular', 'sylheti-specialty', 'khichuri'],
  images: {
    logo: 'https://images.skip.menu/restaurant/35772/logo.jpg',
    coverPhoto: 'https://images.skip.menu/restaurant/35772/cover.jpg',
    gallery: [
      'https://images.skip.menu/restaurant/35772/gallery-1.jpg',
      'https://images.skip.menu/restaurant/35772/gallery-2.jpg',
    ],
  },
  operatingHours: [
    { day: 'Saturday', openTime: '07:00', closeTime: '22:00', isOpen: true },
    { day: 'Sunday', openTime: '07:00', closeTime: '22:00', isOpen: true },
    { day: 'Monday', openTime: '07:00', closeTime: '22:00', isOpen: true },
    { day: 'Tuesday', openTime: '07:00', closeTime: '22:00', isOpen: true },
    { day: 'Wednesday', openTime: '07:00', closeTime: '22:00', isOpen: true },
    { day: 'Thursday', openTime: '07:00', closeTime: '22:00', isOpen: true },
    { day: 'Friday', openTime: '07:00', closeTime: '22:00', isOpen: true },
  ],
  approvalStatus: 'approved' as const,
  isActive: true,
  priceRange: 1 as const,
  deliveryTime: { min: 20, max: 35 },
  deliveryFee: 30,
  minimumOrder: 80,
  serviceOptions: ['delivery', 'dine-in', 'takeaway'] as ('delivery' | 'dine-in' | 'takeaway')[],
  paymentMethods: ['cash', 'bkash', 'nagad'],
  averagePreparationTime: 15,
  rating: { average: 4.3, count: 16209 },
};

// ─── Seed function ────────────────────────────────────────────────────────────

const seedDatabase = async (): Promise<void> => {
  const mongoDbUri = process.env.MONGODB_URI;
  if (!mongoDbUri) {
    console.error(c(ANSI.red, '✖  MONGODB_URI is not defined in .env'));
    process.exit(1);
  }

  console.log(c(ANSI.cyan, 'Connecting to MongoDB...'));
  await mongoose.connect(mongoDbUri);

  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database handle is undefined after connecting.');

    console.log(c(ANSI.cyan, 'Dropping database...'));
    await db.dropDatabase();
    console.log(c(ANSI.yellow, 'Database dropped. Seeding...\n'));

    // ── Admin users ─────────────────────────────────────────────
    await User.create(ADMIN_USER);
    await User.create(ADMIN_USER_2);
    await User.create(SUPPORT_USER);
    console.log(c(ANSI.green, '✓ Admin users created (super_admin, admin, support)'));

    // ── Customer user ───────────────────────────────────────────
    const regularUser = await User.create(REGULAR_USER);
    await CustomerProfile.create({ userId: regularUser._id });
    console.log(c(ANSI.green, '✓ Customer user created'));

    // ── Driver user ─────────────────────────────────────────────
    const driverUser = await User.create(DRIVER_USER);
    await DriverProfile.create({
      userId: driverUser._id,
      applicationStatus: 'approved',
      licenseNumber: 'SYL-DL-2024-007',
      vehicleType: VehicleType.MOTORCYCLE,
      vehicleNumber: 'SYLHET-M-1234',
      isAvailable: false,
      isVerified: true,
      totalDeliveries: 0,
      totalEarnings: 0,
      rating: { average: 0, count: 0 },
    });
    console.log(c(ANSI.green, '✓ Driver user created (approved, motorcycle)'));

    // ── Panshi Restaurant ───────────────────────────────────────
    const panshiVendorUser = await User.create(PANSHI_VENDOR_USER);
    const panshiRestaurant = await Restaurant.create(PANSHI_RESTAURANT);

    await VendorProfile.create({
      userId: panshiVendorUser._id,
      restaurantIds: [panshiRestaurant._id],
      businessName: 'Panshi Restaurant',
      businessLicense: 'SYL-TRADE-2009-0441',
      taxId: 'SYL-TIN-0441-2009',
      isVerified: true,
      autoAcceptOrders: false,
    });

    // Panshi: categories
    const panshiCatLunchDinner = await MenuCategory.create({
      restaurantId: panshiRestaurant._id,
      name: 'Lunch & Dinner',
      description: 'Full biryani and rice platters — the house specialties',
      icon: '🍚',
      displayOrder: 1,
    });
    const panshiCatMains = await MenuCategory.create({
      restaurantId: panshiRestaurant._id,
      name: 'Mains',
      description: 'Hearty dal-rice set meals with meat or poultry',
      icon: '🍛',
      displayOrder: 2,
    });
    const panshiCatBhorta = await MenuCategory.create({
      restaurantId: panshiRestaurant._id,
      name: 'Vegetable & Bhorta',
      description: 'Traditional Sylheti smashed and stir-fried side dishes',
      icon: '🥬',
      displayOrder: 3,
    });

    // Panshi: menu items (15 items from Foodpanda listing)
    await MenuItem.insertMany([
      // ── Lunch & Dinner ───────────────────────────────────────
      {
        restaurantId: panshiRestaurant._id,
        categoryId: panshiCatLunchDinner._id,
        name: 'Kachchi Biryani',
        description: 'Slow-cooked mutton layered with fragrant basmati rice and whole potato, marinated overnight in yoghurt and spices — the crown jewel of Panshi\'s kitchen.',
        price: 160,
        dietaryTags: ['halal'],
        isAvailable: true,
        isPopular: true,
        isFeatured: true,
        preparationTime: 30,
        spiceLevel: 'medium',
        displayOrder: 1,
      },
      {
        restaurantId: panshiRestaurant._id,
        categoryId: panshiCatLunchDinner._id,
        name: 'Chicken Biryani',
        description: 'Mixed rice dish made with aromatic spices and tender chicken pieces, slow-cooked in the dum style.',
        price: 120,
        dietaryTags: ['halal'],
        isAvailable: true,
        isPopular: true,
        preparationTime: 25,
        spiceLevel: 'medium',
        displayOrder: 2,
      },
      {
        restaurantId: panshiRestaurant._id,
        categoryId: panshiCatLunchDinner._id,
        name: 'Mutton Biryani',
        description: 'Tender mutton pieces cooked with rice and a blend of whole spices, served with raita.',
        price: 160,
        dietaryTags: ['halal'],
        isAvailable: true,
        preparationTime: 30,
        spiceLevel: 'medium',
        displayOrder: 3,
      },
      // ── Mains ────────────────────────────────────────────────
      {
        restaurantId: panshiRestaurant._id,
        categoryId: panshiCatMains._id,
        name: 'Beef, Daal & Rice',
        description: 'A wholesome set meal of slow-cooked beef curry served alongside creamy masoor daal and steamed white rice.',
        price: 90,
        dietaryTags: ['halal'],
        isAvailable: true,
        isPopular: true,
        preparationTime: 15,
        spiceLevel: 'mild',
        servingSize: '1 plate',
        displayOrder: 1,
      },
      {
        restaurantId: panshiRestaurant._id,
        categoryId: panshiCatMains._id,
        name: 'Jhalfry, Daal & Rice',
        description: 'Set meal of spicy chicken jhalfry (dry-fried gravy dish) with daal and rice — a lunchtime staple.',
        price: 75,
        dietaryTags: ['halal'],
        isAvailable: true,
        preparationTime: 15,
        spiceLevel: 'hot',
        servingSize: '1 plate',
        displayOrder: 2,
      },
      {
        restaurantId: panshiRestaurant._id,
        categoryId: panshiCatMains._id,
        name: 'Chicken Roast, Daal & Rice',
        description: 'Set meal of golden roasted chicken with a rich gravy, paired with daal and steamed rice.',
        price: 110,
        dietaryTags: ['halal'],
        isAvailable: true,
        preparationTime: 20,
        spiceLevel: 'mild',
        servingSize: '1 plate',
        displayOrder: 3,
      },
      {
        restaurantId: panshiRestaurant._id,
        categoryId: panshiCatMains._id,
        name: 'Mutton, Daal & Rice',
        description: 'Set meal of tender mutton curry with aromatic spices, creamy daal, and white rice.',
        price: 150,
        dietaryTags: ['halal'],
        isAvailable: true,
        preparationTime: 20,
        spiceLevel: 'medium',
        servingSize: '1 plate',
        displayOrder: 4,
      },
      {
        restaurantId: panshiRestaurant._id,
        categoryId: panshiCatMains._id,
        name: 'Koel Bird, Daal & Rice',
        description: 'A rare Sylheti delicacy — set meal of quail (koel) bird cooked in a dark, rich masala with daal and rice.',
        price: 110,
        dietaryTags: ['halal'],
        isAvailable: true,
        preparationTime: 25,
        spiceLevel: 'medium',
        servingSize: '1 plate',
        displayOrder: 5,
      },
      {
        restaurantId: panshiRestaurant._id,
        categoryId: panshiCatMains._id,
        name: 'Pigeon, Daal & Rice',
        description: 'Traditional set meal of pigeon cooked in a fragrant spice blend, served with daal and steamed rice.',
        price: 140,
        dietaryTags: ['halal'],
        isAvailable: true,
        preparationTime: 25,
        spiceLevel: 'medium',
        servingSize: '1 plate',
        displayOrder: 6,
      },
      {
        restaurantId: panshiRestaurant._id,
        categoryId: panshiCatMains._id,
        name: 'Beef Bhuna',
        description: 'Slow-cooked dry beef bhuna with caramelised onions and reduced masala — pairs perfectly with any rice dish.',
        price: 90,
        dietaryTags: ['halal'],
        isAvailable: true,
        preparationTime: 20,
        spiceLevel: 'medium',
        displayOrder: 7,
      },
      // ── Vegetable & Bhorta ───────────────────────────────────
      {
        restaurantId: panshiRestaurant._id,
        categoryId: panshiCatBhorta._id,
        name: 'Shutki Bhorta',
        description: 'Mashed dried fish (shutki) mixed with mustard oil, green chillies, and fresh coriander — an acquired Sylheti classic.',
        price: 10,
        dietaryTags: [],
        isAvailable: true,
        isPopular: true,
        preparationTime: 5,
        spiceLevel: 'hot',
        displayOrder: 1,
      },
      {
        restaurantId: panshiRestaurant._id,
        categoryId: panshiCatBhorta._id,
        name: 'Shutki Bhuna',
        description: 'Deep-fried dried fish tossed with onion, garlic, and dried chilli — intensely savoury and aromatic.',
        price: 40,
        dietaryTags: [],
        isAvailable: true,
        preparationTime: 10,
        spiceLevel: 'hot',
        displayOrder: 2,
      },
      {
        restaurantId: panshiRestaurant._id,
        categoryId: panshiCatBhorta._id,
        name: 'Taaki Fish Bhorta',
        description: 'Mashed taaki (climbing perch) fish blended with spices, herbs, and a dash of mustard oil.',
        price: 20,
        dietaryTags: [],
        isAvailable: true,
        preparationTime: 5,
        spiceLevel: 'medium',
        displayOrder: 3,
      },
      {
        restaurantId: panshiRestaurant._id,
        categoryId: panshiCatBhorta._id,
        name: 'Chingree Bhorta',
        description: 'Mashed small shrimp (chingri) with mustard oil, green chillies, and garlic — a Sylheti favourite side.',
        price: 10,
        dietaryTags: ['halal'],
        isAvailable: true,
        preparationTime: 5,
        spiceLevel: 'mild',
        displayOrder: 4,
      },
      {
        restaurantId: panshiRestaurant._id,
        categoryId: panshiCatBhorta._id,
        name: 'Aloo Bhorta',
        description: 'Smashed boiled potato with minced onion, green chillies, mustard oil, and fresh coriander.',
        price: 10,
        dietaryTags: ['vegetarian', 'vegan'],
        isAvailable: true,
        preparationTime: 5,
        spiceLevel: 'mild',
        displayOrder: 5,
      },
    ]);

    console.log(c(ANSI.green, '✓ Panshi Restaurant created with 3 categories and 15 menu items'));

    // ── Pach Bhai Restaurant ────────────────────────────────────
    const pachBhaiVendorUser = await User.create(PACH_BHAI_VENDOR_USER);
    const pachBhaiRestaurant = await Restaurant.create(PACH_BHAI_RESTAURANT);

    await VendorProfile.create({
      userId: pachBhaiVendorUser._id,
      restaurantIds: [pachBhaiRestaurant._id],
      businessName: 'Pach Bhai Restaurant',
      businessLicense: 'SYL-TRADE-2015-0887',
      taxId: 'SYL-TIN-0887-2015',
      isVerified: true,
      autoAcceptOrders: true,
      totalOrders: 52340,
      averageRating: 4.3,
    });

    // Pach Bhai: categories
    const pbCatKhichuri = await MenuCategory.create({
      restaurantId: pachBhaiRestaurant._id,
      name: 'Khichuri & Rice',
      description: 'The dishes that made Pach Bhai famous — khichuri, tehari, and rice meals',
      icon: '🍲',
      displayOrder: 1,
    });
    const pbCatCurries = await MenuCategory.create({
      restaurantId: pachBhaiRestaurant._id,
      name: 'Curries',
      description: 'Rich, slow-cooked meat and seafood curries with Sylheti flair',
      icon: '🥘',
      displayOrder: 2,
    });
    const pbCatBhortaBhaji = await MenuCategory.create({
      restaurantId: pachBhaiRestaurant._id,
      name: 'Bhorta & Bhaji',
      description: 'Traditional smashed and stir-fried vegetable sides',
      icon: '🥦',
      displayOrder: 3,
    });
    const pbCatDesserts = await MenuCategory.create({
      restaurantId: pachBhaiRestaurant._id,
      name: 'Desserts',
      description: 'Sweet endings — traditional Bangladeshi desserts',
      icon: '🍮',
      displayOrder: 4,
    });

    // Pach Bhai: menu items (13 items from skip.menu review data)
    await MenuItem.insertMany([
      // ── Khichuri & Rice ──────────────────────────────────────
      {
        restaurantId: pachBhaiRestaurant._id,
        categoryId: pbCatKhichuri._id,
        name: 'Beef Khichuri',
        description: 'The dish that defines Pach Bhai — fragrant khichuri cooked with tender beef, crowned with crispy fried onions, pickles, and a drizzle of pure ghee. Comforting, hearty, and utterly soul-satisfying.',
        price: 120,
        dietaryTags: ['halal'],
        isAvailable: true,
        isPopular: true,
        isFeatured: true,
        preparationTime: 20,
        spiceLevel: 'mild',
        servingSize: '1 plate',
        displayOrder: 1,
      },
      {
        restaurantId: pachBhaiRestaurant._id,
        categoryId: pbCatKhichuri._id,
        name: 'Buna Khichuri',
        description: 'A special morning favourite — thick, hearty khichuri cooked with chicken pieces in an amazing dark gravy. Best enjoyed for breakfast.',
        price: 90,
        dietaryTags: ['halal'],
        isAvailable: true,
        isPopular: true,
        preparationTime: 15,
        spiceLevel: 'mild',
        servingSize: '1 plate',
        displayOrder: 2,
        availableFrom: '07:00',
        availableUntil: '11:00',
      },
      {
        restaurantId: pachBhaiRestaurant._id,
        categoryId: pbCatKhichuri._id,
        name: 'Tehari',
        description: 'Highly recommended by regulars — rice cooked with soft, melt-in-your-mouth beef pieces and aromatic spices. Great value for the price.',
        price: 130,
        dietaryTags: ['halal'],
        isAvailable: true,
        isPopular: true,
        preparationTime: 20,
        spiceLevel: 'medium',
        servingSize: '1 plate',
        displayOrder: 3,
      },
      // ── Curries ──────────────────────────────────────────────
      {
        restaurantId: pachBhaiRestaurant._id,
        categoryId: pbCatCurries._id,
        name: 'Chingri (Prawn) Curry',
        description: 'The star of the menu — big, juicy river prawns cooked in a light, flavourful gravy with mustard and turmeric. Widely considered one of the best prawn curries in all of Sylhet.',
        price: 250,
        dietaryTags: ['halal'],
        isAvailable: true,
        isPopular: true,
        isFeatured: true,
        preparationTime: 25,
        spiceLevel: 'medium',
        displayOrder: 1,
      },
      {
        restaurantId: pachBhaiRestaurant._id,
        categoryId: pbCatCurries._id,
        name: 'Beef Curry with Shatkora',
        description: 'The signature Sylheti classic — slow-braised beef in a thick, dark, well-spiced gravy infused with shatkora (wild Sylheti citrus). Rated 10/10 by countless guests. A must-try.',
        price: 180,
        dietaryTags: ['halal'],
        isAvailable: true,
        isPopular: true,
        isFeatured: true,
        preparationTime: 30,
        spiceLevel: 'medium',
        displayOrder: 2,
      },
      {
        restaurantId: pachBhaiRestaurant._id,
        categoryId: pbCatCurries._id,
        name: 'Rui Fish Curry',
        description: 'Mouthwatering rui (rohu) fish cooked in a vibrant turmeric and mustard-based gravy. Celebrated for its generous portions and exceptional taste — rated 10/10 by guests.',
        price: 160,
        dietaryTags: ['halal'],
        isAvailable: true,
        isPopular: true,
        preparationTime: 20,
        spiceLevel: 'medium',
        displayOrder: 3,
      },
      {
        restaurantId: pachBhaiRestaurant._id,
        categoryId: pbCatCurries._id,
        name: 'Beef Bhuna',
        description: 'Traditional Bangladeshi dry beef bhuna with caramelised onions and a thick, deeply flavoured masala. Mouthwatering, satisfying, and highly recommended.',
        price: 150,
        dietaryTags: ['halal'],
        isAvailable: true,
        isPopular: true,
        preparationTime: 20,
        spiceLevel: 'medium',
        displayOrder: 4,
      },
      {
        restaurantId: pachBhaiRestaurant._id,
        categoryId: pbCatCurries._id,
        name: 'Boti Kebab',
        description: 'Charcoal-grilled beef boti kebab — tender chunks marinated in spiced yoghurt, skewered and slow-grilled to perfection. A crowd-pleaser for every table.',
        price: 200,
        dietaryTags: ['halal'],
        isAvailable: true,
        preparationTime: 25,
        spiceLevel: 'medium',
        servingSize: '6 pieces',
        displayOrder: 5,
      },
      // ── Bhorta & Bhaji ───────────────────────────────────────
      {
        restaurantId: pachBhaiRestaurant._id,
        categoryId: pbCatBhortaBhaji._id,
        name: 'Begun Fry',
        description: 'One of Pach Bhai\'s signature side dishes — golden-fried aubergine slices with a crispy outer and soft, smoky interior. Outstanding on its own.',
        price: 60,
        dietaryTags: ['vegetarian', 'vegan', 'halal'],
        isAvailable: true,
        isPopular: true,
        preparationTime: 10,
        spiceLevel: 'none',
        displayOrder: 1,
      },
      {
        restaurantId: pachBhaiRestaurant._id,
        categoryId: pbCatBhortaBhaji._id,
        name: 'Fish Bhorta',
        description: 'Very tasty mashed fish bhorta with mustard oil, green chillies, and fresh herbs — an ideal accompaniment to plain rice.',
        price: 40,
        dietaryTags: ['halal'],
        isAvailable: true,
        preparationTime: 5,
        spiceLevel: 'mild',
        displayOrder: 2,
      },
      {
        restaurantId: pachBhaiRestaurant._id,
        categoryId: pbCatBhortaBhaji._id,
        name: 'Coriander Bhorta',
        description: 'Freshly ground coriander bhorta with garlic, green chillies, and mustard oil. Bright, herby, and deeply refreshing alongside rice.',
        price: 30,
        dietaryTags: ['vegetarian', 'vegan'],
        isAvailable: true,
        preparationTime: 5,
        spiceLevel: 'mild',
        displayOrder: 3,
      },
      // ── Desserts ─────────────────────────────────────────────
      {
        restaurantId: pachBhaiRestaurant._id,
        categoryId: pbCatDesserts._id,
        name: 'Faluda',
        description: 'A beloved cold dessert layered with rose syrup, vermicelli noodles, basil seeds, and chilled milk. Loved by regulars young and old.',
        price: 60,
        dietaryTags: ['vegetarian'],
        isAvailable: true,
        isPopular: true,
        preparationTime: 5,
        spiceLevel: 'none',
        displayOrder: 1,
      },
      {
        restaurantId: pachBhaiRestaurant._id,
        categoryId: pbCatDesserts._id,
        name: 'Firni & Doi',
        description: 'Traditional sweet endings — creamy firni (rice pudding) paired with thick set doi (yoghurt). The perfect finish to a full Sylheti meal.',
        price: 50,
        dietaryTags: ['vegetarian'],
        isAvailable: true,
        preparationTime: 5,
        spiceLevel: 'none',
        displayOrder: 2,
      },
    ]);

    console.log(c(ANSI.green, '✓ Pach Bhai Restaurant created with 4 categories and 13 menu items'));

    // ── Verification ────────────────────────────────────────────
    const [
      adminCount,
      vendorCount,
      vendorProfileCount,
      restaurantCount,
      categoryCount,
      menuItemCount,
      regularUserCount,
      driverCount,
      driverProfileCount,
      totalUserCount,
    ] = await Promise.all([
      User.countDocuments({ role: UserRole.ADMIN }),
      User.countDocuments({ role: UserRole.VENDOR }),
      VendorProfile.countDocuments({}),
      Restaurant.countDocuments({}),
      MenuCategory.countDocuments({}),
      MenuItem.countDocuments({}),
      User.countDocuments({ role: UserRole.CUSTOMER }),
      User.countDocuments({ role: UserRole.DRIVER }),
      DriverProfile.countDocuments({}),
      User.countDocuments({}),
    ]);

    if (adminCount !== 3) throw new Error(`Expected 3 admin users, got ${adminCount}.`);
    if (vendorCount !== 2) throw new Error(`Expected 2 vendor users, got ${vendorCount}.`);
    if (vendorProfileCount !== 2) throw new Error(`Expected 2 vendor profiles, got ${vendorProfileCount}.`);
    if (restaurantCount !== 2) throw new Error(`Expected 2 restaurants, got ${restaurantCount}.`);
    if (categoryCount !== 7) throw new Error(`Expected 7 menu categories, got ${categoryCount}.`);
    if (menuItemCount !== 28) throw new Error(`Expected 28 menu items, got ${menuItemCount}.`);
    if (regularUserCount !== 1) throw new Error(`Expected 1 regular user, got ${regularUserCount}.`);
    if (driverCount !== 1) throw new Error(`Expected 1 driver user, got ${driverCount}.`);
    if (driverProfileCount !== 1) throw new Error(`Expected 1 driver profile, got ${driverProfileCount}.`);
    if (totalUserCount !== 7) throw new Error(`Expected 7 total users, got ${totalUserCount}.`);

    console.log(c(ANSI.bold, '\n✅ Seed completed successfully.'));
    console.log(c(ANSI.dim, '────────────────────────────────────────────'));
    console.log(`  Users       : ${totalUserCount} (3 admins, 2 vendors, 1 customer, 1 driver)`);
    console.log(c(ANSI.dim, `    admin@seed.com    — super_admin  / Admin@123456`));
    console.log(c(ANSI.dim, `    ops@seed.com      — admin        / Admin@123456`));
    console.log(c(ANSI.dim, `    support@seed.com  — support      / Admin@123456`));
    console.log(c(ANSI.dim, `    customer@seed.com — customer     / Customer@123456`));
    console.log(c(ANSI.dim, `    driver@seed.com   — driver       / Driver@123456`));
    console.log(`  Restaurants : ${restaurantCount} (Panshi, Pach Bhai)`);
    console.log(`  Categories  : ${categoryCount}`);
    console.log(`  Menu items  : ${menuItemCount} (15 Panshi + 13 Pach Bhai)`);
    console.log(c(ANSI.dim, '────────────────────────────────────────────'));
  } catch (error) {
    console.error(c(ANSI.red, '\n✖  Seed failed.'));
    console.error(error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

void seedDatabase();
