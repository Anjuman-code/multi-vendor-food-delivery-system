/**
 * Route chunk prefetch registry.
 *
 * Pre-warms the browser HTTP & script cache for destination routes on user intent:
 * - Desktop: on pointer enter / focus
 * - Mobile: on touchstart / pointerdown
 *
 * Deduplicated via Set to prevent redundant network triggers.
 */

type RouteLoader = () => Promise<unknown>;

const routeLoaders: Record<string, RouteLoader> = {
  '/': () => import('@/pages/public/NewHomePage'),
  '/about': () => import('@/pages/public/AboutPage'),
  '/careers': () => import('@/pages/public/CareersPage'),
  '/categories': () => import('@/pages/public/CategoriesPage'),
  '/menu': () => import('@/pages/public/MenuPage'),
  '/contact': () => import('@/pages/public/ContactPage'),
  '/faq': () => import('@/pages/public/FAQPage'),
  '/privacy': () => import('@/pages/public/PrivacyPolicyPage'),
  '/terms': () => import('@/pages/public/TermsPage'),
  '/refund-policy': () => import('@/pages/public/RefundPolicyPage'),
  '/restaurants': () => import('@/pages/public/RestaurantsPage'),
  '/login': () => import('@/pages/auth/LoginPage'),
  '/register': () => import('@/pages/auth/RegisterPage'),
  '/vendor/register': () => import('@/pages/auth/VendorRegisterPage'),
  '/rider/register': () => import('@/pages/auth/RiderRegisterPage'),
  '/forgot-password': () => import('@/pages/auth/ForgotPassword'),
  '/cart': () => import('@/pages/customer/CartPage'),
  '/checkout': () => import('@/pages/customer/CheckoutPage'),
  '/orders': () => import('@/pages/customer/OrdersPage'),
  '/favorites': () => import('@/pages/customer/FavoritesPage'),
  '/profile': () => import('@/pages/customer/ProfilePage'),
  '/reservations': () => import('@/pages/customer/ReservationsPage'),
  '/vendor': () => import('@/pages/vendor/VendorDashboardPage'),
  '/vendor/restaurants': () => import('@/pages/vendor/VendorRestaurantsPage'),
  '/vendor/menu': () => import('@/pages/vendor/VendorMenuPage'),
  '/vendor/orders': () => import('@/pages/vendor/VendorOrdersPage'),
  '/vendor/earnings': () => import('@/pages/vendor/VendorEarningsPage'),
  '/vendor/analytics': () => import('@/pages/vendor/VendorAnalyticsPage'),
  '/rider': () => import('@/pages/rider/RiderDashboardPage'),
  '/rider/available': () => import('@/pages/rider/AvailableDeliveriesPage'),
  '/rider/earnings': () => import('@/pages/rider/RiderEarningsPage'),
  '/admin': () => import('@/pages/admin/Dashboard'),
  '/admin/restaurants': () => import('@/pages/admin/restaurants/RestaurantsPage'),
  '/admin/orders': () => import('@/pages/admin/orders/OrdersPage'),
  '/admin/payouts': () => import('@/pages/admin/finance/PayoutsPage'),
};

const prefetchedPaths = new Set<string>();

/**
 * Normalizes a URL or path to match route keys
 */
function normalizePath(rawPath: string): string {
  try {
    const url = rawPath.startsWith('http') ? new URL(rawPath) : new URL(rawPath, 'http://localhost');
    const path = url.pathname.replace(/\/+$/, '') || '/';
    return path;
  } catch {
    return rawPath;
  }
}

/**
 * Trigger prefetching for a specific route chunk.
 */
export function prefetchRoute(to: string): void {
  const path = normalizePath(to);
  if (prefetchedPaths.has(path)) return;

  // Exact match
  if (routeLoaders[path]) {
    prefetchedPaths.add(path);
    void routeLoaders[path]();
    return;
  }

  // Prefix match for nested routes (e.g. /restaurants/123 -> /restaurants)
  const segments = path.split('/').filter(Boolean);
  while (segments.length > 0) {
    const candidate = '/' + segments.join('/');
    if (routeLoaders[candidate]) {
      prefetchedPaths.add(path);
      void routeLoaders[candidate]();
      return;
    }
    segments.pop();
  }
}
