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
import FoodItemCard from "@/components/ui/FoodItemCard";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import apiService from "@/services/apiService";
import menuService from "@/services/menuService";
import orderService from "@/services/orderService";
import reviewService from "@/services/reviewService";
import type { MenuCategory, MenuItem } from "@/types/menu";
import type { Order } from "@/types/order";
import { cn } from "@/utils/cn";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bike,
  Clock,
  Loader2,
  MapPin,
  Phone,
  Search,
  ShoppingBag,
  Star,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const slugify = (value: string): string =>
  `menu-${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;

const formatTaka = (amount: number): string => `৳${Math.round(amount)}`;

const RestaurantDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { addItem, items: cartItems, updateQuantity } = useCart();
  const isCustomer = user?.role === "customer";

  const [restaurant, setRestaurant] = useState<ApiRestaurant | null>(null);
  const [resolvedRestaurantId, setResolvedRestaurantId] = useState<
    string | null
  >(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [menuQuery, setMenuQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewTotalPages, setReviewTotalPages] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [eligibleOrders, setEligibleOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  // Apply in-menu search across categories
  const filteredMenu = useMemo(() => {
    const query = menuQuery.trim().toLowerCase();
    if (!query) return groupedMenu;
    const result: Record<string, MenuItem[]> = {};
    for (const [category, items] of Object.entries(groupedMenu)) {
      const matches = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query),
      );
      if (matches.length > 0) result[category] = matches;
    }
    return result;
  }, [groupedMenu, menuQuery]);

  const categoryNames = useMemo(() => Object.keys(filteredMenu), [filteredMenu]);

  // Scrollspy: highlight the menu category currently in view
  useEffect(() => {
    if (categoryNames.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveCategory(visible.target.id);
      },
      { rootMargin: "-160px 0px -65% 0px", threshold: [0, 0.25, 0.5] },
    );
    categoryNames.forEach((name) => {
      const node = sectionRefs.current[slugify(name)];
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, [categoryNames]);

  const scrollToCategory = useCallback((name: string) => {
    const node = sectionRefs.current[slugify(name)];
    if (node) {
      const top = node.getBoundingClientRect().top + window.scrollY - 150;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }, []);

  const getItemQuantity = useCallback(
    (menuItemId: string): number => {
      const found = cartItems.find((i) => i.menuItemId === menuItemId);
      return found?.quantity || 0;
    },
    [cartItems],
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

      await addItem(restaurant._id, restaurant.name, cartItem);
      toast({
        title: "Added to cart",
        description: `${item.name} has been added to your cart.`,
      });
    },
    [addItem, restaurant, toast],
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

  // Cart summary scoped to this restaurant
  const restaurantCart = useMemo(() => {
    if (!restaurant) return { items: [], count: 0, subtotal: 0 };
    const items = cartItems.filter((i) => i.restaurantId === restaurant._id);
    const count = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return { items, count, subtotal };
  }, [cartItems, restaurant]);

  if (isLoading) {
    return (
      <div className="min-h-screen px-4 pt-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 h-72 animate-pulse rounded-3xl bg-gray-100" />
          <div className="mb-3 h-8 w-64 animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-96 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  if (errorMessage || !restaurant) {
    return (
      <div className="min-h-screen px-4 pt-24">
        <div className="mx-auto max-w-2xl">
          <Card className="p-8 text-center">
            <p className="mb-2 text-lg font-semibold text-gray-900">
              Unable to load restaurant
            </p>
            <p className="mb-6 text-sm text-gray-600">
              {errorMessage || "Restaurant not found."}
            </p>
            <Button asChild variant="brand">
              <Link to="/restaurants">Browse restaurants</Link>
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const ratingAvg = restaurant.rating?.average || 0;
  const ratingCount = restaurant.rating?.count || 0;
  const menuIsEmpty = categoryNames.length === 0;

  return (
    <div className="min-h-screen bg-gray-50/60 pb-28 lg:pb-10">
      {/* ── Cover hero ───────────────────────────────────────────── */}
      <section className="relative h-72 w-full overflow-hidden sm:h-96">
        <img
          src={
            restaurant.images?.coverPhoto ||
            "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80"
          }
          alt={restaurant.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-24 inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-gray-800 shadow-sm backdrop-blur transition hover:bg-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-6xl px-4 pb-6 text-white">
            <div className="flex items-end gap-4">
              {restaurant.images?.logo && (
                <img
                  src={restaurant.images.logo}
                  alt=""
                  className="hidden h-20 w-20 rounded-2xl border-4 border-white object-cover shadow-lg sm:block"
                />
              )}
              <div className="min-w-0">
                {restaurant.cuisineType?.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {restaurant.cuisineType.slice(0, 3).map((cuisine) => (
                      <span
                        key={cuisine}
                        className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium capitalize backdrop-blur"
                      >
                        {cuisine}
                      </span>
                    ))}
                  </div>
                )}
                <h1 className="text-3xl font-bold sm:text-4xl">{restaurant.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <Star className="h-4 w-4 fill-yellow-300 text-yellow-300" />
                    {ratingAvg.toFixed(1)}
                    <span className="text-white/70">({ratingCount})</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {formatDeliveryTime(restaurant.deliveryTime)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Bike className="h-4 w-4" />
                    {restaurant.deliveryFee
                      ? `${formatTaka(restaurant.deliveryFee)} delivery`
                      : "Free delivery"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Sticky category nav ──────────────────────────────────── */}
      {!menuIsEmpty && (
        <div className="sticky top-20 z-30 border-b border-gray-100 bg-white/90 backdrop-blur-md">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex items-center gap-2 overflow-x-auto py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categoryNames.map((name) => (
                <button
                  key={name}
                  onClick={() => scrollToCategory(name)}
                  className={cn(
                    "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                    activeCategory === slugify(name)
                      ? "bg-brand-500 text-white"
                      : "text-gray-600 hover:bg-gray-100",
                  )}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 pt-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ── Main column ──────────────────────────────────────── */}
          <div className="space-y-6 lg:col-span-2">
            {/* About */}
            <Card className="p-5">
              <h2 className="mb-2 text-lg font-semibold text-gray-900">About</h2>
              <p className="text-sm leading-relaxed text-gray-700">
                {restaurant.description}
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-600 sm:grid-cols-2">
                <p className="inline-flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-brand-500" />
                  <span>
                    {restaurant.address.street}, {restaurant.address.city},{" "}
                    {restaurant.address.state}
                  </span>
                </p>
                <p className="inline-flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4 text-brand-500" />
                  <span>{restaurant.contactInfo.phone}</span>
                </p>
              </div>
            </Card>

            {/* Menu */}
            <Card className="p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <UtensilsCrossed className="h-5 w-5 text-brand-500" />
                  Menu
                </h2>
                {Object.keys(groupedMenu).length > 0 && (
                  <div className="relative w-full sm:w-64">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      value={menuQuery}
                      onChange={(e) => setMenuQuery(e.target.value)}
                      placeholder="Search the menu"
                      className="h-10 rounded-full pl-9"
                    />
                  </div>
                )}
              </div>

              {Object.keys(groupedMenu).length === 0 ? (
                <p className="text-sm text-gray-600">
                  No menu items available yet for this restaurant.
                </p>
              ) : menuIsEmpty ? (
                <p className="text-sm text-gray-600">
                  No items match “{menuQuery}”.
                </p>
              ) : (
                <div className="space-y-8">
                  {categoryNames.map((categoryName) => (
                    <div
                      key={categoryName}
                      id={slugify(categoryName)}
                      ref={(node) => {
                        sectionRefs.current[slugify(categoryName)] = node;
                      }}
                      className="scroll-mt-40"
                    >
                      <h3 className="mb-3 text-base font-semibold text-gray-900">
                        {categoryName}
                        <span className="ml-2 text-sm font-normal text-gray-400">
                          {filteredMenu[categoryName].length}
                        </span>
                      </h3>
                      <div className="space-y-3">
                        {filteredMenu[categoryName].map((item) => (
                          <FoodItemCard
                            key={item._id}
                            variant="list"
                            item={{
                              id: item._id,
                              name: item.name,
                              description: item.description,
                              price: item.price,
                              originalPrice: item.originalPrice,
                              image: item.image,
                              isAvailable: item.isAvailable,
                              dietaryTags: item.dietaryTags,
                              prepTimeMinutes: item.preparationTime,
                              isPopular: item.isPopular,
                              isFeatured: item.isFeatured,
                            }}
                            cartQuantity={getItemQuantity(item._id)}
                            onClick={() =>
                              navigate(`/menu/${restaurant._id}/${item._id}`)
                            }
                            onAddToCart={() => handleAddToCart(item)}
                            onUpdateQuantity={(_, qty) => {
                              const cartItem = cartItems.find(
                                (i) => i.menuItemId === item._id,
                              );
                              updateQuantity(cartItem?.itemKey || item._id, qty);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Reviews */}
            <Card className="p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Reviews</h2>
                  <p className="text-sm text-gray-500">
                    Recent feedback from customers
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold text-gray-900">
                    {ratingAvg.toFixed(1)}
                  </span>
                  <span>({ratingCount || reviews.length} reviews)</span>
                </div>
              </div>

              {reviewsLoading && reviews.length === 0 ? (
                <div className="space-y-4">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div
                      key={index}
                      className="animate-pulse rounded-xl border border-gray-100 p-4"
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-100" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-32 rounded bg-gray-100" />
                          <div className="h-3 w-24 rounded bg-gray-100" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-full rounded bg-gray-100" />
                        <div className="h-3 w-5/6 rounded bg-gray-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : reviewsError ? (
                <div className="rounded-xl border border-dashed border-red-200 bg-red-50/30 px-4 py-3 text-sm text-red-600">
                  {reviewsError}
                </div>
              ) : reviews.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-6 text-center text-sm text-gray-600">
                  No reviews yet. Be the first to share your experience.
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => {
                    const customerName = getReviewCustomerName(review.customerId);
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
                              className="h-10 w-10 rounded-full object-cover"
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
                                className={cn(
                                  "h-4 w-4",
                                  idx < review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-200",
                                )}
                              />
                            ))}
                          </div>
                        </div>

                        {review.title && (
                          <p className="mt-3 text-sm font-semibold text-gray-800">
                            {review.title}
                          </p>
                        )}
                        <p className="mt-2 text-sm leading-relaxed text-gray-700">
                          {review.comment}
                        </p>

                        {review.reply?.text && (
                          <div className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900">
                            <p className="text-xs font-semibold text-brand-600">
                              Restaurant reply
                            </p>
                            <p className="mt-1">{review.reply.text}</p>
                            {review.reply.repliedAt && (
                              <p className="mt-1 text-xs text-brand-600">
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
                <h3 className="mb-3 text-base font-semibold text-gray-900">
                  Write a review
                </h3>

                {!isAuthenticated ? (
                  <div className="flex flex-col gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-4 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                    <span>Log in to leave a review.</span>
                    <Button asChild variant="brand">
                      <Link to="/login">Log in</Link>
                    </Button>
                  </div>
                ) : !isCustomer ? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-4 text-sm text-gray-600">
                    Only customers can leave reviews.
                  </div>
                ) : ordersLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading your delivered orders...
                  </div>
                ) : ordersError ? (
                  <div className="rounded-xl border border-dashed border-red-200 bg-red-50/30 px-4 py-3 text-sm text-red-600">
                    {ordersError}
                  </div>
                ) : eligibleOrders.length === 0 ? (
                  <div className="flex flex-col gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-4 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
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
                                  <SelectItem key={order._id} value={order._id}>
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
                                      onClick={() => field.onChange(starValue)}
                                      className="p-1"
                                      aria-label={`Rate ${starValue} stars`}
                                    >
                                      <Star
                                        className={cn(
                                          "h-6 w-6",
                                          starValue <= (field.value || 0)
                                            ? "fill-yellow-400 text-yellow-400"
                                            : "text-gray-200",
                                        )}
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
                                className="resize-none rounded-xl"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-center gap-3">
                        <Button
                          type="submit"
                          variant="brand"
                          disabled={reviewSubmitting}
                        >
                          {reviewSubmitting && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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

          {/* ── Sidebar: order summary + delivery info ───────────── */}
          <aside className="lg:col-span-1">
            <div className="sticky top-28 space-y-4">
              <Card className="overflow-hidden p-0">
                <div className="border-b border-gray-100 p-5">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <ShoppingBag className="h-5 w-5 text-brand-500" />
                    Your order
                  </h2>
                </div>
                {restaurantCart.count === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-500">
                    Your cart is empty. Add items from the menu to get started.
                  </div>
                ) : (
                  <div className="p-5">
                    <ul className="mb-4 space-y-3">
                      {restaurantCart.items.map((item) => (
                        <li
                          key={item.itemKey || item.menuItemId}
                          className="flex items-start justify-between gap-3 text-sm"
                        >
                          <span className="text-gray-700">
                            <span className="font-medium text-brand-600">
                              {item.quantity}×
                            </span>{" "}
                            {item.name}
                          </span>
                          <span className="shrink-0 font-medium text-gray-900">
                            {formatTaka(item.price * item.quantity)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-semibold text-gray-900">
                        {formatTaka(restaurantCart.subtotal)}
                      </span>
                    </div>
                    <Button
                      asChild
                      variant="brand"
                      size="lg"
                      className="mt-4 w-full"
                    >
                      <Link to="/cart">
                        View cart · {formatTaka(restaurantCart.subtotal)}
                      </Link>
                    </Button>
                  </div>
                )}
              </Card>

              <Card className="p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Delivery info
                </h2>
                <div className="space-y-2.5 text-sm text-gray-700">
                  <p className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-gray-500">
                      <Bike className="h-4 w-4" /> Delivery fee
                    </span>
                    <span className="font-medium">
                      {formatTaka(restaurant.deliveryFee || 0)}
                    </span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-gray-500">
                      <Wallet className="h-4 w-4" /> Minimum order
                    </span>
                    <span className="font-medium">
                      {formatTaka(restaurant.minimumOrder || 0)}
                    </span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-gray-500">
                      <Clock className="h-4 w-4" /> Estimated time
                    </span>
                    <span className="font-medium">
                      {formatDeliveryTime(restaurant.deliveryTime)}
                    </span>
                  </p>
                </div>
              </Card>
            </div>
          </aside>
        </div>
      </div>

      {/* ── Mobile sticky cart bar ───────────────────────────────── */}
      {restaurantCart.count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] lg:hidden">
          <Button asChild variant="brand" size="lg" className="w-full justify-between">
            <Link to="/cart">
              <span className="inline-flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                {restaurantCart.count}{" "}
                {restaurantCart.count === 1 ? "item" : "items"}
              </span>
              <span>View cart · {formatTaka(restaurantCart.subtotal)}</span>
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default RestaurantDetailsPage;
