import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import vendorService from "@/services/vendorService";
import { useVendor } from "@/contexts/VendorContext";
import {
  createRestaurantSchema,
  type CreateRestaurantInput,
} from "@/lib/vendorValidation";
import { useToast } from "@/hooks/use-toast";

type SubmitErrorItem = {
  field?: string;
  message?: string;
};

const CUISINE_OPTIONS = [
  "Bengali",
  "Indian",
  "Chinese",
  "Thai",
  "Italian",
  "Mexican",
  "Japanese",
  "Korean",
  "American",
  "Middle Eastern",
  "Mediterranean",
  "Fast Food",
  "Street Food",
  "Desserts",
  "Beverages",
];

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const RestaurantFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { refreshRestaurants } = useVendor();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<CreateRestaurantInput>({
    resolver: zodResolver(createRestaurantSchema),
    defaultValues: {
      cuisineType: [],
      openingHours: DAYS.map((day) => ({
        day,
        open: "09:00",
        close: "22:00",
        isClosed: false,
      })),
    },
  });

  const selectedCuisines = watch("cuisineType") || [];
  const openingHours = watch("openingHours") || [];

  useEffect(() => {
    if (!isEdit || !id) return;
    const loadRestaurant = async () => {
      const res = await vendorService.getRestaurant(id);
      if (res.success && res.data) {
        const r = res.data.restaurant;
        reset({
          name: r.name,
          description: r.description,
          cuisineType: r.cuisineType,
          phone: r.phone || "",
          email: r.email || "",
          address: r.address || {
            street: "",
            city: "",
            state: "",
            zipCode: "",
            country: "",
          },
          openingHours:
            r.openingHours ||
            DAYS.map((day) => ({
              day,
              open: "09:00",
              close: "22:00",
              isClosed: false,
            })),
          minimumOrder: r.minimumOrder,
          deliveryFee: r.deliveryFee,
          estimatedDeliveryTime: r.estimatedDeliveryTime,
        });
      }
      setLoadingData(false);
    };
    loadRestaurant();
  }, [isEdit, id, reset]);

  const toggleCuisine = (cuisine: string) => {
    const current = selectedCuisines;
    if (current.includes(cuisine)) {
      setValue(
        "cuisineType",
        current.filter((c) => c !== cuisine),
        { shouldValidate: true },
      );
    } else {
      setValue("cuisineType", [...current, cuisine], { shouldValidate: true });
    }
  };

  const onSubmit = async (data: CreateRestaurantInput) => {
    setSubmitting(true);
    setSubmitErrors([]);

    const res = isEdit
      ? await vendorService.updateRestaurant(id!, data)
      : await vendorService.createRestaurant(data);

    if (res.success) {
      toast({
        title: "Success",
        description: isEdit ? "Restaurant updated" : "Restaurant created",
      });
      await refreshRestaurants();
      navigate("/vendor/restaurants");
    } else {
      const parsedErrors = Array.isArray(res.errors)
        ? res.errors
            .map((error) => {
              if (typeof error === "string") return error;
              if (typeof error === "object" && error !== null) {
                const issue = error as SubmitErrorItem;
                if (issue.field && issue.message) {
                  return `${issue.field}: ${issue.message}`;
                }
                return issue.message ?? null;
              }
              return null;
            })
            .filter((message): message is string => Boolean(message))
        : [];

      if (parsedErrors.length > 0) {
        setSubmitErrors(parsedErrors);
      }

      toast({
        title: "Error",
        description: parsedErrors[0] ?? res.message,
        variant: "destructive",
      });
    }

    setSubmitting(false);
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? "Edit Restaurant" : "Create Restaurant"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isEdit
              ? "Update your restaurant details"
              : "Fill in the details to create a new restaurant"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {submitErrors.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">
              Please fix the following issues:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-red-700 list-disc pl-5">
              {submitErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Basic Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            Basic Information
          </h2>
          <div>
            <Label htmlFor="name">Restaurant Name</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="e.g. The Golden Spoon"
              className="mt-1"
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Tell customers about your restaurant..."
              rows={3}
              className="mt-1"
            />
            {errors.description && (
              <p className="text-sm text-red-500 mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Cuisine Type */}
          <div>
            <Label>Cuisine Types</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {CUISINE_OPTIONS.map((cuisine) => (
                <button
                  key={cuisine}
                  type="button"
                  onClick={() => toggleCuisine(cuisine)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    selectedCuisines.includes(cuisine)
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-white text-gray-600 border-gray-300 hover:border-orange-300"
                  }`}
                >
                  {cuisine}
                </button>
              ))}
            </div>
            {errors.cuisineType && (
              <p className="text-sm text-red-500 mt-1">
                {errors.cuisineType.message}
              </p>
            )}
          </div>
        </motion.div>

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            Contact Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                {...register("phone")}
                placeholder="+880 1XXX-XXXXXX"
                className="mt-1"
              />
              {errors.phone && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.phone.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="restaurant@example.com"
                className="mt-1"
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Address */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-gray-900">Address</h2>
          <div>
            <Label htmlFor="address.street">Street</Label>
            <Input
              id="address.street"
              {...register("address.street")}
              placeholder="123 Main Street"
              className="mt-1"
            />
            {errors.address?.street && (
              <p className="text-sm text-red-500 mt-1">
                {errors.address.street.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="address.city">City</Label>
              <Input
                id="address.city"
                {...register("address.city")}
                placeholder="Sylhet"
                className="mt-1"
              />
              {errors.address?.city && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.address.city.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="address.state">State</Label>
              <Input
                id="address.state"
                {...register("address.state")}
                placeholder="Sylhet"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="address.zipCode">Zip Code</Label>
              <Input
                id="address.zipCode"
                {...register("address.zipCode")}
                placeholder="3100"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="address.country">Country</Label>
              <Input
                id="address.country"
                {...register("address.country")}
                placeholder="Bangladesh"
                className="mt-1"
              />
            </div>
          </div>
        </motion.div>

        {/* Opening Hours */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-gray-900">Opening Hours</h2>
          <div className="space-y-3">
            {DAYS.map((day, idx) => {
              const isClosed = openingHours[idx]?.isClosed;
              return (
                <div
                  key={day}
                  className="flex items-center gap-4 py-2 border-b border-gray-50 last:border-0"
                >
                  <label className="w-28 text-sm font-medium text-gray-700">
                    {day}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isClosed}
                      onChange={(e) =>
                        setValue(
                          `openingHours.${idx}.isClosed`,
                          e.target.checked,
                        )
                      }
                      className="rounded text-orange-500 focus:ring-orange-500"
                    />
                    Closed
                  </label>
                  {!isClosed && (
                    <>
                      <Input
                        type="time"
                        {...register(`openingHours.${idx}.open`)}
                        className="w-32"
                      />
                      <span className="text-gray-400">to</span>
                      <Input
                        type="time"
                        {...register(`openingHours.${idx}.close`)}
                        className="w-32"
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Delivery Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            Delivery Settings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="minimumOrder">Minimum Order (৳)</Label>
              <Input
                id="minimumOrder"
                type="number"
                {...register("minimumOrder", { valueAsNumber: true })}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="deliveryFee">Delivery Fee (৳)</Label>
              <Input
                id="deliveryFee"
                type="number"
                {...register("deliveryFee", { valueAsNumber: true })}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="estimatedDeliveryTime">
                Est. Delivery Time (min)
              </Label>
              <Input
                id="estimatedDeliveryTime"
                type="number"
                {...register("estimatedDeliveryTime", {
                  valueAsNumber: true,
                })}
                placeholder="30"
                className="mt-1"
              />
            </div>
          </div>
        </motion.div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            disabled={submitting}
            className="rounded-lg"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg gap-2"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {submitting
              ? isEdit
                ? "Updating..."
                : "Creating..."
              : isEdit
                ? "Update Restaurant"
                : "Create Restaurant"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default RestaurantFormPage;
