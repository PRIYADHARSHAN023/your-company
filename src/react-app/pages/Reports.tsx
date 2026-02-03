import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "@/react-app/contexts/AuthContext";
import Navbar from "@/react-app/components/Navbar";

interface Distribution {
  id: number;
  worker_name: string;
  worker_gender: string | null;
  worker_mobile: string | null;
  product_name: string;
  product_category: string | null;
  quantity: number;
  distributed_by: string;
  distributed_at: string;
}

interface ProductAnalytics {
  product_name: string;
  category: string | null;
  total_distributed: number;
  distribution_count: number;
}

interface WorkerAnalytics {
  worker_name: string;
  total_items: number;
  distribution_count: number;
  last_distribution: string;
}

export default function Reports() {
  const { token } = useAuth();
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [productAnalytics, setProductAnalytics] = useState<ProductAnalytics[]>([]);
  const [workerAnalytics, setWorkerAnalytics] = useState<WorkerAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [workerFilter, setWorkerFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Available filter options
  const [workers, setWorkers] = useState<string[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (token) {
      fetchReportsData();
    }
  }, [token]);

  const fetchReportsData = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (workerFilter) params.append("worker", workerFilter);
      if (productFilter) params.append("product", productFilter);
      if (categoryFilter) params.append("category", categoryFilter);

      const [distRes, prodRes, workerRes] = await Promise.all([
        fetch(`/api/reports/distributions?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/reports/product-analytics?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/reports/worker-analytics?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (distRes.ok) {
        const data = await distRes.json();
        setDistributions(data);

        // Extract unique filters
        const uniqueWorkers = [...new Set(data.map((d: Distribution) => d.worker_name))] as string[];
        const uniqueProducts = [...new Set(data.map((d: Distribution) => d.product_name))] as string[];
        const uniqueCategories = [...new Set(data.map((d: Distribution) => d.product_category).filter(Boolean))] as string[];

        setWorkers(uniqueWorkers.sort());
        setProducts(uniqueProducts.sort());
        setCategories(uniqueCategories.sort());
      }

      if (prodRes.ok) {
        const data = await prodRes.json();
        setProductAnalytics(data);
      }

      if (workerRes.ok) {
        const data = await workerRes.json();
        setWorkerAnalytics(data);
      }
    } catch (error) {
      console.error("Failed to fetch reports data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    setLoading(true);
    fetchReportsData();
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setWorkerFilter("");
    setProductFilter("");
    setCategoryFilter("");
    setLoading(true);
    fetchReportsData();
  };

  const handleExportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Distributions sheet
    const distData = distributions.map((d) => ({
      Date: new Date(d.distributed_at).toLocaleString(),
      Worker: d.worker_name,
      Gender: d.worker_gender || "",
      Mobile: d.worker_mobile || "",
      Product: d.product_name,
      Category: d.product_category || "",
      Quantity: d.quantity,
      "Distributed By": d.distributed_by,
    }));

    const distSheet = XLSX.utils.json_to_sheet(distData);
    XLSX.utils.book_append_sheet(workbook, distSheet, "Distributions");

    // Product analytics sheet
    const prodData = productAnalytics.map((p) => ({
      Product: p.product_name,
      Category: p.category || "",
      "Total Distributed": p.total_distributed,
      "Number of Distributions": p.distribution_count,
    }));

    const prodSheet = XLSX.utils.json_to_sheet(prodData);
    XLSX.utils.book_append_sheet(workbook, prodSheet, "Product Analytics");

    // Worker analytics sheet
    const workerData = workerAnalytics.map((w) => ({
      Worker: w.worker_name,
      "Total Items Received": w.total_items,
      "Number of Distributions": w.distribution_count,
      "Last Distribution": new Date(w.last_distribution).toLocaleString(),
    }));

    const workerSheet = XLSX.utils.json_to_sheet(workerData);
    XLSX.utils.book_append_sheet(workbook, workerSheet, "Worker Analytics");

    // Generate filename with date
    const filename = `distribution_report_${new Date().toISOString().split("T")[0]}.xlsx`;

    XLSX.writeFile(workbook, filename);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Navbar title="Reports & Analytics" showBackButton />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Filters</h2>
            <button
              onClick={handleExportToExcel}
              disabled={distributions.length === 0}
              className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-200 rounded-lg text-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export to Excel</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-blue-100 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-100 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-100 mb-2">Worker</label>
              <select
                value={workerFilter}
                onChange={(e) => setWorkerFilter(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">All Workers</option>
                {workers.map((worker) => (
                  <option key={worker} value={worker}>
                    {worker}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-100 mb-2">Product</label>
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">All Products</option>
                {products.map((product) => (
                  <option key={product} value={product}>
                    {product}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-100 mb-2">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleApplyFilters}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition"
            >
              Apply Filters
            </button>
            <button
              onClick={handleClearFilters}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Analytics Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Product Analytics */}
          <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Product Analytics</h2>
            {loading ? (
              <div className="text-center py-8 text-blue-200">Loading...</div>
            ) : productAnalytics.length === 0 ? (
              <div className="text-center py-8 text-blue-200">No data available</div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {productAnalytics.map((product, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-white">{product.product_name}</h3>
                        {product.category && (
                          <p className="text-blue-300 text-sm">{product.category}</p>
                        )}
                      </div>
                      <span className="text-2xl font-bold text-green-400">
                        {product.total_distributed}
                      </span>
                    </div>
                    <p className="text-blue-200 text-sm">
                      {product.distribution_count} distribution{product.distribution_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Worker Analytics */}
          <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Worker Analytics</h2>
            {loading ? (
              <div className="text-center py-8 text-blue-200">Loading...</div>
            ) : workerAnalytics.length === 0 ? (
              <div className="text-center py-8 text-blue-200">No data available</div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {workerAnalytics.map((worker, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-white">{worker.worker_name}</h3>
                      <span className="text-2xl font-bold text-purple-400">{worker.total_items}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <p className="text-blue-200">
                        {worker.distribution_count} distribution{worker.distribution_count !== 1 ? "s" : ""}
                      </p>
                      <p className="text-blue-200">
                        Last: {new Date(worker.last_distribution).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detailed Distribution Table */}
        <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            Distribution History ({distributions.length} records)
          </h2>
          {loading ? (
            <div className="text-center py-8 text-blue-200">Loading...</div>
          ) : distributions.length === 0 ? (
            <div className="text-center py-8 text-blue-200">No distributions found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-blue-200 text-sm font-medium pb-3">Date & Time</th>
                    <th className="text-left text-blue-200 text-sm font-medium pb-3">Worker</th>
                    <th className="text-left text-blue-200 text-sm font-medium pb-3">Product</th>
                    <th className="text-left text-blue-200 text-sm font-medium pb-3">Category</th>
                    <th className="text-left text-blue-200 text-sm font-medium pb-3">Quantity</th>
                    <th className="text-left text-blue-200 text-sm font-medium pb-3">Distributed By</th>
                  </tr>
                </thead>
                <tbody>
                  {distributions.map((dist) => (
                    <tr key={dist.id} className="border-b border-white/5">
                      <td className="py-3 text-blue-200 text-sm">
                        {new Date(dist.distributed_at).toLocaleString()}
                      </td>
                      <td className="py-3">
                        <div className="text-white font-medium">{dist.worker_name}</div>
                        {dist.worker_mobile && (
                          <div className="text-blue-200 text-xs">{dist.worker_mobile}</div>
                        )}
                      </td>
                      <td className="py-3 text-white">{dist.product_name}</td>
                      <td className="py-3 text-blue-200">{dist.product_category || "-"}</td>
                      <td className="py-3 text-white font-bold">{dist.quantity}</td>
                      <td className="py-3 text-blue-200">{dist.distributed_by}</td>
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
