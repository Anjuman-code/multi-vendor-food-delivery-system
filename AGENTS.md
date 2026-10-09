# AGENTS.md

This repository is a **multi-vendor food delivery system** with a React + TypeScript frontend and a Node/Express backend.

This file is a **dedicated guide for AI coding agents**. Follow it to make consistent, safe, and high-quality contributions.

## Project Overview

- **Frontend**: Vite + React (functional components) + TypeScript (strict) + React Router.
- **UI**: Tailwind CSS + shadcn/ui (Radix primitives) + `class-variance-authority`.
- **Forms/Validation**: React Hook Form + Zod.
- **API**: Axios, with a shared Axios client (`frontend/src/lib/httpClient.ts`) and service modules (`frontend/src/services/*`).
- **Backend**: Express + MongoDB (Mongoose) + JWT/cookies.

## Repository Layout

- `frontend/`
  - `src/pages/` route-level screens
  - `src/components/` reusable UI/sections
  - `src/components/ui/` **shadcn/ui components**
  - `src/services/` API wrappers (Axios)
  - `src/lib/` shared libs (e.g., `httpClient.ts`, `validation.ts`)
  - `src/utils/` utilities (e.g., `cn.ts`)
- `backend/`
  - Node/Express app (see `backend/package.json`)

## Technology Stack (Authoritative)

### Frontend

- **Build tool**: Vite (`frontend/vite.config.js`)
- **TypeScript**: strict mode enabled (`frontend/tsconfig.json`)
- **Routing**: `react-router-dom` (`frontend/src/App.tsx`)
- **Styling**: Tailwind CSS (`frontend/tailwind.config.js`)
- **shadcn/ui**: configured via `frontend/components.json`
  - UI components live in `frontend/src/components/ui/`
  - Aliases:
    - `@/` -> `frontend/src/` (TS paths + Vite alias)
    - shadcn aliases: `components` -> `@/components`, `utils` -> `@/utils`

### Backend

- **Runtime**: Node.js
- **Framework**: Express
- **DB**: Mongoose
- **Auth**: JWT, cookies (`cookie-parser`, `cors`)

## Non-Negotiable Agent Rules

- **Do not change unrelated code.** Keep diffs minimal and scoped to the request.
- **No `any` unless truly unavoidable.** If you must use `any`, justify it in the PR description and isolate it.
- **Handle errors gracefully**:
  - User-facing: toast / inline error states with clear guidance
  - Developer-facing: log meaningful context (avoid leaking secrets)
- **Keep code simple and readable**:
  - Remove redundancy
  - Prefer clear naming and strong typing
  - Avoid clever abstractions unless they reduce complexity

## Coding Standards (React + TypeScript)

- **Use functional components** and hooks.
- **Type everything**:
  - Prefer `type`/`interface` for API payloads and component props.
  - Avoid implicit `any`.
- **Performance**:
  - Use `React.memo`, `useMemo`, `useCallback` when re-renders are measurable/likely.
  - Prefer derived state over duplicated state.
- **Routing**:
  - Route pages live in `frontend/src/pages/`.
  - `frontend/src/App.tsx` defines top-level routes.

## UI Components & Styling

### Use shadcn/ui first

- **Always prefer shadcn/ui components** for common UI:
  - Buttons, inputs, dialogs, dropdowns, forms, toasts, etc.
- Add new components via:

```bash
# run inside ./frontend
npx shadcn-ui@latest add <component>
```

- Existing components are in `frontend/src/components/ui/`.
- Use the shared class helper:
  - `cn` is in `frontend/src/utils/cn.ts`

### Tailwind-first styling (avoid custom CSS)

- **Try not to use custom CSS**. Prefer Tailwind utilities.
- If you must add custom CSS, keep it minimal and local, and ensure it cannot be done reasonably with Tailwind.
- Tailwind content paths are defined in `frontend/tailwind.config.js`.

### Variants with `cva`

- Use `class-variance-authority` for variant-driven components.
- Follow the existing pattern in `frontend/src/components/ui/button.tsx`.

### UI/Design balance (required)

- Build **clean, modern UIs**:
  - Subtle shadows/gradients are fine
  - Avoid overly “Bootstrap-like” layouts
  - Sparsely and subtly use experimental shapes/layouts when appropriate
- **Responsiveness** is mandatory:
  - Mobile-first
  - Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`)
  - Manually test on small and large viewports

## UX / Accessibility

- Ensure keyboard navigation works for interactive components.
- Use accessible primitives from shadcn/Radix (they handle many ARIA details).
- Keep contrast readable and text sizes appropriate.
- Prefer consistent feedback:
  - Loading states (disable buttons, show spinners)
  - Error states (inline + toast)

## Forms & Validation (required)

- Use **React Hook Form** + **Zod** (already in use).
- Put schemas in `frontend/src/lib/validation.ts` (or nearby domain schema modules if it grows).
- Provide real-time helpful error messages and prevent invalid submissions.

Example pattern:

```tsx
const form = useForm<MyFormData>({
  resolver: zodResolver(mySchema),
  defaultValues: {
    /* ... */
  },
});
```

## API & Data Handling

- Prefer `frontend/src/lib/httpClient.ts` (Axios instance) and keep API calls inside `frontend/src/services/*`.
- **Always type API responses**.
- Handle UI states:
  - **Loading**: disable inputs/buttons, show spinner/skeleton
  - **Error**: show a toast + recoverable UI

Toast usage (already wired via `Toaster` in `frontend/src/main.tsx`):

```tsx
const { toast } = useToast();

toast({
  title: 'Error',
  description: 'Something went wrong. Please try again.',
  variant: 'destructive',
});
```

### Environment configuration

- The shared Axios base URL uses `import.meta.env.VITE_API_BASE_URL` (fallback `http://localhost:2002`).
- **Do not hardcode secrets**. Use `.env` / runtime config.

### Security rules

- Sanitize/validate inputs.
- Avoid exposing tokens in logs.
- Prefer secure auth patterns:
  - HttpOnly cookies when feasible
  - Avoid storing long-lived secrets in `localStorage` unless explicitly required

## Animations (required)

- Prefer **Framer Motion** for animations.
- Keep animations subtle (fades/slides), performant, and consistent.

If the feature needs motion and Framer Motion is not installed, add it intentionally:

- Add dependency: `npm i framer-motion` (inside `frontend/`)
- Keep changes minimal and include it in the commit message.

Example:

```tsx
import { motion } from 'framer-motion';

<motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
  {/* content */}
</motion.div>;
```

## Verification Procedures (mandatory)

After **every** change (even small ones), run the following from `frontend/`:

- **Lint**:

```bash
npm run lint
```

- **Typecheck** (this project has `noEmit: true` in `tsconfig.json`):

```bash
npx tsc --noEmit
```

- **Build**:

```bash
npm run build
```

- **Run dev server** and check the changed flows in the browser:

```bash
npm run dev
```

Manual verification checklist:

- Login/Register/Forgot Password flows (if touched)
- Navigation and routes (React Router)
- Responsive layout on mobile + desktop
- Toasts / error handling

If tests exist or are added:

- Update tests for modified logic/components
- Ensure `npm test` passes (if/when configured)

Backend quick check (when backend is impacted):

```bash
# run inside ./backend
npm start
```

## Dependency Management

- Add packages only when necessary.
- Prefer lightweight dependencies.
- When adding a dependency:
  - Explain why in the PR
  - Confirm bundle impact is reasonable

## Where to Put New Code

- **New page/route**: `frontend/src/pages/` + route entry in `frontend/src/App.tsx`
- **Reusable component**: `frontend/src/components/`
- **UI primitive**: `frontend/src/components/ui/` (prefer shadcn)
- **API calls**: `frontend/src/services/` using `frontend/src/lib/httpClient.ts`
- **Schemas**: `frontend/src/lib/validation.ts`
- **Utilities**: `frontend/src/utils/`

## Pull Request / Review Checklist

Before finishing:

- Code is typed, readable, and minimal
- Lint/typecheck/build/dev run clean
- UI is responsive and accessible
- Error and loading states are handled
- No secrets committed
- Commit messages are atomic and descriptive

## Resources

- shadcn/ui: https://ui.shadcn.com/
- Tailwind CSS: https://tailwindcss.com/docs
- Radix UI: https://www.radix-ui.com/primitives
- React Hook Form: https://react-hook-form.com/
- Zod: https://zod.dev/
- React Router: https://reactrouter.com/
- Vite: https://vite.dev/
- AGENTS.md standard: https://agents.md/

## UI & Interaction Standards (Authoritative)

### 1. InteractiveCard & Stretched Link Standard
- **Primary Navigation**: Never make the card an outer `<a>` or `<button>` if it contains child actions. Instead, use `InteractiveCard` with an inner `InteractiveCardLink` on the card's title/heading (`after:absolute after:inset-0 after:z-0`) to stretch the click area.
- **Child Actions**: All secondary controls (favorites, quantity steppers, add-to-cart, edit/delete, menus) must be wrapped in `InteractiveCardAction` or styled with `relative z-10`.
- **Event Isolation**: Secondary actions must stop propagation (`e.stopPropagation()`) so clicking them never triggers card navigation.
- **No Invalid DOM Nesting**: Absolute ban on `<button>` inside `<a>` or `<a>` inside `<button>`. For link buttons, use `<Button asChild><Link to="...">...</Link></Button>`.
- **Touch & Mobile**: Tap targets for interactive actions must be at least 44x44px. Never rely on `opacity-0 group-hover:opacity-100` to expose critical buttons on mobile.

### 2. Button Loading & Double-Submit Protection
- Always use the shared `Button` primitive from `@/components/ui/button`.
- Use the `loading` and optional `loadingText` props for any asynchronous action (form submission, payment, order placement, status transition).
- When `loading={true}`, `Button` automatically sets `disabled={true}`, displays `<Loader2 className="animate-spin" />`, and prevents double submissions.

### 3. Canonical Status Badges
- Import `StatusBadge` from `@/components/ui/StatusBadge`.
- Do NOT declare ad-hoc inline badge spans with custom background/text colors.
- All statuses across Orders, Reservations, Support Tickets, Payouts, Drivers, and Users are mapped in `STATUS_REGISTRY` with accessible color tones, labels, and icons.

### 4. Cohesive Empty & Error States
- Use `EmptyState` and `ErrorState` from `@/components/ui/EmptyState`.
- Provides consistent border dashes, rounded corners, icons, and action CTA slots across all roles.

### 5. Dialogs & Confirmations
- For destructive or high-impact actions (deleting items, cancelling orders, suspending users), use `ConfirmDialog` from `@/components/ui/ConfirmDialog`.
- It includes focus trapping, Esc-to-close, built-in loading states, and optional reason inputs for audit logging.

### 6. Tabular Data & Headers
- Use `DataTable` from `@/components/ui/DataTable` for tabular lists, supporting sorting, pagination, and skeleton loading states.
- Use `PageHeader` from `@/components/ui/PageHeader` for consistent page titles, breadcrumbs, and right-aligned action bars across Customer, Vendor, Rider, and Admin views.

### 7. Route Protection & Redirects
- Use `ProtectedRoute` from `@/components/auth/ProtectedRoute` to wrap private route groups in `App.tsx`.
- Pass `allowedRoles={['vendor']}`, `allowedRoles={['admin']}`, or `allowedRoles={['driver']}` to protect role subtrees.
- Mismatched authenticated users are bounced back to their designated role portal via `getPostAuthPath()`.

### 8. Global Menu & Food Explorer Standard
- **Route & Page**: `/menu` rendered via `@/pages/public/MenuPage`.
- **State Synchronization**: All search, category, filter, and sort state is synced bi-directionally to URL query parameters via `@/hooks/useMenuExplorer`. Refresh, back, and forward navigation restore the view without loss.
- **Card Hierarchy**: Built on `InteractiveCard` with stretched title link to `/menu/:restaurantId/:itemId`. Secondary actions (`InteractiveCardAction`) house restaurant link (`/restaurants/:id`), favorite toggles, and `- / qty / +` steppers in place.
- **Customizable Items**: Dishes with required options/variants open `@/components/menu/QuickViewSheet` instead of blind add.
- **Mobile First**: Fixed tap targets >= 44x44px, bottom filter sheet, floating cart summary bar (`@/components/menu/StickyCartBar`), and categorized section grouping when no filter is selected.

### 9. Food Images & Canonical Fallback System
- **Unified Component**: Always render food items using `FoodImage` from `@/components/ui/FoodImage`. It accepts `src`, `name`, `alt`, and `aspectRatio` (defaults to `4/3`), smoothly falls back on load error or missing image, and provides smooth skeleton loading with zero layout shift.
- **Runtime Resolution**: Backed by `resolveFoodImage(name: string)` in `@/utils/foodImage.ts`. Matches dish names against canonical food items using:
  1. Exact alias / transliteration matches (including Bangla script).
  2. Keyword sets with mandatory exclusion tokens (e.g. `chicken-fry` excludes `curry`, `roll`, `biryani`).
  3. Bounded Levenshtein fuzzy matching on normalized tokens with conservative thresholds (precision over recall).
  4. High-performance synchronous memoization (67k+ lookups/sec).
  5. Fallback to a neutral on-brand vector placeholder if no canonical dish matches.
- **Asset Standards**: Canonical dish images reside in `frontend/src/assets/foods/`, center-cropped to 4:3 (800x600 px), converted to WebP, and strictly budgeted at **<= 80 KB** per image. Eagerly bundled via Vite's `import.meta.glob`.
- **Adding a New Canonical Dish**:
  1. Process and save an openly licensed photo as `frontend/src/assets/foods/<slug>.webp` (4:3 aspect ratio, <= 80 KB).
  2. Record author, source URL, and license in `frontend/src/assets/foods/ATTRIBUTION.md`.
  3. Register dish definition in `frontend/src/assets/foods/food-manifest.ts` with `slug`, `displayName`, `image`, `variants`, `keywords`, `excludeKeywords`, and `priority`.
  4. Run validation and regression tests:
     ```bash
     node scripts/test-food-resolver.ts
     node scripts/dry-run-resolver.ts
     ```

### 10. Loading Indicators & Navigation Progress Standard

#### Decision Rule (Non-Negotiable)
- **Navigation Progress Bar (`RouteProgressBar`)**: Use for route changes, lazy chunk downloads, page-level transitions, and background refreshes where the user can safely keep interacting or navigate away.
- **Content Skeletons (`Skeleton`) / Button Loading (`Button loading`)**: Use for in-page tabular loads, list filters, search boxes, tab switching, and inline asynchronous actions.
- **Blocking Rider Loader (`RiderLoader` via `useBlockingLoader`)**: Use **ONLY** for critical, one-shot operations where interaction or leaving during processing could cause duplicate, inconsistent, or lost work (e.g. placing orders, verifying payment OTP, final auth/registration submission, app boot session restore). Blocking loaders must remain rare.

#### Timing Constants (`LOADING_TIMING` in `@/contexts/LoadingContext`)
- `NAV_SHOW_DELAY_MS` = 120ms (prevents bar flashing on instant navigations).
- `NAV_MIN_DURATION_MS` = 300ms (ensures visual continuity once bar appears).
- `NAV_SLOW_CUE_DELAY_MS` = 400ms (triggers pending cue with subtle opacity reduction and aria-busy on slow navigations).
- `BLOCKING_SHOW_DELAY_MS` = 220ms (fast actions <220ms never flash the overlay).
- `BLOCKING_MIN_DURATION_MS` = 600ms (keeps overlay visible long enough to read smoothly).
- `BLOCKING_DEFAULT_TIMEOUT_MS` = 30000ms (stuck guard timeout to reveal retry/cancel options).

#### Navigation Pending Detection & Lifecycle Standard
- **Intent Detection**: Navigation begins at true user intent via global history interception (`window.history.pushState`, `window.history.replaceState`, and `popstate`) in `LoadingContext`.
- **Commit Completion**: Navigation completes only when the destination route's elements commit to the DOM, observed in `RootLayout.tsx` upon location change.
- **Pending-Content Cue**: If route transition exceeds `400ms`, `isNavigatingSlow` activates, gently dimming the active outlet container to `opacity-60` with `aria-busy="true"` across all layouts without layout shift or interaction lock.
- **Route Chunk Prefetching**: Primary links utilize `Link` / `NavLink` from `@/components/ui/Link`, which pre-warms destination route chunks on hover/focus (desktop) and touchstart/pointerdown (mobile) through `@/utils/routePrefetch.ts`.
- **Chunk Splitting**: Heavy single-use libraries (e.g. `html2canvas`, `jspdf`) must never be imported statically at route level; load dynamically on user interaction (`await import(...)`).
- **Resilience**: `ErrorBoundary` catches dynamic chunk-load errors (e.g. stale deployment hashes), calls `resetNavigation()`, and renders a user-friendly page reload prompt.

#### Blocking Loader Architecture (`DeliveryRiderScene` & `RiderLoader`)
- **Illustration**: Powered by `DeliveryRiderScene.tsx`, an inlined conversion of `frontend/src/assets/illustrations/delivery.svg` with zero external image requests.
- **Translucent Scrim**: Uses `bg-background/75` without heavy backdrop blur filters, allowing the underlying page to remain faintly visible while preserving maximum text legibility and 60fps performance on low-end devices.
- **Wheel Spinning**: Concentric front and rear wheels rotate continuously around mathematically exact SVG centers (`579.261px 294.868px` for front, `305.196px 286.666px` for rear) with subtle spoke accents so rotation is clearly visible with zero wobble.
- **Layered Animations**:
  - Main chassis/rider gentle vertical bob (`translateY(0)` to `translateY(-2.5px)`).
  - Ponytail wind flutter secondary oscillation (`-5deg` rotate loop).
  - Thermal delivery box subtle independent bounce.
  - Seamless horizontal road scroll with animated dashes.
  - Backward-streaming exhaust cloud puffs and speed dust lines.
- **Reduced Motion**: Full `@media (prefers-reduced-motion: reduce)` support halts all transforms/rotations/scrolls and substitutes a calm opacity pulse.

#### API Usage
```tsx
import { useBlockingLoader } from '@/contexts/LoadingContext';

const { run } = useBlockingLoader();

// Wrap critical async actions:
await run(
  () => orderService.createOrderFromCart(payload),
  {
    message: 'Placing your order…',
    slowMessage: 'Confirming order details with the kitchen…',
    allowCancel: false, // Never auto-cancel or allow duplicate order submit!
  }
);
```

### 11. Transactional Email & Messaging Pipeline Standard

#### Hard Rule (Non-Negotiable)
- **DO NOT TOUCH PAYMENT OTP LOGGING**: The custom mock payment service intentionally logs OTPs to stdout/console so checkout can be tested without a real gateway. Never remove, redact, mask, or route payment OTPs through email modules.

#### Architecture & Outbox Pattern
- **Domain Event Seam**: Controllers dispatch events through `domainEvents` (`backend/src/services/domain-events/domain-events.ts`), synchronizing DB notifications, real-time socket broadcasts, and transactional emails in one place.
- **Non-Blocking Enqueue**: Controllers call `emailService.send(...)` which validates idempotency, checks user notification preferences, and writes to `EmailOutbox` in MongoDB. Endpoints return immediately (< 5ms overhead).
- **Lease-Based Worker**: `email-worker.ts` polls `EmailOutbox` using atomic `findOneAndUpdate` leases (`leaseExpiresAt`). Safe across multiple horizontal cluster instances without requiring Redis or BullMQ.
- **Secret Encryption**: Sensitive authentication credentials (OTPs, password reset tokens) are encrypted at rest with AES-256-GCM in `EmailOutbox` and purged immediately upon delivery.

#### Email Design & Client Compatibility
- **Template System**: Templates in `backend/src/services/email/templates/` use a single master layout (`layout.ts`) adhering to Food Rush design tokens (brand primary `#ea580c`, typography, spacing, and mobile 375px viewports).
- **Size Budget**: Strictly budgeted **<= 102 KB** per email (actual sizes range from 7.1 KB to 14 KB) to avoid Gmail clipping.
- **Button Standards**: Bulletproof buttons use Microsoft Office VML markup for desktop Outlook and standard HTML/CSS for modern web/mobile clients.
- **Currency & Formatting**: All amounts are formatted in Bangladeshi Taka (`৳`) with Bengali/international comma grouping (`৳1,017`).
- **RFC 8058 Compliance**: Marketing and review emails automatically attach `List-Unsubscribe: <url>` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers, pointing to the `/unsubscribe` frontend portal.

#### Tooling & Commands
```bash
# Inside backend/
npm run email:preview  # Render all 34 email fixtures to backend/.email-previews/index.html
npm run test:email    # Run unit/integration test suite for email crypto, templates, and limits
npm run email:test     # Send single test email via configured provider or sandbox
```

### 12. Dynamic Delivery Distance, Fees & Free Delivery Standard

#### Hard Rules & Guarantees (Non-Negotiable)
- **Server Authoritative**: The client NEVER sends or dictates a delivery fee. The server quotes and signs fees using HMAC-SHA256 (`quoteSignature`). At checkout submission, the server re-evaluates quotes and rejects stale or tampered requests with HTTP 409 (`DELIVERY_QUOTE_CHANGED`) and fresh quotes.
- **Fixed Minimum Fee Floor (≥ ৳10)**: Under no circumstances can a delivery fee drop below ৳10 (unless waived 100% by an active admin campaign). The ৳10 floor is enforced in Mongoose schemas, Zod schemas, backend calculators, and admin forms.
- **No Hardcoded Free Delivery**: Zero hardcoded thresholds (`FREE_DELIVERY_THRESHOLD`), constants, or marketing guarantees in code. Free delivery is granted EXCLUSIVELY through database-backed `DeliveryCampaign` models managed by administrators.
- **Rider Earnings Protected**: Driver payout and platform earnings derive strictly from `deliveryFeeOriginal + tipAmount`, NEVER the discounted amount (`deliveryFeeCharged`). Platform campaigns never penalize rider compensation.
- **OpenStreetMap / FOSS Tooling Only**: Proprietary mapping APIs (Google Maps, Mapbox, HERE) are strictly prohibited. Browser maps use Leaflet with OSM tiles and mandatory "© OpenStreetMap contributors" (ODbL) attribution.

#### Routing Engine & Fallback Architecture
- **Primary Provider**: Self-hosted OSRM (`osrm-backend`) containerized via `docker-compose.delivery.yml` using Geofabrik Bangladesh OSM extracts (`bangladesh-latest.osm.pbf`) preprocessed with the MLD pipeline.
- **Circuit Breaker**: When OSRM fails or times out (3 consecutive failures), `RoutingCircuitBreaker` trips to open state for 30s cooldown and switches to `HaversineFallbackProvider` (straight-line distance × admin-configurable `detourFactor`, marked as `deliveryIsEstimate: true`).
- **Geocoding & Autocomplete**: Rate-limited server-side proxy (`/api/delivery/geocode/search` and `/api/delivery/geocode/reverse`) compliant with Nominatim usage policy (identifying User-Agent, cached in MongoDB `GeocodeCache`, max 1 req/sec server-side, 300ms client debounce). Fee calculations depend strictly on coordinates, ensuring geocoder outages never block order placement.
- **Coordinate Caching**: Route distance and duration results are cached in MongoDB (`RouteCache`) using 5-decimal precision coordinate keys (~1.1 meter accuracy) with a 24-hour TTL.

#### Multi-Vendor Fee & Campaign Formula
- **Formula**:
  $$\text{fee} = \left\lceil \max\left(\text{minFee}, \text{includedDistanceFee} + \max(0, \text{distanceKm} - \text{includedKm}) \times \text{perKmRate}\right) \right\rceil$$
  capped at `maxFee` if configured.
- **Multi-Vendor Cart Split**: In multi-vendor checkouts, each restaurant sub-order receives its own independent road distance, ETA, and fee. The customer sees per-restaurant fees and a grand total.
- **Campaign Matching**: Evaluated per sub-order on that restaurant's items subtotal (post item-discounts, pre-tax/tip/delivery). The highest-waiver campaign wins. Stacking is strictly prohibited.
- **Immutable Order Snapshot**: Every placed order permanently records:
  - `deliveryFeeOriginal`: Calculated road fee before campaign discount
  - `deliveryFeeDiscount`: Taka amount waived by platform campaign
  - `deliveryFeeCharged`: Actual fee paid by customer (`deliveryFee`)
  - `deliveryCampaignSnapshot`: Snapshot of campaign name, label, and waived amount
  - `deliveryDistanceKm`, `deliveryDurationMin`, `deliveryRouteProvider`, `deliveryIsEstimate`, `deliveryCoordinates`

#### Tooling & Commands
```bash
# Infrastructure
./scripts/setup-osrm.sh                          # Download Geofabrik extract & prepare OSRM
docker compose -f docker-compose.delivery.yml up -d # Launch self-hosted OSRM routing container

# Verification & Backfill
npm run test:delivery                            # Run delivery & fee calculator test suite (backend)
node -r ts-node/register --test tests/free-delivery-guard.test.ts # Architectural guard test
npx ts-node scripts/backfill-restaurant-locations.ts        # Dry-run restaurant coordinates audit
npx ts-node scripts/backfill-restaurant-locations.ts --commit # Apply coordinates to MongoDB
```


