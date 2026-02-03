import { useEffect, useState } from "react";
import { useAuth } from "@/react-app/contexts/AuthContext";
import Navbar from "@/react-app/components/Navbar";

interface Product {
  id: number;
  name: string;
  category: string | null;
  remaining_quantity: number;
}

interface WorkerAllocation {
  workerName: string;
  workerGender: string;
  workerMobile: string;
  products: { productId: number; quantity: number }[];
}

export default function Distribution() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Flow steps
  const [step, setStep] = useState<'count' | 'allocation' | 'summary'>('count');
  const [workerCount, setWorkerCount] = useState<number>(1);
  const [currentWorkerIndex, setCurrentWorkerIndex] = useState(0);
  
  // Products and stock tracking
  const [initialProducts, setInitialProducts] = useState<Product[]>([]);
  const [remainingStock, setRemainingStock] = useState<Record<number, number>>({});
  
  // Worker allocations
  const [workers, setWorkers] = useState<WorkerAllocation[]>([]);
  const [currentWorker, setCurrentWorker] = useState<WorkerAllocation>({
    workerName: "",
    workerGender: "",
    workerMobile: "",
    products: [],
  });
  
  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (token) {
      fetchProducts(token);
    }
  }, [token]);

  const fetchProducts = async (token: string) => {
    try {
      const response = await fetch("/api/products/available", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const products = await response.json();
        setInitialProducts(products);
        
        // Initialize remaining stock
        const stock: Record<number, number> = {};
        products.forEach((p: Product) => {
          stock[p.id] = p.remaining_quantity;
        });
        setRemainingStock(stock);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkerCountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (workerCount < 1) {
      setError("Please enter at least 1 worker");
      return;
    }
    setError("");
    setStep('allocation');
  };

  const handleProductQuantityChange = (productId: number, quantity: string) => {
    const qty = parseInt(quantity) || 0;
    const available = remainingStock[productId] || 0;
    
    if (qty > available) {
      setError(`Cannot exceed available quantity (${available})`);
      return;
    }

    setError("");

    const existingProducts = currentWorker.products.filter((p) => p.productId !== productId);
    
    if (qty > 0) {
      setCurrentWorker({
        ...currentWorker,
        products: [...existingProducts, { productId, quantity: qty }],
      });
    } else {
      setCurrentWorker({
        ...currentWorker,
        products: existingProducts,
      });
    }
  };

  const handleWorkerComplete = () => {
    if (!currentWorker.workerName.trim()) {
      setError("Worker name is required");
      return;
    }

    if (!currentWorker.workerGender) {
      setError("Gender is required");
      return;
    }

    if (currentWorker.products.length === 0) {
      setError("Please allocate at least one product");
      return;
    }

    setError("");

    // Update remaining stock
    const newStock = { ...remainingStock };
    currentWorker.products.forEach((p) => {
      newStock[p.productId] = (newStock[p.productId] || 0) - p.quantity;
    });
    setRemainingStock(newStock);

    // Save current worker
    const updatedWorkers = [...workers, currentWorker];
    setWorkers(updatedWorkers);

    // Check if we have more workers to process
    if (currentWorkerIndex + 1 < workerCount) {
      setCurrentWorkerIndex(currentWorkerIndex + 1);
      setCurrentWorker({
        workerName: "",
        workerGender: "",
        workerMobile: "",
        products: [],
      });
    } else {
      // All workers done, go to summary
      setStep('summary');
    }
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setError("");

    try {
      if (!token) return;

      // Submit each worker's distribution
      for (const worker of workers) {
        const response = await fetch("/api/distributions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            workerName: worker.workerName.trim(),
            workerGender: worker.workerGender || null,
            workerMobile: worker.workerMobile || null,
            products: worker.products,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Failed to submit distribution");
          setSubmitting(false);
          return;
        }
      }

      setSuccess("All distributions recorded successfully!");
      
      // Reset to initial state
      setTimeout(() => {
        setStep('count');
        setWorkerCount(1);
        setCurrentWorkerIndex(0);
        setWorkers([]);
        setCurrentWorker({
          workerName: "",
          workerGender: "",
          workerMobile: "",
          products: [],
        });
        setSuccess("");
        
        // Refresh products
        if (token) fetchProducts(token);
      }, 2000);
    } catch (error) {
      console.error("Failed to submit distributions:", error);
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToCount = () => {
    setStep('count');
    setWorkerCount(1);
    setCurrentWorkerIndex(0);
    setWorkers([]);
    setCurrentWorker({
      workerName: "",
      workerGender: "",
      workerMobile: "",
      products: [],
    });
    
    // Reset stock to initial
    const stock: Record<number, number> = {};
    initialProducts.forEach((p) => {
      stock[p.id] = p.remaining_quantity;
    });
    setRemainingStock(stock);
    setError("");
  };

  const availableProducts = initialProducts.filter(
    (product) => (remainingStock[product.id] || 0) > 0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Navbar title="Distribution" showBackButton />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200">
            {success}
          </div>
        )}

        {/* STEP 1: Worker Count Input */}
        {step === 'count' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 p-8">
              <h2 className="text-2xl font-bold text-white mb-8 text-center">
                Distribution Setup
              </h2>

              <form onSubmit={handleWorkerCountSubmit}>
                <div className="mb-8">
                  <label className="block text-lg font-medium text-blue-100 mb-4 text-center">
                    How many workers are receiving items today?
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={workerCount}
                    onChange={(e) => setWorkerCount(parseInt(e.target.value) || 1)}
                    className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-lg text-white text-center text-2xl font-bold placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Enter number"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-4 px-6 rounded-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition shadow-lg text-lg"
                >
                  Continue to Worker Allocation
                </button>
              </form>
            </div>
          </div>
        )}

        {/* STEP 2: Worker Allocation */}
        {step === 'allocation' && (
          <div>
            {/* Progress Indicator */}
            <div className="mb-6 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-blue-200">
                  Worker {currentWorkerIndex + 1} of {workerCount}
                </span>
                <button
                  type="button"
                  onClick={handleBackToCount}
                  className="text-blue-300 hover:text-blue-200 text-sm"
                >
                  ← Back to Setup
                </button>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${((currentWorkerIndex + 1) / workerCount) * 100}%` }}
                />
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 p-6 mb-6">
              <h2 className="text-2xl font-bold text-white mb-6">
                Worker {currentWorkerIndex + 1} Allocation
              </h2>

              {/* Worker Details Section */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-blue-100 mb-4 flex items-center">
                  <span className="bg-blue-500/20 rounded-full w-8 h-8 flex items-center justify-center mr-2 text-sm">
                    🧑‍🔧
                  </span>
                  Worker Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-100 mb-2">
                      Worker Name *
                    </label>
                    <input
                      type="text"
                      value={currentWorker.workerName}
                      onChange={(e) =>
                        setCurrentWorker({ ...currentWorker, workerName: e.target.value })
                      }
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="Enter worker name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-100 mb-2">
                      Gender *
                    </label>
                    <select
                      value={currentWorker.workerGender}
                      onChange={(e) =>
                        setCurrentWorker({ ...currentWorker, workerGender: e.target.value })
                      }
                      className="w-full px-4 py-2 bg-white/90 border border-white/20 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                      required
                    >
                      <option value="" className="text-slate-500">Select gender...</option>
                      <option value="Male" className="text-slate-900">Male</option>
                      <option value="Female" className="text-slate-900">Female</option>
                      <option value="Other" className="text-slate-900">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-100 mb-2">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      value={currentWorker.workerMobile}
                      onChange={(e) =>
                        setCurrentWorker({ ...currentWorker, workerMobile: e.target.value })
                      }
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-100 mb-2">
                      Date & Time
                    </label>
                    <input
                      type="text"
                      value={new Date().toLocaleString()}
                      readOnly
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-blue-200 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Product Allocation Section */}
              <div>
                <h3 className="text-lg font-semibold text-blue-100 mb-4 flex items-center">
                  <span className="bg-green-500/20 rounded-full w-8 h-8 flex items-center justify-center mr-2 text-sm">
                    📦
                  </span>
                  Product Allocation
                </h3>

                {loading ? (
                  <div className="text-center py-8 text-blue-200">Loading products...</div>
                ) : availableProducts.length === 0 ? (
                  <div className="text-center py-8 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-200">
                    No products with remaining stock available.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableProducts.map((product) => {
                      const available = remainingStock[product.id] || 0;
                      const allocated =
                        currentWorker.products.find((p) => p.productId === product.id)?.quantity || 0;

                      return (
                        <div
                          key={product.id}
                          className="bg-white/5 border border-white/10 rounded-lg p-4"
                        >
                          <h4 className="font-bold text-white mb-1">{product.name}</h4>
                          {product.category && (
                            <p className="text-blue-300 text-sm mb-3">{product.category}</p>
                          )}

                          <div className="flex items-center justify-between mb-3">
                            <span className="text-blue-200 text-sm">Remaining Stock</span>
                            <span className="text-white font-bold text-lg">{available}</span>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-blue-100 mb-2">
                              Allocate Quantity
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={available}
                              value={allocated || ""}
                              onChange={(e) =>
                                handleProductQuantityChange(product.id, e.target.value)
                              }
                              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-green-400"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Worker Complete Button */}
              {availableProducts.length > 0 && (
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleWorkerComplete}
                    disabled={
                      !currentWorker.workerName.trim() ||
                      !currentWorker.workerGender ||
                      currentWorker.products.length === 0
                    }
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg"
                  >
                    {currentWorkerIndex + 1 < workerCount
                      ? `Continue to Worker ${currentWorkerIndex + 2}`
                      : "Review Distribution Summary"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Summary */}
        {step === 'summary' && (
          <div>
            <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 p-6 mb-6">
              <h2 className="text-2xl font-bold text-white mb-6">Distribution Summary</h2>

              {/* Worker-wise Allocations */}
              <div className="space-y-4 mb-6">
                {workers.map((worker, index) => (
                  <div
                    key={index}
                    className="bg-white/5 border border-white/10 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-white">Worker {index + 1}</h3>
                        <p className="text-blue-200">{worker.workerName}</p>
                        <p className="text-sm text-blue-300">
                          {worker.workerGender}
                          {worker.workerMobile && ` • ${worker.workerMobile}`}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-green-500/20 text-green-300 text-sm font-medium rounded-full">
                        {worker.products.length} product{worker.products.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="space-y-2 border-t border-white/10 pt-3">
                      {worker.products.map((p) => {
                        const product = initialProducts.find((prod) => prod.id === p.productId);
                        if (!product) return null;

                        return (
                          <div
                            key={p.productId}
                            className="flex justify-between items-center"
                          >
                            <span className="text-white">{product.name}</span>
                            <span className="text-green-300 font-bold">
                              {p.quantity} {p.quantity === 1 ? 'unit' : 'units'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Distribution Summary */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-blue-100 mb-3">
                  Total Distributed Quantities
                </h3>
                <div className="space-y-2">
                  {initialProducts.map((product) => {
                    const totalDistributed = workers.reduce((sum, worker) => {
                      const allocated = worker.products.find((p) => p.productId === product.id);
                      return sum + (allocated?.quantity || 0);
                    }, 0);

                    if (totalDistributed === 0) return null;

                    return (
                      <div
                        key={product.id}
                        className="flex justify-between items-center"
                      >
                        <span className="text-white font-medium">{product.name}</span>
                        <span className="text-green-300 font-bold">
                          {totalDistributed} {totalDistributed === 1 ? 'unit' : 'units'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Remaining Stock After Distribution */}
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-orange-100 mb-3">
                  Remaining Stock After Distribution
                </h3>
                <div className="space-y-2">
                  {initialProducts.map((product) => {
                    const remaining = remainingStock[product.id] || 0;

                    return (
                      <div
                        key={product.id}
                        className="flex justify-between items-center"
                      >
                        <span className="text-white font-medium">{product.name}</span>
                        <span className={`font-bold ${remaining > 0 ? 'text-blue-300' : 'text-red-300'}`}>
                          {remaining} {remaining === 1 ? 'unit' : 'units'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleBackToCount}
                  className="flex-1 bg-white/10 border border-white/20 text-white font-semibold py-3 px-4 rounded-lg hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg"
                >
                  {submitting ? "Submitting..." : "Confirm & Submit Distribution"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
