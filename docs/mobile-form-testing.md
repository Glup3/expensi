# Mobile form scrolling checks

Mobile/touch devices render forms as document-scrolling pages. Desktop uses a native dialog. The presentation is chosen when the form opens and stays stable during keyboard resizing or rotation.

## On an iPhone (Safari and installed PWA)

1. Scroll the vacation list, open **New vacation**, and confirm the form starts at the top without automatically opening the keyboard.
2. Enter a name, select a non-EUR currency, and edit the rate. With the keyboard open, scroll down to **Save** and back to the name. Scrolling should not jump or move a second, nested scroll area.
3. Dismiss the keyboard and rotate the phone. All fields and actions should remain reachable.
4. Cancel. The vacation list should return to its previous scroll position.
5. Create the vacation, then add an expense. Scroll through categories, date, notes, and the save action with the keyboard open and closed.
6. Try a larger system text size and pinch-to-zoom. Content must remain reachable without horizontal clipping.
7. Check CSV import/export screens, which use the same form container.

## Desktop checks

- Dialogs trap focus and close with Escape or Cancel.
- Long forms scroll inside the dialog; actions remain visible.
- Save, validation, and save-error messages still work.

Browser automation at 320px, 390px, and 1280px in Chrome and WebKit covers creation, shortened-viewport scrolling, cancellation, initial focus, and scroll restoration. A shortened viewport does **not** emulate the iPhone software keyboard; the device checks above are still needed.
