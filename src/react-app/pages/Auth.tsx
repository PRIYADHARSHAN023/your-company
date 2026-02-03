import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/react-app/contexts/AuthContext";

type AuthMode = "login" | "register";
type Role = "admin" | "manager" | "worker";

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("worker");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const companyName = localStorage.getItem("companyName") || "";

  if (!companyName) {
    navigate("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login" 
        ? { companyName, userId, password }
        : { companyName, userId, password, name, role };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "An error occurred");
        return;
      }

      // Login through context
      login({
        token: data.token,
        userId: data.userId,
        name: data.name,
        role: data.role,
      });
      
      navigate("/dashboard");
    } catch (err) {
      setError("Network error. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-1">
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="text-blue-200 text-sm">{companyName}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="userId" className="block text-sm font-medium text-blue-100 mb-2">
                User ID
              </label>
              <input
                id="userId"
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                placeholder="Enter user ID"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-blue-100 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                placeholder="Enter password"
                required
              />
            </div>

            {mode === "register" && (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-blue-100 mb-2">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-100 mb-2">
                    Role
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["admin", "manager", "worker"] as Role[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`py-2 px-3 rounded-lg font-medium text-sm transition ${
                          role === r
                            ? "bg-blue-500 text-white"
                            : "bg-white/10 text-blue-200 hover:bg-white/20"
                        }`}
                      >
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900 transition shadow-lg hover:shadow-blue-500/50"
            >
              {mode === "login" ? "Login" : "Register"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
              className="text-blue-300 hover:text-blue-200 text-sm transition"
            >
              {mode === "login" 
                ? "Need an account? Register here" 
                : "Already have an account? Login here"}
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            localStorage.removeItem("companyName");
            navigate("/");
          }}
          className="mt-4 w-full text-blue-200/60 hover:text-blue-200 text-sm transition"
        >
          ← Change Company
        </button>
      </div>
    </div>
  );
}
