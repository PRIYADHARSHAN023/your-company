import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/react-app/contexts/AuthContext";
import Navbar from "@/react-app/components/Navbar";

interface Stats {
  totalStock: number;
  distributedToday: number;
  distributedMonth: number;
  activeWorkers: number;
}

interface RecentDistribution {
  id: number;
  worker_name: string;
  quantity: number;
  distributed_at: string;
  product_name: string;
  distributed_by: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { userRole, token } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalStock: 0,
    distributedToday: 0,
    distributedMonth: 0,
    activeWorkers: 0,
  });
  const [recentDistributions, setRecentDistributions] = useState<RecentDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchDashboardData(token);
    }
  }, [token]);

  const fetchDashboardData = async (token: string) => {
    try {
      const [statsRes, recentRes] = await Promise.all([
        fetch("/api/dashboard/stats", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/dashboard/recent", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (recentRes.ok) {
        const recentData = await recentRes.json();
        setRecentDistributions(recentData);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: "Total Stock", value: stats.totalStock.toString(), icon: "📦" },
    { label: "Distributed Today", value: stats.distributedToday.toString(), icon: "📤" },
    { label: "Distributed This Month", value: stats.distributedMonth.toString(), icon: "📊" },
    { label: "Active Workers", value: stats.activeWorkers.toString(), icon: "👷" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-blue-200">Overview and quick actions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <div key={index} className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{stat.icon}</span>
                <span className="text-3xl font-bold text-white">{stat.value}</span>
              </div>
              <p className="text-blue-200 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {userRole !== "worker" && (
            <button
              onClick={() => navigate("/stock")}
              className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-xl border border-blue-400/30 rounded-xl p-6 hover:from-blue-500/30 hover:to-blue-600/30 transition group"
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-3 bg-blue-500/30 rounded-lg group-hover:bg-blue-500/40 transition">
                  <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">Stock Setup</h3>
              </div>
              <p className="text-blue-200 text-sm">Manage products and inventory</p>
            </button>
          )}

          {userRole === "manager" && (
            <button
              onClick={() => navigate("/distribution")}
              className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-xl border border-green-400/30 rounded-xl p-6 hover:from-green-500/30 hover:to-green-600/30 transition group"
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-3 bg-green-500/30 rounded-lg group-hover:bg-green-500/40 transition">
                  <svg className="w-6 h-6 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">Distribution</h3>
              </div>
              <p className="text-green-200 text-sm">Distribute to workers</p>
            </button>
          )}

          <button
            onClick={() => navigate("/reports")}
            className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-xl border border-purple-400/30 rounded-xl p-6 hover:from-purple-500/30 hover:to-purple-600/30 transition group"
          >
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-3 bg-purple-500/30 rounded-lg group-hover:bg-purple-500/40 transition">
                <svg className="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Reports</h3>
            </div>
            <p className="text-purple-200 text-sm">Analytics and exports</p>
          </button>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Recent Distributions</h2>
          {loading ? (
            <div className="text-center py-8 text-blue-200">Loading...</div>
          ) : recentDistributions.length === 0 ? (
            <div className="text-center py-8 text-blue-200">No distributions yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-blue-200 text-sm font-medium pb-3">Worker</th>
                    <th className="text-left text-blue-200 text-sm font-medium pb-3">Product</th>
                    <th className="text-left text-blue-200 text-sm font-medium pb-3">Quantity</th>
                    <th className="text-left text-blue-200 text-sm font-medium pb-3">Distributed By</th>
                    <th className="text-left text-blue-200 text-sm font-medium pb-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDistributions.map((dist) => (
                    <tr key={dist.id} className="border-b border-white/5">
                      <td className="py-3 text-white">{dist.worker_name}</td>
                      <td className="py-3 text-white">{dist.product_name}</td>
                      <td className="py-3 text-white">{dist.quantity}</td>
                      <td className="py-3 text-blue-200">{dist.distributed_by}</td>
                      <td className="py-3 text-blue-200 text-sm">
                        {new Date(dist.distributed_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
