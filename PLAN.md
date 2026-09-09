# Vacation Expense Tracker — Implementation Plan

A minimal, iOS-native-feeling PWA for tracking vacation expenses. Single user,
installed on iPhone, fully offline, data in IndexedDB via Dexie.js.

## Stack

- React 19 + TypeScript + Vite (existing)
- `vite-plugin-pwa` / Workbox precaching (existing, needs manifest polish)
- `dexie` + `dexie-react-hooks` (to add)
- Plain CSS with design tokens (no UI framework)
- No router library — small in-app view stack with iOS push/pop transitions

## Data model (Dexie v1)

```ts
interface Vacation {
  id: string; // uuid
  name: string; // "Japan 2025"
  currency: string; // ISO 4217: EUR, JPY, DKK, ...
  rateToEur: number; // manual one-time rate; 1 for EUR. e.g. JPY: 0.0061
  createdAt: number;
}

interface Expense {
  id: string; // uuid
  vacationId: string; // indexed
  name: string;
  category: Category;
  amountMinor: number; // integer minor units (cents); JPY has 0 decimals
  date: string; // "YYYY-MM-DD", indexed (compound [vacationId+date])
  notes?: string;
}
```

- Amounts stored as integer minor units; formatted with `Intl.NumberFormat`
  using the vacation currency (handles decimal digits per currency).
- EUR equivalent = `amountMinor → major × rateToEur`, display only, never stored.

**Categories (fixed):** Food, Flights, Hotels, Transport, Fun, Shopping, Other —
each with an emoji/SF-style glyph and a tint.

**Currency picker:** short list (EUR, JPY, DKK, USD, GBP, CHF, SEK, NOK, CZK, HUF, PLN).
Selecting non-EUR reveals the "rate to EUR" field (prefilled 1, manual entry, no API).

## Views

1. **Vacations (home)** — large title, grouped cards: name, currency, total
   (native + EUR equivalent). "+" to add; tap card → detail; long-press or edit
   mode for editing/deleting a vacation.
2. **Vacation detail** — iOS segmented control:
   - **Expenses**: list grouped by date (newest first), each row: category
     glyph, name, amount. Swipe-to-delete with undo toast. Tap to edit.
     Floating "+" button (thumb-reachable, bottom right).
   - **Summary**: big total (native + EUR), per-category rows with amount,
     percentage, and proportional bar in category tint.
3. **Add/Edit expense** — bottom sheet, optimized for speed:
   - Amount input auto-focused, `inputmode="decimal"`, big type
   - Category: single-tap icon chips (no dropdown)
   - Date: defaults to today, native date input
   - Name field; collapsed optional Notes field
   - Save enabled once amount + name + category present
4. **Settings/Data** (sheet from home): CSV export (per vacation or all),
   CSV import, app version.

## iOS look & feel

- `-apple-system` font stack, iOS grouped-list styling, hairline separators,
  large titles, spring-ish push/pop transitions.
- Primary color: iOS system blue `#0A84FF`.
- Dark mode via `prefers-color-scheme` from the start.
- `viewport-fit=cover` + `env(safe-area-inset-*)`, 100dvh layout,
  `apple-mobile-web-app-status-bar-style`, standalone display.
- Manifest: proper name ("Expenses" or similar short_name), blue theme_color,
  icons via existing `@vite-pwa/assets-generator` from a generated SVG
  (blue rounded square + simple glyph).

## Offline

- Workbox precaches all assets (config exists); verify `navigateFallback`.
- Dexie/IndexedDB is local-only — no network anywhere.
- Keep existing `PWABadge` update prompt.

## CSV export/import

Format: `vacation,currency,rateToEur,name,category,amount,date,notes`
(amount in major units, `.` decimal separator).

- **Export**: Blob download (iOS share sheet); per vacation or full backup.
- **Import**: file picker → tiny hand-rolled CSV parser (quotes/commas/newlines)
  → preview (rows, vacations found) → creates missing vacations, appends
  expenses. Doubles as test-data seeding.

## Non-goals (for now)

- No archive, no multi-currency per vacation, no custom categories,
  no global cross-vacation summary, no time-of-day, no auth/sync.

## Implementation order

1. Dexie schema + typed repository/helpers (money, formatting, uuid)
2. App shell: design tokens, safe areas, view-stack navigation
3. Vacations list + add/edit vacation sheet
4. Expense list + add/edit expense sheet (core UX, most polish here)
5. Swipe-to-delete + undo toast
6. Summary view
7. CSV export/import + settings sheet
8. Manifest, app icon generation, dark mode pass, real-device testing
