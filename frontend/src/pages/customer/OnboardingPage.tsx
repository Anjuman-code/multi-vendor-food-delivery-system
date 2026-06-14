import {
  OnboardingLayout,
  OptionCard,
  StepHeader,
  StepNav,
  type OnboardingStep,
} from "@/components/onboarding";
import {
  DISTRICT_DATA,
  getAreasByDistrict,
  reverseGeocodeCoordinates,
} from "@/components/locationUtils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { applyServerErrors } from "@/lib/formErrors";
import { toast } from "@/lib/toast";
import { addAddressSchema } from "@/lib/validation";
import authService from "@/services/authService";
import type { AddAddressPayload } from "@/services/userService";
import userService from "@/services/userService";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import type { z } from "zod";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import {
  Briefcase,
  CheckCircle2,
  CreditCard,
  Home,
  Loader2,
  MapPin,
  Navigation,
  PartyPopper,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { useNavigate, useSearchParams } from "react-router-dom";

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const ADDRESS_LABELS = [
  { value: "Home", icon: Home },
  { value: "Work", icon: Briefcase },
  { value: "Other", icon: MapPin },
] as const;

type AddressLabel = (typeof ADDRESS_LABELS)[number]["value"];

const STEPS: OnboardingStep[] = [
  { id: "welcome", label: "Welcome", description: "A quick hello", icon: Sparkles },
  {
    id: "delivery-address",
    label: "Delivery address",
    description: "Where we'll bring your food",
    icon: MapPin,
  },
  {
    id: "payment",
    label: "Payment",
    description: "How you'd like to pay",
    icon: CreditCard,
  },
  {
    id: "complete",
    label: "All set",
    description: "Start ordering",
    icon: PartyPopper,
  },
];

const STEP_INDEX: Record<string, number> = {
  welcome: 0,
  "delivery-address": 1,
  payment: 2,
  complete: 3,
};

// ── Map picker ────────────────────────────────────────────────

const LocationPickerMap = ({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}) => {
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
};

// ── Step 1: Welcome ────────────────────────────────────────────

const WelcomeStep = ({
  userName,
  onGetStarted,
}: {
  userName: string;
  onGetStarted: () => void;
}) => (
  <div>
    <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-red-500 text-white shadow-lg shadow-brand-500/25">
      <span className="text-2xl">🍔</span>
    </span>
    <h2 className="mt-5 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
      Welcome, {userName.split(" ")[0]}!
    </h2>
    <p className="mt-2 max-w-md text-[0.95rem] leading-relaxed text-muted-foreground">
      Let's get your account ready so you can order in seconds. Two quick steps —
      your delivery address and a payment method. You can change both anytime.
    </p>

    <div className="mt-7 space-y-3">
      {[
        {
          icon: MapPin,
          title: "Delivery address",
          desc: "So riders know exactly where to bring your order.",
        },
        {
          icon: CreditCard,
          title: "Payment method",
          desc: "Cash on delivery works out of the box — cards optional.",
        },
      ].map(({ icon: Icon, title, desc }) => (
        <div
          key={title}
          className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </div>
        </div>
      ))}
    </div>

    <StepNav nextLabel="Let's go" onNext={onGetStarted} />
  </div>
);

// ── Step 2: Address ────────────────────────────────────────────

const LABEL_TO_TYPE: Record<AddressLabel, "home" | "work" | "other"> = {
  Home: "home",
  Work: "work",
  Other: "other",
};
const TYPE_TO_LABEL: Record<"home" | "work" | "other", AddressLabel> = {
  home: "Home",
  work: "Work",
  other: "Other",
};

type AddressFormInput = z.input<typeof addAddressSchema>;
type AddressFormOutput = z.output<typeof addAddressSchema>;

const AddressStep = ({
  onNext,
  onBack,
  onSkip,
}: {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) => {
  const [isDetecting, setIsDetecting] = useState(false);

  const form = useForm<AddressFormInput, unknown, AddressFormOutput>({
    resolver: zodResolver(addAddressSchema),
    mode: "onTouched",
    defaultValues: {
      type: "home",
      street: "",
      apartment: "",
      district: "",
      area: "",
      // Sentinels outside the valid lat/lng range so the schema flags an
      // unset location instead of silently passing (0,0).
      latitude: 999,
      longitude: 999,
      isDefault: true,
    },
  });

  const district = form.watch("district");
  const lat = Number(form.watch("latitude"));
  const lng = Number(form.watch("longitude"));
  const label = TYPE_TO_LABEL[form.watch("type")];
  const hasPin =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180;

  const handleCoordinatesUpdate = useCallback(
    async (latitude: number, longitude: number) => {
      form.setValue("latitude", latitude, { shouldValidate: true });
      form.setValue("longitude", longitude, { shouldValidate: true });
      setIsDetecting(true);

      try {
        const resolvedAddress = await reverseGeocodeCoordinates(
          latitude,
          longitude,
        );

        if (resolvedAddress.street)
          form.setValue("street", resolvedAddress.street, {
            shouldValidate: true,
          });

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
            (d) => d.district.toLowerCase() === districtValue?.toLowerCase(),
          );
          const areaExists = districtData?.areas.some(
            (a) => a.toLowerCase() === areaValue?.toLowerCase(),
          );
          if (!areaExists) areaValue = districtData?.areas[0] || "Sylhet Sadar";
        }

        if (districtValue)
          form.setValue("district", districtValue, { shouldValidate: true });
        if (areaValue)
          form.setValue("area", areaValue, { shouldValidate: true });

        toast.success("Location detected", {
          description: "Address fields filled from GPS.",
        });
      } catch {
        form.setValue("district", "Sylhet", { shouldValidate: true });
        form.setValue("area", "Sylhet Sadar", { shouldValidate: true });
        toast.info("Location set", {
          description: "Coordinates saved. Defaulting to Sylhet.",
        });
      } finally {
        setIsDetecting(false);
      }
    },
    [form],
  );

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Not supported", {
        description: "Geolocation is not supported by your browser.",
      });
      return;
    }
    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latitude = Math.round(pos.coords.latitude * 1e6) / 1e6;
        const longitude = Math.round(pos.coords.longitude * 1e6) / 1e6;
        handleCoordinatesUpdate(latitude, longitude);
      },
      (err) => {
        setIsDetecting(false);
        toast.error("Location error", {
          description:
            err.code === 1
              ? "Location permission denied. Please allow access and try again."
              : "Could not detect your location. Please try again.",
        });
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
    );
  };

  // RHF only invokes this once the whole step validates, so an invalid /
  // incomplete address can never advance.
  const onSubmit = async (values: AddressFormOutput) => {
    try {
      const payload: AddAddressPayload = {
        type: values.type,
        street: values.street,
        apartment: values.apartment || undefined,
        district: values.district,
        area: values.area,
        coordinates: {
          latitude: values.latitude,
          longitude: values.longitude,
        },
        isDefault: true,
      };
      const res = await userService.addAddress(payload);
      if (!res.success) {
        applyServerErrors(form, res, {
          fallbackMessage: "Failed to save address. Please try again.",
        });
        return;
      }
      toast.success("Address saved!", {
        description: "Your delivery address has been added.",
      });
      onNext();
    } catch (err) {
      applyServerErrors(form, err, {
        fallbackMessage: "Failed to save address. Please try again.",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <StepHeader
        icon={MapPin}
        title="Where should we deliver?"
        subtitle="Pin your spot on the map or fill in the details below. We deliver across Sylhet and beyond."
      />

      {/* GPS auto-fill */}
      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-red-500 text-white">
            <Navigation className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Use my current location
            </p>
            <p className="text-xs text-muted-foreground">
              Auto-fill your address from GPS
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isDetecting}
          className="shrink-0 gap-1.5 border-brand-200"
          onClick={handleUseLocation}
        >
          {isDetecting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Navigation className="h-3.5 w-3.5" />
          )}
          {isDetecting ? "Detecting…" : "Detect"}
        </Button>
      </div>

      {/* Map */}
      <div className="relative mb-1.5 h-44 w-full overflow-hidden rounded-2xl border border-border">
        <MapContainer
          center={hasPin ? [lat, lng] : [23.8103, 90.4125]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationPickerMap
            lat={hasPin ? lat : 0}
            lng={hasPin ? lng : 0}
            onChange={handleCoordinatesUpdate}
          />
        </MapContainer>
        <div className="pointer-events-none absolute bottom-2 left-2 rounded-lg bg-background/90 px-2 py-1 text-xs text-muted-foreground backdrop-blur-sm">
          Tap the map to drop a pin
        </div>
      </div>
      {(form.formState.errors.latitude || form.formState.errors.longitude) && (
        <p className="mb-3 text-sm font-medium text-red-600">
          Please drop a pin on the map or use your current location.
        </p>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="street"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel htmlFor="houseNumber">House / Apt number *</FormLabel>
                <FormControl>
                  <Input
                    id="houseNumber"
                    {...field}
                    placeholder="e.g. 123, Apt 4B"
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
              <FormItem className="space-y-1.5">
                <FormLabel htmlFor="floor">
                  Floor{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    id="floor"
                    {...field}
                    value={field.value ?? ""}
                    placeholder="e.g. 2nd floor"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="district"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel htmlFor="district">District *</FormLabel>
                <FormControl>
                  <select
                    id="district"
                    value={field.value}
                    onBlur={field.onBlur}
                    aria-invalid={!!form.formState.errors.district}
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      form.setValue("area", "", { shouldValidate: true });
                    }}
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 aria-[invalid=true]:border-destructive"
                  >
                    <option value="">Select district</option>
                    {DISTRICT_DATA.map((d) => (
                      <option key={d.district} value={d.district}>
                        {d.district}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="area"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel htmlFor="area">Area *</FormLabel>
                <FormControl>
                  <select
                    id="area"
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(e) => field.onChange(e.target.value)}
                    disabled={!district}
                    aria-invalid={!!form.formState.errors.area}
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm disabled:opacity-50 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 aria-[invalid=true]:border-destructive"
                  >
                    <option value="">Select area</option>
                    {getAreasByDistrict(district).map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <Label>Save this address as</Label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {ADDRESS_LABELS.map(({ value, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  form.setValue("type", LABEL_TO_TYPE[value], {
                    shouldValidate: true,
                  })
                }
                className={`flex items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-sm font-medium transition-all ${
                  label === value
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-border text-muted-foreground hover:border-brand-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {value}
              </button>
            ))}
          </div>
        </div>
      </div>

      <StepNav
        submit
        onBack={onBack}
        onSkip={onSkip}
        skipLabel="Do this later"
        nextLabel="Save & continue"
        isLoading={form.formState.isSubmitting}
      />
      </form>
    </Form>
  );
};

// ── Step 3: Payment ────────────────────────────────────────────

const PaymentStep = ({
  onNext,
  onBack,
  onSkip,
}: {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) => {
  const [paymentType, setPaymentType] = useState<"cod" | "card">("cod");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    cardholderName?: string;
    cardNumber?: string;
    expiry?: string;
    cvv?: string;
  }>({});

  const formatCardNumber = (val: string) =>
    val
      .replace(/\D/g, "")
      .slice(0, 16)
      .replace(/(.{4})/g, "$1 ")
      .trim();

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const validateCard = () => {
    const rawCard = cardNumber.replace(/\s/g, "");
    const nextErrors: typeof errors = {};

    if (!cardholderName.trim())
      nextErrors.cardholderName = "Cardholder name is required.";

    if (!rawCard) nextErrors.cardNumber = "Card number is required.";
    else if (rawCard.length < 13 || rawCard.length > 16)
      nextErrors.cardNumber = "Enter a valid card number.";

    if (!expiry) nextErrors.expiry = "Expiry date is required.";
    else {
      const [monthStr, yearStr] = expiry.split("/");
      const expiryMonth = parseInt(monthStr, 10);
      const expiryYear = parseInt(`20${yearStr}`, 10);
      if (
        !yearStr ||
        isNaN(expiryMonth) ||
        isNaN(expiryYear) ||
        expiryMonth < 1 ||
        expiryMonth > 12
      ) {
        nextErrors.expiry = "Enter a valid MM/YY expiry date.";
      }
    }

    if (!cvv) nextErrors.cvv = "CVV is required.";
    else if (cvv.length < 3) nextErrors.cvv = "Enter a valid CVV.";

    return nextErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (paymentType === "cod") {
      onNext();
      return;
    }

    const nextErrors = validateCard();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const rawCard = cardNumber.replace(/\s/g, "");
    const [monthStr, yearStr] = expiry.split("/");
    const expiryMonth = parseInt(monthStr, 10);
    const expiryYear = parseInt(`20${yearStr}`, 10);

    setIsLoading(true);
    try {
      const firstDigit = rawCard[0];
      const provider =
        firstDigit === "4"
          ? "visa"
          : firstDigit === "5"
            ? "mastercard"
            : firstDigit === "3"
              ? "amex"
              : "card";
      const res = await userService.addPaymentMethod({
        type: "card",
        provider,
        token: rawCard,
        last4: rawCard.slice(-4),
        isDefault: true,
        expiryMonth,
        expiryYear,
      });
      if (!res.success) throw new Error(res.message);
      toast.success("Card saved!", {
        description: "Your payment method has been added.",
      });
      onNext();
    } catch (err) {
      toast.error("Error", {
        description:
          err instanceof Error
            ? err.message
            : "Failed to save card. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <StepHeader
        icon={Wallet}
        title="How would you like to pay?"
        subtitle="Cash on delivery is ready to go. Prefer cards? Add one now — it's encrypted and you can manage it later."
      />

      <div className="space-y-3">
        <OptionCard
          icon={Wallet}
          title="Cash on delivery"
          description="Pay with cash when your order arrives"
          badge="Default"
          selected={paymentType === "cod"}
          onSelect={() => setPaymentType("cod")}
        />
        <OptionCard
          icon={CreditCard}
          title="Credit / debit card"
          description="Visa, Mastercard and Amex accepted"
          selected={paymentType === "card"}
          onSelect={() => setPaymentType("card")}
        />
      </div>

      {paymentType === "card" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <div className="mt-4 space-y-4 rounded-2xl border border-border bg-muted/40 p-4">
            <div>
              <Label htmlFor="cardholderName">Cardholder name</Label>
              <Input
                id="cardholderName"
                value={cardholderName}
                onChange={(e) => {
                  setCardholderName(e.target.value);
                  if (errors.cardholderName)
                    setErrors((p) => ({ ...p, cardholderName: undefined }));
                }}
                placeholder="Full name on card"
                aria-invalid={!!errors.cardholderName}
                className="mt-1.5"
              />
              {errors.cardholderName && (
                <p className="mt-1.5 text-sm font-medium text-red-600">
                  {errors.cardholderName}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="cardNumber">Card number</Label>
              <Input
                id="cardNumber"
                value={cardNumber}
                onChange={(e) => {
                  setCardNumber(formatCardNumber(e.target.value));
                  if (errors.cardNumber)
                    setErrors((p) => ({ ...p, cardNumber: undefined }));
                }}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                inputMode="numeric"
                aria-invalid={!!errors.cardNumber}
                className="mt-1.5 font-mono tracking-wider"
              />
              {errors.cardNumber && (
                <p className="mt-1.5 text-sm font-medium text-red-600">
                  {errors.cardNumber}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiry">Expiry (MM/YY)</Label>
                <Input
                  id="expiry"
                  value={expiry}
                  onChange={(e) => {
                    setExpiry(formatExpiry(e.target.value));
                    if (errors.expiry)
                      setErrors((p) => ({ ...p, expiry: undefined }));
                  }}
                  placeholder="MM/YY"
                  maxLength={5}
                  inputMode="numeric"
                  aria-invalid={!!errors.expiry}
                  className="mt-1.5"
                />
                {errors.expiry && (
                  <p className="mt-1.5 text-sm font-medium text-red-600">
                    {errors.expiry}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  value={cvv}
                  onChange={(e) => {
                    setCvv(e.target.value.replace(/\D/g, "").slice(0, 4));
                    if (errors.cvv)
                      setErrors((p) => ({ ...p, cvv: undefined }));
                  }}
                  placeholder="•••"
                  maxLength={4}
                  type="password"
                  inputMode="numeric"
                  aria-invalid={!!errors.cvv}
                  className="mt-1.5"
                />
                {errors.cvv && (
                  <p className="mt-1.5 text-sm font-medium text-red-600">
                    {errors.cvv}
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <StepNav
        submit
        onBack={onBack}
        onSkip={onSkip}
        skipLabel="Do this later"
        nextLabel={
          paymentType === "cod" ? "Continue with cash" : "Save card & continue"
        }
        isLoading={isLoading}
      />
    </form>
  );
};

// ── Step 4: Completion ────────────────────────────────────────

const CompletionStep = ({
  addressAdded,
  paymentAdded,
  onComplete,
}: {
  addressAdded: boolean;
  paymentAdded: boolean;
  onComplete: () => void;
}) => {
  const navigate = useNavigate();
  const completedRef = useRef(false);

  useEffect(() => {
    if (!completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
    const timer = setTimeout(() => navigate("/", { replace: true }), 2600);
    return () => clearTimeout(timer);
  }, [onComplete, navigate]);

  const items = [
    ...(addressAdded
      ? [{ icon: MapPin, text: "Delivery address added" }]
      : []),
    ...(paymentAdded
      ? [{ icon: CreditCard, text: "Payment method configured" }]
      : []),
  ];

  return (
    <div className="py-6 text-center sm:py-10">
      <motion.span
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 16 }}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-200"
      >
        <CheckCircle2 className="h-10 w-10" />
      </motion.span>

      <h2 className="mt-6 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        You're all set!
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-[0.95rem] text-muted-foreground">
        Your account is ready. Let's find something delicious — taking you home
        now.
      </p>

      {items.length > 0 && (
        <div className="mx-auto mt-7 max-w-xs space-y-2 text-left">
          {items.map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3"
            >
              <Icon className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-foreground">{text}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-col items-center gap-3">
        <Button
          variant="brand"
          size="lg"
          onClick={() => navigate("/", { replace: true })}
          className="min-w-[12rem]"
        >
          Explore restaurants
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/profile", { replace: true })}
          className="text-muted-foreground"
        >
          Go to my profile
        </Button>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────

const OnboardingPage = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [addressAdded, setAddressAdded] = useState(false);
  const [paymentAdded, setPaymentAdded] = useState(false);

  const rawStep = searchParams.get("step") ?? "welcome";
  const step = STEP_INDEX[rawStep] ?? 0;

  const goTo = useCallback(
    (id: string) => setSearchParams({ step: id }, { replace: true }),
    [setSearchParams],
  );

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    // Bounce already-onboarded users — but not while the success screen
    // (step 3) is playing, where we flip the flag ourselves on purpose.
    if (user.onboardingCompleted && step !== 3) {
      navigate("/", { replace: true });
    }
  }, [user, navigate, step]);

  useEffect(() => {
    if (!searchParams.get("step")) {
      setSearchParams({ step: "welcome" }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleCompleteOnboarding = useCallback(
    async (redirect = true) => {
      try {
        await authService.completeOnboarding();
      } catch {
        // best-effort — the flag also flips client-side below
      } finally {
        updateUser({ onboardingCompleted: true });
        if (redirect) navigate("/", { replace: true });
      }
    },
    [navigate, updateUser],
  );

  if (!user) return null;

  return (
    <OnboardingLayout
      role="customer"
      steps={STEPS}
      currentStep={step}
      onExit={step < 3 ? () => handleCompleteOnboarding(true) : undefined}
    >
      {step === 0 && (
        <WelcomeStep
          userName={`${user.firstName} ${user.lastName}`}
          onGetStarted={() => goTo("delivery-address")}
        />
      )}
      {step === 1 && (
        <AddressStep
          onNext={() => {
            setAddressAdded(true);
            goTo("payment");
          }}
          onBack={() => goTo("welcome")}
          onSkip={() => goTo("payment")}
        />
      )}
      {step === 2 && (
        <PaymentStep
          onNext={() => {
            setPaymentAdded(true);
            goTo("complete");
          }}
          onBack={() => goTo("delivery-address")}
          onSkip={() => goTo("complete")}
        />
      )}
      {step === 3 && (
        <CompletionStep
          addressAdded={addressAdded}
          paymentAdded={paymentAdded}
          onComplete={() => handleCompleteOnboarding(false)}
        />
      )}
    </OnboardingLayout>
  );
};

export default OnboardingPage;
