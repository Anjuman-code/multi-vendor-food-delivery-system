import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, MapPin, Phone, Star, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import apiService from "@/services/apiService";
import menuService from "@/services/menuService";
import type { MenuCategory, MenuItem } from "@/types/menu";

type ApiRestaurant = {
  _id: string;
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contactInfo: {
    phone: string;
    email: string;
    website?: string;
  };
  cuisineType: string[];
  images: {
    logo?: string;
    coverPhoto?: string;
    gallery?: string[];
  };
  rating?: {
    average?: number;
    count?: number;
  };
  deliveryTime?: string;
  deliveryFee?: number;
  minimumOrder?: number;
};

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const RestaurantDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { addItem, clearCart, items, updateQuantity } = useCart();

  const [restaurant, setRestaurant] = useState<ApiRestaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resolveRestaurantId = useCallback(async (): Promise<string | null> => {
    if (!id) return null;

    if (objectIdRegex.test(id)) {
      return id;
    }

    const asNumber = Number(id);
    if (!Number.isInteger(asNumber) || asNumber < 1) {
      return null;
    }

    try {
      const listResponse = await apiService.getAllRestaurants();
      const payload = listResponse.data as { data?: Array<{ _id: string }> };
      const list = Array.isArray(payload.data) ? payload.data : [];
      const selected = list[asNumber - 1];
      return selected?._id || null;
    } catch {
      return null;
    }
  }, [id]);

  const loadRestaurant = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const resolvedId = await resolveRestaurantId();
    if (!resolvedId) {
      setErrorMessage("Restaurant not found.");
      setIsLoading(false);
      return;
    }

    try {
      const [restaurantResponse, menuResponse] = await Promise.all([
        apiService.getRestaurantById(resolvedId),
        menuService.getMenu(resolvedId),
      ]);

      const restaurantPayload = restaurantResponse.data as {
        data?: ApiRestaurant;
      };

      if (!restaurantPayload?.data) {
        setErrorMessage("Restaurant not found.");
        setIsLoading(false);
        return;
      }

      setRestaurant(restaurantPayload.data);

      if (menuResponse.success && menuResponse.data) {
        setMenuCategories(menuResponse.data.categories || []);
        setMenuItems(menuResponse.data.items || []);
      } else {
        setMenuCategories([]);
        setMenuItems([]);
      }
    } catch {
      setErrorMessage("Failed to load restaurant details.");
    } finally {
      setIsLoading(false);
    }
  }, [resolveRestaurantId]);

  useEffect(() => {
    loadRestaurant();
  }, [loadRestaurant]);

  const groupedMenu = useMemo(() => {
    const categoryNameById = new Map<string, string>();
    for (const category of menuCategories) {
      categoryNameById.set(category._id, category.name);
    }

    const groups: Record<string, MenuItem[]> = {};
    for (const item of menuItems) {
      const key = item.categoryId
        ? categoryNameById.get(item.categoryId) || "Menu Items"
        : "Menu Items";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }

    return groups;
  }, [menuCategories, menuItems]);

  const getItemQuantity = useCallback(
    (menuItemId: string): number => {
      const found = items.find(
        (i) => i.menuItemId === menuItemId,
      );
      return found?.quantity || 0;
    },
    [items],
  );

  const handleAddToCart = useCallback(
    (item: MenuItem) => {
      if (!restaurant) return;

      const cartItem = {
        menuItemId: item._id,
        name: item.name,
        price: item.price,
        image: item.image,
        quantity: 1,
        variants: [],
        addons: [],
      };

      const added = addItem(restaurant._id, restaurant.name, cartItem);
      if (added) {
        toast({
          title: "Added to cart",
          description: `${item.name} has been added to your cart.`,
        });
        return;
      }

      const shouldReplace = window.confirm(
        "Your cart has items from another restaurant. Clear cart and add this item?",
      );
      if (!shouldReplace) return;

      clearCart();
      addItem(restaurant._id, restaurant.name, cartItem);
      toast({
        title: "Cart updated",
        description: `${item.name} has been added to your cart.`,
      });
    },
    [addItem, clearCart, restaurant, toast],
  );

  const handleIncreaseQuantity = useCallback(
    (item: MenuItem) => {
      const current = getItemQuantity(item._id);
      updateQuantity(item._id, current + 1);
    },
    [getItemQuantity, updateQuantity],
  );

  const handleDecreaseQuantity = useCallback(
    (item: MenuItem) => {
      const current = getItemQuantity(item._id);
      if (current <= 1) {
        updateQuantity(item._id, 0);
        return;
      }
      updateQuantity(item._id, current - 1);
    },
    [getItemQuantity, updateQuantity],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="h-64 rounded-2xl bg-gray-100 animate-pulse mb-6" />
          <div className="h-8 w-64 bg-gray-100 rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (errorMessage || !restaurant) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            <p className="text-lg font-semibold text-gray-900 mb-2">
              Unable to load restaurant
            </p>
            <p className="text-sm text-gray-600">
              {errorMessage || "Restaurant not found."}
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-20 pb-10">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="relative rounded-2xl overflow-hidden h-64 sm:h-80 mb-6">
            <img
              src={
                restaurant.images?.coverPhoto ||
                "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80"
              }
              alt={restaurant.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h1 className="text-2xl sm:text-3xl font-bold">
                {restaurant.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                <span className="inline-flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                  {(restaurant.rating?.average || 0).toFixed(1)} (
                  {restaurant.rating?.count || 0})
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {restaurant.deliveryTime || "30-45 min"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  About
                </h2>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {restaurant.description}
                </p>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
                  <p className="inline-flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-orange-500" />
                    <span>
                      {restaurant.address.street}, {restaurant.address.city},{" "}
                      {restaurant.address.state}
                    </span>
                  </p>
                  <p className="inline-flex items-start gap-2">
                    <Phone className="w-4 h-4 mt-0.5 text-orange-500" />
                    <span>{restaurant.contactInfo.phone}</span>
                  </p>
                </div>
              </Card>

              <Card className="p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 inline-flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-orange-500" />
                  Menu
                </h2>

                {Object.keys(groupedMenu).length === 0 ? (
                  <p className="text-sm text-gray-600">
                    No menu items available yet for this restaurant.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedMenu).map(
                      ([categoryName, items]) => (
                        <div key={categoryName}>
                          <h3 className="text-base font-semibold text-gray-900 mb-3">
                            {categoryName}
                          </h3>
                          <div className="space-y-3">
                            {items.map((item) => (
                              <div
                                key={item._id}
                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-gray-100 rounded-xl p-3"
                              >
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-900">
                                    {item.name}
                                  </p>
                                  <p className="text-sm text-gray-600 truncate">
                                    {item.description}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-orange-600 font-semibold">
                                    ৳{item.price}
                                  </span>
                                  {getItemQuantity(item._id) > 0 ? (
                                    <div className="flex items-center gap-1">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDecreaseQuantity(item)}
                                        className="w-8 h-8 p-0 border-orange-300 text-orange-600 hover:bg-orange-50"
                                      >
                                        −
                                      </Button>
                                      <span className="w-8 text-center font-medium text-sm">
                                        {getItemQuantity(item._id)}
                                      </span>
                                      <Button
                                        size="sm"
                                        onClick={() => handleIncreaseQuantity(item)}
                                        className="w-8 h-8 p-0 bg-orange-500 hover:bg-orange-600 text-white"
                                      >
                                        +
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => handleAddToCart(item)}
                                      className="bg-orange-500 hover:bg-orange-600 text-white"
                                    >
                                      Add to cart
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </Card>
            </div>

            <div>
              <Card className="p-5 sticky top-24">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Delivery Info
                </h2>
                <div className="space-y-2 text-sm text-gray-700">
                  <p className="flex items-center justify-between">
                    <span>Delivery fee</span>
                    <span className="font-medium">
                      ৳{restaurant.deliveryFee || 0}
                    </span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>Minimum order</span>
                    <span className="font-medium">
                      ৳{restaurant.minimumOrder || 0}
                    </span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>Estimated time</span>
                    <span className="font-medium">
                      {restaurant.deliveryTime || "30-45 min"}
                    </span>
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RestaurantDetailsPage;
