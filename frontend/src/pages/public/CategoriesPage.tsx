import { Badge } from "@/components/ui/badge";
import FoodItemCard from "@/components/ui/FoodItemCard";
import { useCart } from "@/contexts/CartContext";
import type { CartItem } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  Grid3x3,
  Leaf,
  List,
  SlidersHorizontal,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import homeService, { MenuItemByCategory } from "@/services/homeService";
import type { TopCategory } from "@/types/home";

interface Category {
  id: string;
  name: string;
  isNew?: boolean;
}

type ViewMode = "grid" | "list";
type SortOption = "popular" | "price-low" | "price-high" | "rating";

const CategoryTab: React.FC<{
  category: Category;
  isActive: boolean;
  onClick: () => void;
}> = ({ category, isActive, onClick }) => (
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

const CategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const { addItem, items, updateQuantity, isRestaurantMismatch, clearCart } = useCart();
  const { toast } = useToast();

  const [activeCategory, setActiveCategory] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemByCategory[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [showVegOnly, setShowVegOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAdd, setPendingAdd] = useState<{
    restaurantId: string;
    restaurantName: string;
    cartItem: CartItem;
  } | null>(null);

  // Handle pending add after cart is cleared (restaurant switch)
  useEffect(() => {
    if (pendingAdd) {
      addItem(pendingAdd.restaurantId, pendingAdd.restaurantName, pendingAdd.cartItem);
      toast({
        title: "Cart updated",
        description: `${pendingAdd.cartItem.name} has been added to your cart.`,
      });
      setPendingAdd(null);
    }
  }, [pendingAdd, addItem, toast]);

  const getItemQuantity = useCallback(
    (menuItemId: string) => {
      const found = items.find((i) => i.menuItemId === menuItemId);
      return found?.quantity || 0;
    },
    [items],
  );

  const handleAddToCart = useCallback(
    (menuItem: MenuItemByCategory) => {
      const cartItem: CartItem = {
        menuItemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        image: menuItem.image,
        quantity: 1,
        variants: [],
        addons: [],
      };

      if (isRestaurantMismatch(menuItem.restaurantId)) {
        clearCart();
        setPendingAdd({
          restaurantId: menuItem.restaurantId,
          restaurantName: menuItem.restaurantName,
          cartItem,
        });
        return;
      }

      addItem(menuItem.restaurantId, menuItem.restaurantName, cartItem);
      toast({
        title: "Added to cart",
        description: `${menuItem.name} has been added to your cart.`,
      });
    },
    [addItem, isRestaurantMismatch, toast],
  );

  const handleUpdateQuantity = useCallback(
    (id: string | number, qty: number) => {
      updateQuantity(String(id), qty);
    },
    [updateQuantity],
  );

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await homeService.getTopCategories(20);
      if (response.success && response.data?.categories) {
        const cats = response.data.categories.map((c: TopCategory) => ({
          id: c.name.toLowerCase(),
          name: c.name,
        }));
        setCategories(cats);
        
        if (cats.length > 0) {
          setActiveCategory(cats[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  }, []);

  const loadMenuItems = useCallback(async (category: string) => {
    setIsLoading(true);
    try {
      const response = await homeService.getMenuItemsByCategory(category, 50, 0);
      if (response.success && response.data) {
        setMenuItems(response.data.items || []);
      } else {
        setMenuItems([]);
      }
    } catch (error) {
      console.error("Error loading menu items:", error);
      setMenuItems([]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (activeCategory) {
      loadMenuItems(activeCategory);
    }
  }, [activeCategory]);

  const filteredAndSortedItems = useMemo(() => {
    let filtered = menuItems;

    if (showVegOnly) {
      filtered = filtered.filter((item) =>
        item.dietaryTags.some((tag) => tag.toLowerCase() === "vegetarian")
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "popular":
          return (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0);
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
  }, [menuItems, sortBy, showVegOnly]);

  return (
    <div>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb category={activeCategory} />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              {categories.find(c => c.id === activeCategory)?.name || activeCategory}
            </h1>
            <p className="text-gray-600">
              {filteredAndSortedItems.length} items available
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
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
            {isLoading ? (
              <div className="col-span-full text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Loading...
                </h3>
              </div>
            ) : filteredAndSortedItems.length > 0 ? (
              filteredAndSortedItems.map((item, index) => (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <FoodItemCard
                    variant={viewMode === "list" ? "list" : "grid"}
                    item={{
                      id: item._id,
                      name: item.name,
                      description: item.description,
                      price: item.price,
                      originalPrice: item.originalPrice,
                      image: item.image || "",
                      isAvailable: item.isAvailable,
                      dietaryTags: item.dietaryTags,
                      prepTimeMinutes: item.preparationTime,
                      rating: item.rating,
                      reviewCount: item.reviewCount,
                      isPopular: item.isPopular,
                    }}
                    cartQuantity={getItemQuantity(item._id)}
                    onClick={() => navigate(`/menu/${item.restaurantId}/${item._id}`)}
                    onAddToCart={() => handleAddToCart(item)}
                    onUpdateQuantity={handleUpdateQuantity}
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