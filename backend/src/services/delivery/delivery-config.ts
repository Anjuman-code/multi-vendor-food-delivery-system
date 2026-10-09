/**
 * Delivery Configuration & Environment Validation.
 */
export interface DeliveryConfig {
  osrmBaseUrl: string;
  routingTimeoutMs: number;
  nominatimBaseUrl: string;
  nominatimUserAgent: string;
  quoteSecret: string;
}

export function getDeliveryConfig(): DeliveryConfig {
  const osrmBaseUrl =
    process.env.OSRM_BASE_URL?.trim() || "http://localhost:5000";
  const routingTimeoutMs = parseInt(
    process.env.ROUTING_TIMEOUT_MS || "2000",
    10,
  );
  const nominatimBaseUrl =
    process.env.NOMINATIM_BASE_URL?.trim() ||
    "https://nominatim.openstreetmap.org";
  const nominatimUserAgent =
    process.env.NOMINATIM_USER_AGENT?.trim() ||
    "FoodRush-Delivery/1.0 (contact: support@foodrush.app)";
  const quoteSecret =
    process.env.DELIVERY_QUOTE_SECRET ||
    process.env.JWT_ACCESS_SECRET ||
    "food-rush-delivery-quote-signing-key-32chars";

  return {
    osrmBaseUrl,
    routingTimeoutMs: Number.isFinite(routingTimeoutMs)
      ? routingTimeoutMs
      : 2000,
    nominatimBaseUrl,
    nominatimUserAgent,
    quoteSecret,
  };
}
