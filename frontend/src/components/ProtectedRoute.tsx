import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../state/authStore";

type Props = {
  children: ReactNode;
};

export const ProtectedRoute = ({ children }: Props) => {
  const { accessToken } = useAuthStore();

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

