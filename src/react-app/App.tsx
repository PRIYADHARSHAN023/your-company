import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import { AuthProvider } from "@/react-app/contexts/AuthContext";
import ProtectedRoute from "@/react-app/components/ProtectedRoute";
import CompanyEntry from "@/react-app/pages/CompanyEntry";
import Auth from "@/react-app/pages/Auth";
import Dashboard from "@/react-app/pages/Dashboard";
import Stock from "@/react-app/pages/Stock";
import Distribution from "@/react-app/pages/Distribution";
import Reports from "@/react-app/pages/Reports";

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<CompanyEntry />} />
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stock"
            element={
              <ProtectedRoute allowedRoles={["admin", "manager"]}>
                <Stock />
              </ProtectedRoute>
            }
          />
          <Route
            path="/distribution"
            element={
              <ProtectedRoute allowedRoles={["manager"]}>
                <Distribution />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
