import "./PWABadge.css";
import { useState } from "react";

import { useRegisterSW } from "virtual:pwa-register/react";

function PWABadge() {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  // check for updates every hour
  const period = 60 * 60 * 1000;

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      if (period <= 0) return;
      if (r?.active?.state === "activated") {
        registerPeriodicSync(period, swUrl, r);
      } else if (r?.installing) {
        r.installing.addEventListener("statechange", (e) => {
          const sw = e.target as ServiceWorker;
          if (sw.state === "activated") registerPeriodicSync(period, swUrl, r);
        });
      }
    },
  });

  function close() {
    setNeedRefresh(false);
  }

  if (!needRefresh) return null;

  return (
    <section className="pwa-update" aria-label="App update">
      <p role="status">An update is ready. Reload when you’ve finished editing.</p>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <div className="pwa-update-actions">
        <button
          type="button"
          className="pwa-update-button"
          disabled={updating}
          onClick={async () => {
            if (
              document.querySelector(".form-page form") &&
              !window.confirm("Reloading may discard unsaved changes. Reload now?")
            )
              return;
            setUpdating(true);
            setError("");
            try {
              await updateServiceWorker(true);
            } catch {
              setError("Could not update the app. Please try again.");
            } finally {
              setUpdating(false);
            }
          }}
        >
          {updating ? "Updating…" : "Reload"}
        </button>
        <button type="button" className="pwa-update-button" disabled={updating} onClick={close}>
          Later
        </button>
      </div>
    </section>
  );
}

export default PWABadge;

/**
 * This function will register a periodic sync check every hour, you can modify the interval as needed.
 */
function registerPeriodicSync(period: number, swUrl: string, r: ServiceWorkerRegistration) {
  if (period <= 0) return;

  setInterval(async () => {
    if ("onLine" in navigator && !navigator.onLine) return;

    try {
      const resp = await fetch(swUrl, { cache: "no-store" });
      if (resp.status === 200) await r.update();
    } catch {
      // A background update check may fail offline; retry on the next interval.
    }
  }, period);
}
