import React, { useState, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  MapPin,
  Clock,
  Phone,
  Globe,
  ChevronDown,
  ChevronUp,
  Heart,
  Share2,
  ThumbsUp,
  Flag,
  X,
  ChevronLeft,
  ChevronRight,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/utils/cn";
import { useToast } from "@/hooks/use-toast";
import BkashIcon from "@/assets/BKash-Icon2-Logo.wine.svg";
import NagadIcon from "@/assets/Nagad-Vertical-Logo.wine.svg";
import CashIcon from "@/assets/Cash_App-Logo.wine.svg";

// ============================================================================
// Types
// ============================================================================

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
}

interface Review {
  id: number;
  userName: string;
  userLocation: string;
  userAvatar: string;
  rating: number;
  date: string;
  comment: string;
  helpful: number;
  notHelpful: number;
}

interface RestaurantDetails {
  id: number;
  name: string;
  address: string;
  rating: number;
  reviewCount: number;
  cuisines: string[];
  priceLevel: number;
  description: string;
  heroImage: string;
  images: string[];
  coordinates: { lat: number; lng: number };
  openingHours: {
    weekdays: { open: string; close: string };
    weekends: { open: string; close: string };
  };
  contact: {
    phone: string;
    website: string;
  };
  paymentMethods: string[];
  bkashNumber?: string;
  nagadNumber?: string;
  menu: MenuItem[];
  reviews: Review[];
  recommendPercent: number;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockRestaurant: RestaurantDetails = {
  id: 1,
  name: "Wolfdon Restaurant",
  address: "Zindabazar, Sylhet 3100",
  rating: 4.5,
  reviewCount: 222,
  cuisines: ["Bangladeshi", "Indian", "Chinese"],
  priceLevel: 3,
  description: `Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.

Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.`,
  heroImage:
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80",
  images: [
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1579027989536-b7b1f875659b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1544025162-d76978e7b01c?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1567521464027-f127ff144326?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80",
  ],
  coordinates: { lat: 24.8949, lng: 91.8687 },
  openingHours: {
    weekdays: { open: "11:00 am", close: "10:00 pm" },
    weekends: { open: "11:00 am", close: "11:00 pm" },
  },
  contact: {
    phone: "+880 1712-345678",
    website: "www.wolfdonrest.com",
  },
  paymentMethods: ["bkash", "nagad", "cash"],
  bkashNumber: "+880 1712-345678",
  nagadNumber: "+880 1812-345678",
  menu: [
    {
      id: 1,
      name: "Smoked salmon",
      description: "Excepteur sint occaecat cupidatat",
      price: 10,
      category: "Lunch",
    },
    {
      id: 2,
      name: "Halloumi",
      description: "Aliquip ex ea commodo consequat dolor sit",
      price: 8.5,
      category: "Lunch",
    },
    {
      id: 3,
      name: "Beef tartar",
      description: "Et harum quidem rerum facilis est et expedita",
      price: 12,
      category: "Lunch",
    },
    {
      id: 4,
      name: "Parmesan-crusted salmon",
      description: "Quis autem vel eum iure reprehenderit",
      price: 15,
      category: "Lunch",
    },
    {
      id: 5,
      name: "Grilled ribeye steak",
      description: "Premium cut with herb butter",
      price: 28,
      category: "Dinner",
    },
    {
      id: 6,
      name: "Lobster linguine",
      description: "Fresh lobster with garlic cream sauce",
      price: 32,
      category: "Dinner",
    },
    {
      id: 7,
      name: "Tiramisu",
      description: "Classic Italian coffee-flavored dessert",
      price: 8,
      category: "Desserts",
    },
    {
      id: 8,
      name: "Chocolate fondant",
      description: "Warm chocolate cake with vanilla ice cream",
      price: 9,
      category: "Desserts",
    },
    {
      id: 9,
      name: "Chef's tasting menu",
      description: "5-course seasonal menu",
      price: 65,
      category: "Special Offers",
    },
  ],
  reviews: [
    {
      id: 1,
      userName: "Rahim",
      userLocation: "Sylhet, BD",
      userAvatar: "R",
      rating: 4.0,
      date: "2 Days ago",
      comment:
        "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, easque ipsa quae ab illo inventore veritatis et quasi.",
      helpful: 4,
      notHelpful: 1,
    },
    {
      id: 2,
      userName: "Ayesha",
      userLocation: "Dhaka, BD",
      userAvatar: "A",
      rating: 5.0,
      date: "1 Week ago",
      comment:
        "Absolutely amazing experience! The food was exquisite and the service was top-notch. Highly recommend the beef tartar.",
      helpful: 12,
      notHelpful: 0,
    },
    {
      id: 3,
      userName: "Mahir",
      userLocation: "Chittagong, BD",
      userAvatar: "M",
      rating: 4.5,
      date: "2 Weeks ago",
      comment:
        "Great Italian-American fusion. The smoked salmon was perfectly prepared. Will definitely come back!",
      helpful: 8,
      notHelpful: 2,
    },
  ],
  recommendPercent: 90,
};

// ============================================================================
// Helper Components
// ============================================================================

const StarRating: React.FC<{ rating: number; size?: "sm" | "md" | "lg" }> = ({
  rating,
  size = "md",
}) => {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            sizeClasses[size],
            star <= Math.floor(rating)
              ? "fill-yellow-400 text-yellow-400"
              : star - 0.5 <= rating
                ? "fill-yellow-400/50 text-yellow-400"
                : "fill-gray-200 text-gray-200",
          )}
        />
      ))}
    </div>
  );
};

// ============================================================================
// Section Components
// ============================================================================

const HeroSection: React.FC<{
  restaurant: RestaurantDetails;
  onReserve: (guests: number, date: string, time: string) => void;
}> = ({ restaurant, onReserve }) => {
  const [guests, setGuests] = useState("2");
  const [date, setDate] = useState("Today");
  const [time, setTime] = useState("7:00 pm");

  const handleReserve = () => {
    onReserve(parseInt(guests), date, time);
  };

  return (
    <section className="relative h-[400px] md:h-[500px]">
      {/* Hero Image */}
      <div className="absolute inset-0">
        <img
          src={restaurant.heroImage}
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
      </div>

      {/* Reservation Card */}
      <div className="absolute top-8 right-4 md:top-16 md:right-8 lg:right-16 z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-2xl p-6 w-[280px] md:w-[320px]"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Make Reservation
          </h3>

          <div className="space-y-4">
            {/* Guests */}
            <div>
              <label className="block text-sm text-gray-500 mb-1">People</label>
              <Select value={guests} onValueChange={setGuests}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select guests" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      For {num} {num === 1 ? "Person" : "People"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Date</label>
                <Select value={date} onValueChange={setDate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Today">Today</SelectItem>
                    <SelectItem value="Tomorrow">Tomorrow</SelectItem>
                    <SelectItem value="In 2 days">In 2 days</SelectItem>
                    <SelectItem value="In 3 days">In 3 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Time</label>
                <Select value={time} onValueChange={setTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Time" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "12:00 pm",
                      "12:30 pm",
                      "1:00 pm",
                      "1:30 pm",
                      "6:00 pm",
                      "6:30 pm",
                      "7:00 pm",
                      "7:30 pm",
                      "8:00 pm",
                      "8:30 pm",
                    ].map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleReserve}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium py-3 rounded-xl shadow-lg shadow-orange-500/25"
            >
              Reserve a table
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const InfoSection: React.FC<{
  restaurant: RestaurantDetails;
  isDescriptionExpanded: boolean;
  onToggleDescription: () => void;
}> = ({ restaurant, isDescriptionExpanded, onToggleDescription }) => {
  const [isFavorite, setIsFavorite] = useState(false);

  return (
    <section className="py-8 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        {/* Left: Restaurant Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {restaurant.name}
            </h1>
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label={
                isFavorite ? "Remove from favorites" : "Add to favorites"
              }
            >
              <Heart
                className={cn(
                  "w-6 h-6 transition-colors",
                  isFavorite
                    ? "fill-red-500 text-red-500"
                    : "text-gray-400 hover:text-red-500",
                )}
              />
            </button>
          </div>

          <p className="text-gray-500 mb-4 flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {restaurant.address}
          </p>

          {/* Rating and Cuisine */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <StarRating rating={restaurant.rating} />
              <span className="text-sm text-gray-500">
                ({restaurant.reviewCount})
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              {restaurant.cuisines.join(", ")}
            </div>
          </div>

          {/* Description */}
          <div className="mb-4">
            <p
              className={cn(
                "text-gray-600 leading-relaxed transition-all",
                !isDescriptionExpanded && "line-clamp-4",
              )}
            >
              {restaurant.description}
            </p>
            <button
              onClick={onToggleDescription}
              className="text-orange-500 hover:text-orange-600 font-medium mt-2 flex items-center gap-1"
            >
              {isDescriptionExpanded ? (
                <>
                  Read Less <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  Read More <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Share/Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="w-4 h-4" />
            Share
          </Button>
        </div>
      </div>
    </section>
  );
};

const MapSection: React.FC<{ restaurant: RestaurantDetails }> = ({
  restaurant,
}) => {
  return (
    <div>
      {/* Map */}
      <div className="rounded-2xl overflow-hidden shadow-lg h-[300px] bg-gray-100 mb-6">
        <iframe
          title="Restaurant Location"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${restaurant.coordinates.lng - 0.01},${restaurant.coordinates.lat - 0.01},${restaurant.coordinates.lng + 0.01},${restaurant.coordinates.lat + 0.01}&layer=mapnik&marker=${restaurant.coordinates.lat},${restaurant.coordinates.lng}`}
          className="w-full h-full border-0"
        />
      </div>

      {/* Details Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Opening Hours */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white rounded-xl p-5 shadow-md border border-gray-100"
        >
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-orange-500" />
            <h4 className="font-semibold text-gray-900">Opening Hours</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500">Mon - Fri:</span>
              <div className="text-orange-500 font-medium">
                {restaurant.openingHours.weekdays.open} -{" "}
                {restaurant.openingHours.weekdays.close}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Sat - Sun:</span>
              <div className="text-orange-500 font-medium">
                {restaurant.openingHours.weekends.open} -{" "}
                {restaurant.openingHours.weekends.close}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-5 shadow-md border border-gray-100"
        >
          <div className="flex items-center gap-2 mb-3">
            <Phone className="w-5 h-5 text-orange-500" />
            <h4 className="font-semibold text-gray-900">Contact</h4>
          </div>
          <div className="space-y-2 text-sm">
            <a
              href={`tel:${restaurant.contact.phone}`}
              className="text-gray-600 hover:text-orange-500 transition-colors block"
            >
              {restaurant.contact.phone}
            </a>
            <a
              href={`https://${restaurant.contact.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-1"
            >
              <Globe className="w-3 h-3" />
              {restaurant.contact.website}
            </a>
          </div>
        </motion.div>

        {/* Payment Options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-5 shadow-md border border-gray-100"
        >
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-5 h-5 text-orange-500" />
            <h4 className="font-semibold text-gray-900">Payment Options</h4>
          </div>
          <div className="flex items-center gap-3">
            {restaurant.paymentMethods.includes("bkash") && (
              <div className="w-12 h-12 flex items-center justify-center">
                <img
                  src={BkashIcon}
                  alt="bKash"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            {restaurant.paymentMethods.includes("nagad") && (
              <div className="w-12 h-12 flex items-center justify-center">
                <img
                  src={NagadIcon}
                  alt="Nagad"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            {restaurant.paymentMethods.includes("cash") && (
              <div className="w-12 h-12 flex items-center justify-center">
                <img
                  src={CashIcon}
                  alt="Cash"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            {restaurant.paymentMethods.includes("mastercard") && (
              <div className="w-12 h-8 bg-gray-100 rounded flex items-center justify-center">
                <span className="text-xs font-bold text-orange-600">MC</span>
              </div>
            )}
            {restaurant.paymentMethods.includes("visa") && (
              <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-xs font-bold text-white">VISA</span>
              </div>
            )}
            {restaurant.paymentMethods.includes("amex") && (
              <div className="w-12 h-8 bg-blue-800 rounded flex items-center justify-center">
                <span className="text-xs font-bold text-white">AMEX</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const PhotoGallerySection: React.FC<{
  images: string[];
  onViewAll: () => void;
}> = ({ images, onViewAll }) => {
  const displayImages = images.slice(0, 3);

  return (
    <div className="mb-8">
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        <span className="text-orange-500">{images.length}</span> Photos
      </h3>

      <div className="grid grid-cols-3 gap-3">
        {displayImages.map((image, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="aspect-square rounded-xl overflow-hidden shadow-md cursor-pointer hover:shadow-lg transition-shadow"
            onClick={onViewAll}
          >
            <img
              src={image}
              alt={`Restaurant photo ${index + 1}`}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </motion.div>
        ))}
      </div>

      <div className="mt-4">
        <Button
          onClick={onViewAll}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-full px-8"
        >
          View more photos
        </Button>
      </div>
    </div>
  );
};

const MenuSection: React.FC<{ menu: MenuItem[] }> = ({ menu }) => {
  const [activeCategory, setActiveCategory] = useState("Lunch");

  const categories = useMemo(() => {
    const cats = [...new Set(menu.map((item) => item.category))];
    return cats;
  }, [menu]);

  const filteredMenu = useMemo(() => {
    return menu.filter((item) => item.category === activeCategory);
  }, [menu, activeCategory]);

  return (
    <div className="mb-8">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Menu</h3>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              activeCategory === category
                ? "bg-orange-500 text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            )}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Menu Items */}
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        <AnimatePresence mode="wait">
          {filteredMenu.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0"
            >
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{item.name}</h4>
                <p className="text-sm text-gray-500 mt-1">{item.description}</p>
              </div>
              <span className="text-orange-500 font-bold ml-4">
                ৳{item.price * 10}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-6">
        <Button className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-full px-8">
          View full menu
        </Button>
      </div>
    </div>
  );
};

const ReviewsSection: React.FC<{
  reviews: Review[];
  totalReviews: number;
  averageRating: number;
  recommendPercent: number;
}> = ({ reviews, totalReviews, averageRating, recommendPercent }) => {
  const [sortBy, setSortBy] = useState("newest");

  // Calculate rating distribution (mock data)
  const ratingDistribution = useMemo(() => {
    return {
      5: 65,
      4: 20,
      3: 10,
      2: 3,
      1: 2,
    };
  }, []);

  return (
    <div className="bg-gray-50/50 rounded-3xl p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6">
        What <span className="text-orange-500">{totalReviews}</span> people are
        saying
      </h3>

      {/* Rating Overview - Compact Version */}
      <div className="mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-600 mb-3">
            Overall ratings and reviews
          </p>
          <div className="flex items-center gap-2 mb-4">
            <StarRating rating={averageRating} size="md" />
            <span className="text-lg font-bold text-gray-900">
              {averageRating}
            </span>
          </div>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center gap-2">
                <span className="text-sm text-gray-500 w-3">{rating}</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{
                      width: `${ratingDistribution[rating as keyof typeof ratingDistribution]}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-8">
                  {
                    ratingDistribution[
                      rating as keyof typeof ratingDistribution
                    ]
                  }
                  %
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sort */}
      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Sort by</span>
          <button
            onClick={() =>
              setSortBy(sortBy === "newest" ? "highest" : "newest")
            }
            className="text-orange-500 hover:text-orange-600 font-medium text-sm underline"
          >
            {sortBy === "newest" ? "Newest" : "Highest rated"}
          </button>
        </div>
      </div>

      {/* Review List - Narrower */}
      <div className="space-y-4">
        {reviews.map((review, index) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white font-bold shrink-0">
                {review.userAvatar}
              </div>

              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900 text-sm">
                    {review.userName}
                  </h4>
                  <StarRating rating={review.rating} size="sm" />
                </div>

                <p className="text-xs text-gray-400 mb-2">{review.date}</p>

                {/* Comment */}
                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                  {review.comment}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors">
                    <ThumbsUp className="w-3 h-3" />
                    {review.helpful}
                  </button>
                  <button className="flex items-center gap-1 text-xs text-red-400 hover:text-red-500 transition-colors">
                    <ThumbsUp className="w-3 h-3 rotate-180" />
                    {review.notHelpful}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-6">
        <Button className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-full px-8">
          View all reviews
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// Image Gallery Modal
// ============================================================================

const ImageGalleryModal: React.FC<{
  images: string[];
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
}> = ({ images, isOpen, onClose, initialIndex = 0 }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  // Reset index when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors z-10"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Navigation */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          className="absolute left-4 p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="absolute right-4 p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>

        {/* Image */}
        <motion.img
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          src={images[currentIndex]}
          alt={`Gallery image ${currentIndex + 1}`}
          className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />

        {/* Counter */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 px-4 py-2 rounded-full text-white text-sm">
          {currentIndex + 1} / {images.length}
        </div>

        {/* Thumbnails */}
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 max-w-[80vw] overflow-x-auto py-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              className={cn(
                "w-16 h-12 rounded-lg overflow-hidden shrink-0 transition-all",
                index === currentIndex
                  ? "ring-2 ring-orange-500 opacity-100"
                  : "opacity-50 hover:opacity-75",
              )}
            >
              <img
                src={image}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// ============================================================================
// Main Page Component
// ============================================================================

const RestaurantDetailsPage: React.FC = () => {
  const { id: _id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // In production, fetch restaurant by ID
  const restaurant = mockRestaurant;

  const handleReservation = useCallback(
    (guests: number, date: string, time: string) => {
      toast({
        title: "Reservation Request Sent",
        description: `Table for ${guests} on ${date} at ${time}. We'll confirm shortly!`,
      });
    },
    [toast],
  );

  const toggleDescription = useCallback(() => {
    setIsDescriptionExpanded((prev) => !prev);
  }, []);

  const openGallery = useCallback(() => {
    setIsGalleryOpen(true);
  }, []);

  const closeGallery = useCallback(() => {
    setIsGalleryOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero with Reservation */}
      <HeroSection restaurant={restaurant} onReserve={handleReservation} />

      {/* Restaurant Info */}
      <InfoSection
        restaurant={restaurant}
        isDescriptionExpanded={isDescriptionExpanded}
        onToggleDescription={toggleDescription}
      />

      {/* 2-Column Layout: Left content, Right empty */}
      <section className="py-8 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - All Content */}
          <div className="space-y-8">
            {/* Map and Details */}
            <MapSection restaurant={restaurant} />

            {/* Photo Gallery */}
            <PhotoGallerySection
              images={restaurant.images}
              onViewAll={openGallery}
            />

            {/* Menu */}
            <MenuSection menu={restaurant.menu} />

            {/* Reviews */}
            <ReviewsSection
              reviews={restaurant.reviews}
              totalReviews={restaurant.reviewCount}
              averageRating={restaurant.rating}
              recommendPercent={restaurant.recommendPercent}
            />
          </div>

          {/* Right Column - Empty */}
          <div className="hidden lg:block">
            {/* Intentionally empty for future use */}
          </div>
        </div>
      </section>

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        images={restaurant.images}
        isOpen={isGalleryOpen}
        onClose={closeGallery}
      />
    </div>
  );
};

export default RestaurantDetailsPage;
