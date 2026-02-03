import { useNavigate } from "react-router";
import { useAuth } from "@/react-app/contexts/AuthContext";

interface NavbarProps {
  title?: string;
  showBackButton?: boolean;
}

export default function Navbar({ title = "Inventory System", showBackButton = false }: NavbarProps) {
  const navigate = useNavigate();
  const { userName, userRole, logout } = useAuth();

  return (
    <nav className="bg-white/10 backdrop-blur-xl border-b border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {showBackButton ? (
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center space-x-3 text-white hover:text-blue-200 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">Back to Dashboard</span>
            </button>
          ) : (
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <span className="text-white font-semibold text-lg">{title}</span>
            </div>
          )}
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-white text-sm font-medium">{userName}</p>
              <p className="text-blue-200 text-xs capitalize">{userRole}</p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg text-sm transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
