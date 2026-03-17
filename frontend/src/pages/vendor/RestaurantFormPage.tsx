import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, ImagePlus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import vendorService from "@/services/vendorService";
import { useVendor } from "@/contexts/VendorContext";
import type { CreateRestaurantPayload } from "@/types/vendor";
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

const MAX_IMAGE_FILE_SIZE_BYTES = 2 * 1024 * 1024;

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
      website: "",
      images: {
        logo: "",
        coverPhoto: "",
        gallery: [],
      },
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
  const logoPreview = watch("images.logo") || "";
  const coverPreview = watch("images.coverPhoto") || "";

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
          phone: r.phone || r.contactInfo?.phone || "",
          email: r.email || r.contactInfo?.email || "",
          website: r.contactInfo?.website || "",
          images: {
            logo: r.images?.logo || "",
            coverPhoto: r.images?.coverPhoto || r.coverImage || "",
            gallery: r.images?.gallery || [],
          },
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

  const handleImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    field: "images.logo" | "images.coverPhoto",
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
      toast({
        title: "Image too large",
        description: "Please choose an image smaller than 2MB.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setValue(field, reader.result, { shouldValidate: true });
      }
    };
    reader.onerror = () => {
      toast({
        title: "Upload failed",
        description: "Could not read the selected image. Please try again.",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
  };

  const toggleCuisine = (cuisine: string) => {
    const current: string[] = selectedCuisines;
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

    const payload: CreateRestaurantPayload = {
      ...data,
      images: {
        ...data.images,
        gallery: data.images.gallery ?? [],
      },
    };

    const res = isEdit
      ? await vendorService.updateRestaurant(id!, payload)
      : await vendorService.createRestaurant(payload);

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

        {/* Restaurant Photos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-gray-900">Photos</h2>
          <p className="text-sm text-gray-500">
            Add a logo and cover photo. You can upload files or paste image
            URLs.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="images.logo">Logo</Label>
              <div className="h-32 rounded-lg border border-dashed border-gray-300 bg-gray-50 overflow-hidden flex items-center justify-center">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-gray-400">
                    <ImagePlus className="w-5 h-5 mx-auto mb-1" />
                    <p className="text-xs">Logo preview</p>
                  </div>
                )}
              </div>
              <Input
                id="images.logo"
                {...register("images.logo")}
                placeholder="https://example.com/logo.jpg"
              />
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, "images.logo")}
              />
              {errors.images?.logo && (
                <p className="text-sm text-red-500">
                  {errors.images.logo.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="images.coverPhoto">Cover Photo</Label>
              <div className="h-32 rounded-lg border border-dashed border-gray-300 bg-gray-50 overflow-hidden flex items-center justify-center">
                {coverPreview ? (
                  <img
                    src={coverPreview}
                    alt="Cover photo preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-gray-400">
                    <ImagePlus className="w-5 h-5 mx-auto mb-1" />
                    <p className="text-xs">Cover preview</p>
                  </div>
                )}
              </div>
              <Input
                id="images.coverPhoto"
                {...register("images.coverPhoto")}
                placeholder="https://example.com/cover.jpg"
              />
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, "images.coverPhoto")}
              />
              {errors.images?.coverPhoto && (
                <p className="text-sm text-red-500">
                  {errors.images.coverPhoto.message}
                </p>
              )}
            </div>
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
            <div className="md:col-span-2">
              <Label htmlFor="website">Website (optional)</Label>
              <Input
                id="website"
                {...register("website")}
                placeholder="https://restaurant.com"
                className="mt-1"
              />
              {errors.website && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.website.message}
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
                {...register("minimumOrder", {
                  setValueAs: (value) =>
                    value === "" ? undefined : Number(value),
                })}
                placeholder="0"
                className="mt-1"
              />
              {errors.minimumOrder && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.minimumOrder.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="deliveryFee">Delivery Fee (৳)</Label>
              <Input
                id="deliveryFee"
                type="number"
                {...register("deliveryFee", {
                  setValueAs: (value) =>
                    value === "" ? undefined : Number(value),
                })}
                placeholder="0"
                className="mt-1"
              />
              {errors.deliveryFee && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.deliveryFee.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="estimatedDeliveryTime">
                Est. Delivery Time (min)
              </Label>
              <Input
                id="estimatedDeliveryTime"
                type="number"
                {...register("estimatedDeliveryTime", {
                  setValueAs: (value) =>
                    value === "" ? undefined : Number(value),
                })}
                placeholder="30"
                className="mt-1"
              />
              {errors.estimatedDeliveryTime && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.estimatedDeliveryTime.message}
                </p>
              )}
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
