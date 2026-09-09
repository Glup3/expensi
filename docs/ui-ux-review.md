# UI/UX code review

Scope: all active screens, shared components, navigation/loaders, styles, local database and CSV transfer helpers, and PWA update behavior. This is a source review plus automated browser coverage, not a real-device usability study.

## Implemented in this pass

- Removed routine success toasts, the provider, toast CSS, and unused swipe-delete code. Saved changes are visible in the destination page.
- Expense deletion now asks for confirmation, including the expense name and the fact that it cannot be undone. Vacation deletion retains its confirmation.
- Save/delete failures stay inline on the form. Errors are scrolled into view, drafts remain intact, and pending delete actions no longer say “Saving…”.
- Added explanations for disabled Save buttons, required-field semantics, and currency context for the amount input.
- Import/export failures are inline. File operations disable competing actions and guard against repeated clicks. Import pending/error messages are specific to importing.
- Invalid-only CSV files cannot be imported. Preview vacation counts now include only accepted rows, rather than vacation names from rejected rows.
- Data pages explain local-only storage and the need for backups. Import confirmation explicitly warns about duplicate expenses on repeat imports.
- Exchange-rate help now says the suggested rates are approximate, not live.
- Kept the PWA update notice separate from routine feedback. It no longer leaves an empty alert in the DOM, reports update failures inline, and asks before reloading a form page. Background update-check network failures are caught.

## Recommended next, in priority order

### 1. Protect existing money values when currency changes — high

`src/views/VacationForm.tsx`, `src/db/repo.ts`, `src/db/transfer.ts`

Vacation settings currently allow changing currency after expenses exist. Stored amounts are integer minor units, so changing EUR to JPY can turn 1,250 cents into 1,250 yen rather than performing a conversion. Import also matches vacations by name and interprets imported amounts using the existing vacation's currency without flagging a conflicting CSV currency.

Recommendation: lock currency after the first expense (enforced in the repository as well as the UI), or introduce an explicit conversion workflow. Reject conflicting import currencies before writing anything, with an actionable explanation. This needs a deliberate data policy, not just a styling change.

### 2. Preserve unsaved drafts — high

`src/components/FormPage.tsx`, `src/views/ExpenseForm.tsx`, `src/views/VacationForm.tsx`

Browser Back, reload, or closing the installed app still discards unsaved changes. The new update confirmation protects only the explicit update action.

Recommendation: persist drafts per record/new-form route in session storage, restore with a clear indication, and clear only after successful save or explicit discard. Test iOS backgrounding and browser history. Avoid blocking ordinary navigation with confirmations when nothing changed.

### 3. Strengthen import validation and conflict previews — high

`src/lib/csv.ts`, `src/lib/date.ts`, `src/lib/money.ts`, `src/db/transfer.ts`

Date validation currently checks the string shape, not calendar validity. Imports allow zero amounts and can produce invalid/missing exchange rates; very large numeric inputs need safe-integer bounds. Unknown categories silently become Other. Duplicate names and repeated imports can merge trips or duplicate expenses.

Recommendation: preview accepted/skipped/conflicting rows with reasons; validate actual dates, money bounds and currency/rate compatibility; offer explicit duplicate handling. Keep the import transactional.

### 4. Make expenses easier to scan and find — medium

`src/views/VacationDetailView.tsx`, `src/views/VacationsView.tsx`, `src/db/repo.ts`

There is no search or category filter. The trip total is only on Summary. Within a date, expenses sort by amount rather than entry time, so a new small expense may be hard to spot. List totals briefly default to zero while their live query loads.

Recommendation: add a compact total above the expense list, then search/filter for larger trips. Choose an explicit intra-day sort policy (creation order requires a schema change). Load list totals with the route data to avoid a misleading zero flash.

### 5. Improve navigation semantics and loading feedback — medium

`src/App.tsx`, `src/views/VacationsView.tsx`, `src/views/VacationDetailView.tsx`, `src/views/DataView.tsx`

Most route navigation is implemented as buttons, so users cannot open items in a new tab or copy a link normally. Initial route loading has limited feedback. Import preview changes the page heading without changing the URL, so browser Back leaves the data page instead of just leaving preview. Heading/title updates also need attention for asynchronously mounted forms and preview transitions.

Recommendation: use router Links for normal destinations; preserve the special synchronous Add expense path required for iOS keyboard activation. Add quiet delayed loading feedback and explicit preview navigation/focus handling.

### 6. Backup and update discoverability — medium

`src/views/DataView.tsx`, `src/PWABadge.tsx`, `src/db/transfer.ts`

Export is hidden behind Data or Summary, and there is no persistent backup status or manual update check. The update notice still floats over content; it is infrequent, but can overlap forms on a short viewport.

Recommendation: show last-backup time in Data, consider a persistent-storage request with a clear explanation, and consider placing the update notice in a non-overlapping settings/banner area. Validate CSV download/share behavior in the installed Safari PWA before adding more export formats.

## Retain and verify on a real iPhone

Keep ordinary document scrolling, safe-area padding, 48px controls, native date selection with the Safari width fix, pinch-to-zoom, and synchronous amount focus from Add expense. Desktop WebKit automation cannot verify the iPhone keyboard, VoiceOver, home-screen PWA chrome, native confirmation presentation, or OS text scaling. Test those manually in light/dark mode, portrait/landscape, and with long names/notes.
