import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Plus,
  Minus,
  ArrowRight,
  X,
  ChevronRight,
  SlidersHorizontal,
  Grid3x3,
  List,
  Star,
  Flame,
  Leaf,
  Clock,
  ShoppingBag,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// Types
// ============================================================================

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  isMostLiked?: boolean;
  isVegetarian?: boolean;
  isSpicy?: boolean;
  prepTime?: number; // in minutes
  rating?: number;
  reviewCount?: number;
}

interface CartItem extends MenuItem {
  quantity: number;
  extras?: string[];
}

interface Category {
  id: string;
  name: string;
  isNew?: boolean;
}

type ViewMode = "grid" | "list";
type SortOption = "popular" | "price-low" | "price-high" | "rating";

// ============================================================================
// Mock Data
// ============================================================================

const categories: Category[] = [
  { id: "starter", name: "Starter" },
  { id: "burger", name: "Burger" },
  { id: "tacos", name: "Tacos" },
  { id: "dessert", name: "Dessert" },
  { id: "beverage", name: "Beverage" },
  { id: "cocktail", name: "Cocktail", isNew: true },
  { id: "sides", name: "Sides" },
];

const menuItems: MenuItem[] = [
  // Starters
  {
    id: 1,
    name: "Charcuterie Pretzel",
    description:
      "Artisan pretzel served with cherry smoked meat, aged cheese, genoa salami, and crumbled feta. Perfect for sharing!",
    price: 24.0,
    originalPrice: 30.0,
    image:
      "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=800&q=80",
    category: "starter",
    isMostLiked: true,
    prepTime: 15,
    rating: 4.8,
    reviewCount: 234,
  },
  {
    id: 2,
    name: "Sweet Potato Fries",
    description:
      "Crispy sweet potato fries seasoned with herbs and spices. Served with chipotle mayo and garlic aioli.",
    price: 26.0,
    image:
      "https://images.unsplash.com/photo-1596560548464-f010549b84d7?auto=format&fit=crop&w=800&q=80",
    category: "starter",
    isVegetarian: true,
    prepTime: 12,
    rating: 4.6,
    reviewCount: 189,
  },
  {
    id: 3,
    name: "Mediterranean Salad Bowl",
    description:
      "Fresh mixed greens with cherry tomatoes, cucumber, olives, feta cheese, and our signature vinaigrette.",
    price: 30.0,
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80",
    category: "starter",
    isVegetarian: true,
    prepTime: 10,
    rating: 4.7,
    reviewCount: 156,
  },
  {
    id: 4,
    name: "Caramelized Onion Tart",
    description:
      "Slowly caramelized onions on a flaky puff pastry base with goat cheese and fresh thyme.",
    price: 20.0,
    image:
      "https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?auto=format&fit=crop&w=800&q=80",
    category: "starter",
    isVegetarian: true,
    prepTime: 18,
    rating: 4.5,
    reviewCount: 98,
  },
  // Burgers
  {
    id: 5,
    name: "Big Burger Bite",
    description:
      "Double beef patty with aged cheddar, crispy bacon, caramelized onions, lettuce, tomato, and our signature sauce on a brioche bun.",
    price: 50.0,
    originalPrice: 64.0,
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
    category: "burger",
    isMostLiked: true,
    prepTime: 20,
    rating: 4.9,
    reviewCount: 512,
  },
  {
    id: 6,
    name: "Devil Burger Cheese",
    description:
      "Spicy beef patty with jalapeños, pepper jack cheese, spicy mayo, and crispy onion rings. Not for the faint-hearted!",
    price: 50.0,
    originalPrice: 60.0,
    image:
      "https://images.unsplash.com/photo-1550317138-10000687a72b?auto=format&fit=crop&w=800&q=80",
    category: "burger",
    isMostLiked: true,
    isSpicy: true,
    prepTime: 18,
    rating: 4.8,
    reviewCount: 423,
  },
  {
    id: 7,
    name: "Double Animal Style",
    description:
      "Two juicy patties with melted American cheese, grilled onions, special sauce, and pickles. A west coast classic!",
    price: 40.0,
    originalPrice: 46.0,
    image:
      "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=800&q=80",
    category: "burger",
    isMostLiked: true,
    prepTime: 16,
    rating: 4.7,
    reviewCount: 389,
  },
  {
    id: 8,
    name: "Mushroom Swiss Burger",
    description:
      "Premium beef patty topped with sautéed mushrooms, Swiss cheese, garlic aioli, and fresh arugula on a sesame bun.",
    price: 42.0,
    image:
      "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=800&q=80",
    category: "burger",
    prepTime: 18,
    rating: 4.6,
    reviewCount: 267,
  },
  {
    id: 9,
    name: "Whiskey BBQ Burger",
    description:
      "Smoked beef patty glazed with whiskey BBQ sauce, crispy bacon, cheddar cheese, and onion straws on a toasted bun.",
    price: 55.0,
    image:
      "https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=800&q=80",
    category: "burger",
    isMostLiked: true,
    prepTime: 22,
    rating: 4.9,
    reviewCount: 445,
  },
  {
    id: 10,
    name: "Classic Cheeseburger",
    description:
      "The timeless classic! Juicy beef patty with American cheese, lettuce, tomato, onion, pickles, and our secret sauce.",
    price: 38.0,
    image:
      "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?auto=format&fit=crop&w=800&q=80",
    category: "burger",
    prepTime: 15,
    rating: 4.7,
    reviewCount: 356,
  },
  // Tacos
  {
    id: 11,
    name: "Classic Beef Tacos",
    description:
      "Three soft-shell tacos with seasoned beef, fresh pico de gallo, shredded cheese, lettuce, and sour cream.",
    price: 28.0,
    image:
      "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80",
    category: "tacos",
    isMostLiked: true,
    isSpicy: true,
    prepTime: 14,
    rating: 4.7,
    reviewCount: 298,
  },
  {
    id: 12,
    name: "Fish Tacos Special",
    description:
      "Grilled mahi-mahi with cabbage slaw, chipotle mayo, cilantro, and lime on corn tortillas.",
    price: 32.0,
    image:
      "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=800&q=80",
    category: "tacos",
    prepTime: 16,
    rating: 4.8,
    reviewCount: 245,
  },
  // Desserts
  {
    id: 13,
    name: "Chocolate Lava Cake",
    description:
      "Decadent warm chocolate cake with a molten center, served with vanilla ice cream and fresh berries.",
    price: 15.0,
    image:
      "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=800&q=80",
    category: "dessert",
    isMostLiked: true,
    isVegetarian: true,
    prepTime: 12,
    rating: 4.9,
    reviewCount: 412,
  },
  {
    id: 14,
    name: "Tiramisu Classic",
    description:
      "Traditional Italian dessert with espresso-soaked ladyfingers, mascarpone cream, and cocoa powder.",
    price: 18.0,
    image:
      "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=80",
    category: "dessert",
    isVegetarian: true,
    prepTime: 8,
    rating: 4.7,
    reviewCount: 321,
  },
  // Beverages
  {
    id: 15,
    name: "Fresh Lemonade",
    description:
      "Refreshing homemade lemonade with freshly squeezed lemons, mint leaves, and a touch of honey.",
    price: 8.0,
    image:
      "https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=800&q=80",
    category: "beverage",
    isVegetarian: true,
    prepTime: 5,
    rating: 4.5,
    reviewCount: 178,
  },
  {
    id: 16,
    name: "Tropical Mango Smoothie",
    description:
      "Creamy blend of fresh mango, banana, Greek yogurt, and a hint of passion fruit. Healthy and delicious!",
    price: 12.0,
    image:
      "https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=800&q=80",
    category: "beverage",
    isMostLiked: true,
    isVegetarian: true,
    prepTime: 6,
    rating: 4.8,
    reviewCount: 267,
  },
  // Cocktails
  {
    id: 17,
    name: "Mojito Classic",
    description:
      "Refreshing Cuban cocktail with white rum, fresh mint, lime juice, sugar, and soda water over crushed ice.",
    price: 22.0,
    image:
      "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=800&q=80",
    category: "cocktail",
    isMostLiked: true,
    prepTime: 7,
    rating: 4.7,
    reviewCount: 334,
  },
  {
    id: 18,
    name: "Margarita Sunset",
    description:
      "Premium tequila with fresh lime juice, triple sec, and a hint of grenadine. Served with a salted rim.",
    price: 25.0,
    image:
      "https://images.unsplash.com/photo-1556855810-ac404aa91e85?auto=format&fit=crop&w=800&q=80",
    category: "cocktail",
    prepTime: 8,
    rating: 4.6,
    reviewCount: 289,
  },
  // Sides
  {
    id: 19,
    name: "Crispy French Fries",
    description:
      "Golden, crispy hand-cut fries seasoned with sea salt and herbs. Served with house-made ketchup and aioli.",
    price: 10.0,
    image:
      "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80",
    category: "sides",
    isMostLiked: true,
    isVegetarian: true,
    prepTime: 10,
    rating: 4.6,
    reviewCount: 445,
  },
  {
    id: 20,
    name: "Beer-Battered Onion Rings",
    description:
      "Thick-cut onions in a crispy beer batter, fried to golden perfection. Served with ranch dipping sauce.",
    price: 12.0,
    image:
      "https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&fit=crop&w=800&q=80",
    category: "sides",
    isVegetarian: true,
    prepTime: 12,
    rating: 4.5,
    reviewCount: 312,
  },
];

// ============================================================================
// Components
// ============================================================================

// Breadcrumb Component
const Breadcrumb: React.FC<{ category: string }> = ({ category }) => (
  <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
    <Link to="/" className="hover:text-orange-500 transition-colors">
      Home
    </Link>
    <ChevronRight className="w-4 h-4" />
    <Link to="/categories" className="hover:text-orange-500 transition-colors">
      Menu
    </Link>
    <ChevronRight className="w-4 h-4" />
    <span className="text-gray-900 font-medium capitalize">{category}</span>
  </div>
);

// Category Tab Component
interface CategoryTabProps {
  category: Category;
  isActive: boolean;
  onClick: () => void;
}

const CategoryTab: React.FC<CategoryTabProps> = ({
  category,
  isActive,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={`relative px-6 py-3 text-base font-medium transition-all duration-200 whitespace-nowrap ${
      isActive
        ? "text-orange-500 border-b-2 border-orange-500"
        : "text-gray-600 hover:text-gray-900"
    }`}
  >
    <span className="flex items-center gap-2">
      {category.name}
      {category.isNew && (
        <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-0 text-xs px-2 py-0.5">
          NEW
        </Badge>
      )}
    </span>
  </button>
);

// Session storage key for cart
const CART_STORAGE_KEY = "food_delivery_cart";

// Enhanced Menu Item Card Component
interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem, event: React.MouseEvent) => void;
  onUpdateQuantity: (
    id: number,
    quantity: number,
    event: React.MouseEvent,
  ) => void;
  viewMode: ViewMode;
  cartQuantity: number;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  onAddToCart,
  onUpdateQuantity,
  viewMode,
  cartQuantity,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const hasDiscount = item.originalPrice && item.originalPrice > item.price;
  const discountPercent = hasDiscount
    ? Math.round(
        ((item.originalPrice! - item.price) / item.originalPrice!) * 100,
      )
    : 0;

  if (viewMode === "list") {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex gap-6 p-5 bg-white rounded-2xl hover:shadow-lg transition-all duration-300 border border-gray-100 group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image */}
        <div className="relative flex-shrink-0 w-48 h-36">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover rounded-xl"
          />
          {hasDiscount && (
            <div className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {discountPercent}% OFF
            </div>
          )}
          {item.isMostLiked && (
            <div className="absolute top-3 right-3 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg">
              <Flame className="w-3 h-3" />
              Popular
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 group-hover:text-orange-500 transition-colors mb-1">
                {item.name}
              </h3>
              <div className="flex items-center gap-3 mb-2">
                {item.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-orange-500 text-orange-500" />
                    <span className="text-sm font-medium text-gray-900">
                      {item.rating}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({item.reviewCount})
                    </span>
                  </div>
                )}
                {item.prepTime && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">{item.prepTime} min</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <p className="text-gray-600 text-sm leading-relaxed mb-3 flex-1">
            {item.description}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">
                  BDT {item.price.toFixed(2)}
                </span>
                {hasDiscount && (
                  <span className="text-sm text-gray-400 line-through">
                    BDT {item.originalPrice!.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {item.isVegetarian && (
                  <Badge
                    variant="success"
                    className="flex items-center gap-1 text-xs"
                  >
                    <Leaf className="w-3 h-3" />
                    Veg
                  </Badge>
                )}
                {item.isSpicy && (
                  <Badge
                    variant="warning"
                    className="flex items-center gap-1 text-xs"
                  >
                    <Flame className="w-3 h-3" />
                    Spicy
                  </Badge>
                )}
              </div>
            </div>

            {cartQuantity > 0 ? (
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) =>
                    onUpdateQuantity(item.id, cartQuantity - 1, e)
                  }
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold w-10 h-10 rounded-xl transition-all duration-200 flex items-center justify-center"
                >
                  <Minus className="w-4 h-4" />
                </motion.button>
                <motion.span
                  key={cartQuantity}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  className="text-gray-900 font-bold text-lg w-8 text-center"
                >
                  {cartQuantity}
                </motion.span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) =>
                    onUpdateQuantity(item.id, cartQuantity + 1, e)
                  }
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold w-10 h-10 rounded-xl transition-all duration-200 flex items-center justify-center shadow-md"
                >
                  <Plus className="w-4 h-4" />
                </motion.button>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => onAddToCart(item, e)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
              >
                <ShoppingBag className="w-4 h-4" />
                Add to Cart
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Grid view (default)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100 group flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <div className="relative h-56 overflow-hidden">
        <motion.img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover"
          animate={{ scale: isHovered ? 1.1 : 1 }}
          transition={{ duration: 0.4 }}
        />
        {hasDiscount && (
          <div className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
            {discountPercent}% OFF
          </div>
        )}
        {item.isMostLiked && (
          <div className="absolute top-3 right-3 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
            <Flame className="w-3.5 h-3.5" />
            Popular
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-orange-500 transition-colors line-clamp-1">
            {item.name}
          </h3>
        </div>

        <div className="flex items-center gap-3 mb-2">
          {item.rating && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-orange-500 text-orange-500" />
              <span className="text-sm font-medium text-gray-900">
                {item.rating}
              </span>
              <span className="text-xs text-gray-500">
                ({item.reviewCount})
              </span>
            </div>
          )}
          {item.prepTime && (
            <div className="flex items-center gap-1 text-gray-600">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs">{item.prepTime} min</span>
            </div>
          )}
        </div>

        <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-2 flex-1">
          {item.description}
        </p>

        <div className="flex items-center gap-2 mb-4">
          {item.isVegetarian && (
            <Badge
              variant="success"
              className="flex items-center gap-1 text-xs"
            >
              <Leaf className="w-3 h-3" />
              Veg
            </Badge>
          )}
          {item.isSpicy && (
            <Badge
              variant="warning"
              className="flex items-center gap-1 text-xs"
            >
              <Flame className="w-3 h-3" />
              Spicy
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-gray-900">
                BDT {item.price.toFixed(2)}
              </span>
            </div>
            {hasDiscount && (
              <span className="text-sm text-gray-400 line-through">
                BDT {item.originalPrice!.toFixed(2)}
              </span>
            )}
          </div>

          {cartQuantity > 0 ? (
            <div className="flex items-center gap-1">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => onUpdateQuantity(item.id, cartQuantity - 1, e)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold w-9 h-9 rounded-lg transition-all duration-200 flex items-center justify-center"
              >
                <Minus className="w-4 h-4" />
              </motion.button>
              <motion.span
                key={cartQuantity}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                className="text-gray-900 font-bold text-base w-7 text-center"
              >
                {cartQuantity}
              </motion.span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => onUpdateQuantity(item.id, cartQuantity + 1, e)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold w-9 h-9 rounded-lg transition-all duration-200 flex items-center justify-center shadow-md"
              >
                <Plus className="w-4 h-4" />
              </motion.button>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => onAddToCart(item, e)}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold w-10 h-10 rounded-xl transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg"
            >
              <Plus className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Cart Item Component
interface CartItemProps {
  item: CartItem;
  onUpdateQuantity: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
}

const CartItemComponent: React.FC<CartItemProps> = ({
  item,
  onUpdateQuantity,
}) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, x: -20 }}
    className="py-4 border-b border-gray-100 last:border-0"
  >
    <div className="flex gap-3">
      {/* Item Thumbnail */}
      <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Item Details */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2 mb-1">
          <h4 className="font-semibold text-gray-900 text-base leading-tight">
            {item.name}
          </h4>
          <motion.span
            key={item.price * item.quantity}
            initial={{ scale: 1.2, color: "#f97316" }}
            animate={{ scale: 1, color: "#111827" }}
            className="font-bold text-gray-900 text-base whitespace-nowrap"
          >
            BDT {(item.price * item.quantity).toFixed(2)}
          </motion.span>
        </div>

        {item.extras && item.extras.length > 0 && (
          <div className="flex items-center gap-1 mb-3">
            <span className="text-xs text-gray-500">Add-ons:</span>
            <span className="text-xs font-medium text-gray-700 bg-gray-50 px-2 py-0.5 rounded">
              {item.extras.join(", ")}
            </span>
          </div>
        )}

        {/* Quantity Controls */}
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
            className="w-11 h-11 flex items-center justify-center rounded-lg border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 hover:text-orange-600 transition-all duration-200 active:scale-95"
          >
            <Minus className="w-4 h-4" />
          </motion.button>
          <motion.span
            key={item.quantity}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="text-gray-900 font-semibold text-base w-8 text-center"
          >
            {item.quantity}
          </motion.span>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            className="w-11 h-11 flex items-center justify-center rounded-lg border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 hover:text-orange-600 transition-all duration-200 active:scale-95"
          >
            <Plus className="w-4 h-4" />
          </motion.button>
          <span className="text-sm text-gray-500 ml-2">
            BDT {item.price.toFixed(2)} each
          </span>
        </div>
      </div>
    </div>
  </motion.div>
);

// ============================================================================
// Main Component
// ============================================================================

const CategoriesPage: React.FC = () => {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string>("burger");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [showVegOnly, setShowVegOnly] = useState(false);

  // Initialize cart from sessionStorage (empty on new session)
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const savedCart = sessionStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        return JSON.parse(savedCart);
      }
    } catch (error) {
      console.error("Error loading cart from sessionStorage:", error);
    }
    return [];
  });
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Save cart to sessionStorage whenever it changes
  useEffect(() => {
    try {
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      console.error("Error saving cart to sessionStorage:", error);
    }
  }, [cart]);

  // Get filtered and sorted items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = menuItems.filter((item) => item.category === activeCategory);

    // Apply vegetarian filter
    if (showVegOnly) {
      filtered = filtered.filter((item) => item.isVegetarian);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "popular":
          return (b.reviewCount || 0) - (a.reviewCount || 0);
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        default:
          return 0;
      }
    });

    return sorted;
  }, [activeCategory, sortBy, showVegOnly]);

  // Cart calculations
  const cartCalculations = useMemo(() => {
    const subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const salesTax = subtotal * 0.05; // 5% tax
    const total = subtotal + salesTax;
    return { subtotal, salesTax, total };
  }, [cart]);

  // Handlers
  const handleAddToCart = (item: MenuItem, event: React.MouseEvent) => {
    event.stopPropagation();
    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => cartItem.id === item.id);
      if (existingItem) {
        return prevCart.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem,
        );
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });

    toast({
      title: "Added to cart",
      description: `${item.name} has been added to your cart.`,
    });
  };

  const handleUpdateQuantity = useCallback((id: number, quantity: number) => {
    if (quantity <= 0) {
      setCart((prevCart) => prevCart.filter((item) => item.id !== id));
    } else {
      setCart((prevCart) =>
        prevCart.map((item) => (item.id === id ? { ...item, quantity } : item)),
      );
    }
  }, []);

  // Handler for updating quantity from menu card (with event)
  const handleMenuCardQuantityUpdate = useCallback(
    (id: number, quantity: number, event: React.MouseEvent) => {
      event.stopPropagation();
      handleUpdateQuantity(id, quantity);
    },
    [handleUpdateQuantity],
  );

  // Helper to get quantity of an item in cart
  const getCartQuantity = useCallback(
    (itemId: number): number => {
      const cartItem = cart.find((item) => item.id === itemId);
      return cartItem ? cartItem.quantity : 0;
    },
    [cart],
  );

  const handleRemoveFromCart = (id: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  const handlePlaceOrder = () => {
    toast({
      title: "Order placed!",
      description: "Your order has been placed successfully.",
    });
  };

  return (
    <div className="min-h-screen pt-20">
      {/* Category Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-20 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center overflow-x-auto hide-scrollbar">
            {categories.map((category) => (
              <CategoryTab
                key={category.id}
                category={category}
                isActive={activeCategory === category.id}
                onClick={() => setActiveCategory(category.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Menu Section */}
          <div className="flex-1">
            {/* Breadcrumb */}
            <Breadcrumb category={activeCategory} />

            {/* Header with Count and Filters */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 capitalize mb-1">
                  {activeCategory}
                </h1>
                <p className="text-gray-600">
                  {filteredAndSortedItems.length} items available
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Vegetarian Filter */}
                <button
                  onClick={() => setShowVegOnly(!showVegOnly)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all duration-200 ${
                    showVegOnly
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                  }`}
                >
                  <Leaf className="w-4 h-4" />
                  <span className="text-sm font-medium">Vegetarian</span>
                </button>

                {/* Sort Dropdown */}
                <div className="relative group">
                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all duration-200 text-gray-700">
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {sortBy === "popular" && "Popular"}
                      {sortBy === "price-low" && "Price: Low to High"}
                      {sortBy === "price-high" && "Price: High to Low"}
                      {sortBy === "rating" && "Highest Rated"}
                    </span>
                    <ChevronRight className="w-4 h-4 transform -rotate-90" />
                  </button>
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-2">
                      <button
                        onClick={() => setSortBy("popular")}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                          sortBy === "popular"
                            ? "text-orange-500 font-medium"
                            : "text-gray-700"
                        }`}
                      >
                        Most Popular
                      </button>
                      <button
                        onClick={() => setSortBy("rating")}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                          sortBy === "rating"
                            ? "text-orange-500 font-medium"
                            : "text-gray-700"
                        }`}
                      >
                        Highest Rated
                      </button>
                      <button
                        onClick={() => setSortBy("price-low")}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                          sortBy === "price-low"
                            ? "text-orange-500 font-medium"
                            : "text-gray-700"
                        }`}
                      >
                        Price: Low to High
                      </button>
                      <button
                        onClick={() => setSortBy("price-high")}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                          sortBy === "price-high"
                            ? "text-orange-500 font-medium"
                            : "text-gray-700"
                        }`}
                      >
                        Price: High to Low
                      </button>
                    </div>
                  </div>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      viewMode === "grid"
                        ? "bg-white shadow-sm text-orange-500"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Grid3x3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      viewMode === "list"
                        ? "bg-white shadow-sm text-orange-500"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Items Grid/List */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeCategory}-${viewMode}-${sortBy}-${showVegOnly}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6"
                    : "flex flex-col gap-4"
                }
              >
                {filteredAndSortedItems.length > 0 ? (
                  filteredAndSortedItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <MenuItemCard
                        item={item}
                        onAddToCart={handleAddToCart}
                        onUpdateQuantity={handleMenuCardQuantityUpdate}
                        viewMode={viewMode}
                        cartQuantity={getCartQuantity(item.id)}
                      />
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-16">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                      <Leaf className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No items found
                    </h3>
                    <p className="text-gray-600">
                      Try adjusting your filters to see more options
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Order Sidebar - Desktop */}
          <div className="hidden lg:block w-96">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden sticky top-36">
              {/* Delivery Info */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-5 border-b-2 border-orange-100">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Delivery Details
                </h3>
                <div className="flex items-start gap-3 bg-white rounded-xl p-4 shadow-sm">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-base mb-1">
                      Pickup at
                    </p>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      House 42, Road 7, Dhanmondi, Dhaka
                    </p>
                    <button className="text-orange-600 text-sm font-semibold hover:text-orange-700 transition-colors mt-2 flex items-center gap-1 group">
                      <span>Change Location</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="p-6">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                  Order Summary
                </h3>

                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <ShoppingBag className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">
                      Your cart is empty
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      Add items to get started
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Cart Items */}
                    <div className="max-h-80 overflow-y-auto -mx-2 px-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      <AnimatePresence>
                        {cart.map((item) => (
                          <CartItemComponent
                            key={item.id}
                            item={item}
                            onUpdateQuantity={handleUpdateQuantity}
                            onRemove={handleRemoveFromCart}
                          />
                        ))}
                      </AnimatePresence>
                    </div>

                    {/* Pricing Breakdown */}
                    <div className="mt-6 pt-5 border-t-2 border-gray-100 space-y-3">
                      <div className="flex justify-between items-center text-gray-700">
                        <span className="text-sm">Subtotal</span>
                        <span className="font-semibold text-base">
                          BDT {cartCalculations.subtotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-gray-700">
                        <span className="text-sm flex items-center gap-1">
                          Sales Tax
                          <span className="text-xs text-gray-500">(5%)</span>
                        </span>
                        <span className="font-semibold text-base">
                          BDT {cartCalculations.salesTax.toFixed(2)}
                        </span>
                      </div>

                      {/* Total - Highlighted */}
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 -mx-2 px-4 py-4 rounded-xl mt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-base font-semibold text-gray-700">
                            Total Amount
                          </span>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">
                              BDT {cartCalculations.total.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {cart.reduce(
                                (sum, item) => sum + item.quantity,
                                0,
                              )}{" "}
                              items
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Place Order Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handlePlaceOrder}
                      className="w-full mt-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-between shadow-lg hover:shadow-xl group"
                    >
                      <span className="text-lg">Place Order</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Cart Button */}
      <div className="lg:hidden fixed bottom-6 left-4 right-4 z-50">
        <button
          onClick={() => setIsMobileCartOpen(true)}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 px-6 rounded-xl shadow-lg flex items-center justify-between"
        >
          <span className="flex items-center gap-3">
            <span className="bg-white/20 rounded-lg px-2 py-1 text-sm">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} items
            </span>
            <span>View Cart</span>
          </span>
          <span>BDT {cartCalculations.total.toFixed(2)}</span>
        </button>
      </div>

      {/* Mobile Cart Drawer */}
      <AnimatePresence>
        {isMobileCartOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileCartOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 z-50"
            />

            {/* Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="lg:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-h-[85vh] flex flex-col shadow-2xl"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="px-6 pb-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-5 sticky top-0 bg-white pt-2 pb-4 -mt-2 z-10">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        Your Order
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {cart.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                        items
                      </p>
                    </div>
                    <button
                      onClick={() => setIsMobileCartOpen(false)}
                      className="p-2.5 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Delivery Info */}
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 mb-5 border border-orange-100">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-base mb-1">
                          Pickup at
                        </p>
                        <p className="text-gray-600 text-sm leading-relaxed">
                          House 42, Road 7, Dhanmondi, Dhaka
                        </p>
                        <button className="text-orange-600 text-sm font-semibold hover:text-orange-700 transition-colors mt-2 flex items-center gap-1 active:scale-95">
                          <span>Change Location</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Cart Items */}
                  {cart.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <ShoppingBag className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium">
                        Your cart is empty
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        Add items to get started
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <AnimatePresence>
                          {cart.map((item) => (
                            <CartItemComponent
                              key={item.id}
                              item={item}
                              onUpdateQuantity={handleUpdateQuantity}
                              onRemove={handleRemoveFromCart}
                            />
                          ))}
                        </AnimatePresence>
                      </div>

                      {/* Pricing Breakdown */}
                      <div className="mt-6 pt-5 border-t-2 border-gray-100 space-y-3">
                        <div className="flex justify-between items-center text-gray-700">
                          <span className="text-sm">Subtotal</span>
                          <span className="font-semibold text-base">
                            BDT {cartCalculations.subtotal.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-gray-700">
                          <span className="text-sm flex items-center gap-1">
                            Sales Tax
                            <span className="text-xs text-gray-500">(5%)</span>
                          </span>
                          <span className="font-semibold text-base">
                            BDT {cartCalculations.salesTax.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Sticky Footer with Total and CTA */}
              {cart.length > 0 && (
                <div className="flex-shrink-0 border-t-2 border-gray-100 bg-white px-6 py-4">
                  {/* Total */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-4 rounded-xl mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-semibold text-gray-700">
                        Total Amount
                      </span>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          BDT {cartCalculations.total.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {cart.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                          items
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Place Order Button */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePlaceOrder}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-between shadow-lg active:shadow-md group"
                  >
                    <span className="text-lg">Place Order</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Custom Scrollbar Hide Style */}
      <style>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default CategoriesPage;
