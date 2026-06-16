/**
 * FleetMapPage — live ops view of every in-flight delivery. Initial positions
 * come from GET /api/admin/orders/active; riders then move in real time via the
 * `admin:room` socket channel (surfaced through SocketContext.orderLocations).
 */
import { PageHeader, StatusBadge } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { useSocketContext } from '@/contexts/SocketContext';
import adminService from '@/services/adminService';
import type { DeliveryStage } from '@/types/order';
import L from 'leaflet';
import { Loader2, RefreshCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';

interface FleetOrder {
  _id: string;
  orderNumber: string;
  status: string;
  deliveryStage?: DeliveryStage;
  etaMinutes?: number;
  total: number;
  driverId?:
    | { _id: string; firstName: string; lastName: string; phoneNumber?: string }
    | string
    | null;
  restaurantId?:
    | { _id: string; name: string; address?: { coordinates?: { lat?: number; lng?: number } } }
    | string;
  customerId?: { firstName: string; lastName: string } | string;
  deliveryAddress?: { coordinates?: { latitude: number; longitude: number } };
  driverLocation?: { latitude: number; longitude: number } | null;
  createdAt: string;
}

interface LatLng {
  lat: number;
  lng: number;
}

const DEFAULT_CENTER: [number, number] = [23.8103, 90.4125]; // Dhaka

const STATUS_COLOR: Record<string, string> = {
  picked_up: '#2563eb',
  ready: '#f59e0b',
  preparing: '#f97316',
  confirmed: '#6b7280',
};

const markerIcon = (color: string, label: string) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 6px rgba(0,0,0,.3);border:2px solid #fff;">
      <span style="transform:rotate(45deg);font-size:11px;font-weight:700;color:#fff;">${label}</span>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 26],
  });

const restaurantLatLng = (o: FleetOrder): LatLng | null => {
  const r = o.restaurantId;
  if (!r || typeof r === 'string') return null;
  const c = r.address?.coordinates;
  if (c && c.lat != null && c.lng != null) return { lat: c.lat, lng: c.lng };
  return null;
};

const FitBounds: React.FC<{ points: LatLng[] }> = ({ points }) => {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || points.length === 0) return;
    done.current = true;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 13);
      return;
    }
    map.fitBounds(
      L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])),
      { padding: [50, 50], maxZoom: 14 },
    );
  }, [map, points]);
  return null;
};

const fullName = (
  p: { firstName: string; lastName: string } | string | null | undefined,
) => (p && typeof p === 'object' ? `${p.firstName} ${p.lastName}`.trim() : '');

export default function FleetMapPage() {
  const { orderLocations } = useSocketContext();
  const [orders, setOrders] = useState<FleetOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await adminService.getActiveOrders();
      const data = (res.data as { data?: { orders?: FleetOrder[] } }).data;
      setOrders(data?.orders ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  // Best-known position for an order: live socket → server snapshot →
  // customer drop-off → restaurant.
  const positionOf = useCallback(
    (o: FleetOrder): LatLng | null => {
      const live = orderLocations[o._id];
      if (live) return { lat: live.latitude, lng: live.longitude };
      if (o.driverLocation)
        return { lat: o.driverLocation.latitude, lng: o.driverLocation.longitude };
      if (o.deliveryAddress?.coordinates)
        return {
          lat: o.deliveryAddress.coordinates.latitude,
          lng: o.deliveryAddress.coordinates.longitude,
        };
      return restaurantLatLng(o);
    },
    [orderLocations],
  );

  const placed = useMemo(
    () =>
      orders
        .map((o) => ({ order: o, pos: positionOf(o) }))
        .filter((x): x is { order: FleetOrder; pos: LatLng } => x.pos !== null),
    [orders, positionOf],
  );

  const selectedOrder = orders.find((o) => o._id === selected) ?? null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Live fleet map"
        subtitle={`${orders.length} active ${orders.length === 1 ? 'delivery' : 'deliveries'}`}
        actions={
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCcw className="mr-1.5 h-4 w-4" /> Refresh
          </Button>
        }
      />

      {loading ? (
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Active orders list */}
          <div className="order-2 max-h-[70vh] space-y-2 overflow-y-auto lg:order-1">
            {orders.length === 0 ? (
              <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                No active deliveries right now.
              </p>
            ) : (
              orders.map((o) => (
                <button
                  key={o._id}
                  type="button"
                  onClick={() => setSelected(o._id)}
                  className={`w-full rounded-xl border bg-card p-3 text-left transition-colors ${
                    selected === o._id
                      ? 'border-orange-400 ring-1 ring-orange-300'
                      : 'border-border hover:border-orange-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">
                      #{o.orderNumber}
                    </span>
                    <StatusBadge status={o.status} size="sm" />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {typeof o.restaurantId === 'object' ? o.restaurantId.name : '—'}
                    {' → '}
                    {fullName(o.customerId) || 'Customer'}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {o.driverId && typeof o.driverId === 'object'
                      ? `Rider: ${fullName(o.driverId)}`
                      : 'No rider yet'}
                    {o.etaMinutes != null && ` · ~${o.etaMinutes} min`}
                  </p>
                </button>
              ))
            )}
          </div>

          {/* Map */}
          <div className="order-1 overflow-hidden rounded-xl border border-border lg:order-2 lg:col-span-2">
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={12}
              scrollWheelZoom
              className="h-[70vh] w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {placed.map(({ order, pos }) => (
                <Marker
                  key={order._id}
                  position={[pos.lat, pos.lng]}
                  icon={markerIcon(
                    STATUS_COLOR[order.status] ?? '#6b7280',
                    order.orderNumber.slice(-2),
                  )}
                  eventHandlers={{ click: () => setSelected(order._id) }}
                />
              ))}
              <FitBounds points={placed.map((p) => p.pos)} />
            </MapContainer>
          </div>
        </div>
      )}

      {/* Selected order summary */}
      {selectedOrder && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                #{selectedOrder.orderNumber}
              </p>
              <p className="text-xs text-muted-foreground">
                {typeof selectedOrder.restaurantId === 'object'
                  ? selectedOrder.restaurantId.name
                  : '—'}
                {' → '}
                {fullName(selectedOrder.customerId) || 'Customer'}
                {selectedOrder.etaMinutes != null &&
                  ` · ETA ~${selectedOrder.etaMinutes} min`}
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to={`/admin/orders/${selectedOrder._id}`}>Open order</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
