import { useEffect, useState } from "react";
import PWABadge from "./PWABadge.tsx";
import { ToastProvider } from "./components/toast.tsx";
import VacationsView from "./views/VacationsView.tsx";
import VacationDetailView from "./views/VacationDetailView.tsx";
import "./App.css";

export default function App() {
  const [openVacationId, setOpenVacationId] = useState<string | null>(null);

  // Make the iOS/Android back gesture pop the detail view instead of leaving the app.
  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const state = event.state as { vacationId?: string } | null;
      setOpenVacationId(state?.vacationId ?? null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function open(vacationId: string) {
    setOpenVacationId(vacationId);
    history.pushState({ vacationId }, "");
  }

  function back() {
    if (history.state?.vacationId) history.back();
    else setOpenVacationId(null);
  }

  return (
    <ToastProvider>
      <div className="app">
        <VacationsView onOpen={open} />
        {openVacationId && (
          <div className="screen--pushed" key={openVacationId}>
            <VacationDetailView vacationId={openVacationId} onBack={back} />
          </div>
        )}
      </div>
      <PWABadge />
    </ToastProvider>
  );
}
