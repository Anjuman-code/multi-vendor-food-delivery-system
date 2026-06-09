import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import FoodItemCard from "@/components/ui/FoodItemCard";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useToast } from "@/hooks/use-toast";
import apiService from "@/services/apiService";
import menuService from "@/services/menuService";
import orderService from "@/services/orderService";
import reviewService from "@/services/reviewService";
import type { MenuCategory, MenuItem } from "@/types/menu";
import type { Order } from "@/types/order";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  Clock,
  Loader2,
  MapPin,
  Phone,
  Star,
  UtensilsCrossed,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";

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
  deliveryTime?: string | { min: number; max: number };
  deliveryFee?: number;
  minimumOrder?: number;
};

type ApiReviewCustomer = {
  _id: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
};

type ApiReview = {
  _id: string;
  rating: number;
  title?: string;
  comment: string;
  createdAt: string;
  reply?: { text: string; repliedAt: string };
  customerId: string | ApiReviewCustomer;
};

const reviewSchema = z.object({
  orderId: z.string().min(1, "Select an order"),
  rating: z.number().min(1, "Select a rating").max(5),
  title: z
    .string()
    .trim()
    .max(100, "Title must be 100 characters or less")
    .optional(),
  comment: z
    .string()
    .trim()
    .min(10, "Comment must be at least 10 characters")
    .max(1000, "Comment must be 1000 characters or less"),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

function formatDeliveryTime(
  deliveryTime?: string | { min: number; max: number },
): string {
  if (!deliveryTime) return "30-45 min";
  if (typeof deliveryTime === "object")
    return `${deliveryTime.min}-${deliveryTime.max} min`;
  return deliveryTime;
}

const REVIEW_PAGE_SIZE = 4;

const formatReviewDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const getReviewCustomerName = (customer: ApiReview["customerId"]): string => {
  if (typeof customer === "object" && customer) {
    const fullName = `${customer.firstName} ${customer.lastName}`.trim();
    return fullName || "Verified customer";
  }
  return "Verified customer";
};

const getReviewAvatar = (
  customer: ApiReview["customerId"],
  fallbackName: string,
): string => {
  if (typeof customer === "object" && customer?.profileImage) {
    return customer.profileImage;
  }
  const safeName = encodeURIComponent(fallbackName || "Customer");
  return `https://ui-avatars.com/api/?name=${safeName}&background=f97316&color=ffffff`;
};

const getOrderRestaurantId = (order: Order): string =>
  typeof order.restaurantId === "string"
    ? order.restaurantId
    : order.restaurantId._id;

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const RestaurantDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { addItem, clearCart, items, updateQuantity } = useCart();
  const isCustomer = user?.role === "customer";

  const [restaurant, setRestaurant] = useState<ApiRestaurant | null>(null);
  const [resolvedRestaurantId, setResolvedRestaurantId] = useState<
    string | null
  >(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewTotalPages, setReviewTotalPages] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [eligibleOrders, setEligibleOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const reviewForm = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      orderId: "",
      rating: 0,
      title: "",
      comment: "",
    },
    mode: "onTouched",
  });
  const ratingValue = reviewForm.watch("rating");

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
      setResolvedRestaurantId(resolvedId);

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

  const loadReviews = useCallback(
    async (page = 1, replace = false) => {
      if (!resolvedRestaurantId) return;
      setReviewsLoading(true);
      setReviewsError(null);

      const response = await reviewService.getRestaurantReviews(
        resolvedRestaurantId,
        page,
        REVIEW_PAGE_SIZE,
      );

      if (response.success && response.data) {
        const nextReviews = Array.isArray(response.data.reviews)
          ? response.data.reviews
          : [];
        const pagination = response.data.pagination;
        setReviewPage(pagination?.page || page);
        setReviewTotalPages(pagination?.pages || 1);
        setReviews((prev) =>
          replace ? nextReviews : [...prev, ...nextReviews],
        );
      } else {
        if (replace) setReviews([]);
        setReviewPage(1);
        setReviewTotalPages(1);
        setReviewsError(response.message || "Failed to load reviews.");
      }

      setReviewsLoading(false);
    },
    [resolvedRestaurantId],
  );

  const loadEligibleOrders = useCallback(async () => {
    if (!resolvedRestaurantId || !isAuthenticated || !isCustomer) return;

    setOrdersLoading(true);
    setOrdersError(null);

    const [ordersResponse, reviewsResponse] = await Promise.all([
      orderService.getOrders(1, 50, "delivered"),
      reviewService.getMyReviews(),
    ]);

    if (!ordersResponse.success || !ordersResponse.data) {
      setOrdersError(
        ordersResponse.message || "Failed to load delivered orders.",
      );
      setEligibleOrders([]);
      setOrdersLoading(false);
      return;
    }

    const deliveredOrders = Array.isArray(ordersResponse.data.orders)
      ? ordersResponse.data.orders
      : [];
    const matchingOrders = deliveredOrders.filter(
      (order) => getOrderRestaurantId(order) === resolvedRestaurantId,
    );
    const reviewedOrderIds = new Set<string>();

    if (reviewsResponse.success && reviewsResponse.data?.reviews) {
      for (const review of reviewsResponse.data.reviews) {
        if (review.orderId) reviewedOrderIds.add(review.orderId);
      }
    }

    const availableOrders = matchingOrders.filter(
      (order) => !reviewedOrderIds.has(order._id),
    );

    setEligibleOrders(availableOrders);
    reviewForm.setValue("orderId", availableOrders[0]?._id || "", {
      shouldValidate: true,
    });
    setOrdersLoading(false);
  }, [isAuthenticated, isCustomer, resolvedRestaurantId, reviewForm]);

  useEffect(() => {
    loadRestaurant();
  }, [loadRestaurant]);

  useEffect(() => {
    if (!resolvedRestaurantId) return;
    setReviews([]);
    setReviewPage(1);
    setReviewTotalPages(1);
    void loadReviews(1, true);
  }, [resolvedRestaurantId, loadReviews]);

  useEffect(() => {
    setEligibleOrders([]);
    reviewForm.reset({ orderId: "", rating: 0, title: "", comment: "" });
    void loadEligibleOrders();
  }, [loadEligibleOrders, reviewForm, resolvedRestaurantId]);

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
      const found = items.find((i) => i.menuItemId === menuItemId);
      return found?.quantity || 0;
    },
    [items],
  );

  const handleAddToCart = useCallback(
    async (item: MenuItem) => {
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

      const shouldReplace = await confirm({
        title: "Different restaurant",
        description:
          "Your cart has items from another restaurant. Clear cart and add this item?",
        confirmLabel: "Clear & add",
      });
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

  const handleReviewSubmit = useCallback(
    async (data: ReviewFormData) => {
      if (!resolvedRestaurantId) return;
      setReviewSubmitting(true);

      const payload = {
        orderId: data.orderId,
        rating: data.rating,
        title: data.title?.trim() || undefined,
        comment: data.comment.trim(),
      };

      const response = await reviewService.createReview(payload);

      if (response.success) {
        toast({
          title: "Review submitted",
          description: "Thanks for sharing your feedback.",
        });

        const remainingOrders = eligibleOrders.filter(
          (order) => order._id !== data.orderId,
        );
        setEligibleOrders(remainingOrders);
        reviewForm.reset({
          orderId: remainingOrders[0]?._id || "",
          rating: 0,
          title: "",
          comment: "",
        });
        void loadReviews(1, true);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to submit review.",
          variant: "destructive",
        });
      }

      setReviewSubmitting(false);
    },
    [eligibleOrders, loadReviews, resolvedRestaurantId, reviewForm, toast],
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
    <div className="pb-10">
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
                  {formatDeliveryTime(restaurant.deliveryTime)}
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
                              <FoodItemCard
                                key={item._id}
                                variant="list"
                                item={{
                                  id: item._id,
                                  name: item.name,
                                  description: item.description,
                                  price: item.price,
                                  image: item.image,
                                  isAvailable: true,
                                }}
                                cartQuantity={getItemQuantity(item._id)}
                                onClick={() =>
                                  restaurant &&
                                  navigate(
                                    `/menu/${restaurant._id}/${item._id}`,
                                  )
                                }
                                onAddToCart={() => handleAddToCart(item)}
                                onUpdateQuantity={(_, qty) =>
                                  updateQuantity(item._id, qty)
                                }
                              />
                            ))}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </Card>

              <Card className="p-5">
                <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Reviews
                    </h2>
                    <p className="text-sm text-gray-500">
                      Recent feedback from customers
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="font-semibold text-gray-900">
                      {(restaurant.rating?.average || 0).toFixed(1)}
                    </span>
                    <span>
                      ({restaurant.rating?.count ?? reviews.length} reviews)
                    </span>
                  </div>
                </div>

                {reviewsLoading && reviews.length === 0 ? (
                  <div className="space-y-4">
                    {Array.from({ length: 2 }).map((_, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-gray-100 p-4 animate-pulse"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-gray-100" />
                          <div className="space-y-2 flex-1">
                            <div className="h-3 w-32 bg-gray-100 rounded" />
                            <div className="h-3 w-24 bg-gray-100 rounded" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-3 w-full bg-gray-100 rounded" />
                          <div className="h-3 w-5/6 bg-gray-100 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : reviewsError ? (
                  <div className="rounded-xl border border-dashed border-red-200 bg-red-50/30 px-4 py-3 text-sm text-red-600">
                    {reviewsError}
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-6 text-sm text-gray-600 text-center">
                    No reviews yet. Be the first to share your experience.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => {
                      const customerName = getReviewCustomerName(
                        review.customerId,
                      );
                      const avatar = getReviewAvatar(
                        review.customerId,
                        customerName,
                      );

                      return (
                        <motion.div
                          key={review._id}
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.35 }}
                          className="rounded-xl border border-gray-100 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={avatar}
                                alt={customerName}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {customerName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatReviewDate(review.createdAt)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, idx) => (
                                <Star
                                  key={idx}
                                  className={`w-4 h-4 ${
                                    idx < review.rating
                                      ? "text-yellow-400 fill-yellow-400"
                                      : "text-gray-200"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>

                          {review.title && (
                            <p className="mt-3 text-sm font-semibold text-gray-800">
                              {review.title}
                            </p>
                          )}
                          <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                            {review.comment}
                          </p>

                          {review.reply?.text && (
                            <div className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-900">
                              <p className="text-xs font-semibold text-orange-600">
                                Restaurant reply
                              </p>
                              <p className="mt-1">{review.reply.text}</p>
                              {review.reply.repliedAt && (
                                <p className="text-xs text-orange-600 mt-1">
                                  {formatReviewDate(review.reply.repliedAt)}
                                </p>
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {reviewPage < reviewTotalPages && (
                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => loadReviews(reviewPage + 1)}
                      disabled={reviewsLoading}
                    >
                      {reviewsLoading ? "Loading..." : "Load more"}
                    </Button>
                  </div>
                )}

                <div className="mt-6 border-t border-gray-100 pt-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">
                    Write a review
                  </h3>

                  {!isAuthenticated ? (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-4 text-sm text-gray-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <span>Log in to leave a review.</span>
                      <Button
                        asChild
                        className="bg-orange-500 hover:bg-orange-600"
                      >
                        <Link to="/login">Log in</Link>
                      </Button>
                    </div>
                  ) : !isCustomer ? (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-4 text-sm text-gray-600">
                      Only customers can leave reviews.
                    </div>
                  ) : ordersLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading your delivered orders...
                    </div>
                  ) : ordersError ? (
                    <div className="rounded-xl border border-dashed border-red-200 bg-red-50/30 px-4 py-3 text-sm text-red-600">
                      {ordersError}
                    </div>
                  ) : eligibleOrders.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-4 text-sm text-gray-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <span>No delivered orders to review yet.</span>
                      <Button asChild variant="outline">
                        <Link to="/orders">View orders</Link>
                      </Button>
                    </div>
                  ) : (
                    <Form {...reviewForm}>
                      <form
                        onSubmit={reviewForm.handleSubmit(handleReviewSubmit)}
                        className="space-y-4"
                      >
                        <FormField
                          control={reviewForm.control}
                          name="orderId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Order</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder="Select an order" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {eligibleOrders.map((order) => (
                                    <SelectItem
                                      key={order._id}
                                      value={order._id}
                                    >
                                      #{order.orderNumber} ·{" "}
                                      {formatReviewDate(order.createdAt)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={reviewForm.control}
                          name="rating"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Rating</FormLabel>
                              <FormControl>
                                <div className="flex items-center gap-2">
                                  {Array.from({ length: 5 }).map((_, idx) => {
                                    const starValue = idx + 1;
                                    return (
                                      <button
                                        key={starValue}
                                        type="button"
                                        onClick={() =>
                                          field.onChange(starValue)
                                        }
                                        className="p-1"
                                        aria-label={`Rate ${starValue} stars`}
                                      >
                                        <Star
                                          className={`w-6 h-6 ${
                                            starValue <= (field.value || 0)
                                              ? "text-yellow-400 fill-yellow-400"
                                              : "text-gray-200"
                                          }`}
                                        />
                                      </button>
                                    );
                                  })}
                                  {ratingValue > 0 && (
                                    <span className="text-xs text-gray-500">
                                      {ratingValue} / 5
                                    </span>
                                  )}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={reviewForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title (optional)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Short summary"
                                  className="rounded-xl"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={reviewForm.control}
                          name="comment"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Comment</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  rows={4}
                                  placeholder="Share your experience"
                                  className="rounded-xl resize-none"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex items-center gap-3">
                          <Button
                            type="submit"
                            disabled={reviewSubmitting}
                            className="bg-orange-500 hover:bg-orange-600"
                          >
                            {reviewSubmitting && (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            Submit review
                          </Button>
                          <p className="text-xs text-gray-500">
                            Only delivered orders can be reviewed.
                          </p>
                        </div>
                      </form>
                    </Form>
                  )}
                </div>
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
                      {formatDeliveryTime(restaurant.deliveryTime)}
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
