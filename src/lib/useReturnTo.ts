import { useLocation, useNavigate } from "react-router-dom";

/** Pop only a known parent entry; direct links have a deterministic fallback. */
export function useReturnTo(parent: string) {
  const navigate = useNavigate();
  const location = useLocation();
  return () => {
    const from = location.state?.from;
    if (typeof from === "string" && from.split("?")[0] === parent) void navigate(-1);
    else void navigate(parent, { replace: true });
  };
}
