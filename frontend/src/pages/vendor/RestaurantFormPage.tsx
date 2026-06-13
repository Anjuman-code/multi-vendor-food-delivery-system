import { DISTRICT_DATA, getAreasByDistrict } from '@/components/locationUtils';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader, SectionCard } from '@/components/vendor';
import { useVendor } from '@/contexts/VendorContext';
import { useToast } from '@/hooks/use-toast';
import {
  createRestaurantSchema,
  type CreateRestaurantInput,
} from '@/lib/vendorValidation';
import vendorService from '@/services/vendorService';
import type { CreateRestaurantPayload } from '@/types/vendor';
import { cn } from '@/utils/cn';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bike,
  Clock,
  ImagePlus,
  Info,
  Loader2,
  MapPin,
  Phone,
  Save,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';

type SubmitErrorItem = {
  field?: string;
  message?: string;
};

const CUISINE_OPTIONS = [
  'Bengali',
  'Indian',
  'Chinese',
  'Thai',
  'Italian',
  'Mexican',
  'Japanese',
  'Korean',
  'American',
  'Middle Eastern',
  'Mediterranean',
  'Fast Food',
  'Street Food',
  'Desserts',
  'Beverages',
];

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
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
      website: '',
      images: {
        logo: '',
        coverPhoto: '',
        gallery: [],
      },
      address: {
        street: '',
        area: '',
        district: '',
      },
      openingHours: DAYS.map((day) => ({
        day,
        open: '09:00',
        close: '22:00',
        isClosed: false,
      })),
    },
  });

  const selectedCuisines = watch('cuisineType') || [];
  const openingHours = watch('openingHours') || [];
  const logoPreview = watch('images.logo') || '';
  const coverPreview = watch('images.coverPhoto') || '';

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
          phone: r.phone || r.contactInfo?.phone || '',
          email: r.email || r.contactInfo?.email || '',
          website: r.contactInfo?.website || '',
          images: {
            logo: r.images?.logo || '',
            coverPhoto: r.images?.coverPhoto || r.coverImage || '',
            gallery: r.images?.gallery || [],
          },
          address: {
            street: r.address?.street || '',
            area: r.address?.area || '',
            district: r.address?.district || '',
          },
          openingHours:
            r.operatingHours?.map((h) => ({
              day: h.day,
              open: h.openTime,
              close: h.closeTime,
              isClosed: !h.isOpen,
            })) ??
            DAYS.map((day) => ({
              day,
              open: '09:00',
              close: '22:00',
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
    field: 'images.logo' | 'images.coverPhoto',
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please select an image file.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
      toast({
        title: 'Image too large',
        description: 'Please choose an image smaller than 2MB.',
        variant: 'destructive',
      });
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setValue(field, reader.result, { shouldValidate: true });
      }
    };
    reader.onerror = () => {
      toast({
        title: 'Upload failed',
        description: 'Could not read the selected image. Please try again.',
        variant: 'destructive',
      });
    };
    reader.readAsDataURL(file);
  };

  const toggleCuisine = (cuisine: string) => {
    const current: string[] = selectedCuisines;
    if (current.includes(cuisine)) {
      setValue(
        'cuisineType',
        current.filter((c) => c !== cuisine),
        { shouldValidate: true },
      );
    } else {
      setValue('cuisineType', [...current, cuisine], { shouldValidate: true });
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
        title: 'Success',
        description: isEdit ? 'Restaurant updated' : 'Restaurant created',
      });
      await refreshRestaurants();
      navigate('/vendor/restaurants');
    } else {
      const parsedErrors = Array.isArray(res.errors)
        ? res.errors
            .map((error) => {
              if (typeof error === 'string') return error;
              if (typeof error === 'object' && error !== null) {
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
        title: 'Error',
        description: parsedErrors[0] ?? res.message,
        variant: 'destructive',
      });
    }

    setSubmitting(false);
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl pb-28">
      <PageHeader
        title={isEdit ? 'Edit Restaurant' : 'New Restaurant'}
        description={
          isEdit
            ? 'Update your restaurant details'
            : 'Fill in the details to create a new restaurant'
        }
        actions={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
        {submitErrors.length > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <p className="text-sm font-semibold text-destructive">
              Please fix the following issues:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-destructive">
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
        >
          <SectionCard
            title="Basic Information"
            description="The essentials customers see first."
            icon={<Info className="h-4 w-4" />}
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Restaurant Name</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="e.g. The Golden Spoon"
                  className="mt-1"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Tell customers about your restaurant..."
                  rows={3}
                  className="mt-1"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.description.message}
                  </p>
                )}
              </div>

              {/* Cuisine Type */}
              <div>
                <Label>Cuisine Types</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CUISINE_OPTIONS.map((cuisine) => (
                    <button
                      key={cuisine}
                      type="button"
                      onClick={() => toggleCuisine(cuisine)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                        selectedCuisines.includes(cuisine)
                          ? 'border-primary bg-accent text-primary'
                          : 'border-border bg-card text-muted-foreground hover:border-primary/50',
                      )}
                    >
                      {cuisine}
                    </button>
                  ))}
                </div>
                {errors.cuisineType && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.cuisineType.message}
                  </p>
                )}
              </div>
            </div>
          </SectionCard>
        </motion.div>

        {/* Restaurant Photos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
        >
          <SectionCard
            title="Photos"
            description="Add a logo and cover photo. You can upload files or paste image URLs."
            icon={<ImagePlus className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="images.logo">Logo</Label>
                <div className="flex h-32 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <ImagePlus className="mx-auto mb-1 h-5 w-5" />
                      <p className="text-xs">Logo preview</p>
                    </div>
                  )}
                </div>
                <Input
                  id="images.logo"
                  {...register('images.logo')}
                  placeholder="https://example.com/logo.jpg"
                />
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'images.logo')}
                />
                {errors.images?.logo && (
                  <p className="text-sm text-destructive">
                    {errors.images.logo.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="images.coverPhoto">Cover Photo</Label>
                <div className="flex h-32 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted">
                  {coverPreview ? (
                    <img
                      src={coverPreview}
                      alt="Cover photo preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <ImagePlus className="mx-auto mb-1 h-5 w-5" />
                      <p className="text-xs">Cover preview</p>
                    </div>
                  )}
                </div>
                <Input
                  id="images.coverPhoto"
                  {...register('images.coverPhoto')}
                  placeholder="https://example.com/cover.jpg"
                />
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'images.coverPhoto')}
                />
                {errors.images?.coverPhoto && (
                  <p className="text-sm text-destructive">
                    {errors.images.coverPhoto.message}
                  </p>
                )}
              </div>
            </div>
          </SectionCard>
        </motion.div>

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <SectionCard
            title="Contact Information"
            description="How customers and the platform can reach you."
            icon={<Phone className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="+880 1XXX-XXXXXX"
                  className="mt-1"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.phone.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="restaurant@example.com"
                  className="mt-1"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="website">Website (optional)</Label>
                <Input
                  id="website"
                  {...register('website')}
                  placeholder="https://restaurant.com"
                  className="mt-1"
                />
                {errors.website && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.website.message}
                  </p>
                )}
              </div>
            </div>
          </SectionCard>
        </motion.div>

        {/* Address */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <SectionCard
            title="Address"
            description="Where your restaurant is located."
            icon={<MapPin className="h-4 w-4" />}
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="address.street">Street</Label>
                <Input
                  id="address.street"
                  {...register('address.street')}
                  placeholder="e.g. Zinda Bazar Road"
                  className="mt-1"
                />
                {errors.address?.street && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.address.street.message}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>District</Label>
                  <div className="mt-1">
                    <Combobox
                      options={DISTRICT_DATA.map((d) => ({
                        value: d.district,
                        label: d.district,
                      }))}
                      value={watch('address.district') || ''}
                      onValueChange={(val) => {
                        setValue('address.district', val, {
                          shouldValidate: true,
                        });
                        setValue('address.area', '', { shouldValidate: false });
                      }}
                      placeholder="Select district"
                    />
                  </div>
                  {errors.address?.district && (
                    <p className="mt-1 text-sm text-destructive">
                      {errors.address.district.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Area</Label>
                  <div className="mt-1">
                    <Combobox
                      options={getAreasByDistrict(
                        watch('address.district') || '',
                      )}
                      value={watch('address.area') || ''}
                      onValueChange={(val) =>
                        setValue('address.area', val, { shouldValidate: true })
                      }
                      placeholder="Select area"
                      disabled={!watch('address.district')}
                    />
                  </div>
                  {errors.address?.area && (
                    <p className="mt-1 text-sm text-destructive">
                      {errors.address.area.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>
        </motion.div>

        {/* Opening Hours */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <SectionCard
            title="Opening Hours"
            description="Set daily availability for your restaurant."
            icon={<Clock className="h-4 w-4" />}
          >
            <div className="space-y-3">
              {DAYS.map((day, idx) => {
                const isClosed = openingHours[idx]?.isClosed;
                return (
                  <div
                    key={day}
                    className="flex items-center gap-4 border-b border-border py-2 last:border-0"
                  >
                    <label className="w-28 text-sm font-medium text-foreground">
                      {day}
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={isClosed}
                        onChange={(e) =>
                          setValue(
                            `openingHours.${idx}.isClosed`,
                            e.target.checked,
                          )
                        }
                        className="rounded border-border text-primary focus:ring-primary"
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
                        <span className="text-muted-foreground">to</span>
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
          </SectionCard>
        </motion.div>

        {/* Delivery Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <SectionCard
            title="Delivery Settings"
            description="Order thresholds, fees and timing."
            icon={<Bike className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="minimumOrder">Minimum Order (৳)</Label>
                <Input
                  id="minimumOrder"
                  type="number"
                  {...register('minimumOrder', {
                    setValueAs: (value) =>
                      value === '' ? undefined : Number(value),
                  })}
                  placeholder="0"
                  className="mt-1"
                />
                {errors.minimumOrder && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.minimumOrder.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="deliveryFee">Delivery Fee (৳)</Label>
                <Input
                  id="deliveryFee"
                  type="number"
                  {...register('deliveryFee', {
                    setValueAs: (value) =>
                      value === '' ? undefined : Number(value),
                  })}
                  placeholder="0"
                  className="mt-1"
                />
                {errors.deliveryFee && (
                  <p className="mt-1 text-sm text-destructive">
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
                  {...register('estimatedDeliveryTime', {
                    setValueAs: (value) =>
                      value === '' ? undefined : Number(value),
                  })}
                  placeholder="30"
                  className="mt-1"
                />
                {errors.estimatedDeliveryTime && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.estimatedDeliveryTime.message}
                  </p>
                )}
              </div>
            </div>
          </SectionCard>
        </motion.div>

        {/* Sticky save bar */}
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="mx-auto flex max-w-3xl items-center justify-end gap-3 px-4 py-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={submitting} className="gap-2">
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {submitting
                ? isEdit
                  ? 'Updating...'
                  : 'Creating...'
                : isEdit
                  ? 'Update Restaurant'
                  : 'Create Restaurant'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default RestaurantFormPage;
