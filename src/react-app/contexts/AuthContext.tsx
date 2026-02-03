import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router";

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: "admin" | "manager" | "worker" | null;
  userId: string | null;
  userName: string | null;
  companyName: string | null;
  token: string | null;
  login: (data: LoginData) => void;
  logout: () => void;
  checkAuth: () => void;
}

interface LoginData {
  token: string;
  userId: string;
  name: string;
  role: "admin" | "manager" | "worker";
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<"admin" | "manager" | "worker" | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const storedToken = localStorage.getItem("sessionToken");
    const storedUserId = localStorage.getItem("userId");
    const storedUserName = localStorage.getItem("userName");
    const storedUserRole = localStorage.getItem("userRole");
    const storedCompanyName = localStorage.getItem("companyName");

    if (storedToken && storedUserId && storedUserRole) {
      setToken(storedToken);
      setUserId(storedUserId);
      setUserName(storedUserName);
      setUserRole(storedUserRole as "admin" | "manager" | "worker");
      setCompanyName(storedCompanyName);
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
      setUserRole(null);
      setUserId(null);
      setUserName(null);
      setCompanyName(null);
      setToken(null);
    }
  };

  const login = (data: LoginData) => {
    localStorage.setItem("sessionToken", data.token);
    localStorage.setItem("userId", data.userId);
    localStorage.setItem("userName", data.name);
    localStorage.setItem("userRole", data.role);
    
    setToken(data.token);
    setUserId(data.userId);
    setUserName(data.name);
    setUserRole(data.role);
    setCompanyName(localStorage.getItem("companyName"));
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("sessionToken");
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("userRole");
    
    setToken(null);
    setUserId(null);
    setUserName(null);
    setUserRole(null);
    setIsAuthenticated(false);
    
    navigate("/auth");
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userRole,
        userId,
        userName,
        companyName,
        token,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
