import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/react-app/contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: Array<"admin" | "manager" | "worker">;
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }

    if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
      navigate("/dashboard");
      return;
    }
  }, [isAuthenticated, userRole, allowedRoles, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return null;
  }

  return <>{children}</>;
}
