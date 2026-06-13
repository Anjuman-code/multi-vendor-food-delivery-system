import { Button } from "@/components/ui/button";
import {
  PageHeader,
  StatusBadge,
  VendorEmptyState,
} from "@/components/vendor";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useVendor } from "@/contexts/VendorContext";
import { useToast } from "@/hooks/use-toast";
import vendorService from "@/services/vendorService";
import type { VendorRestaurant } from "@/types/vendor";
import { motion } from "framer-motion";
import {
  Clock,
  Edit,
  ImageIcon,
  MapPin,
  Plus,
  Star,
  Store,
  Trash2,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const VendorRestaurantsPage: React.FC = () => {
  const [restaurants, setRestaurants] = useState<VendorRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { refreshRestaurants } = useVendor();
  const { toast } = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    const load = async () => {
      const res = await vendorService.getRestaurants();
      if (res.success && res.data) {
        setRestaurants(res.data.restaurants);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: "Delete restaurant", description: "Are you sure you want to delete this restaurant? This cannot be undone.", confirmLabel: "Delete" });
    if (!ok) return;
    const res = await vendorService.deleteRestaurant(id);
    if (res.success) {
      setRestaurants((prev) => prev.filter((r) => r._id !== id));
      refreshRestaurants();
      toast({ title: "Success", description: "Restaurant deleted" });
    } else {
      toast({
        title: "Error",
        description: res.message,
        variant: "destructive",
      });
    }
  };

  const addAction = (
    <Link to="/vendor/restaurants/new">
      <Button variant="brand" className="gap-2">
        <Plus className="h-4 w-4" />
        Add Restaurant
      </Button>
    </Link>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="My Restaurants"
          description="Manage your restaurant listings"
          actions={addAction}
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden rounded-xl border border-border bg-card"
            >
              <div className="h-40 bg-muted" />
              <div className="space-y-3 p-5">
                <div className="h-5 w-3/4 rounded bg-muted" />
                <div className="h-4 w-1/2 rounded bg-muted" />
                <div className="flex gap-2">
                  <div className="h-6 w-16 rounded-full bg-muted" />
                  <div className="h-6 w-16 rounded-full bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Restaurants"
        description="Manage your restaurant listings"
        actions={addAction}
      />

      {restaurants.length === 0 ? (
        <VendorEmptyState
          icon={Store}
          title="No restaurants yet"
          description="Create your first restaurant to start receiving orders."
          action={{
            label: "Add Restaurant",
            onClick: () => navigate("/vendor/restaurants/new"),
            icon: Plus,
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((restaurant, idx) => {
            const cover = restaurant.coverImage || restaurant.images?.coverPhoto;
            const logo = restaurant.images?.logo;
            const rating =
              restaurant.averageRating ?? restaurant.rating?.average ?? 0;
            const deliveryTime =
              restaurant.estimatedDeliveryTime != null
                ? `${restaurant.estimatedDeliveryTime} min`
                : `${restaurant.deliveryTime.min}–${restaurant.deliveryTime.max} min`;
            const area = restaurant.address?.area;
            const district = restaurant.address?.district;
            const location = [area, district].filter(Boolean).join(", ");
            const isClosed = restaurant.isTemporarilyClosed;
            const isOpen = restaurant.isOpen ?? !isClosed;

            return (
              <motion.div
                key={restaurant._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
                onClick={() =>
                  navigate(`/vendor/restaurants/${restaurant._id}/edit`)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/vendor/restaurants/${restaurant._id}/edit`);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                {/* Cover image */}
                <div className="relative h-40 bg-muted">
                  {cover ? (
                    <img
                      src={cover}
                      alt={restaurant.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}

                  {/* Approval status */}
                  <div className="absolute left-3 top-3">
                    <StatusBadge
                      status={restaurant.approvalStatus}
                      className="shadow-sm"
                    />
                  </div>

                  {/* Open / Closed */}
                  <div className="absolute bottom-3 left-3">
                    <StatusBadge
                      label={isOpen ? "Open" : "Closed"}
                      tone={isOpen ? "success" : "neutral"}
                      icon={false}
                      size="sm"
                      className="shadow-sm"
                    />
                  </div>

                  {/* Hover actions */}
                  <div className="absolute right-3 top-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 shadow"
                      title="Edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/vendor/restaurants/${restaurant._id}/edit`);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 text-destructive shadow hover:text-destructive"
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(restaurant._id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Logo */}
                  {logo && (
                    <div className="absolute -bottom-6 right-4 h-12 w-12 overflow-hidden rounded-lg border-2 border-card bg-card shadow">
                      <img
                        src={logo}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-5">
                  <h3 className="mb-1 truncate text-lg font-semibold text-foreground">
                    {restaurant.name}
                  </h3>
                  <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                    {restaurant.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    {rating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span className="font-medium text-foreground">
                          {rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                    {deliveryTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{deliveryTime}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span className="max-w-[140px] truncate">
                        {location || "—"}
                      </span>
                    </div>
                  </div>

                  {restaurant.cuisineType.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {restaurant.cuisineType.slice(0, 3).map((c) => (
                        <span
                          key={c}
                          className="rounded-full bg-accent px-2 py-0.5 text-xs text-primary"
                        >
                          {c}
                        </span>
                      ))}
                      {restaurant.cuisineType.length > 3 && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          +{restaurant.cuisineType.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VendorRestaurantsPage;
