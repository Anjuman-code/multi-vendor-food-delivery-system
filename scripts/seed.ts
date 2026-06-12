import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import https from 'node:https';
import http from 'node:http';
import {
  AdminTier,
  UserRole,
  VehicleType,
} from '../backend/src/config/constants';
import CustomerProfile from '../backend/src/models/CustomerProfile';
import DriverProfile from '../backend/src/models/DriverProfile';
import MenuCategory from '../backend/src/models/MenuCategory';
import MenuItem from '../backend/src/models/MenuItem';
import Order, { OrderStatus, PaymentStatus } from '../backend/src/models/Order';
import Restaurant from '../backend/src/models/Restaurant';
import Review from '../backend/src/models/Review';
import User from '../backend/src/models/User';
import VendorProfile from '../backend/src/models/VendorProfile';

const backendRequire = createRequire(
  path.resolve(__dirname, '../backend/package.json'),
);

backendRequire('dotenv/config');
const mongoose = backendRequire('mongoose') as typeof import('mongoose');

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

const UPLOAD_ROOT = path.resolve(__dirname, '../backend/uploads');
const RESTAURANT_IMG_DIR = path.join(UPLOAD_ROOT, 'restaurants');
const HERO_DIR = path.join(RESTAURANT_IMG_DIR, 'hero');
const LOGO_DIR = path.join(RESTAURANT_IMG_DIR, 'logo');

const SYSTEM_USERS = {
  admin: {
    email: 'admin@seed.com',
    password: 'Admin@123456',
    firstName: 'System',
    lastName: 'Admin',
    role: UserRole.ADMIN,
    adminTier: AdminTier.SUPER_ADMIN,
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: true,
  },
  admin2: {
    email: 'ops@seed.com',
    password: 'Admin@123456',
    firstName: 'Ops',
    lastName: 'Manager',
    role: UserRole.ADMIN,
    adminTier: AdminTier.ADMIN,
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: true,
  },
  support: {
    email: 'support@seed.com',
    password: 'Admin@123456',
    firstName: 'Support',
    lastName: 'Agent',
    role: UserRole.ADMIN,
    adminTier: AdminTier.SUPPORT,
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: true,
  },
  customer: {
    email: 'customer@seed.com',
    password: 'Customer@123456',
    firstName: 'Regular',
    lastName: 'User',
    role: UserRole.CUSTOMER,
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: true,
  },
  driver: {
    email: 'driver@seed.com',
    password: 'Driver@123456',
    firstName: 'Rahim',
    lastName: 'Driver',
    role: UserRole.DRIVER,
    phoneNumber: '+8801911223344',
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: true,
  },
} as const;

// ── Types for scraped JSON ──────────────────────────────────────
interface ScrapedCuisine {
  id: number;
  name: string;
  url_key: string;
  main: boolean;
}

interface ScrapedReview {
  reviewer: string;
  rating: number;
  date: string;
  text: string;
}

interface ScrapedRestaurant {
  id: number;
  code: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number;
  review_number: number;
  hero_image: string;
  hero_listing_image: string;
  logo: string;
  cuisines: ScrapedCuisine[];
  minimum_delivery_time: number;
  minimum_order_amount: number;
  minimum_delivery_fee: number;
  budget: number;
  is_active: boolean;
  is_delivery_enabled: boolean;
  is_pickup_enabled: boolean;
  reviews: ScrapedReview[];
  customer_phone: string;
}

// ── Helpers ─────────────────────────────────────────────────────

function downloadFile(url: string, dest: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!url || !url.startsWith('http')) {
      resolve(false);
      return;
    }
    const mod = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    mod
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          file.close();
          fs.unlinkSync(dest);
          downloadFile(res.headers.location!, dest).then(resolve);
          return;
        }
        if (res.statusCode !== 200) {
          file.close();
          try { fs.unlinkSync(dest); } catch {}
          resolve(false);
          return;
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(true);
        });
      })
      .on('error', () => {
        file.close();
        try { fs.unlinkSync(dest); } catch {}
        resolve(false);
      });
  });
}

async function downloadBatch(
  items: { url: string; dest: string }[],
  concurrency = 10,
): Promise<number> {
  let success = 0;
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map((item) => downloadFile(item.url, item.dest)),
    );
    success += results.filter(Boolean).length;
  }
  return success;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

function parseAddress(raw: string): { street: string; area: string; district: string } {
  const cleaned = raw.replace(/,\s*Sylhet.*$/i, '').replace(/,\s*Bangladesh.*$/i, '').trim();
  const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);
  const street = parts[0] || raw;
  const area = parts.length > 1 ? parts[parts.length - 1] : parts[0] || 'Sylhet';
  return { street, area, district: 'Sylhet' };
}

function sanitizeForEmail(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20);
}

function generateDefaultHours() {
  return [
    { day: 'Saturday' as const, openTime: '10:00', closeTime: '22:00', isOpen: true },
    { day: 'Sunday' as const, openTime: '10:00', closeTime: '22:00', isOpen: true },
    { day: 'Monday' as const, openTime: '10:00', closeTime: '22:00', isOpen: true },
    { day: 'Tuesday' as const, openTime: '10:00', closeTime: '22:00', isOpen: true },
    { day: 'Wednesday' as const, openTime: '10:00', closeTime: '22:00', isOpen: true },
    { day: 'Thursday' as const, openTime: '10:00', closeTime: '22:00', isOpen: true },
    { day: 'Friday' as const, openTime: '14:00', closeTime: '22:00', isOpen: true },
  ];
}

// ── Menu templates by primary cuisine ───────────────────────────

interface MenuItemTemplate {
  name: string;
  description: string;
  price: number;
  spiceLevel: 'none' | 'mild' | 'medium' | 'hot' | 'extra-hot';
  dietaryTags: string[];
  isPopular?: boolean;
  isFeatured?: boolean;
}

const MENU_TEMPLATES: Record<string, { category: string; icon: string; items: MenuItemTemplate[] }[]> = {
  Burgers: [
    {
      category: 'Burgers',
      icon: '🍔',
      items: [
        { name: 'Classic Beef Burger', description: 'Juicy beef patty with lettuce, tomato, and special sauce', price: 200, spiceLevel: 'mild', dietaryTags: ['halal'], isPopular: true },
        { name: 'Cheese Burger', description: 'Beef patty topped with melted cheddar cheese', price: 220, spiceLevel: 'mild', dietaryTags: ['halal'], isPopular: true },
        { name: 'Chicken Burger', description: 'Crispy chicken fillet with mayo and pickles', price: 180, spiceLevel: 'mild', dietaryTags: ['halal'] },
        { name: 'Double Patty Burger', description: 'Two beef patties with cheese and special sauce', price: 320, spiceLevel: 'mild', dietaryTags: ['halal'], isFeatured: true },
        { name: 'Spicy Jalapeño Burger', description: 'Beef patty with jalapeños, pepper jack cheese, and chipotle mayo', price: 250, spiceLevel: 'hot', dietaryTags: ['halal'] },
      ],
    },
    {
      category: 'Sides & Drinks',
      icon: '🍟',
      items: [
        { name: 'Loaded Fries', description: 'Crispy fries topped with cheese sauce and jalapeños', price: 150, spiceLevel: 'mild', dietaryTags: [] },
        { name: 'Onion Rings', description: 'Golden crispy battered onion rings', price: 120, spiceLevel: 'none', dietaryTags: [] },
        { name: 'Soft Drink', description: 'Choice of Coca-Cola, Sprite, or Fanta', price: 40, spiceLevel: 'none', dietaryTags: [] },
      ],
    },
  ],
  'Fast Food': [
    {
      category: 'Chicken',
      icon: '🍗',
      items: [
        { name: 'Chicken Wings (6 pcs)', description: 'Crispy fried chicken wings with choice of sauce', price: 250, spiceLevel: 'medium', dietaryTags: ['halal'], isPopular: true },
        { name: 'Chicken Nuggets (8 pcs)', description: 'Breaded chicken nuggets with dipping sauce', price: 200, spiceLevel: 'none', dietaryTags: ['halal'] },
        { name: 'Chicken Tenders', description: 'Tender strips of breaded chicken', price: 220, spiceLevel: 'mild', dietaryTags: ['halal'] },
        { name: 'Hot Wings (8 pcs)', description: 'Fiery hot chicken wings for spice lovers', price: 270, spiceLevel: 'extra-hot', dietaryTags: ['halal'], isPopular: true },
      ],
    },
    {
      category: 'Sides',
      icon: '🍟',
      items: [
        { name: 'French Fries', description: 'Crispy golden fries', price: 120, spiceLevel: 'none', dietaryTags: [] },
        { name: 'Coleslaw', description: 'Fresh creamy coleslaw', price: 80, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Garlic Bread', description: 'Toasted bread with garlic butter', price: 100, spiceLevel: 'none', dietaryTags: [] },
      ],
    },
    {
      category: 'Burgers & Sandwiches',
      icon: '🍔',
      items: [
        { name: 'Club Sandwich', description: 'Triple-decker sandwich with chicken, egg, and veggies', price: 180, spiceLevel: 'mild', dietaryTags: ['halal'] },
        { name: 'Hot Dog', description: 'Grilled sausage in a soft bun with mustard and ketchup', price: 150, spiceLevel: 'none', dietaryTags: [] },
        { name: 'Grilled Chicken Sandwich', description: 'Grilled chicken breast with lettuce and mayo', price: 170, spiceLevel: 'mild', dietaryTags: ['halal'] },
      ],
    },
  ],
  Pizza: [
    {
      category: 'Pizzas',
      icon: '🍕',
      items: [
        { name: 'Margherita', description: 'Classic pizza with tomato sauce, mozzarella, and basil', price: 350, spiceLevel: 'none', dietaryTags: ['vegetarian'], isPopular: true },
        { name: 'Pepperoni', description: 'Pizza topped with pepperoni slices and cheese', price: 450, spiceLevel: 'mild', dietaryTags: [], isFeatured: true },
        { name: 'Chicken Tikka Pizza', description: 'Pizza with chicken tikka, onions, and capsicum', price: 400, spiceLevel: 'medium', dietaryTags: ['halal'], isPopular: true },
        { name: 'BBQ Chicken', description: 'Pizza with BBQ chicken, red onions, and cheese', price: 420, spiceLevel: 'mild', dietaryTags: ['halal'] },
        { name: 'Veggie Supreme', description: 'Loaded with bell peppers, mushrooms, olives, and onions', price: 380, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Meat Lovers', description: 'Loaded with pepperoni, chicken, sausage, and beef', price: 500, spiceLevel: 'medium', dietaryTags: ['halal'], isFeatured: true },
      ],
    },
    {
      category: 'Sides',
      icon: '🧀',
      items: [
        { name: 'Garlic Breadsticks', description: 'Soft breadsticks with garlic butter', price: 120, spiceLevel: 'none', dietaryTags: [] },
        { name: 'Chicken Wings (6 pcs)', description: 'Crispy chicken wings', price: 250, spiceLevel: 'medium', dietaryTags: ['halal'] },
        { name: 'Cheesy Fries', description: 'Fries topped with melted cheese', price: 150, spiceLevel: 'none', dietaryTags: [] },
      ],
    },
  ],
  Bangladeshi: [
    {
      category: 'Rice & Biryani',
      icon: '🍚',
      items: [
        { name: 'Kachchi Biryani', description: 'Traditional slow-cooked mutton biryani with potato', price: 200, spiceLevel: 'medium', dietaryTags: ['halal'], isPopular: true, isFeatured: true },
        { name: 'Chicken Biryani', description: 'Aromatic rice cooked with tender chicken pieces', price: 160, spiceLevel: 'medium', dietaryTags: ['halal'], isPopular: true },
        { name: 'Beef Tehari', description: 'Rice cooked with spiced beef chunks and potatoes', price: 150, spiceLevel: 'medium', dietaryTags: ['halal'] },
        { name: 'Polao', description: 'Mildly spiced aromatic rice', price: 120, spiceLevel: 'none', dietaryTags: ['halal'] },
        { name: 'Khichuri', description: 'Comforting rice and lentil dish with spices', price: 100, spiceLevel: 'mild', dietaryTags: ['halal'] },
      ],
    },
    {
      category: 'Curry & Bhuna',
      icon: '🍛',
      items: [
        { name: 'Beef Curry', description: 'Slow-cooked beef in rich spiced gravy', price: 180, spiceLevel: 'medium', dietaryTags: ['halal'], isPopular: true },
        { name: 'Chicken Roast', description: 'Golden roasted chicken in mild spiced gravy', price: 150, spiceLevel: 'mild', dietaryTags: ['halal'] },
        { name: 'Mutton Bhuna', description: 'Dry-cooked mutton with caramelised onions', price: 220, spiceLevel: 'medium', dietaryTags: ['halal'] },
        { name: 'Fish Curry', description: 'River fish cooked in turmeric and mustard gravy', price: 160, spiceLevel: 'medium', dietaryTags: ['halal'] },
        { name: 'Daal', description: 'Creamy lentil curry', price: 80, spiceLevel: 'mild', dietaryTags: ['halal', 'vegetarian'] },
      ],
    },
    {
      category: 'Bhorta & Sides',
      icon: '🥘',
      items: [
        { name: 'Aloo Bhorta', description: 'Mashed potato with mustard oil, onion, and chillies', price: 40, spiceLevel: 'mild', dietaryTags: ['vegetarian', 'vegan'] },
        { name: 'Begun Fry', description: 'Golden fried eggplant slices', price: 60, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
        { name: 'Shutki Bhorta', description: 'Mashed dried fish with spices and mustard oil', price: 50, spiceLevel: 'hot', dietaryTags: [] },
      ],
    },
  ],
  Indian: [
    {
      category: 'Tandoori & Grills',
      icon: '🔥',
      items: [
        { name: 'Butter Chicken', description: 'Tender chicken in rich creamy tomato sauce', price: 250, spiceLevel: 'mild', dietaryTags: ['halal'], isPopular: true },
        { name: 'Tandoori Chicken', description: 'Yoghurt-marinated chicken cooked in clay oven', price: 220, spiceLevel: 'medium', dietaryTags: ['halal'], isPopular: true },
        { name: 'Chicken Tikka Masala', description: 'Spiced chicken tikka in creamy curry sauce', price: 230, spiceLevel: 'medium', dietaryTags: ['halal'] },
        { name: 'Seekh Kebab', description: 'Minced meat kebabs grilled on skewers', price: 200, spiceLevel: 'medium', dietaryTags: ['halal'] },
      ],
    },
    {
      category: 'Breads & Rice',
      icon: '🫓',
      items: [
        { name: 'Naan', description: 'Soft leavened bread baked in tandoor', price: 40, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Garlic Naan', description: 'Naan topped with garlic and butter', price: 60, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Jeera Rice', description: 'Cumin-flavored basmati rice', price: 100, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
        { name: 'Biryani', description: 'Fragrant rice cooked with spiced chicken', price: 180, spiceLevel: 'medium', dietaryTags: ['halal'] },
      ],
    },
    {
      category: 'Curry',
      icon: '🍛',
      items: [
        { name: 'Dal Makhani', description: 'Slow-cooked black lentils in butter cream', price: 120, spiceLevel: 'mild', dietaryTags: ['vegetarian'] },
        { name: 'Paneer Tikka', description: 'Grilled cottage cheese with spices', price: 180, spiceLevel: 'medium', dietaryTags: ['vegetarian'] },
        { name: 'Chicken Vindaloo', description: 'Spicy Goan-style chicken curry', price: 220, spiceLevel: 'hot', dietaryTags: ['halal'] },
      ],
    },
  ],
  Chinese: [
    {
      category: 'Noodles & Rice',
      icon: '🍜',
      items: [
        { name: 'Chicken Chowmein', description: 'Stir-fried noodles with chicken and vegetables', price: 180, spiceLevel: 'mild', dietaryTags: ['halal'], isPopular: true },
        { name: 'Fried Rice', description: 'Wok-fried rice with egg and vegetables', price: 150, spiceLevel: 'mild', dietaryTags: [] },
        { name: 'Hakka Noodles', description: 'Spicy stir-fried noodles with vegetables', price: 160, spiceLevel: 'medium', dietaryTags: ['vegetarian', 'vegan'] },
        { name: 'Egg Noodles', description: 'Soft noodles with egg and vegetables', price: 140, spiceLevel: 'mild', dietaryTags: [] },
      ],
    },
    {
      category: 'Main Course',
      icon: '🥘',
      items: [
        { name: 'Sweet & Sour Chicken', description: 'Crispy chicken in tangy sweet and sour sauce', price: 250, spiceLevel: 'mild', dietaryTags: ['halal'], isPopular: true },
        { name: 'Chicken Manchurian', description: 'Deep-fried chicken in spicy Manchurian sauce', price: 220, spiceLevel: 'medium', dietaryTags: ['halal'] },
        { name: 'Chilli Chicken', description: 'Spicy stir-fried chicken with peppers and onions', price: 230, spiceLevel: 'hot', dietaryTags: ['halal'] },
        { name: 'Spring Rolls (4 pcs)', description: 'Crispy vegetable spring rolls', price: 120, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
      ],
    },
  ],
  Shawarma: [
    {
      category: 'Shawarma',
      icon: '🌯',
      items: [
        { name: 'Chicken Shawarma', description: 'Grilled chicken wrapped in pita with garlic sauce', price: 150, spiceLevel: 'mild', dietaryTags: ['halal'], isPopular: true },
        { name: 'Beef Shawarma', description: 'Spiced beef wrapped in pita with tahini', price: 180, spiceLevel: 'medium', dietaryTags: ['halal'], isPopular: true },
        { name: 'Shawarma Plate', description: 'Shawarma meat served with rice, hummus, and salad', price: 250, spiceLevel: 'mild', dietaryTags: ['halal'], isFeatured: true },
        { name: 'Falafel Shawarma', description: 'Crispy falafel wrapped in pita with vegetables', price: 130, spiceLevel: 'mild', dietaryTags: ['vegetarian', 'vegan'] },
      ],
    },
    {
      category: 'Sides & Drinks',
      icon: '🥤',
      items: [
        { name: 'Garlic Sauce', description: 'Creamy garlic sauce', price: 30, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Hummus with Pita', description: 'Smooth hummus served with warm pita bread', price: 120, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
        { name: 'French Fries', description: 'Crispy golden fries', price: 100, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
      ],
    },
  ],
  Cafe: [
    {
      category: 'Coffee & Tea',
      icon: '☕',
      items: [
        { name: 'Espresso', description: 'Rich single-shot espresso', price: 80, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Cappuccino', description: 'Espresso with steamed milk and foam', price: 120, spiceLevel: 'none', dietaryTags: ['vegetarian'], isPopular: true },
        { name: 'Latte', description: 'Smooth espresso with steamed milk', price: 130, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Cold Coffee', description: 'Iced blended coffee with cream', price: 140, spiceLevel: 'none', dietaryTags: ['vegetarian'], isPopular: true },
        { name: 'Green Tea', description: 'Fresh brewed green tea', price: 60, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
      ],
    },
    {
      category: 'Snacks & Desserts',
      icon: '🍰',
      items: [
        { name: 'Club Sandwich', description: 'Triple-layer chicken sandwich', price: 180, spiceLevel: 'mild', dietaryTags: ['halal'] },
        { name: 'Brownie', description: 'Rich chocolate brownie', price: 150, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Cheesecake Slice', description: 'Creamy New York-style cheesecake', price: 200, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
      ],
    },
  ],
  Dessert: [
    {
      category: 'Desserts',
      icon: '🍰',
      items: [
        { name: 'Tiramisu', description: 'Classic Italian coffee-flavored dessert', price: 250, spiceLevel: 'none', dietaryTags: ['vegetarian'], isPopular: true, isFeatured: true },
        { name: 'Chocolate Brownie', description: 'Warm fudgy brownie with chocolate sauce', price: 180, spiceLevel: 'none', dietaryTags: ['vegetarian'], isPopular: true },
        { name: 'Waffle', description: 'Crispy Belgian waffle with maple syrup', price: 220, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Pancake Stack', description: 'Fluffy pancakes with honey and butter', price: 200, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Ice Cream Sundae', description: 'Three scoops of ice cream with toppings', price: 200, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Lava Cake', description: 'Warm chocolate cake with molten centre', price: 250, spiceLevel: 'none', dietaryTags: ['vegetarian'], isFeatured: true },
      ],
    },
    {
      category: 'Beverages',
      icon: '🥤',
      items: [
        { name: 'Milkshake', description: 'Choice of chocolate, vanilla, or strawberry', price: 150, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Iced Tea', description: 'Refreshing lemon iced tea', price: 80, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
        { name: 'Fresh Juice', description: 'Choice of mango, orange, or watermelon', price: 100, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
      ],
    },
  ],
  Snacks: [
    {
      category: 'Snacks',
      icon: '🥟',
      items: [
        { name: 'Samosa (2 pcs)', description: 'Crispy pastry filled with spiced potatoes', price: 40, spiceLevel: 'medium', dietaryTags: ['vegetarian', 'vegan'], isPopular: true },
        { name: 'Pakora', description: 'Deep-fried vegetable fritters', price: 60, spiceLevel: 'mild', dietaryTags: ['vegetarian', 'vegan'] },
        { name: 'Chotpoti', description: 'Spicy chickpea snack with tamarind sauce', price: 50, spiceLevel: 'medium', dietaryTags: ['vegetarian', 'vegan'], isPopular: true },
        { name: 'Fuchka', description: 'Crispy shells filled with spiced water and chickpeas', price: 50, spiceLevel: 'medium', dietaryTags: ['vegetarian', 'vegan'] },
        { name: 'Jhal Muri', description: 'Spiced puffed rice mix', price: 40, spiceLevel: 'hot', dietaryTags: ['vegetarian', 'vegan'] },
      ],
    },
  ],
  Biryani: [
    {
      category: 'Biryani',
      icon: '🍚',
      items: [
        { name: 'Chicken Biryani', description: 'Aromatic rice layered with spiced chicken', price: 160, spiceLevel: 'medium', dietaryTags: ['halal'], isPopular: true, isFeatured: true },
        { name: 'Beef Biryani', description: 'Fragrant rice with tender beef pieces', price: 200, spiceLevel: 'medium', dietaryTags: ['halal'], isPopular: true },
        { name: 'Mutton Biryani', description: 'Premium rice with slow-cooked mutton', price: 250, spiceLevel: 'medium', dietaryTags: ['halal'], isFeatured: true },
        { name: 'Kachchi Biryani', description: 'Traditional raw-marinated meat layered with rice', price: 220, spiceLevel: 'medium', dietaryTags: ['halal'] },
        { name: 'Tehari', description: 'Beef cooked with spiced rice', price: 150, spiceLevel: 'medium', dietaryTags: ['halal'] },
      ],
    },
    {
      category: 'Sides',
      icon: '🥘',
      items: [
        { name: 'Borhani', description: 'Spiced yogurt drink', price: 30, spiceLevel: 'mild', dietaryTags: ['vegetarian'] },
        { name: 'Salad', description: 'Fresh garden salad', price: 30, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
        { name: 'Boiled Egg', description: 'Hard-boiled egg', price: 20, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
      ],
    },
  ],
  Curry: [
    {
      category: 'Curry',
      icon: '🍛',
      items: [
        { name: 'Chicken Curry', description: 'Classic chicken curry with aromatic spices', price: 180, spiceLevel: 'medium', dietaryTags: ['halal'], isPopular: true },
        { name: 'Beef Curry', description: 'Slow-cooked beef in rich gravy', price: 200, spiceLevel: 'medium', dietaryTags: ['halal'], isPopular: true },
        { name: 'Fish Curry', description: 'Fresh river fish in turmeric gravy', price: 180, spiceLevel: 'medium', dietaryTags: ['halal'] },
        { name: 'Mutton Curry', description: 'Tender mutton in aromatic curry', price: 280, spiceLevel: 'medium', dietaryTags: ['halal'] },
        { name: 'Daal', description: 'Creamy lentil curry', price: 80, spiceLevel: 'mild', dietaryTags: ['halal', 'vegetarian'] },
      ],
    },
    {
      category: 'Rice',
      icon: '🍚',
      items: [
        { name: 'Plain Rice', description: 'Steamed basmati rice', price: 60, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
        { name: 'Fried Rice', description: 'Wok-fried rice with vegetables', price: 120, spiceLevel: 'mild', dietaryTags: ['vegetarian'] },
        { name: 'Biryani', description: 'Fragrant spiced rice with chicken', price: 160, spiceLevel: 'medium', dietaryTags: ['halal'] },
      ],
    },
  ],
  Kebab: [
    {
      category: 'Kebabs',
      icon: '🍢',
      items: [
        { name: 'Seekh Kebab (4 pcs)', description: 'Minced meat kebabs grilled over charcoal', price: 220, spiceLevel: 'medium', dietaryTags: ['halal'], isPopular: true },
        { name: 'Shami Kebab (4 pcs)', description: 'Spiced meat patties with lentils', price: 180, spiceLevel: 'mild', dietaryTags: ['halal'] },
        { name: 'Tikka Kebab', description: 'Marinated chicken tikka chunks', price: 200, spiceLevel: 'medium', dietaryTags: ['halal'], isPopular: true },
        { name: 'Boti Kebab', description: 'Charcoal-grilled beef boti', price: 280, spiceLevel: 'medium', dietaryTags: ['halal'], isFeatured: true },
      ],
    },
    {
      category: 'Sides',
      icon: '🥘',
      items: [
        { name: 'Naan', description: 'Soft tandoori bread', price: 40, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Salad', description: 'Fresh garden salad', price: 40, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
        { name: 'Chutney', description: 'Mint and coriander chutney', price: 20, spiceLevel: 'mild', dietaryTags: ['vegetarian', 'vegan'] },
      ],
    },
  ],
  Chicken: [
    {
      category: 'Chicken',
      icon: '🍗',
      items: [
        { name: 'Fried Chicken (4 pcs)', description: 'Crispy golden fried chicken pieces', price: 250, spiceLevel: 'mild', dietaryTags: ['halal'], isPopular: true },
        { name: 'Grilled Chicken', description: 'Herb-grilled chicken with spices', price: 220, spiceLevel: 'medium', dietaryTags: ['halal'], isPopular: true },
        { name: 'Chicken Wings (6 pcs)', description: 'Crispy chicken wings with sauce', price: 200, spiceLevel: 'medium', dietaryTags: ['halal'] },
        { name: 'Chicken Lollipop', description: 'Deep-fried chicken lollipops', price: 180, spiceLevel: 'medium', dietaryTags: ['halal'] },
        { name: 'Chicken 65', description: 'Spicy deep-fried chicken chunks', price: 200, spiceLevel: 'hot', dietaryTags: ['halal'] },
      ],
    },
    {
      category: 'Rice & Sides',
      icon: '🍚',
      items: [
        { name: 'Chicken Rice Bowl', description: 'Steamed rice with grilled chicken', price: 180, spiceLevel: 'mild', dietaryTags: ['halal'] },
        { name: 'French Fries', description: 'Crispy golden fries', price: 100, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
      ],
    },
  ],
  'Fried Chicken': [
    {
      category: 'Fried Chicken',
      icon: '🍗',
      items: [
        { name: 'Classic Fried Chicken (4 pcs)', description: 'Original recipe crispy fried chicken', price: 250, spiceLevel: 'mild', dietaryTags: ['halal'], isPopular: true, isFeatured: true },
        { name: 'Spicy Wings (6 pcs)', description: 'Fiery hot chicken wings', price: 220, spiceLevel: 'hot', dietaryTags: ['halal'], isPopular: true },
        { name: 'Chicken Tenders (4 pcs)', description: 'Crispy breaded chicken strips', price: 200, spiceLevel: 'mild', dietaryTags: ['halal'] },
        { name: 'Popcorn Chicken', description: 'Bite-sized crispy chicken pieces', price: 150, spiceLevel: 'mild', dietaryTags: ['halal'] },
        { name: 'Chicken Bucket (8 pcs)', description: 'Family-size bucket of fried chicken', price: 500, spiceLevel: 'mild', dietaryTags: ['halal'] },
      ],
    },
    {
      category: 'Sides & Drinks',
      icon: '🍟',
      items: [
        { name: 'French Fries', description: 'Crispy golden fries', price: 100, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
        { name: 'Coleslaw', description: 'Creamy coleslaw salad', price: 60, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Soft Drink', description: 'Choice of beverage', price: 40, spiceLevel: 'none', dietaryTags: [] },
      ],
    },
  ],
  Meat: [
    {
      category: 'Meat',
      icon: '🥩',
      items: [
        { name: 'Beef Kebab', description: 'Grilled beef kebab with spices', price: 250, spiceLevel: 'medium', dietaryTags: ['halal'], isPopular: true },
        { name: 'Mutton Curry', description: 'Tender mutton in rich curry', price: 300, spiceLevel: 'medium', dietaryTags: ['halal'], isPopular: true },
        { name: 'Seekh Kebab', description: 'Minced meat kebabs on skewers', price: 220, spiceLevel: 'medium', dietaryTags: ['halal'] },
        { name: 'Beef Bhuna', description: 'Dry-cooked beef with caramelised onions', price: 200, spiceLevel: 'medium', dietaryTags: ['halal'] },
        { name: 'Boti Kebab', description: 'Charcoal-grilled beef chunks', price: 280, spiceLevel: 'medium', dietaryTags: ['halal'], isFeatured: true },
      ],
    },
    {
      category: 'Sides',
      icon: '🍚',
      items: [
        { name: 'Naan', description: 'Soft tandoori bread', price: 40, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Rice', description: 'Steamed basmati rice', price: 60, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
      ],
    },
  ],
  Seafood: [
    {
      category: 'Seafood',
      icon: '🐟',
      items: [
        { name: 'Fish Curry', description: 'River fish in turmeric-mustard gravy', price: 200, spiceLevel: 'medium', dietaryTags: ['halal'], isPopular: true },
        { name: 'Prawn Masala', description: 'Juicy prawns in spicy masala', price: 300, spiceLevel: 'medium', dietaryTags: ['halal'], isFeatured: true },
        { name: 'Grilled Fish', description: 'Whole fish grilled with herbs and spices', price: 280, spiceLevel: 'mild', dietaryTags: ['halal'] },
        { name: 'Fish Fry', description: 'Crispy fried fish fillet', price: 180, spiceLevel: 'mild', dietaryTags: ['halal'] },
        { name: 'Shrimp Tempura', description: 'Lightly battered and fried prawns', price: 320, spiceLevel: 'none', dietaryTags: ['halal'] },
      ],
    },
    {
      category: 'Rice',
      icon: '🍚',
      items: [
        { name: 'Plain Rice', description: 'Steamed basmati rice', price: 60, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
        { name: 'Fried Rice', description: 'Wok-fried rice with egg', price: 120, spiceLevel: 'mild', dietaryTags: [] },
      ],
    },
  ],
  Noodles: [
    {
      category: 'Noodles',
      icon: '🍜',
      items: [
        { name: 'Chicken Chowmein', description: 'Stir-fried noodles with chicken', price: 180, spiceLevel: 'mild', dietaryTags: ['halal'], isPopular: true },
        { name: 'Pad Thai', description: 'Thai-style stir-fried rice noodles', price: 220, spiceLevel: 'mild', dietaryTags: ['halal'] },
        { name: 'Hakka Noodles', description: 'Spicy Indo-Chinese noodles', price: 160, spiceLevel: 'medium', dietaryTags: ['halal'] },
        { name: 'Veg Noodles', description: 'Noodles with mixed vegetables', price: 140, spiceLevel: 'mild', dietaryTags: ['vegetarian', 'vegan'] },
      ],
    },
  ],
  'Rice Dishes': [
    {
      category: 'Rice & Curry',
      icon: '🍚',
      items: [
        { name: 'Biryani', description: 'Aromatic rice with spiced chicken', price: 160, spiceLevel: 'medium', dietaryTags: ['halal'], isPopular: true },
        { name: 'Fried Rice', description: 'Wok-fried rice with egg and vegetables', price: 140, spiceLevel: 'mild', dietaryTags: [] },
        { name: 'Khichuri', description: 'Comforting rice and lentil dish', price: 100, spiceLevel: 'mild', dietaryTags: ['halal'] },
        { name: 'Beef Curry Rice', description: 'Steamed rice with beef curry', price: 150, spiceLevel: 'medium', dietaryTags: ['halal'] },
      ],
    },
  ],
  Healthy: [
    {
      category: 'Bowls',
      icon: '🥗',
      items: [
        { name: 'Salad Bowl', description: 'Fresh mixed greens with grilled chicken', price: 200, spiceLevel: 'none', dietaryTags: ['halal'], isPopular: true },
        { name: 'Grilled Chicken Bowl', description: 'Grilled chicken with quinoa and vegetables', price: 250, spiceLevel: 'mild', dietaryTags: ['halal'] },
        { name: 'Smoothie Bowl', description: 'Acai smoothie with granola and fruits', price: 180, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
        { name: 'Avocado Toast', description: 'Whole grain toast with smashed avocado', price: 200, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
      ],
    },
    {
      category: 'Drinks',
      icon: '🥤',
      items: [
        { name: 'Green Smoothie', description: 'Spinach, banana, and apple smoothie', price: 120, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
        { name: 'Fresh Juice', description: 'Freshly squeezed seasonal juice', price: 100, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
      ],
    },
  ],
  Juice: [
    {
      category: 'Juices & Drinks',
      icon: '🧃',
      items: [
        { name: 'Mango Juice', description: 'Fresh mango juice', price: 80, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'], isPopular: true },
        { name: 'Mixed Fruit Juice', description: 'Seasonal mixed fruit juice', price: 100, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
        { name: 'Lassi', description: 'Creamy yogurt-based drink', price: 80, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Smoothie', description: 'Blended fruit smoothie', price: 120, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
        { name: 'Fresh Lime', description: 'Refreshing lime juice', price: 50, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'], isPopular: true },
      ],
    },
  ],
  Fish: [
    {
      category: 'Fish',
      icon: '🐟',
      items: [
        { name: 'Rui Fish Curry', description: 'River fish in turmeric gravy', price: 180, spiceLevel: 'medium', dietaryTags: ['halal'], isPopular: true },
        { name: 'Hilsa Fry', description: 'Fried hilsa fish pieces', price: 300, spiceLevel: 'medium', dietaryTags: ['halal'], isFeatured: true },
        { name: 'Fish Bhorta', description: 'Mashed fish with mustard oil and spices', price: 120, spiceLevel: 'medium', dietaryTags: ['halal'] },
        { name: 'Fish Cutlet', description: 'Deep-fried fish cutlets', price: 150, spiceLevel: 'mild', dietaryTags: ['halal'] },
      ],
    },
    {
      category: 'Rice',
      icon: '🍚',
      items: [
        { name: 'Plain Rice', description: 'Steamed basmati rice', price: 60, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
      ],
    },
  ],
  Beverage: [
    {
      category: 'Beverages',
      icon: '🥤',
      items: [
        { name: 'Cold Coffee', description: 'Iced blended coffee', price: 120, spiceLevel: 'none', dietaryTags: ['vegetarian'], isPopular: true },
        { name: 'Milkshake', description: 'Choice of chocolate, vanilla, or strawberry', price: 150, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Smoothie', description: 'Blended fruit smoothie', price: 130, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
        { name: 'Fresh Juice', description: 'Seasonal fresh juice', price: 80, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
        { name: 'Iced Tea', description: 'Refreshing lemon iced tea', price: 80, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
      ],
    },
  ],
  Bakery: [
    {
      category: 'Bakery',
      icon: '🥐',
      items: [
        { name: 'Croissant', description: 'Buttery flaky croissant', price: 120, spiceLevel: 'none', dietaryTags: ['vegetarian'], isPopular: true },
        { name: 'Muffin', description: 'Chocolate chip muffin', price: 80, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Sandwich Bread', description: 'Freshly baked sandwich loaf', price: 60, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Cookie', description: 'Chocolate chip cookie', price: 50, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Cake Slice', description: 'Slice of daily fresh cake', price: 150, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
      ],
    },
  ],
  Cakes: [
    {
      category: 'Cakes',
      icon: '🎂',
      items: [
        { name: 'Chocolate Cake', description: 'Rich chocolate layer cake', price: 800, spiceLevel: 'none', dietaryTags: ['vegetarian'], isFeatured: true },
        { name: 'Red Velvet', description: 'Classic red velvet with cream cheese frosting', price: 900, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Cheesecake', description: 'Creamy New York-style cheesecake', price: 350, spiceLevel: 'none', dietaryTags: ['vegetarian'], isPopular: true },
        { name: 'Black Forest', description: 'Chocolate cake with cherries and cream', price: 800, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
      ],
    },
  ],
  Sweets: [
    {
      category: 'Sweets',
      icon: '🍬',
      items: [
        { name: 'Rosogolla', description: 'Soft spongy cheese balls in sugar syrup', price: 30, spiceLevel: 'none', dietaryTags: ['vegetarian'], isPopular: true },
        { name: 'Sandesh', description: 'Delicate milk-based sweet', price: 50, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Mishti Doi', description: 'Sweetened yoghurt', price: 60, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Chamcham', description: 'Soft milk sweet with coconut', price: 40, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
      ],
    },
  ],
  Dumpling: [
    {
      category: 'Momos',
      icon: '🥟',
      items: [
        { name: 'Steamed Momos (8 pcs)', description: 'Steamed dumplings with chicken filling', price: 150, spiceLevel: 'mild', dietaryTags: ['halal'], isPopular: true },
        { name: 'Fried Momos (8 pcs)', description: 'Crispy fried dumplings', price: 180, spiceLevel: 'mild', dietaryTags: ['halal'] },
        { name: 'Jhol Momos', description: 'Momos in spicy sesame soup', price: 170, spiceLevel: 'medium', dietaryTags: ['halal'] },
        { name: 'C Momos (8 pcs)', description: 'Cheese-filled momos', price: 200, spiceLevel: 'mild', dietaryTags: ['vegetarian'], isFeatured: true },
      ],
    },
    {
      category: 'Sides',
      icon: '🥘',
      items: [
        { name: 'Chutney', description: 'Spicy tomato and sesame chutney', price: 20, spiceLevel: 'medium', dietaryTags: ['vegetarian', 'vegan'] },
        { name: 'Soup', description: 'Clear chicken soup', price: 60, spiceLevel: 'mild', dietaryTags: ['halal'] },
      ],
    },
  ],
  Soup: [
    {
      category: 'Soups',
      icon: '🍲',
      items: [
        { name: 'Chicken Soup', description: 'Clear chicken broth with vegetables', price: 120, spiceLevel: 'mild', dietaryTags: ['halal'], isPopular: true },
        { name: 'Hot & Sour Soup', description: 'Spicy and tangy mixed soup', price: 100, spiceLevel: 'hot', dietaryTags: ['halal'] },
        { name: 'Tom Yum Soup', description: 'Thai-style spicy sour soup', price: 150, spiceLevel: 'hot', dietaryTags: ['halal'] },
        { name: 'Lentil Soup', description: 'Creamy spiced lentil soup', price: 80, spiceLevel: 'mild', dietaryTags: ['vegetarian', 'vegan'] },
      ],
    },
  ],
  Sandwiches: [
    {
      category: 'Sandwiches',
      icon: '🥪',
      items: [
        { name: 'Club Sandwich', description: 'Triple-decker with chicken, egg, and veggies', price: 180, spiceLevel: 'mild', dietaryTags: ['halal'], isPopular: true },
        { name: 'Grilled Chicken Sandwich', description: 'Grilled chicken breast in a bun', price: 160, spiceLevel: 'mild', dietaryTags: ['halal'] },
        { name: 'Grilled Cheese', description: 'Melted cheese sandwich', price: 120, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Tuna Sandwich', description: 'Tuna mayo with fresh vegetables', price: 170, spiceLevel: 'none', dietaryTags: [] },
      ],
    },
    {
      category: 'Sides',
      icon: '🍟',
      items: [
        { name: 'French Fries', description: 'Crispy golden fries', price: 100, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
        { name: 'Soft Drink', description: 'Choice of beverage', price: 40, spiceLevel: 'none', dietaryTags: [] },
      ],
    },
  ],
  Steak: [
    {
      category: 'Steaks',
      icon: '🥩',
      items: [
        { name: 'Beef Steak', description: 'Grilled beef steak with herbs', price: 450, spiceLevel: 'mild', dietaryTags: ['halal'], isPopular: true, isFeatured: true },
        { name: 'Grilled Chicken Steak', description: 'Chicken breast grilled to perfection', price: 350, spiceLevel: 'mild', dietaryTags: ['halal'] },
        { name: 'Lamb Chops', description: 'Herb-crusted lamb chops', price: 500, spiceLevel: 'medium', dietaryTags: ['halal'] },
      ],
    },
    {
      category: 'Sides',
      icon: '🥗',
      items: [
        { name: 'Mashed Potato', description: 'Creamy mashed potato', price: 100, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Grilled Vegetables', description: 'Seasonal grilled vegetables', price: 120, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
        { name: 'Caesar Salad', description: 'Classic Caesar salad', price: 150, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
      ],
    },
  ],
  Turkish: [
    {
      category: 'Turkish',
      icon: '🥙',
      items: [
        { name: 'Turkish Kebab', description: 'Traditional grilled meat kebab', price: 250, spiceLevel: 'medium', dietaryTags: ['halal'], isPopular: true },
        { name: 'Doner Plate', description: 'Sliced doner meat with rice and salad', price: 200, spiceLevel: 'mild', dietaryTags: ['halal'] },
        { name: 'Pide', description: 'Turkish flatbread with toppings', price: 280, spiceLevel: 'mild', dietaryTags: ['halal'], isFeatured: true },
        { name: 'Lahmacun', description: 'Thin Turkish pizza with minced meat', price: 180, spiceLevel: 'medium', dietaryTags: ['halal'] },
      ],
    },
  ],
  'Middle Eastern': [
    {
      category: 'Middle Eastern',
      icon: '🧆',
      items: [
        { name: 'Shawarma Plate', description: 'Grilled shawarma meat with hummus and pita', price: 250, spiceLevel: 'mild', dietaryTags: ['halal'], isPopular: true },
        { name: 'Kebab Platter', description: 'Mixed grilled kebabs with rice', price: 280, spiceLevel: 'medium', dietaryTags: ['halal'], isFeatured: true },
        { name: 'Hummus', description: 'Creamy chickpea dip with pita', price: 150, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
        { name: 'Falafel Plate', description: 'Crispy falafel with tahini and salad', price: 140, spiceLevel: 'mild', dietaryTags: ['vegetarian', 'vegan'] },
      ],
    },
  ],
  Mediterranean: [
    {
      category: 'Mediterranean',
      icon: '🫒',
      items: [
        { name: 'Hummus Platter', description: 'Smooth hummus with warm pita bread', price: 200, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'], isPopular: true },
        { name: 'Falafel Plate', description: 'Crispy falafel with tahini sauce', price: 180, spiceLevel: 'mild', dietaryTags: ['vegetarian', 'vegan'] },
        { name: 'Grilled Chicken', description: 'Herb-grilled chicken with Mediterranean salad', price: 250, spiceLevel: 'mild', dietaryTags: ['halal'] },
        { name: 'Fattoush Salad', description: 'Crispy pita salad with sumac dressing', price: 150, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
      ],
    },
  ],
  Italian: [
    {
      category: 'Pasta',
      icon: '🍝',
      items: [
        { name: 'Pasta Carbonara', description: 'Creamy pasta with bacon and parmesan', price: 280, spiceLevel: 'none', dietaryTags: [], isPopular: true },
        { name: 'Chicken Alfredo', description: 'Pasta in creamy white sauce with chicken', price: 300, spiceLevel: 'none', dietaryTags: ['halal'] },
        { name: 'Arrabiata Pasta', description: 'Spicy tomato pasta', price: 250, spiceLevel: 'hot', dietaryTags: ['vegetarian'] },
      ],
    },
    {
      category: 'Starters & Desserts',
      icon: '🍞',
      items: [
        { name: 'Bruschetta', description: 'Toasted bread with tomato and basil', price: 180, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Garlic Bread', description: 'Toasted garlic butter bread', price: 80, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Tiramisu', description: 'Classic Italian coffee dessert', price: 200, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
      ],
    },
  ],
  'Chotpoti & Fuchka': [
    {
      category: 'Street Food',
      icon: '🥘',
      items: [
        { name: 'Chotpoti', description: 'Spiced chickpea curry with eggs and tamarind', price: 60, spiceLevel: 'medium', dietaryTags: ['vegetarian'], isPopular: true },
        { name: 'Fuchka (8 pcs)', description: 'Crispy shells with spiced water and fillings', price: 50, spiceLevel: 'medium', dietaryTags: ['vegetarian'] },
        { name: 'Special Chotpoti', description: 'Loaded chotpoti with extra toppings', price: 80, spiceLevel: 'medium', dietaryTags: ['vegetarian'], isFeatured: true },
        { name: 'Jhal Muri', description: 'Spiced puffed rice mix', price: 40, spiceLevel: 'hot', dietaryTags: ['vegetarian', 'vegan'] },
      ],
    },
  ],
  Faluda: [
    {
      category: 'Faluda & Desserts',
      icon: '🍨',
      items: [
        { name: 'Classic Faluda', description: 'Vermicelli, basil seeds, and rose syrup with milk', price: 120, spiceLevel: 'none', dietaryTags: ['vegetarian'], isPopular: true },
        { name: 'Mango Faluda', description: 'Mango-flavored faluda', price: 140, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Rose Faluda', description: 'Rose-flavored classic faluda', price: 120, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Chocolate Faluda', description: 'Chocolate-flavored faluda', price: 150, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
      ],
    },
  ],
  Doi: [
    {
      category: 'Doi & Yogurt',
      icon: '🥛',
      items: [
        { name: 'Mishti Doi', description: 'Sweetened caramelized yogurt', price: 60, spiceLevel: 'none', dietaryTags: ['vegetarian'], isPopular: true },
        { name: 'Tok Doi', description: 'Plain sour yogurt', price: 40, spiceLevel: 'none', dietaryTags: ['vegetarian'] },
        { name: 'Doi Bora', description: 'Lentil dumplings in yogurt', price: 80, spiceLevel: 'mild', dietaryTags: ['vegetarian'] },
      ],
    },
  ],
};

// Fallback menu for cuisines not in the template
const DEFAULT_MENU: { category: string; icon: string; items: MenuItemTemplate[] }[] = [
  {
    category: 'Popular Items',
    icon: '⭐',
    items: [
      { name: 'Chicken Rice', description: 'Steamed rice with grilled chicken', price: 150, spiceLevel: 'mild', dietaryTags: ['halal'], isPopular: true },
      { name: 'Beef Curry', description: 'Rich beef curry with aromatic spices', price: 180, spiceLevel: 'medium', dietaryTags: ['halal'] },
      { name: 'French Fries', description: 'Crispy golden fries', price: 100, spiceLevel: 'none', dietaryTags: ['vegetarian', 'vegan'] },
      { name: 'Soft Drink', description: 'Choice of beverage', price: 40, spiceLevel: 'none', dietaryTags: [] },
    ],
  },
  {
    category: 'Main Course',
    icon: '🍛',
    items: [
      { name: 'Chicken Biryani', description: 'Aromatic rice with spiced chicken', price: 160, spiceLevel: 'medium', dietaryTags: ['halal'], isPopular: true },
      { name: 'Beef Bhuna', description: 'Dry-cooked beef with caramelised onions', price: 180, spiceLevel: 'medium', dietaryTags: ['halal'] },
      { name: 'Fish Curry', description: 'Fresh fish in turmeric gravy', price: 160, spiceLevel: 'medium', dietaryTags: ['halal'] },
    ],
  },
];

// ── Seed script ─────────────────────────────────────────────────

const NON_RESTAURANT_PATTERNS = [
  /pharmacy/i,
  /pharma/i,
  /drug/i,
  /medical hall/i,
  /surgical/i,
  /distribution/i,
  /d[\s-]?mart/i,
  /pandamart/i,
  /bengal meat/i,
];

const isRestaurant = (r: ScrapedRestaurant): boolean => {
  return !NON_RESTAURANT_PATTERNS.some((p) => p.test(r.name));
};

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

    // ── Create image directories ──────────────────────────────
    [HERO_DIR, LOGO_DIR].forEach((dir) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    // ── Create system users ───────────────────────────────────
    await User.create(SYSTEM_USERS.admin);
    await User.create(SYSTEM_USERS.admin2);
    await User.create(SYSTEM_USERS.support);
    console.log(c(ANSI.green, '✓ Admin users created'));

    const regularUser = await User.create(SYSTEM_USERS.customer);
    await CustomerProfile.create({ userId: regularUser._id });
    console.log(c(ANSI.green, '✓ Customer user created'));

    const driverUser = await User.create(SYSTEM_USERS.driver);
    await DriverProfile.create({
      userId: driverUser._id,
      applicationStatus: 'approved',
      licenseNumber: 'SYL-DL-2024-007',
      vehicleType: VehicleType.MOTORCYCLE,
      vehicleNumber: 'SYLHET-M-1234',
      isAvailable: false,
      totalDeliveries: 0,
      totalEarnings: 0,
      rating: { average: 0, count: 0 },
    });
    console.log(c(ANSI.green, '✓ Driver user created'));

    // ── Load & filter restaurant data ─────────────────────────
    const allData: ScrapedRestaurant[] = require('../scripts/sylhet_restaurants.json');
    const restaurants = allData.filter(isRestaurant);
    console.log(
      c(
        ANSI.cyan,
        `\n📦 Loaded ${allData.length} entries, ${restaurants.length} are restaurants`,
      ),
    );

    // ── Download images ───────────────────────────────────────
    console.log(c(ANSI.cyan, '⬇  Downloading restaurant images...'));
    const downloads: { url: string; dest: string }[] = [];
    for (const r of restaurants) {
      if (r.hero_image) {
        downloads.push({
          url: r.hero_image,
          dest: path.join(HERO_DIR, `${r.code}.jpg`),
        });
      }
      if (r.logo) {
        downloads.push({
          url: r.logo,
          dest: path.join(LOGO_DIR, `${r.code}.jpg`),
        });
      }
    }
    const downloaded = await downloadBatch(downloads, 15);
    console.log(
      c(
        ANSI.green,
        `✓ Downloaded ${downloaded}/${downloads.length} images`,
      ),
    );

    // ── Create vendor users, restaurants, profiles ────────────
    console.log(c(ANSI.cyan, '🏪 Creating restaurants...'));
    const vendorUsers: any[] = [];
    const restaurantDocs: any[] = [];
    const vendorProfiles: any[] = [];

    for (const r of restaurants) {
      const slug = `${slugify(r.name)}-${r.code}`;
      const { street, area, district } = parseAddress(r.address);
      const cuisineNames = r.cuisines.map((c) => c.name);
      const primaryCuisine = r.cuisines.find((c) => c.main)?.name || cuisineNames[0] || 'General';

      const heroPath = fs.existsSync(path.join(HERO_DIR, `${r.code}.jpg`))
        ? `/uploads/restaurants/hero/${r.code}.jpg`
        : '';
      const logoPath = fs.existsSync(path.join(LOGO_DIR, `${r.code}.jpg`))
        ? `/uploads/restaurants/logo/${r.code}.jpg`
        : heroPath;

      vendorUsers.push({
        email: `vendor.${r.code}@seed.com`,
        password: 'Vendor@123456',
        firstName: r.name.split(' ')[0].slice(0, 30),
        lastName: 'Owner',
        role: UserRole.VENDOR,
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true,
      });

      const priceRange = Math.min(4, Math.max(1, r.budget)) as 1 | 2 | 3 | 4;

      restaurantDocs.push({
        name: r.name.slice(0, 150),
        slug,
        description: `${r.name} is a popular ${primaryCuisine.toLowerCase()} restaurant in ${area}, Sylhet. Known for its quality food and fast delivery.`,
        address: { street, area, district, coordinates: { lat: r.latitude, lng: r.longitude } },
        location: { type: 'Point', coordinates: [r.longitude, r.latitude] },
        contactInfo: {
          phone: r.customer_phone || '+8801700000000',
          email: `contact.${r.code}@restaurant.com`,
        },
        cuisineType: cuisineNames,
        tags: cuisineNames.map((n) => n.toLowerCase()),
        images: {
          logo: logoPath || heroPath || '/uploads/restaurants/hero/default.jpg',
          coverPhoto: heroPath || logoPath || '/uploads/restaurants/hero/default.jpg',
          gallery: heroPath ? [heroPath] : [],
        },
        operatingHours: generateDefaultHours(),
        isActive: r.is_active,
        isTemporarilyClosed: false,
        approvalStatus: 'approved' as const,
        rating: { average: r.rating, count: r.review_number },
        deliveryTime: { min: Math.round(r.minimum_delivery_time), max: Math.round(r.minimum_delivery_time + 15) },
        deliveryFee: r.minimum_delivery_fee,
        minimumOrder: r.minimum_order_amount,
        priceRange,
        serviceOptions: [
          ...(r.is_delivery_enabled ? (['delivery'] as const) : []),
          ...(r.is_pickup_enabled ? (['takeaway'] as const) : []),
        ],
        paymentMethods: ['cash', 'bkash', 'nagad'],
        totalOrders: 0,
        averagePreparationTime: 20,
      });
    }

    // Batch insert vendor users
    const createdVendorUsers: any[] = [];
    const vendorUserByEmail = new Map<string, any>();
    for (const vu of vendorUsers) {
      try {
        const doc = await User.create(vu);
        createdVendorUsers.push(doc);
        vendorUserByEmail.set(vu.email, doc);
      } catch {}
    }
    console.log(c(ANSI.green, `✓ ${createdVendorUsers.length} vendor users created`));

    // Batch insert restaurants, preserving mapping to scraped data
    const createdRestaurants: any[] = [];
    const scrapedByRestaurantId = new Map<string, ScrapedRestaurant>();
    for (let i = 0; i < restaurantDocs.length; i++) {
      try {
        const doc = await Restaurant.create(restaurantDocs[i]);
        createdRestaurants.push(doc);
        scrapedByRestaurantId.set(doc._id.toString(), restaurants[i]);
      } catch {}
    }
    console.log(c(ANSI.green, `✓ ${createdRestaurants.length} restaurants created`));

    // Create vendor profiles
    for (const restaurant of createdRestaurants) {
      const data = scrapedByRestaurantId.get(restaurant._id.toString());
      if (!data) continue;
      const vendorUser = vendorUserByEmail.get(`vendor.${data.code}@seed.com`);
      if (!vendorUser) continue;
      vendorProfiles.push({
        userId: vendorUser._id,
        restaurantIds: [restaurant._id],
        businessName: data.name.slice(0, 100),
        businessLicense: `SYL-TRADE-${2020}-${restaurant._id.toString().slice(-4)}`,
        taxId: `SYL-TIN-${restaurant._id.toString().slice(-4)}-2020`,
        isVerified: true,
        autoAcceptOrders: false,
        totalOrders: 0,
        totalEarnings: 0,
        averageRating: data.rating,
      });
    }
    await VendorProfile.insertMany(vendorProfiles, { ordered: false }).catch(() => VendorProfile.insertMany(vendorProfiles));
    console.log(c(ANSI.green, `✓ ${vendorProfiles.length} vendor profiles created`));

    // ── Create menu categories & items ────────────────────────
    console.log(c(ANSI.cyan, '🍽  Creating menu categories & items...'));
    const allCategories: any[] = [];
    const allMenuItems: any[] = [];
    const restaurantMenuItems: Map<string, any[]> = new Map();

    for (const restaurant of createdRestaurants) {
      const data = scrapedByRestaurantId.get(restaurant._id.toString());
      if (!data) continue;
      const primaryCuisine = data.cuisines.find((c) => c.main)?.name || data.cuisines[0]?.name || '';

      const templates = MENU_TEMPLATES[primaryCuisine] || DEFAULT_MENU;

      for (let catIdx = 0; catIdx < templates.length; catIdx++) {
        const tmpl = templates[catIdx];
        const cat = {
          restaurantId: restaurant._id,
          name: tmpl.category,
          icon: tmpl.icon,
          displayOrder: catIdx + 1,
        };
        allCategories.push(cat);
      }
    }

    const createdCategories = await MenuCategory.insertMany(allCategories, { ordered: false }).catch(() => MenuCategory.insertMany(allCategories));
    console.log(c(ANSI.green, `✓ ${createdCategories.length} menu categories created`));

    // Create menu items (need category IDs)
    const catByRestaurant = new Map<string, any[]>();
    for (const cat of createdCategories) {
      const rid = cat.restaurantId.toString();
      if (!catByRestaurant.has(rid)) catByRestaurant.set(rid, []);
      catByRestaurant.get(rid)!.push(cat);
    }

    let itemIdx = 0;
    for (const restaurant of createdRestaurants) {
      const data = scrapedByRestaurantId.get(restaurant._id.toString());
      if (!data) continue;
      const rid = restaurant._id.toString();
      const cats = catByRestaurant.get(rid) || [];
      const primaryCuisine = data.cuisines.find((c) => c.main)?.name || data.cuisines[0]?.name || '';
      const templates = MENU_TEMPLATES[primaryCuisine] || DEFAULT_MENU;
      const menuItemsForRestaurant: any[] = [];

      for (let catIdx = 0; catIdx < cats.length && catIdx < templates.length; catIdx++) {
        const cat = cats[catIdx];
        const tmpl = templates[catIdx];

        for (let itemIdx2 = 0; itemIdx2 < tmpl.items.length; itemIdx2++) {
          const item = tmpl.items[itemIdx2];
          const mi = {
            restaurantId: restaurant._id,
            categoryId: cat._id,
            name: item.name,
            description: item.description,
            price: item.price,
            dietaryTags: item.dietaryTags,
            isAvailable: true,
            stockStatus: 'available' as const,
            preparationTime: 15 + Math.floor(Math.random() * 15),
            displayOrder: itemIdx2 + 1,
            isPopular: item.isPopular || false,
            isFeatured: item.isFeatured || false,
            spiceLevel: item.spiceLevel,
          };
          allMenuItems.push(mi);
          menuItemsForRestaurant.push(mi);
        }
      }
      restaurantMenuItems.set(rid, menuItemsForRestaurant);
    }

    const createdMenuItems = await MenuItem.insertMany(allMenuItems, { ordered: false }).catch(() => MenuItem.insertMany(allMenuItems));
    console.log(c(ANSI.green, `✓ ${createdMenuItems.length} menu items created`));

    // Map menu items back to restaurants
    const menuItemsByRestaurant = new Map<string, any[]>();
    for (const mi of createdMenuItems) {
      const rid = mi.restaurantId.toString();
      if (!menuItemsByRestaurant.has(rid)) menuItemsByRestaurant.set(rid, []);
      menuItemsByRestaurant.get(rid)!.push(mi);
    }

    // ── Create reviews ────────────────────────────────────────
    console.log(c(ANSI.cyan, '💬 Creating reviews...'));

    // Collect unique reviewers
    const reviewerMap = new Map<string, { name: string; email: string }>();
    let reviewerCounter = 0;
    for (const r of restaurants) {
      for (const rev of r.reviews) {
        const key = rev.reviewer.toLowerCase().trim();
        if (!reviewerMap.has(key)) {
          reviewerCounter++;
          reviewerMap.set(key, {
            name: rev.reviewer,
            email: `reviewer.${sanitizeForEmail(rev.reviewer)}${reviewerCounter}@seed.com`,
          });
        }
      }
    }

    // Create customer users for reviewers
    const customerUsersData: any[] = [];
    for (const [, info] of reviewerMap) {
      customerUsersData.push({
        email: info.email,
        password: 'Reviewer@123456',
        firstName: info.name.slice(0, 30),
        lastName: 'User',
        role: UserRole.CUSTOMER,
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true,
      });
    }

    const createdCustomerUsers = await User.insertMany(customerUsersData, { ordered: false }).catch(() => User.insertMany(customerUsersData));

    // Create customer profiles
    const customerProfiles = createdCustomerUsers.map((u) => ({ userId: u._id }));
    await CustomerProfile.insertMany(customerProfiles, { ordered: false }).catch(() => CustomerProfile.insertMany(customerProfiles));

    // Map reviewer name → user ID
    const reviewerUserMap = new Map<string, any>();
    for (let i = 0; i < createdCustomerUsers.length; i++) {
      const email = createdCustomerUsers[i].email;
      for (const [key, info] of reviewerMap) {
        if (info.email === email) {
          reviewerUserMap.set(key, createdCustomerUsers[i]);
          break;
        }
      }
    }

    console.log(
      c(
        ANSI.green,
        `✓ ${createdCustomerUsers.length} customer users created for reviewers`,
      ),
    );

    // Create orders + reviews
    const allOrders: any[] = [];
    const allReviews: any[] = [];
    let orderCounter = 0;

    for (const restaurant of createdRestaurants) {
      const data = scrapedByRestaurantId.get(restaurant._id.toString());
      if (!data) continue;
      const rid = restaurant._id.toString();
      const items = menuItemsByRestaurant.get(rid) || [];

      if (items.length === 0 || data.reviews.length === 0) continue;

      for (const rev of data.reviews) {
        orderCounter++;
        const reviewerKey = rev.reviewer.toLowerCase().trim();
        const customerUser = reviewerUserMap.get(reviewerKey);
        if (!customerUser) continue;

        const randomItem = items[Math.floor(Math.random() * items.length)];
        const subtotal = randomItem.price;
        const tax = Math.round(subtotal * 0.05);
        const deliveryFee = restaurant.deliveryFee || 30;
        const total = subtotal + tax + deliveryFee;

        const orderNumber = `SEED-${String(orderCounter).padStart(6, '0')}`;
        const reviewDate = new Date(rev.date);
        const orderDate = new Date(reviewDate.getTime() - 60 * 60 * 1000); // 1 hour before review

        allOrders.push({
          orderNumber,
          customerId: customerUser._id,
          restaurantId: restaurant._id,
          items: [
            {
              menuItemId: randomItem._id,
              name: randomItem.name,
              price: randomItem.price,
              quantity: 1,
              itemTotal: randomItem.price,
            },
          ],
          deliveryAddress: {
            street: 'Zinda Bazar Road',
            area: 'Zinda Bazar',
            district: 'Sylhet',
            coordinates: { latitude: 24.8994, longitude: 91.8687 },
          },
          status: OrderStatus.DELIVERED,
          statusHistory: [
            { status: OrderStatus.PENDING, timestamp: orderDate },
            { status: OrderStatus.CONFIRMED, timestamp: new Date(orderDate.getTime() + 5 * 60000) },
            { status: OrderStatus.PREPARING, timestamp: new Date(orderDate.getTime() + 10 * 60000) },
            { status: OrderStatus.READY, timestamp: new Date(orderDate.getTime() + 25 * 60000) },
            { status: OrderStatus.DELIVERED, timestamp: new Date(orderDate.getTime() + 40 * 60000) },
          ],
          paymentMethod: 'cash',
          paymentStatus: PaymentStatus.PAID,
          subtotal,
          tax,
          deliveryFee,
          discount: 0,
          tipAmount: 0,
          total,
          createdAt: orderDate,
          updatedAt: reviewDate,
        });

        allReviews.push({
          customerId: customerUser._id,
          restaurantId: restaurant._id,
          orderId: null, // will be set after orders are created
          rating: rev.rating,
          comment: rev.text.slice(0, 1000),
          images: [],
          helpfulVotes: 0,
          unhelpfulVotes: 0,
          createdAt: reviewDate,
          updatedAt: reviewDate,
        });
      }
    }

    // Batch insert orders
    const createdOrders = await Order.insertMany(allOrders, { ordered: false }).catch(() => Order.insertMany(allOrders));
    console.log(c(ANSI.green, `✓ ${createdOrders.length} orders created`));

    // Link reviews to orders
    for (let i = 0; i < allReviews.length && i < createdOrders.length; i++) {
      allReviews[i].orderId = createdOrders[i]._id;
    }

    // Batch insert reviews
    const createdReviews = await Review.insertMany(allReviews, { ordered: false }).catch(() => Review.insertMany(allReviews));
    console.log(c(ANSI.green, `✓ ${createdReviews.length} reviews created`));

    // ── Update restaurant order counts ────────────────────────
    const orderCounts = new Map<string, number>();
    for (const order of createdOrders) {
      const rid = order.restaurantId.toString();
      orderCounts.set(rid, (orderCounts.get(rid) || 0) + 1);
    }
    for (const restaurant of createdRestaurants) {
      const count = orderCounts.get(restaurant._id.toString()) || 0;
      await Restaurant.findByIdAndUpdate(restaurant._id, { totalOrders: count });
    }

    // ── Verification ──────────────────────────────────────────
    const [
      adminCount,
      vendorCount,
      vendorProfileCount,
      restaurantCount,
      categoryCount,
      menuItemCount,
      customerCount,
      driverCount,
      orderCount,
      reviewCount,
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
      Order.countDocuments({}),
      Review.countDocuments({}),
      User.countDocuments({}),
    ]);

    console.log(c(ANSI.bold, '\n✅ Seed completed successfully.'));
    console.log(c(ANSI.dim, '────────────────────────────────────────────'));
    console.log(
      `  Users        : ${totalUserCount} (${adminCount} admins, ${vendorCount} vendors, ${customerCount} customers, ${driverCount} drivers)`,
    );
    console.log(
      `  Restaurants  : ${restaurantCount}`,
    );
    console.log(`  Categories   : ${categoryCount}`);
    console.log(`  Menu items   : ${menuItemCount}`);
    console.log(`  Orders       : ${orderCount}`);
    console.log(`  Reviews      : ${reviewCount}`);
    console.log(`  Vendor profiles : ${vendorProfileCount}`);
    console.log(c(ANSI.dim, '────────────────────────────────────────────'));
    console.log(
      c(ANSI.dim, `    admin@seed.com    — super_admin  / Admin@123456`),
    );
    console.log(
      c(ANSI.dim, `    customer@seed.com — customer     / Customer@123456`),
    );
    console.log(
      c(ANSI.dim, `    driver@seed.com   — driver       / Driver@123456`),
    );
    console.log(
      c(
        ANSI.dim,
        `    vendor.*@seed.com — vendor       / Vendor@123456`,
      ),
    );
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
