import { DISTRICT_DATA, getAreasByDistrict, reverseGeocodeCoordinates } from '@/components/locationUtils';
import { AnimatePresence, motion } from 'framer-motion';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import { CheckCircle2, CreditCard, Home, Loader2, MapPin, Navigation, Wallet } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MapContainer,
  Marker,
  TileLayer,
  useMapEvents,
} from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import authService from '../services/authService';
import type { AddAddressPayload } from '../services/userService';
import userService from '../services/userService';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const STEPS = 3;
const STORAGE_KEY = 'onboarding_step';
const ADDRESS_LABELS = ['Home', 'Work', 'Other'] as const;

type AddressLabel = (typeof ADDRESS_LABELS)[number];

// ── Progress Bar ───────────────────────────────────────────────

const ProgressBar = ({ step }: { step: number }) => {
  const percent = (step / STEPS) * 100;
  return (
    <div className="fixed top-0 left-0 w-full h-[3px] bg-gray-100 z-50">
      <motion.div
        className="h-full bg-gradient-to-r from-orange-500 to-pink-500"
        initial={false}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
      />
    </div>
  );
};

// ── Step wrapper ───────────────────────────────────────────────

const stepVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
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
  onSkip,
}: {
  userName: string;
  onGetStarted: () => void;
  onSkip: () => void;
}) => (
  <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
    <motion.div
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center mb-8 shadow-lg shadow-orange-200"
    >
      <span className="text-4xl">🍔</span>
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <h1 className="text-3xl sm:text-4xl font-bold mb-3 text-gray-900">
        Welcome, {userName.split(' ')[0]}!
      </h1>
      <p className="text-gray-500 mb-8 max-w-sm mx-auto text-base leading-relaxed">
        Let's get you set up in just two quick steps so you're ready to order.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10 max-w-sm mx-auto">
        <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-100 rounded-xl text-left">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-orange-400 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Delivery address</p>
            <p className="text-xs text-gray-500">Where to bring your food</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 bg-pink-50 border border-pink-100 rounded-xl text-left">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-pink-500 to-pink-400 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Payment method</p>
            <p className="text-xs text-gray-500">Cash on delivery by default</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 w-full max-w-xs mx-auto">
        <Button
          onClick={onGetStarted}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md shadow-orange-200"
          size="lg"
        >
          Get started
        </Button>
        <Button
          onClick={onSkip}
          variant="ghost"
          className="w-full text-gray-400 hover:text-gray-600 text-sm"
        >
          Skip for now
        </Button>
      </div>
    </motion.div>
  </div>
);

// ── Step 2: Address ────────────────────────────────────────────

const AddressStep = ({
  onNext,
  onSkip,
}: {
  onNext: () => void;
  onSkip: () => void;
}) => {
  const [houseNumber, setHouseNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [instructions, setInstructions] = useState('');
  const [label, setLabel] = useState<AddressLabel>('Home');
  const [district, setDistrict] = useState('');
  const [area, setArea] = useState('');
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const { toast } = useToast();

  const handleCoordinatesUpdate = useCallback(
    async (latitude: number, longitude: number) => {
      setLat(latitude);
      setLng(longitude);
      setIsDetecting(true);

      try {
        const resolvedAddress = await reverseGeocodeCoordinates(latitude, longitude);

        if (resolvedAddress.street) setHouseNumber(resolvedAddress.street);

        let districtValue = resolvedAddress.district;
        let areaValue = resolvedAddress.area;

        const districtExists = DISTRICT_DATA.some(
          (d) => d.district.toLowerCase() === districtValue?.toLowerCase(),
        );

        if (!districtExists) {
          districtValue = 'Sylhet';
          areaValue = 'Sylhet Sadar';
        } else if (areaValue) {
          const districtData = DISTRICT_DATA.find(
            (d) => d.district.toLowerCase() === districtValue?.toLowerCase(),
          );
          const areaExists = districtData?.areas.some(
            (a) => a.toLowerCase() === areaValue?.toLowerCase(),
          );
          if (!areaExists) areaValue = districtData?.areas[0] || 'Sylhet Sadar';
        }

        if (districtValue) setDistrict(districtValue);
        if (areaValue) setArea(areaValue);

        toast({ title: 'Location detected', description: 'Address fields filled from GPS.' });
      } catch {
        setDistrict('Sylhet');
        setArea('Sylhet Sadar');
        toast({ title: 'Location set', description: 'Coordinates saved. Defaulting to Sylhet.' });
      } finally {
        setIsDetecting(false);
      }
    },
    [toast],
  );

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: 'Not supported', description: 'Geolocation is not supported by your browser.', variant: 'destructive' });
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
        toast({
          title: 'Location error',
          description: err.code === 1
            ? 'Location permission denied. Please allow access and try again.'
            : 'Could not detect your location. Please try again.',
          variant: 'destructive',
        });
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseNumber) {
      toast({ title: 'Required', description: 'Please enter your house/apartment number.', variant: 'destructive' });
      return;
    }
    if (!district || !area) {
      toast({ title: 'Required', description: 'Please select a district and area.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const payload: AddAddressPayload = {
        type: label.toLowerCase() as 'home' | 'work' | 'other',
        street: houseNumber,
        apartment: floor || undefined,
        district,
        area,
        coordinates: {
          latitude: lat !== 0 ? lat : 23.8103,
          longitude: lng !== 0 ? lng : 90.4125,
        },
        isDefault: true,
      };
      const res = await userService.addAddress(payload);
      if (!res.success) throw new Error(res.message);
      toast({ title: 'Address saved!', description: 'Your delivery address has been added.' });
      onNext();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save address. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-2xl font-bold text-gray-900">Delivery Address</h2>
          <Button variant="ghost" size="sm" onClick={onSkip} className="text-gray-400 hover:text-gray-600 text-sm">
            Skip
          </Button>
        </div>
        <p className="text-gray-500 text-sm">Where should we deliver your orders?</p>
      </div>

      {/* GPS auto-fill */}
      <div className="flex items-center justify-between gap-3 p-4 border border-orange-100 rounded-2xl bg-orange-50 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-orange-400 flex items-center justify-center flex-shrink-0">
            <Navigation className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Use GPS location</p>
            <p className="text-xs text-gray-500">Auto-fill address from coordinates</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isDetecting}
          className="rounded-xl border-orange-200 hover:bg-orange-100 flex-shrink-0 gap-1.5"
          onClick={handleUseLocation}
        >
          {isDetecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
          {isDetecting ? 'Detecting…' : 'Auto-fill'}
        </Button>
      </div>

      {/* Map */}
      <div className="h-44 w-full rounded-2xl overflow-hidden border border-gray-200 mb-6 relative">
        <MapContainer
          center={lat !== 0 ? [lat, lng] : [23.8103, 90.4125]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationPickerMap lat={lat} lng={lng} onChange={handleCoordinatesUpdate} />
        </MapContainer>
        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-xs text-gray-500 pointer-events-none">
          Tap the map to pin your location
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="houseNumber">House / Apt Number *</Label>
            <Input
              id="houseNumber"
              value={houseNumber}
              onChange={(e) => setHouseNumber(e.target.value)}
              placeholder="e.g., 123, Apt 4B"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="floor">Floor <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Input
              id="floor"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              placeholder="e.g., 2nd Floor"
              className="mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="district">District *</Label>
            <select
              id="district"
              value={district}
              onChange={(e) => { setDistrict(e.target.value); setArea(''); }}
              className="mt-1 w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
            >
              <option value="">Select district</option>
              {DISTRICT_DATA.map((d) => (
                <option key={d.district} value={d.district}>{d.district}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="area">Area *</Label>
            <select
              id="area"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              disabled={!district}
              className="mt-1 w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
            >
              <option value="">Select area</option>
              {getAreasByDistrict(district).map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label htmlFor="instructions">Rider Instructions <span className="text-gray-400 font-normal">(optional)</span></Label>
          <Textarea
            id="instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g., Ring bell twice, ask for building code at gate"
            rows={2}
            className="mt-1"
          />
        </div>

        <div>
          <Label>Label</Label>
          <div className="flex gap-2 mt-2">
            {ADDRESS_LABELS.map((l) => (
              <Button
                key={l}
                type="button"
                variant={label === l ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLabel(l)}
                className={label === l ? 'bg-orange-500 hover:bg-orange-600 border-orange-500' : 'border-gray-200'}
              >
                {l === 'Home' ? <Home className="w-3.5 h-3.5 mr-1" /> : l === 'Work' ? <Wallet className="w-3.5 h-3.5 mr-1" /> : <MapPin className="w-3.5 h-3.5 mr-1" />}
                {l}
              </Button>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white mt-2"
          size="lg"
        >
          {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : 'Save & Continue'}
        </Button>
      </form>
    </div>
  );
};

// ── Step 3: Payment ────────────────────────────────────────────

const PaymentStep = ({
  onNext,
  onSkip,
}: {
  onNext: () => void;
  onSkip: () => void;
}) => {
  const [paymentType, setPaymentType] = useState<'cod' | 'card'>('cod');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const formatCardNumber = (val: string) =>
    val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentType === 'cod') {
      // COD is default — no API call needed, just proceed
      onNext();
      return;
    }

    const rawCard = cardNumber.replace(/\s/g, '');
    if (!rawCard || rawCard.length < 13 || !expiry || !cvv || !cardholderName) {
      toast({ title: 'Incomplete', description: 'Please fill in all card details.', variant: 'destructive' });
      return;
    }

    const [monthStr, yearStr] = expiry.split('/');
    const expiryMonth = parseInt(monthStr, 10);
    const expiryYear = parseInt(`20${yearStr}`, 10);

    if (isNaN(expiryMonth) || isNaN(expiryYear) || expiryMonth < 1 || expiryMonth > 12) {
      toast({ title: 'Invalid expiry', description: 'Enter a valid MM/YY expiry date.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const firstDigit = rawCard[0];
      const provider = firstDigit === '4' ? 'visa' : firstDigit === '5' ? 'mastercard' : firstDigit === '3' ? 'amex' : 'card';
      const res = await userService.addPaymentMethod({
        type: 'card',
        provider,
        token: rawCard,
        last4: rawCard.slice(-4),
        isDefault: true,
        expiryMonth,
        expiryYear,
      });
      if (!res.success) throw new Error(res.message);
      toast({ title: 'Card saved!', description: 'Your payment method has been added.' });
      onNext();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save card. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-2xl font-bold text-gray-900">Payment Method</h2>
          <Button variant="ghost" size="sm" onClick={onSkip} className="text-gray-400 hover:text-gray-600 text-sm">
            Skip
          </Button>
        </div>
        <p className="text-gray-500 text-sm">Choose how you'd like to pay for orders.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Method selector */}
        <div className="space-y-3">
          {(['cod', 'card'] as const).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentType(method)}
              className={`w-full text-left border-2 rounded-2xl p-4 transition-all duration-200 ${
                paymentType === method
                  ? 'border-orange-500 bg-orange-50 shadow-sm shadow-orange-100'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  paymentType === method ? 'bg-gradient-to-br from-orange-500 to-orange-400' : 'bg-gray-100'
                }`}>
                  {method === 'cod'
                    ? <Wallet className={`w-5 h-5 ${paymentType === method ? 'text-white' : 'text-gray-400'}`} />
                    : <CreditCard className={`w-5 h-5 ${paymentType === method ? 'text-white' : 'text-gray-400'}`} />
                  }
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">
                      {method === 'cod' ? 'Cash on Delivery' : 'Credit / Debit Card'}
                    </span>
                    {method === 'cod' && (
                      <span className="text-xs font-medium px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Default</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {method === 'cod' ? 'Pay with cash when your order arrives' : 'Visa, Mastercard, Amex accepted'}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Card form */}
        <AnimatePresence>
          {paymentType === 'card' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="space-y-4 p-4 border border-gray-200 rounded-2xl bg-gray-50">
                <div>
                  <Label htmlFor="cardholderName">Cardholder Name</Label>
                  <Input
                    id="cardholderName"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    placeholder="Full name on card"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    inputMode="numeric"
                    className="mt-1 font-mono tracking-wider"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiry">Expiry (MM/YY)</Label>
                    <Input
                      id="expiry"
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/YY"
                      maxLength={5}
                      inputMode="numeric"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="•••"
                      maxLength={4}
                      type="password"
                      inputMode="numeric"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white mt-2"
          size="lg"
        >
          {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : paymentType === 'cod' ? 'Continue with Cash on Delivery' : 'Save Card & Continue'}
        </Button>
      </form>
    </div>
  );
};

// ── Completion screen ─────────────────────────────────────────

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
    const timer = setTimeout(() => navigate('/', { replace: true }), 2000);
    return () => clearTimeout(timer);
  }, [onComplete, navigate]);

  const items = [
    ...(addressAdded ? [{ icon: <MapPin className="w-4 h-4" />, text: 'Delivery address added' }] : []),
    ...(paymentAdded ? [{ icon: <CreditCard className="w-4 h-4" />, text: 'Payment method configured' }] : []),
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 16 }}
        className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mb-8 shadow-lg shadow-green-200"
      >
        <CheckCircle2 className="w-12 h-12 text-white" />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h1 className="text-3xl font-bold mb-3 text-gray-900">You're all set!</h1>
        <p className="text-gray-500 mb-8 max-w-xs mx-auto text-sm">
          Redirecting you to home in a moment…
        </p>

        {items.length > 0 ? (
          <div className="flex flex-col gap-2 mb-8 max-w-xs mx-auto">
            {items.map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-100 rounded-xl">
                <div className="text-green-600">{icon}</div>
                <span className="text-sm font-medium text-gray-700">{text}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-8">You can set up address and payment later in your profile.</p>
        )}

        <Button
          onClick={() => navigate('/', { replace: true })}
          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
          size="lg"
        >
          Go to Home
        </Button>
      </motion.div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────

const OnboardingPage = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? parseInt(saved, 10) : 1;
    return isNaN(parsed) || parsed < 1 || parsed > 4 ? 1 : parsed;
  });
  const [addressAdded, setAddressAdded] = useState(false);
  const [paymentAdded, setPaymentAdded] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login', { replace: true }); return; }
    if (user.onboardingCompleted) { navigate('/', { replace: true }); }
  }, [user, navigate]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, step.toString());
  }, [step]);

  const handleCompleteOnboarding = useCallback(async (redirect = true) => {
    try {
      await authService.completeOnboarding();
    } catch {
      // best-effort
    } finally {
      updateUser({ onboardingCompleted: true });
      localStorage.removeItem(STORAGE_KEY);
      if (redirect) navigate('/', { replace: true });
    }
  }, [navigate, updateUser]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-rose-50">
      {step <= STEPS && <ProgressBar step={step} />}

      {/* Brand header */}
      <div className="pt-8 pb-2 flex justify-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
            <span className="text-sm font-bold text-white">F</span>
          </div>
          <span className="font-bold text-gray-800 text-lg">Food Rush</span>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl pt-2 pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {step === 1 && (
              <WelcomeStep
                userName={`${user.firstName} ${user.lastName}`}
                onGetStarted={() => setStep(2)}
                onSkip={() => handleCompleteOnboarding(true)}
              />
            )}
            {step === 2 && (
              <AddressStep
                onNext={() => { setAddressAdded(true); setStep(3); }}
                onSkip={() => setStep(3)}
              />
            )}
            {step === 3 && (
              <PaymentStep
                onNext={() => { setPaymentAdded(true); setStep(4); }}
                onSkip={() => setStep(4)}
              />
            )}
            {step === 4 && (
              <CompletionStep
                addressAdded={addressAdded}
                paymentAdded={paymentAdded}
                onComplete={() => handleCompleteOnboarding(false)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OnboardingPage;
