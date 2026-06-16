/**
 * LiveTrackingPanel — the customer's real-time order view: live map (restaurant,
 * customer, moving rider + driving route + ETA), fine-grained delivery stage,
 * a rider card with a call button, and chat with the rider and the restaurant.
 *
 * Self-contained: it joins the order socket room, derives the live rider
 * position/ETA from SocketContext, computes the route via OSRM (lib/routing),
 * and pushes a throttled ETA back to the server so other viewers share it.
 */
import { Button } from '@/components/ui/button';
import { useSocketContext } from '@/contexts/SocketContext';
import { getRoute, etaMinutesFromRoute, type LatLng } from '@/lib/routing';
import orderChatService from '@/services/orderChatService';
import type {
  DeliveryStage,
  Order,
  OrderLiveDriver,
  OrderLiveDriverProfile,
} from '@/types/order';
import { Bike, Phone, Star } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DeliveryMap } from '@/components/rider/DeliveryMap';
import { LiveStageStrip } from './LiveStageStrip';
import { OrderChat } from './OrderChat';

interface LiveTrackingPanelProps {
  order: Order;
  driver?: OrderLiveDriver | null;
  driverProfile?: OrderLiveDriverProfile | null;
}

/** Pull a usable {lat,lng} from the populated restaurant, if any. */
function restaurantLatLng(order: Order): LatLng | null {
  const r = order.restaurantId;
  if (!r || typeof r === 'string') return null;
  const c = r.address?.coordinates;
  if (c && Number.isFinite(c.lat) && Number.isFinite(c.lng) && (c.lat || c.lng))
    return { lat: c.lat as number, lng: c.lng as number };
  const loc = r.location?.coordinates;
  if (loc && loc.length === 2 && (loc[0] || loc[1]))
    return { lat: loc[1], lng: loc[0] };
  return null;
}

const PICKED_STAGES: DeliveryStage[] = [
  'picked_up',
  'heading_to_customer',
  'arrived',
];

export const LiveTrackingPanel: React.FC<LiveTrackingPanelProps> = ({
  order,
  driver,
  driverProfile,
}) => {
  const { orderLocations, orderEtas, orderStages, joinOrderRoom, leaveOrderRoom } =
    useSocketContext();

  const [route, setRoute] = useState<LatLng[] | null>(null);
  const [localEta, setLocalEta] = useState<number | null>(
    order.etaMinutes ?? null,
  );
  const [chatTab, setChatTab] = useState<'driver' | 'vendor'>(
    order.driverId ? 'driver' : 'vendor',
  );
  const lastRouteAt = useRef(0);

  // Join/leave the order room for live telemetry + chat.
  useEffect(() => {
    joinOrderRoom(order._id);
    return () => leaveOrderRoom(order._id);
  }, [order._id, joinOrderRoom, leaveOrderRoom]);

  const store = useMemo(() => restaurantLatLng(order), [order]);
  const customer: LatLng | null = useMemo(() => {
    const c = order.deliveryAddress?.coordinates;
    return c && (c.latitude || c.longitude)
      ? { lat: c.latitude, lng: c.longitude }
      : null;
  }, [order.deliveryAddress]);

  // Live rider position: socket update wins, else last known profile location.
  const liveLoc = orderLocations[order._id];
  const driverPos: LatLng | null = liveLoc
    ? { lat: liveLoc.latitude, lng: liveLoc.longitude }
    : driverProfile?.currentLocation
      ? {
          lat: driverProfile.currentLocation.latitude,
          lng: driverProfile.currentLocation.longitude,
        }
      : null;

  const stage: DeliveryStage | undefined =
    orderStages[order._id] ?? order.deliveryStage;
  const pickedUp = stage ? PICKED_STAGES.includes(stage) : order.status === 'picked_up';

  // Build the route waypoints for the current leg.
  const waypoints = useMemo<LatLng[]>(() => {
    const wp: LatLng[] = [];
    if (driverPos) wp.push(driverPos);
    if (!pickedUp && store) wp.push(store);
    if (customer) wp.push(customer);
    return wp.filter(Boolean) as LatLng[];
  }, [driverPos?.lat, driverPos?.lng, pickedUp, store, customer]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recompute the route/ETA when the leg changes — throttled to spare OSRM.
  useEffect(() => {
    if (waypoints.length < 2) return;
    const now = Date.now();
    if (now - lastRouteAt.current < 15_000 && route) return;
    lastRouteAt.current = now;

    let active = true;
    getRoute(waypoints).then((r) => {
      if (!active || !r) return;
      setRoute(r.geometry);
      const eta = etaMinutesFromRoute(r);
      if (eta != null) {
        setLocalEta(eta);
        // Share the freshly computed ETA so vendor/admin/fleet see it too.
        orderChatService.updateEta(order._id, eta).catch(() => {});
      }
    });
    return () => {
      active = false;
    };
  }, [waypoints, order._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prefer a server/rider-published ETA when present (it reflects the rider's
  // own device), else the locally computed one.
  const eta = orderEtas[order._id] ?? localEta;

  const driverName = driver
    ? `${driver.firstName} ${driver.lastName}`.trim()
    : '';
  const navigateTo = pickedUp ? customer : store;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <DeliveryMap
          store={store}
          customer={customer}
          driver={driverPos}
          route={route}
          driverHeading={liveLoc?.heading ?? null}
          eta={driverPos ? eta : null}
          navigateTo={navigateTo}
          className="h-64 w-full sm:h-80"
        />

        <div className="border-t border-border px-4 py-4">
          {stage ? (
            <LiveStageStrip stage={stage} />
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bike className="h-4 w-4" />
              {order.status === 'pending' || order.status === 'confirmed'
                ? 'Waiting for the restaurant to start preparing your order…'
                : 'Looking for a nearby rider…'}
            </p>
          )}
        </div>
      </div>

      {/* Rider card */}
      {driver && (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 text-orange-600">
              <Bike className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {driverName || 'Your rider'}
              </p>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                {driverProfile?.rating?.average ? (
                  <span className="inline-flex items-center gap-0.5">
                    <Star className="h-3 w-3 fill-orange-400 text-orange-400" />
                    {driverProfile.rating.average.toFixed(1)}
                  </span>
                ) : null}
                {driverProfile?.vehicleType && (
                  <span className="capitalize">{driverProfile.vehicleType}</span>
                )}
                {driverProfile?.vehicleNumber && (
                  <span>· {driverProfile.vehicleNumber}</span>
                )}
              </p>
            </div>
          </div>
          {driver.phoneNumber && (
            <Button asChild size="sm" variant="outline">
              <a href={`tel:${driver.phoneNumber}`}>
                <Phone className="mr-1.5 h-4 w-4" />
                Call
              </a>
            </Button>
          )}
        </div>
      )}

      {/* Chat */}
      <div>
        <div className="mb-2 flex gap-1 rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => setChatTab('driver')}
            disabled={!order.driverId}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              chatTab === 'driver'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            Chat with rider
          </button>
          <button
            type="button"
            onClick={() => setChatTab('vendor')}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              chatTab === 'vendor'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground'
            }`}
          >
            Chat with restaurant
          </button>
        </div>

        {chatTab === 'driver' && order.driverId ? (
          <OrderChat
            orderId={order._id}
            channel="customer_driver"
            peerLabel={driverName || 'Your rider'}
          />
        ) : chatTab === 'driver' ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Chat opens once a rider is assigned.
          </div>
        ) : (
          <OrderChat
            orderId={order._id}
            channel="customer_vendor"
            peerLabel={
              typeof order.restaurantId === 'string'
                ? 'Restaurant'
                : order.restaurantId.name
            }
          />
        )}
      </div>
    </div>
  );
};

export default LiveTrackingPanel;
