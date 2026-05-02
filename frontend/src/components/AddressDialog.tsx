import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import {
  addAddressSchema,
  type AddAddressFormData,
} from "@/lib/validation";
import type { UserAddress } from "@/services/userService";
import userService from "@/services/userService";
import { zodResolver } from "@hookform/resolvers/zod";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import { Loader2, MapPin } from "lucide-react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMapEvents,
} from "react-leaflet";

import { DISTRICT_DATA, getAreasByDistrict, reverseGeocodeCoordinates } from "./locationUtils";

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function LocationPickerMap({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const map = useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    if (lat !== 0 && lng !== 0) {
      map.flyTo([lat, lng], map.getZoom());
    }
  }, [lat, lng, map]);

  return lat !== 0 && lng !== 0 ? <Marker position={[lat, lng]} /> : null;
}

export interface AddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: UserAddress | null;
  onSuccess: () => Promise<void>;
}

export const AddressDialog: React.FC<AddressDialogProps> = ({
  open,
  onOpenChange,
  address,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const isEdit = !!address;

  const form = useForm<AddAddressFormData>({
    resolver: zodResolver(addAddressSchema) as any,
    mode: "onChange",
    defaultValues: {
      type: address?.type ?? "home",
      street: address?.street ?? "",
      apartment: address?.apartment ?? "",
      district: address?.district ?? "",
      area: address?.area ?? "",
      latitude: address?.coordinates?.latitude ?? 0,
      longitude: address?.coordinates?.longitude ?? 0,
      isDefault: address?.isDefault ?? false,
    },
  });

  useEffect(() => {
    if (address) {
      form.reset({
        type: address.type,
        street: address.street,
        apartment: address.apartment ?? "",
        district: address.district,
        area: address.area,
        latitude: address.coordinates.latitude,
        longitude: address.coordinates.longitude,
        isDefault: address.isDefault,
      });
    } else {
      form.reset({
        type: "home",
        street: "",
        apartment: "",
        district: "",
        area: "",
        latitude: 0,
        longitude: 0,
        isDefault: false,
      });
    }
  }, [address, form]);

  const onSubmit = async (data: AddAddressFormData) => {
    setIsSaving(true);
    const payload = {
      type: data.type as "home" | "work" | "other",
      street: data.street,
      apartment: data.apartment || undefined,
      district: data.district,
      area: data.area,
      coordinates: { latitude: data.latitude, longitude: data.longitude },
      isDefault: data.isDefault,
    };

    const res = isEdit
      ? await userService.updateAddress(address._id, payload)
      : await userService.addAddress(payload);

    if (res.success) {
      toast({
        title: "Success",
        description: isEdit
          ? "Address updated successfully"
          : "Address added successfully",
      });
      await onSuccess();
    } else {
      toast({
        title: "Error",
        description: res.message,
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  const handleCoordinatesUpdate = useCallback(
    async (latitude: number, longitude: number) => {
      form.setValue("latitude", latitude, { shouldValidate: true });
      form.setValue("longitude", longitude, { shouldValidate: true });

      const coordsString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      form.setValue("apartment", coordsString, { shouldValidate: true });

      setIsDetectingLocation(true);

      try {
        const resolvedAddress = await reverseGeocodeCoordinates(
          latitude,
          longitude,
        );

        if (resolvedAddress.street) {
          form.setValue("street", resolvedAddress.street, {
            shouldValidate: true,
          });
        }

        let districtValue = resolvedAddress.district;
        let areaValue = resolvedAddress.area;

        const districtExists = DISTRICT_DATA.some(
          (d) => d.district.toLowerCase() === districtValue?.toLowerCase(),
        );
        if (!districtExists) {
          districtValue = "Sylhet";
          areaValue = "Sylhet Sadar";
        } else if (areaValue) {
          const districtData = DISTRICT_DATA.find(
            (d) =>
              d.district.toLowerCase() === districtValue?.toLowerCase(),
          );
          const areaExists = districtData?.areas.some(
            (a) => a.toLowerCase() === areaValue?.toLowerCase(),
          );
          if (!areaExists) {
            areaValue = districtData?.areas[0] || "Sylhet Sadar";
          }
        }

        if (districtValue) {
          form.setValue("district", districtValue, {
            shouldValidate: true,
          });
        }
        if (areaValue) {
          form.setValue("area", areaValue, {
            shouldValidate: true,
          });
        }

        toast({
          title: "Location detected",
          description:
            "Your address fields were updated automatically.",
        });
      } catch {
        form.setValue("district", "Sylhet", { shouldValidate: true });
        form.setValue("area", "Sylhet Sadar", { shouldValidate: true });
        toast({
          title: "Location set",
          description:
            "Coordinates were saved, but address lookup could not complete. Defaulting to Sylhet.",
        });
      } finally {
        setIsDetectingLocation(false);
      }
    },
    [form, toast],
  );

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: "Not supported",
        description: "Geolocation is not supported by your browser.",
        variant: "destructive",
      });
      return;
    }

    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = Math.round(pos.coords.latitude * 1e6) / 1e6;
        const longitude = Math.round(pos.coords.longitude * 1e6) / 1e6;
        handleCoordinatesUpdate(latitude, longitude);
      },
      (err) => {
        setIsDetectingLocation(false);
        toast({
          title: "Location error",
          description:
            err.code === 1
              ? "Location permission denied. Please allow location access in your browser settings."
              : "Could not detect your location. Please try again.",
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      },
    );
  }, [handleCoordinatesUpdate, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Address" : "Add Address"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update your address details below."
              : "Add a new delivery address."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Use your current location
                  </p>
                  <p className="text-xs text-gray-500">
                    We will fill your address fields from the GPS coordinates.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isDetectingLocation}
                  className="rounded-xl gap-2 flex-shrink-0"
                  onClick={handleUseCurrentLocation}
                >
                  {isDetectingLocation ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MapPin className="w-4 h-4" />
                  )}
                  {isDetectingLocation ? "Detecting…" : "Use my location"}
                </Button>
              </div>
              {!form.watch("latitude") && (
                <span className="text-xs text-muted-foreground">
                  We need your location for delivery
                </span>
              )}
            </div>

            <div className="h-48 w-full rounded-2xl overflow-hidden border border-gray-200 z-0 relative">
              <MapContainer
                center={
                  form.watch("latitude") !== 0
                    ? [form.watch("latitude"), form.watch("longitude")]
                    : [23.8103, 90.4125]
                }
                zoom={13}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationPickerMap
                  lat={form.watch("latitude")}
                  lng={form.watch("longitude")}
                  onChange={handleCoordinatesUpdate}
                />
              </MapContainer>
            </div>

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="home">Home</SelectItem>
                      <SelectItem value="work">Work</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="123 Main St"
                      className="rounded-xl"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="apartment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apartment / Suite</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={field.value || "e.g. 24.9174, 92.9372"}
                      className="rounded-xl"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>District</FormLabel>
                    <Combobox
                      options={DISTRICT_DATA.map((d) => ({
                        value: d.district,
                        label: d.district,
                      }))}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select district"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area</FormLabel>
                    <Combobox
                      options={getAreasByDistrict(form.watch("district"))}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select area"
                      disabled={!form.watch("district")}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {(form.formState.errors.latitude ||
              form.formState.errors.longitude) && (
              <p className="text-sm font-medium text-destructive">
                Please detect your location before submitting
              </p>
            )}
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !form.formState.isValid}
                className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
              >
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEdit ? "Update" : "Add"} Address
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};