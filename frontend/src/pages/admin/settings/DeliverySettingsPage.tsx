import React, { useEffect, useState, useMemo } from "react";
import { PageHeader, SectionCard } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";
import deliveryService from "@/services/deliveryService";
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  Compass,
  RefreshCw,
  Save,
  Truck,
} from "lucide-react";

export default function DeliverySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [minFee, setMinFee] = useState<string>("10");
  const [includedKm, setIncludedKm] = useState<string>("1");
  const [includedDistanceFee, setIncludedDistanceFee] = useState<string>("10");
  const [perKmRate, setPerKmRate] = useState<string>("10");
  const [maxFee, setMaxFee] = useState<string>("");
  const [maxDeliveryDistanceKm, setMaxDeliveryDistanceKm] = useState<string>("15");
  const [detourFactor, setDetourFactor] = useState<string>("1.3");

  // Simulator state
  const [simDistance, setSimDistance] = useState<string>("3.5");
  const [simSubtotal, setSimSubtotal] = useState<string>("600");

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await deliveryService.getSettings();
      if (res.success && res.data?.settings) {
        const s = res.data.settings;
        setMinFee(String(s.minFee ?? 10));
        setIncludedKm(String(s.includedKm ?? 1));
        setIncludedDistanceFee(String(s.includedDistanceFee ?? 10));
        setPerKmRate(String(s.perKmRate ?? 10));
        setMaxFee(s.maxFee != null ? String(s.maxFee) : "");
        setMaxDeliveryDistanceKm(String(s.maxDeliveryDistanceKm ?? 15));
        setDetourFactor(String(s.detourFactor ?? 1.3));
      }
    } catch {
      toast.error("Failed to load delivery settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedMinFee = parseFloat(minFee);
    const parsedIncludedKm = parseFloat(includedKm);
    const parsedIncludedDistanceFee = parseFloat(includedDistanceFee);
    const parsedPerKmRate = parseFloat(perKmRate);
    const parsedMaxDeliveryDistanceKm = parseFloat(maxDeliveryDistanceKm);
    const parsedDetourFactor = parseFloat(detourFactor);
    const parsedMaxFee = maxFee.trim() !== "" ? parseFloat(maxFee) : undefined;

    // Strict validation
    if (isNaN(parsedMinFee) || parsedMinFee < 10) {
      toast.error("Minimum Fee Constraint", {
        description: "Minimum delivery fee cannot be less than ৳10 by platform policy.",
      });
      return;
    }

    if (isNaN(parsedIncludedKm) || parsedIncludedKm < 0) {
      toast.error("Included Distance must be 0 or greater.");
      return;
    }

    if (isNaN(parsedPerKmRate) || parsedPerKmRate < 0) {
      toast.error("Per Km Rate must be 0 or greater.");
      return;
    }

    if (isNaN(parsedMaxDeliveryDistanceKm) || parsedMaxDeliveryDistanceKm < 1) {
      toast.error("Max Delivery Distance must be at least 1 km.");
      return;
    }

    if (isNaN(parsedDetourFactor) || parsedDetourFactor < 1 || parsedDetourFactor > 2) {
      toast.error("Detour Factor must be between 1.0 and 2.0.");
      return;
    }

    if (parsedMaxFee !== undefined && (isNaN(parsedMaxFee) || parsedMaxFee < parsedMinFee)) {
      toast.error("Max Fee must be greater than or equal to Minimum Fee.");
      return;
    }

    setSaving(true);
    try {
      const res = await deliveryService.updateSettings({
        minFee: parsedMinFee,
        includedKm: parsedIncludedKm,
        includedDistanceFee: parsedIncludedDistanceFee,
        perKmRate: parsedPerKmRate,
        maxDeliveryDistanceKm: parsedMaxDeliveryDistanceKm,
        detourFactor: parsedDetourFactor,
        maxFee: parsedMaxFee,
      });

      if (res.success && res.data) {
        toast.success("Delivery settings saved successfully");
      }
    } catch (err: unknown) {
      toast.error("Failed to save delivery settings", {
        description: (err as any)?.response?.data?.message || "An error occurred.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Live simulation calculation
  const simulationResult = useMemo(() => {
    const dist = parseFloat(simDistance) || 0;
    const minF = Math.max(10, parseFloat(minFee) || 10);
    const incKm = parseFloat(includedKm) || 1;
    const incDistFee = parseFloat(includedDistanceFee) || 10;
    const rate = parseFloat(perKmRate) || 10;
    const maxDist = parseFloat(maxDeliveryDistanceKm) || 15;
    const maxF = maxFee.trim() !== "" ? parseFloat(maxFee) : null;
    const detour = parseFloat(detourFactor) || 1.3;

    if (dist > maxDist) {
      return {
        deliverable: false,
        reason: `Exceeds max allowed delivery distance (${maxDist} km)`,
        fee: 0,
        detourFee: 0,
      };
    }

    // Pure road routing fee
    const extraKm = Math.max(0, dist - incKm);
    let fee = Math.ceil(Math.max(minF, incDistFee + extraKm * rate));
    if (maxF != null && fee > maxF) fee = maxF;

    // Haversine fallback estimate fee
    const haversineDist = dist * detour;
    const haversineExtra = Math.max(0, haversineDist - incKm);
    let detourFee = Math.ceil(Math.max(minF, incDistFee + haversineExtra * rate));
    if (maxF != null && detourFee > maxF) detourFee = maxF;

    return {
      deliverable: true,
      fee,
      detourFee,
      distanceKm: dist,
      extraKm,
    };
  }, [
    simDistance,
    minFee,
    includedKm,
    includedDistanceFee,
    perKmRate,
    maxDeliveryDistanceKm,
    maxFee,
    detourFactor,
  ]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6">
      <PageHeader
        title="Delivery Routing & Fee Settings"
        description="Configure dynamic OpenStreetMap distance calculation, per-km rates, and fallback parameters."
        actions={
          <Button
            onClick={loadSettings}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reload
          </Button>
        }
      />

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Pricing Parameters */}
          <div className="lg:col-span-2 space-y-6">
            <SectionCard
              title="Distance & Pricing Formula"
              description="Authoritative fee: max(minFee, includedDistanceFee + max(0, distanceKm − includedKm) × perKmRate), rounded up to whole Taka."
              icon={<Truck className="h-5 w-5 text-primary" />}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minFee" className="flex items-center gap-1.5">
                    Minimum Fee (৳)
                    <span className="text-xs text-rose-500 font-semibold">* (≥ ৳10 floor)</span>
                  </Label>
                  <Input
                    id="minFee"
                    type="number"
                    min={10}
                    step="1"
                    value={minFee}
                    onChange={(e) => setMinFee(e.target.value)}
                    className="mt-1"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Hard safety floor. Delivery fee can never be saved or charged below ৳10.
                  </p>
                </div>

                <div>
                  <Label htmlFor="includedDistanceFee">
                    Included Distance Fee (৳)
                  </Label>
                  <Input
                    id="includedDistanceFee"
                    type="number"
                    min={0}
                    step="1"
                    value={includedDistanceFee}
                    onChange={(e) => setIncludedDistanceFee(e.target.value)}
                    className="mt-1"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Base fee charged for the initial included radius.
                  </p>
                </div>

                <div>
                  <Label htmlFor="includedKm">Included Distance (km)</Label>
                  <Input
                    id="includedKm"
                    type="number"
                    min={0}
                    step="0.1"
                    value={includedKm}
                    onChange={(e) => setIncludedKm(e.target.value)}
                    className="mt-1"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Distance threshold covered under the base fee.
                  </p>
                </div>

                <div>
                  <Label htmlFor="perKmRate">Per-Km Rate (৳ / km)</Label>
                  <Input
                    id="perKmRate"
                    type="number"
                    min={0}
                    step="1"
                    value={perKmRate}
                    onChange={(e) => setPerKmRate(e.target.value)}
                    className="mt-1"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Additional fee per kilometer beyond the included distance.
                  </p>
                </div>

                <div>
                  <Label htmlFor="maxDeliveryDistanceKm">
                    Max Delivery Radius (km)
                  </Label>
                  <Input
                    id="maxDeliveryDistanceKm"
                    type="number"
                    min={1}
                    step="1"
                    value={maxDeliveryDistanceKm}
                    onChange={(e) => setMaxDeliveryDistanceKm(e.target.value)}
                    className="mt-1"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Orders beyond this road distance are flagged as out of range.
                  </p>
                </div>

                <div>
                  <Label htmlFor="maxFee">Maximum Fee Cap (৳, optional)</Label>
                  <Input
                    id="maxFee"
                    type="number"
                    min={10}
                    step="1"
                    placeholder="No upper limit"
                    value={maxFee}
                    onChange={(e) => setMaxFee(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional ceiling. Delivery fee will never exceed this amount.
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Routing Engine & Fallback"
              description="OpenStreetMap OSRM routing with fallback to Haversine crow-flies calculation."
              icon={<Compass className="h-5 w-5 text-primary" />}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="detourFactor">
                    Detour Factor (Straight-line multiplier)
                  </Label>
                  <Input
                    id="detourFactor"
                    type="number"
                    min={1.0}
                    max={2.0}
                    step="0.05"
                    value={detourFactor}
                    onChange={(e) => setDetourFactor(e.target.value)}
                    className="mt-1"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Used ONLY when OSRM routing is unreachable (default: 1.3×).
                  </p>
                </div>

                <div className="flex flex-col justify-center">
                  <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1">
                    <div className="font-semibold flex items-center gap-1.5 text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      OSRM Docker Ready
                    </div>
                    <p className="text-muted-foreground">
                      Powered by Geofabrik Bangladesh OSM extracts. Circuit breaker automatically falls back to Haversine if OSRM is offline.
                    </p>
                  </div>
                </div>
              </div>
            </SectionCard>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="submit"
                loading={saving}
                className="bg-primary hover:bg-primary/90 font-semibold"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Delivery Settings
              </Button>
            </div>
          </div>

          {/* Live Simulator Column */}
          <div className="space-y-6">
            <SectionCard
              title="Fee Simulator"
              description="Preview fee output with current parameters."
              icon={<Calculator className="h-5 w-5 text-primary" />}
            >
              <div className="space-y-4 text-sm">
                <div>
                  <Label htmlFor="simDistance">Test Distance (km)</Label>
                  <Input
                    id="simDistance"
                    type="number"
                    step="0.1"
                    min="0"
                    value={simDistance}
                    onChange={(e) => setSimDistance(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="simSubtotal">Subtotal (৳)</Label>
                  <Input
                    id="simSubtotal"
                    type="number"
                    step="10"
                    min="0"
                    value={simSubtotal}
                    onChange={(e) => setSimSubtotal(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2 mt-4">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Computed Output
                  </div>

                  {simulationResult.deliverable ? (
                    <>
                      <div className="flex justify-between items-center pt-1 border-b border-primary/10 pb-2">
                        <span className="text-muted-foreground">OSRM Road Fee:</span>
                        <span className="text-xl font-bold text-primary">
                          ৳{simulationResult.fee}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
                        <span>Haversine Fallback Fee:</span>
                        <span>৳{simulationResult.detourFee}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground pt-1">
                        Breakdown: ৳{includedDistanceFee} (first {includedKm} km) + ৳{perKmRate} × {simulationResult.extraKm != null ? simulationResult.extraKm.toFixed(1) : '0'} km extra
                      </div>
                    </>
                  ) : (
                    <div className="flex items-start gap-2 text-rose-600 text-xs py-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{simulationResult.reason}</span>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                  <p className="font-semibold text-foreground">OpenStreetMap Legal Attribution</p>
                  <p className="text-muted-foreground">
                    All map layers and routing profiles are powered by OpenStreetMap contributors under the ODbL license.
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </form>
    </div>
  );
}
