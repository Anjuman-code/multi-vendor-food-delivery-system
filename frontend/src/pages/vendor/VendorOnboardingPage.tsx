import {
  DISTRICT_DATA,
  getAreasByDistrict,
} from "@/components/locationUtils";
import {
  OnboardingLayout,
  OptionCard,
  StepHeader,
  StepNav,
  type OnboardingStep,
} from "@/components/onboarding";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import authService from "@/services/authService";
import vendorService from "@/services/vendorService";
import type { CreateRestaurantPayload } from "@/types/vendor";
import { motion } from "framer-motion";
import {
  Banknote,
  Bike,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Rocket,
  Smartphone,
  Store,
  Truck,
  Utensils,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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

const MOBILE_MONEY_PROVIDERS = [
  { value: "bkash", label: "bKash" },
  { value: "nagad", label: "Nagad" },
  { value: "rocket", label: "Rocket" },
  { value: "upay", label: "Upay" },
];

const STEPS: OnboardingStep[] = [
  { id: "welcome", label: "Welcome", description: "How it works", icon: Store },
  {
    id: "restaurant",
    label: "Restaurant",
    description: "Tell us the basics",
    icon: Utensils,
  },
  {
    id: "delivery",
    label: "Hours & delivery",
    description: "When & how you deliver",
    icon: Truck,
  },
  { id: "payout", label: "Payout", description: "Get paid your way", icon: Wallet },
  { id: "launch", label: "Launch", description: "Go live", icon: Rocket },
];

interface DayHours {
  day: string;
  open: string;
  close: string;
  isClosed: boolean;
}

const defaultHours = (): DayHours[] =>
  DAYS.map((day) => ({
    day,
    open: "09:00",
    close: "22:00",
    isClosed: false,
  }));

type PayoutMethod = "mobile" | "bank";

const VendorOnboardingPage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingRestaurantId, setExistingRestaurantId] = useState<string | null>(
    null,
  );

  // Restaurant basics
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [street, setStreet] = useState("");
  const [district, setDistrict] = useState("");
  const [area, setArea] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Hours & delivery
  const [hours, setHours] = useState<DayHours[]>(defaultHours);
  const [minimumOrder, setMinimumOrder] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("30");

  // Payout
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>("mobile");
  const [provider, setProvider] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (user.onboardingCompleted) {
      navigate("/vendor", { replace: true });
      return;
    }
    void (async () => {
      try {
        const [profileRes, restaurantsRes] = await Promise.all([
          vendorService.getProfile(),
          vendorService.getRestaurants(),
        ]);

        if (profileRes.success && profileRes.data) {
          setName((prev) => prev || profileRes.data?.businessName || "");
          setPhone((prev) => prev || profileRes.data?.businessPhone || "");
          setEmail(
            (prev) => prev || profileRes.data?.businessEmail || user.email || "",
          );
        } else if (user.email) {
          setEmail((prev) => prev || user.email);
        }

        const restaurant = restaurantsRes.success
          ? restaurantsRes.data?.restaurants?.[0]
          : undefined;
        if (restaurant) {
          setExistingRestaurantId(restaurant._id);
          setName((prev) => prev || restaurant.name || "");
          setDescription((prev) => prev || restaurant.description || "");
        }
      } catch {
        // Non-blocking — vendor can fill everything from scratch
      } finally {
        setBootstrapping(false);
      }
    })();
  }, [user, navigate]);

  const toggleCuisine = (cuisine: string) =>
    setCuisines((prev) =>
      prev.includes(cuisine)
        ? prev.filter((c) => c !== cuisine)
        : [...prev, cuisine],
    );

  const updateHours = (index: number, patch: Partial<DayHours>) =>
    setHours((prev) =>
      prev.map((h, i) => (i === index ? { ...h, ...patch } : h)),
    );

  const validateRestaurant = (): boolean => {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = "Enter your restaurant name.";
    if (description.trim().length < 10)
      next.description = "Add a short description (at least 10 characters).";
    if (cuisines.length === 0) next.cuisines = "Pick at least one cuisine.";
    if (phone.trim().length < 6) next.phone = "Enter a contact phone number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Enter a valid email address.";
    if (street.trim().length < 2) next.street = "Enter your street address.";
    if (!district) next.district = "Select a district.";
    if (!area) next.area = "Select an area.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleRestaurantNext = () => {
    if (validateRestaurant()) setStep(2);
  };

  const handleLaunch = useCallback(async () => {
    setSubmitting(true);
    try {
      const payload: CreateRestaurantPayload = {
        name: name.trim(),
        description: description.trim(),
        cuisineType: cuisines,
        phone: phone.trim(),
        email: email.trim(),
        address: {
          street: street.trim(),
          area,
          district,
        },
        openingHours: hours,
        minimumOrder: minimumOrder ? Number(minimumOrder) : undefined,
        deliveryFee: deliveryFee ? Number(deliveryFee) : undefined,
        estimatedDeliveryTime: deliveryTime ? Number(deliveryTime) : undefined,
      };

      const restaurantRes = existingRestaurantId
        ? await vendorService.updateRestaurant(existingRestaurantId, payload)
        : await vendorService.createRestaurant(payload);

      if (!restaurantRes.success) {
        throw new Error(restaurantRes.message || "Could not save your restaurant.");
      }

      // Persist payout details (best-effort — not blocking go-live)
      const bankDetails =
        payoutMethod === "mobile"
          ? provider || mobileNumber
            ? { mobileMoneyProvider: provider, mobileMoneyNumber: mobileNumber }
            : null
          : bankName || accountNumber
            ? { bankName, accountHolderName, accountNumber }
            : null;

      if (bankDetails) {
        await vendorService.updateProfile({ bankDetails });
      }

      await authService.completeOnboarding();
      updateUser({ onboardingCompleted: true });

      toast({
        title: "You're live! 🎉",
        description:
          "Your restaurant is set up. Add menu items to start taking orders.",
      });
      navigate("/vendor", { replace: true });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Couldn't finish setup",
        description:
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    name,
    description,
    cuisines,
    phone,
    email,
    street,
    area,
    district,
    hours,
    minimumOrder,
    deliveryFee,
    deliveryTime,
    payoutMethod,
    provider,
    mobileNumber,
    bankName,
    accountHolderName,
    accountNumber,
    existingRestaurantId,
    updateUser,
    navigate,
    toast,
  ]);

  if (!user) return null;

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  const openDaysCount = hours.filter((h) => !h.isClosed).length;

  return (
    <OnboardingLayout role="vendor" steps={STEPS} currentStep={step}>
      {/* ── Step 0: Welcome ── */}
      {step === 0 && (
        <div>
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-red-500 text-white shadow-lg shadow-brand-500/25">
            <Store className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Welcome aboard
            {name ? `, ${name}` : user.firstName ? `, ${user.firstName}` : ""}!
          </h2>
          <p className="mt-2 max-w-md text-[0.95rem] leading-relaxed text-muted-foreground">
            Let's get your restaurant ready for orders. It only takes a few
            minutes, and you can fine-tune everything later from your dashboard.
          </p>

          <div className="mt-7 space-y-3">
            {[
              {
                icon: Utensils,
                title: "Set up your restaurant",
                desc: "Name, cuisine and where you're located.",
              },
              {
                icon: Truck,
                title: "Hours & delivery",
                desc: "When you're open and your delivery terms.",
              },
              {
                icon: Wallet,
                title: "Payout details",
                desc: "Choose how you'd like to receive earnings.",
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

          <StepNav nextLabel="Start setup" onNext={() => setStep(1)} />
        </div>
      )}

      {/* ── Step 1: Restaurant basics ── */}
      {step === 1 && (
        <div>
          <StepHeader
            icon={Utensils}
            title="About your restaurant"
            subtitle="This is what customers will see when they discover you on Food Rush."
          />

          <div className="space-y-4">
            <Field label="Restaurant name" error={errors.name} htmlFor="r-name">
              <Input
                id="r-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Spice Garden"
              />
            </Field>

            <Field
              label="Short description"
              error={errors.description}
              htmlFor="r-desc"
            >
              <Textarea
                id="r-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="A line or two about your food and what makes it special."
              />
            </Field>

            <div>
              <Label>Cuisine types</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {CUISINE_OPTIONS.map((cuisine) => {
                  const active = cuisines.includes(cuisine);
                  return (
                    <button
                      key={cuisine}
                      type="button"
                      onClick={() => toggleCuisine(cuisine)}
                      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all ${
                        active
                          ? "border-brand-500 bg-brand-500 text-white"
                          : "border-border bg-card text-muted-foreground hover:border-brand-200"
                      }`}
                    >
                      {cuisine}
                    </button>
                  );
                })}
              </div>
              {errors.cuisines && (
                <p className="mt-1.5 text-xs text-red-600">{errors.cuisines}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Contact phone" error={errors.phone} htmlFor="r-phone">
                <Input
                  id="r-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  inputMode="tel"
                />
              </Field>
              <Field label="Contact email" error={errors.email} htmlFor="r-email">
                <Input
                  id="r-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hello@restaurant.com"
                />
              </Field>
            </div>

            <Field label="Street address" error={errors.street} htmlFor="r-street">
              <Input
                id="r-street"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="House / road / block"
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="District" error={errors.district} htmlFor="r-district">
                <select
                  id="r-district"
                  value={district}
                  onChange={(e) => {
                    setDistrict(e.target.value);
                    setArea("");
                  }}
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="">Select district</option>
                  {DISTRICT_DATA.map((d) => (
                    <option key={d.district} value={d.district}>
                      {d.district}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Area" error={errors.area} htmlFor="r-area">
                <select
                  id="r-area"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  disabled={!district}
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm disabled:opacity-50 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="">Select area</option>
                  {getAreasByDistrict(district).map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <StepNav
            onBack={() => setStep(0)}
            nextLabel="Continue"
            onNext={handleRestaurantNext}
          />
        </div>
      )}

      {/* ── Step 2: Hours & delivery ── */}
      {step === 2 && (
        <div>
          <StepHeader
            icon={Clock}
            title="Hours & delivery"
            subtitle="Set when you're open and your delivery terms. You can adjust these anytime."
          />

          <div className="rounded-2xl border border-border bg-card p-2">
            {hours.map((h, i) => (
              <div
                key={h.day}
                className="flex flex-wrap items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-muted/40"
              >
                <button
                  type="button"
                  onClick={() => updateHours(i, { isClosed: !h.isClosed })}
                  className={`flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors ${
                    h.isClosed ? "bg-muted" : "bg-brand-500"
                  }`}
                  role="switch"
                  aria-checked={!h.isClosed}
                  aria-label={`Toggle ${h.day}`}
                >
                  <span
                    className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      h.isClosed ? "translate-x-0" : "translate-x-5"
                    }`}
                  />
                </button>
                <span className="w-20 shrink-0 text-sm font-medium text-foreground">
                  {h.day}
                </span>
                {h.isClosed ? (
                  <span className="text-sm text-muted-foreground">Closed</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={h.open}
                      onChange={(e) => updateHours(i, { open: e.target.value })}
                      className="h-9 w-[7.5rem]"
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input
                      type="time"
                      value={h.close}
                      onChange={(e) => updateHours(i, { close: e.target.value })}
                      className="h-9 w-[7.5rem]"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Min. order (৳)" htmlFor="d-min">
              <Input
                id="d-min"
                type="number"
                min={0}
                value={minimumOrder}
                onChange={(e) => setMinimumOrder(e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field label="Delivery fee (৳)" htmlFor="d-fee">
              <Input
                id="d-fee"
                type="number"
                min={0}
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field label="Prep + delivery (min)" htmlFor="d-time">
              <Input
                id="d-time"
                type="number"
                min={0}
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                placeholder="30"
              />
            </Field>
          </div>

          <StepNav
            onBack={() => setStep(1)}
            nextLabel="Continue"
            onNext={() => setStep(3)}
          />
        </div>
      )}

      {/* ── Step 3: Payout ── */}
      {step === 3 && (
        <div>
          <StepHeader
            icon={Wallet}
            title="How would you like to get paid?"
            subtitle="Add your payout details so earnings reach you on schedule. You can skip and set this up later."
          />

          <div className="space-y-3">
            <OptionCard
              icon={Smartphone}
              title="Mobile money"
              description="bKash, Nagad, Rocket or Upay"
              badge="Popular"
              selected={payoutMethod === "mobile"}
              onSelect={() => setPayoutMethod("mobile")}
            />
            <OptionCard
              icon={Banknote}
              title="Bank transfer"
              description="Weekly payout to your business account"
              selected={payoutMethod === "bank"}
              onSelect={() => setPayoutMethod("bank")}
            />
          </div>

          {payoutMethod === "mobile" ? (
            <div className="mt-5 space-y-4 rounded-2xl border border-border bg-muted/40 p-4">
              <Field label="Provider" htmlFor="p-provider">
                <select
                  id="p-provider"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="">Select provider</option>
                  {MOBILE_MONEY_PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Mobile money number" htmlFor="p-number">
                <Input
                  id="p-number"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  inputMode="tel"
                />
              </Field>
            </div>
          ) : (
            <div className="mt-5 space-y-4 rounded-2xl border border-border bg-muted/40 p-4">
              <Field label="Account holder name" htmlFor="p-holder">
                <Input
                  id="p-holder"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  placeholder="Full name / business name"
                />
              </Field>
              <Field label="Bank name" htmlFor="p-bank">
                <Input
                  id="p-bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. Dutch-Bangla Bank"
                />
              </Field>
              <Field label="Account number" htmlFor="p-acc">
                <Input
                  id="p-acc"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Enter account number"
                />
              </Field>
            </div>
          )}

          <StepNav
            onBack={() => setStep(2)}
            onSkip={() => setStep(4)}
            skipLabel="Add later"
            nextLabel="Continue"
            onNext={() => setStep(4)}
          />
        </div>
      )}

      {/* ── Step 4: Launch ── */}
      {step === 4 && (
        <div>
          <StepHeader
            icon={Rocket}
            title="Ready to go live"
            subtitle="Review your setup and launch. Your restaurant will be submitted for approval and you'll land on your dashboard."
          />

          <div className="space-y-3">
            <SummaryRow icon={Store} title={name || "Your restaurant"}>
              {cuisines.length > 0 ? cuisines.join(" · ") : "Cuisine not set"}
            </SummaryRow>
            <SummaryRow icon={MapPin} title="Location">
              {[street, area, district].filter(Boolean).join(", ") ||
                "Not provided"}
            </SummaryRow>
            <SummaryRow icon={Clock} title="Open hours">
              {openDaysCount} day{openDaysCount === 1 ? "" : "s"} a week
            </SummaryRow>
            <SummaryRow icon={Bike} title="Delivery">
              {deliveryFee ? `৳${deliveryFee} fee` : "Free delivery"}
              {deliveryTime ? ` · ~${deliveryTime} min` : ""}
            </SummaryRow>
            <SummaryRow icon={Wallet} title="Payout">
              {payoutMethod === "mobile"
                ? provider || mobileNumber
                  ? "Mobile money"
                  : "Set up later"
                : bankName || accountNumber
                  ? "Bank transfer"
                  : "Set up later"}
            </SummaryRow>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 flex items-start gap-2.5 rounded-xl border border-brand-100 bg-brand-50/60 p-4"
          >
            <Rocket className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <p className="text-sm leading-relaxed text-foreground/80">
              Next up: add a few menu items from your dashboard so customers can
              start ordering. You're moments away!
            </p>
          </motion.div>

          <StepNav
            onBack={() => setStep(3)}
            nextLabel="Launch my restaurant"
            onNext={handleLaunch}
            isLoading={submitting}
          />
        </div>
      )}
    </OnboardingLayout>
  );
};

// ── Small helpers ──────────────────────────────────────────────

const Field = ({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
}) => (
  <div>
    <Label htmlFor={htmlFor}>{label}</Label>
    <div className="mt-1.5">{children}</div>
    {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
  </div>
);

const SummaryRow = ({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Store;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
      <Icon className="h-5 w-5" />
    </span>
    <div className="min-w-0 flex-1">
      <p className="truncate font-semibold text-foreground">{title}</p>
      <p className="truncate text-sm text-muted-foreground">{children}</p>
    </div>
    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
  </div>
);

export default VendorOnboardingPage;
