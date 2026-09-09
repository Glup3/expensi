# Navigation and mobile form checks

All screens now use React Router and normal document scrolling. There are no modal forms, portals, fixed-body locks, or keyboard-driven viewport resizing.

## Routes

- `/vacations` — vacation list (also the destination of `/`)
- `/vacations/new` — create vacation
- `/vacations/:vacationId` — expenses; `?tab=summary` selects summary
- `/vacations/:vacationId/edit` — vacation settings
- `/vacations/:vacationId/expenses/new` — create expense
- `/vacations/:vacationId/expenses/:expenseId/edit` — edit expense
- `/data` — all-data import/export
- `/vacations/:vacationId/data` — vacation-specific import/export

Records live in IndexedDB on this device. Opening a record URL on a different device does not transfer the record. Missing records and unknown URLs show a recovery page.

Cancel returns to the parent history entry when the form was opened from that page, restoring scroll position. Direct links fall back to the parent URL. Browser Back/Forward work normally. Unsaved form drafts are not persisted across navigation or reload.

## Automated checks

```sh
npm install
npx playwright install chromium webkit
npm run test:e2e
```

The suite builds and serves the production PWA. It covers desktop Chromium, small-screen Chromium, and iPhone-sized WebKit: create/edit/confirmed deletion, inline failures, back/forward, direct-link refresh, missing records, document scrolling, scroll restoration, and CSV import/export. Offline deep-link navigation and saving run in Chromium because Playwright WebKit does not expose service workers.

If Chromium downloads are unavailable but Chrome is installed:

```sh
PLAYWRIGHT_CHROMIUM_CHANNEL=chrome npm run test:e2e
```

## On a real iPhone (Safari and installed PWA)

1. Scroll the vacation list and open **New vacation**. It should start at the top without automatically opening the keyboard.
2. Enter a name, select a non-EUR currency, and edit its rate. With the keyboard open, scroll to **Save** and back to the name. There should be only normal document scrolling.
3. Dismiss the keyboard and rotate the phone. All fields and actions should remain reachable.
4. Cancel and confirm the list returns to its previous scroll position. Try the browser back gesture as well.
5. Create a vacation, then an expense. Test categories, date, notes, and saving with the keyboard open and closed.
6. Test larger system text and pinch-to-zoom.
7. Refresh an expense-edit URL. After the PWA has been cached, repeat offline and save an expense.

A shortened automated viewport does not emulate the real iPhone software keyboard.

## Hosting

`nginx.conf` already falls back to `/index.html` for application routes. `vite.config.ts` configures the same fallback in the service worker for offline navigation. Any alternative host must provide this SPA fallback too. No CDN-hosted libraries are required; React Router is bundled and precached with the app.
