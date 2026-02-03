import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "@/react-app/contexts/AuthContext";
import Navbar from "@/react-app/components/Navbar";

interface Product {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  initial_quantity: number;
  remaining_quantity: number;
}

export default function Stock() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Manual entry form
  const [showManualForm, setShowManualForm] = useState(false);
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");

  useEffect(() => {
    if (token) {
      fetchProducts(token);
    }
  }, [token]);

  const fetchProducts = async (token: string) => {
    try {
      const response = await fetch("/api/products", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) return;

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: productName,
          category: category || null,
          description: description || null,
          quantity: parseInt(quantity) || 0,
        }),
      });

      if (response.ok) {
        setProductName("");
        setCategory("");
        setDescription("");
        setQuantity("");
        setShowManualForm(false);
        fetchProducts(token);
      }
    } catch (error) {
      console.error("Failed to create product:", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);

      const extractedProducts: Array<{
        name: string;
        category: string | null;
        quantity: number;
      }> = [];

      // Process each sheet
      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];

        // Skip empty sheets
        if (jsonData.length === 0) return;

        jsonData.forEach((row) => {
          if (!row || row.length === 0) return;

          // Generic product extraction: combine all meaningful text
          const textCells: string[] = [];
          const numericCells: number[] = [];

          row.forEach((cell) => {
            if (cell === null || cell === undefined || cell === "") return;

            const cellStr = String(cell).trim();
            
            // Try to parse as number
            const numValue = parseFloat(cellStr);
            if (!isNaN(numValue) && isFinite(numValue)) {
              numericCells.push(numValue);
            } else if (cellStr.length > 0) {
              textCells.push(cellStr);
            }
          });

          // Skip rows with no text
          if (textCells.length === 0) return;

          // Product identity: combine meaningful text
          const productName = textCells.join(" - ");

          // Quantity detection: pick logical stock quantity
          let quantity = 0;
          if (numericCells.length > 0) {
            // Prefer integers over decimals (avoid prices)
            const integers = numericCells.filter((n) => Number.isInteger(n) && n >= 0);
            if (integers.length > 0) {
              // Pick the largest reasonable integer (likely stock quantity)
              quantity = Math.max(...integers);
            } else {
              // If no integers, just pick first non-negative number
              const nonNegative = numericCells.filter((n) => n >= 0);
              if (nonNegative.length > 0) {
                quantity = Math.floor(nonNegative[0]);
              }
            }
          }

          // Sheet name as category
          const category = sheetName !== "Sheet1" ? sheetName : null;

          extractedProducts.push({
            name: productName,
            category,
            quantity,
          });
        });
      });

      // Send to backend
      if (!token) return;

      const response = await fetch("/api/products/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ products: extractedProducts }),
      });

      if (response.ok) {
        fetchProducts(token);
      }
    } catch (error) {
      console.error("Failed to upload Excel:", error);
      alert("Failed to process Excel file. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Navbar title="Stock Setup" showBackButton />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => setShowManualForm(!showManualForm)}
            className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-xl border border-blue-400/30 rounded-xl p-6 hover:from-blue-500/30 hover:to-blue-600/30 transition text-left"
          >
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-blue-500/30 rounded-lg">
                <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">Manual Entry</h3>
            </div>
            <p className="text-blue-200 text-sm">Add products one by one</p>
          </button>

          <label className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-xl border border-green-400/30 rounded-xl p-6 hover:from-green-500/30 hover:to-green-600/30 transition cursor-pointer">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-green-500/30 rounded-lg">
                <svg className="w-5 h-5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">
                {uploading ? "Processing..." : "Excel Upload"}
              </h3>
            </div>
            <p className="text-green-200 text-sm">
              {uploading ? "Analyzing file..." : "Upload any Excel format"}
            </p>
          </label>

          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-xl border border-purple-400/30 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-purple-500/30 rounded-lg">
                <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">{products.length}</h3>
            </div>
            <p className="text-purple-200 text-sm">Total Products</p>
          </div>
        </div>

        {showManualForm && (
          <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Add New Product</h2>
            <form onSubmit={handleManualSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-100 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-100 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-100 mb-2">
                  Quantity *
                </label>
                <input
                  type="number"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-100 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Optional"
                />
              </div>

              <div className="md:col-span-2 flex space-x-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition"
                >
                  Add Product
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualForm(false)}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Product Inventory</h2>
          
          {loading ? (
            <div className="text-center py-8 text-blue-200">Loading...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-blue-200">
              No products yet. Add products manually or upload an Excel file.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className={`bg-white/5 border rounded-lg p-4 ${
                    product.remaining_quantity === 0
                      ? "border-red-400/30 opacity-60"
                      : "border-white/10"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-white text-lg">{product.name}</h3>
                    {product.remaining_quantity === 0 && (
                      <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded">
                        Out of Stock
                      </span>
                    )}
                  </div>
                  
                  {product.category && (
                    <p className="text-blue-300 text-sm mb-2">{product.category}</p>
                  )}
                  
                  {product.description && (
                    <p className="text-blue-200/70 text-sm mb-3">{product.description}</p>
                  )}
                  
                  <div className="flex justify-between items-center pt-3 border-t border-white/10">
                    <span className="text-blue-200 text-sm">Remaining</span>
                    <span className={`text-2xl font-bold ${
                      product.remaining_quantity === 0 ? "text-red-400" : "text-white"
                    }`}>
                      {product.remaining_quantity}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-blue-200/50 text-xs">Initial</span>
                    <span className="text-blue-200/50 text-sm">{product.initial_quantity}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
