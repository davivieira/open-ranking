import type { NavigateFunction } from "react-router-dom";
import { ApiError } from "./apiClient";
import { useAuthStore } from "../state/authStore";

export function handleApiError(
  err: unknown,
  navigate: NavigateFunction,
  setError: (msg: string | null) => void,
  fallbackMessage: string,
) {
  if (
    err instanceof ApiError &&
    (err.status === 401 ||
      err.status === 403 ||
      /invalid token|not authenticated/i.test(err.message))
  ) {
    // Clear auth state and send the user to login
    useAuthStore.getState().logout();
    navigate("/login", { replace: true });
    return;
  }

  const message = err instanceof Error ? err.message : fallbackMessage;
  setError(message);
}

