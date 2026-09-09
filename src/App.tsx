import { useEffect } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  Navigate,
  Link,
  ScrollRestoration,
  useLocation,
  useRouteError,
  isRouteErrorResponse,
} from "react-router-dom";
import PWABadge from "./PWABadge.tsx";
import { ToastProvider } from "./components/toast.tsx";
import VacationsView from "./views/VacationsView.tsx";
import VacationDetailView from "./views/VacationDetailView.tsx";
import {
  AllDataPage,
  VacationDataPage,
  NewVacationPage,
  EditVacationPage,
  ExpensePage,
} from "./views/RoutePages.tsx";
import { vacationLoader, expenseLoader, detailLoader } from "./lib/loaders.ts";
import { listVacations } from "./db/repo.ts";
import "./App.css";

function Layout() {
  const location = useLocation();
  useEffect(() => {
    const heading = document.querySelector<HTMLElement>("main h1");
    if (heading) {
      heading.tabIndex = -1;
      // Preserve intentional form autofocus when entering a page.
      if (!document.activeElement?.matches("main input, main textarea, main select")) {
        heading.focus({ preventScroll: true });
      }
      document.title = `${heading.textContent} · Expenses`;
    }
  }, [location.pathname]);
  return (
    <ToastProvider>
      <main className="app">
        <Outlet />
      </main>
      <PWABadge />
      <ScrollRestoration />
    </ToastProvider>
  );
}

function RouteError() {
  const error = useRouteError();
  const missing = isRouteErrorResponse(error) && error.status === 404;
  return (
    <div className="screen">
      <h1 className="large-title">{missing ? "Page not found" : "Could not load this page"}</h1>
      <p>
        {missing
          ? "This page or record doesn't exist on this device. It may have been deleted."
          : "Please try again. Your browser may be unable to access local storage."}
      </p>
      <Link className="btn" to="/vacations" replace>
        Go to vacations
      </Link>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        errorElement: <RouteError />,
        children: [
          { index: true, element: <Navigate to="/vacations" replace /> },
          { path: "vacations", loader: listVacations, element: <VacationsView /> },
          { path: "vacations/new", element: <NewVacationPage /> },
          { path: "vacations/:vacationId", loader: detailLoader, element: <VacationDetailView /> },
          {
            path: "vacations/:vacationId/edit",
            loader: vacationLoader,
            element: <EditVacationPage />,
          },
          {
            path: "vacations/:vacationId/expenses/new",
            loader: expenseLoader,
            element: <ExpensePage />,
          },
          {
            path: "vacations/:vacationId/expenses/:expenseId/edit",
            loader: expenseLoader,
            element: <ExpensePage />,
          },
          { path: "data", element: <AllDataPage /> },
          {
            path: "vacations/:vacationId/data",
            loader: vacationLoader,
            element: <VacationDataPage />,
          },
          {
            path: "*",
            loader: () => {
              throw new Response("Not found", { status: 404 });
            },
          },
        ],
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
