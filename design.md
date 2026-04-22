# Student App Design Brief (Stitch Input)

## Goal
Design a **modern, sleek, dynamic student experience** for MPSTME Smart Canteen that feels:
- Fast
- Seamless
- Trustworthy for payments
- Attractive for daily use by students

This brief covers **student logged-in flows only**.  
Do not change backend business logic; redesign UI/UX around the existing functionality.

---

## Product Context

Student app use cases:
- Check wallet balance quickly
- Browse menu and add items to cart
- Place wallet orders
- Pay directly using Razorpay (UPI/Card)
- Place offline-queued wallet orders when network is unavailable
- View order history and order details
- See pickup QR payload when order is ready
- Manage sessions and basic profile preferences

Current logic is already implemented. UI should preserve every flow and state while improving clarity, delight, and speed perception.

---

## User Persona

- Primary user: college student using mobile-first web experience
- Often in rush between lectures, short attention span, expects instant feedback
- Payment trust and checkout confidence are critical

### UX implications
- One-tap primary actions
- Clear amount visibility everywhere
- Immediate visual feedback (loading, success, error)
- Minimal friction between menu -> cart -> payment
- Smooth motion and modern visual polish without clutter

---

## Information Architecture (Student)

Bottom tab navigation (persistent):
1. Home (`/home`)
2. Menu (`/menu`)
3. Orders (`/orders`)
4. Wallet (`/wallet`)

Additional route:
- Order Detail (`/orders/[id]`)
- Profile (`/profile`) for sessions and notification preference

Global auth routing behavior:
- If token missing -> redirect to `/login`
- If logged-in role is not STUDENT -> redirect to vendor queue (`/vendor/queue`)
- Logout all should clear local session even if remote call fails

---

## Functional Logic to Preserve (Critical)

1. **Auth + Session**
   - Access token is persisted in client store.
   - API client retries once on 401 after refresh token call.
   - On refresh failure, clear auth state and user profile.

2. **Payment safety + reliability**
   - All API requests include timeout behavior.
   - Razorpay flow starts only after SDK load + order creation success.
   - Wallet top-up and direct payment use idempotency keys.

3. **Offline support**
   - Menu can load from local cache when offline.
   - Offline wallet queue supports queued orders with signatures and local records.
   - Daily offline spend limit: INR 500/day.
   - Offline queue can sync manually and automatically on reconnect.

4. **State feedback**
   - Show loading/error/success/empty states on every page.
   - Show toasts for action outcomes (info/success/error).

---

## Screen-by-Screen Requirements

## 1) Student Home

### Purpose
Fast "at a glance" entry point after login.

### Existing functionality
- Fetches wallet balance (`/wallet`) when token exists.
- Shows loading balance and error fallback.
- Quick link to wallet details.

### UI requirements
- Hero card with greeting + wallet summary.
- Big, high-contrast current balance.
- Secondary action: "Open Wallet".
- Optional quick shortcuts to Menu and Orders.

### Dynamic behavior
- Skeleton shimmer while loading.
- Inline error banner if balance fetch fails.
- Subtle animated refresh indicator.

---

## 2) Menu + Cart + Checkout

### Existing functionality
- Fetch menu categories/items (network/cached/offline cache with source label).
- Add items to cart (quantity increments if already in cart).
- Cart total computed from store state.
- Checkout modes:
  - Online: wallet checkout (`/orders` with payment method WALLET)
  - Offline: queue signed offline record if network unavailable and rules pass
  - Direct pay: Razorpay order for direct payment (`purpose: ORDER_DIRECT`)

### Offline wallet queue rules
- Require cached wallet balance >= order amount.
- Require daily offline spend within INR 500.
- Require active token to sign queued record.
- Save queued record in IndexedDB and update cached local balance.

### UI requirements
- Sticky cart summary + clear checkout CTA.
- Distinct primary/secondary buttons:
  - Checkout with Wallet
  - Pay via UPI/Card (Razorpay)
- Visible "offline mode" treatment when disconnected.
- Show menu source chip:
  - Network
  - Online cache
  - Offline cache

### Dynamic interaction
- Quantity steppers (+/-) in modern floating cart bar.
- "Added to cart" micro animation.
- Disable checkout while pending.
- Inline actionable errors for failed checkout/payment order creation.

---

## 3) Wallet

### Existing functionality
- Fetch current balance and transaction list.
- Quick top-up presets (INR 100/200/500).
- Custom top-up (INR 1 to INR 2000) with validation.
- Start Razorpay top-up order (`purpose: WALLET_TOPUP`).
- Offline queue sync:
  - Auto sync on reconnect
  - Manual "Sync now" button
  - Remove processed queued records after sync response

### UI requirements
- Payment-first premium wallet screen.
- Large balance card + "Top up now" section.
- Preset amount chips + custom input field.
- Recent transactions timeline with color-coded credit/debit.
- Offline queue status card with pending count and sync CTA.

### Dynamic behavior
- "Starting..." and "Syncing..." button states.
- Toasts for top-up failure/sync success/sync failure.
- Empty transaction state with gentle prompt.

---

## 4) Orders List

### Existing functionality
- Fetch student orders.
- Display offline queued orders from local storage separately.
- Each order links to order detail page.

### UI requirements
- Two sections:
  - Queued Offline Orders (if any)
  - Confirmed Server Orders
- Clear status badges for each order.
- Amount and time visible at a glance.

### Dynamic behavior
- Empty state illustration when no orders.
- Pull-to-refresh feel on mobile.

---

## 5) Order Detail

### Existing functionality
- Fetch single order by ID.
- Show amount + status.
- If status is READY and receipt exists, show QR payload to present at pickup.

### UI requirements
- Prominent status progress visualization.
- Payment summary and items summary block.
- Ready state should spotlight pickup block.
- QR payload display should be copy-friendly and visually secure.

### Dynamic behavior
- Live status feeling (subtle polling indicator or manual refresh).
- READY state transition animation (non-intrusive).

---

## 6) Profile / Sessions

### Existing functionality
- Toggle push notification preference in local store.
- List active sessions from backend.
- Remove individual sessions and refetch.

### UI requirements
- Simple account safety page.
- Clear "Active Sessions" device cards.
- Easy remove action with pending/disabled state.
- Keep this page clean and secondary.

---

## Global Design Direction (for Stitch)

Design style should be:
- Modern, sleek, and premium
- Youthful but not childish
- Dynamic with tasteful motion
- High-trust for payments

### Visual language
- Glassy dark surfaces with vibrant accent gradients
- Strong contrast for money/amount text
- Soft shadows, rounded corners, smooth spacing rhythm
- Interactive hover/press states that feel responsive

### Color intent
- Primary: electric indigo / blue-violet for key actions
- Secondary: teal/cyan for positive wallet cues
- Accent: amber/orange for warnings and offline indicators
- Error: clear but elegant red

### Motion and micro-interactions
- Button press feedback <150ms
- Card hover lift (desktop)
- Skeleton loading shimmer for content fetch
- Animated chips/badges for status changes
- Smooth bottom-nav transitions

---

## Components Stitch Should Generate

- Student app shell with sticky header + bottom navigation
- Wallet balance hero card
- Menu category accordion/cards
- Item card with quantity controls
- Sticky cart summary panel
- Primary/secondary payment CTA buttons
- Transaction timeline list
- Offline status/queue panel
- Order list cards with status badges
- Order detail status stepper
- Empty/error/loading state components
- Toast/inline alert components
- Session device list row

---

## Performance + UX Constraints

- Mobile-first, optimized for narrow screens.
- Critical actions reachable with thumb zone.
- Payment CTA always visible near cart context.
- Avoid blocking UI during background refetch.
- Never hide errors; always provide human-readable message.
- Maintain semantic accessibility:
  - Proper labels
  - Focus visibility
  - Button states (disabled/loading)

---

## Copy Tone

Use concise, confident student-friendly copy:
- "Top up wallet"
- "Pay with UPI/Card"
- "Queued offline, will sync automatically"
- "Order ready for pickup"
- "Try again"

Avoid technical words like "mutation", "idempotency", "payload" in end-user text.

---

## Final Instruction to Stitch

Create a **high-energy, payment-trustworthy student app UI** that feels fast and delightful while preserving all existing logic exactly:
- auth guard + role routing
- wallet and transaction behavior
- menu caching/offline behavior
- checkout and Razorpay flows
- offline queue limits and sync flows
- orders list + detail + pickup readiness
- profile session management

