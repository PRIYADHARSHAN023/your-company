import { Hono } from "hono";
import { cors } from "hono/cors";
import { handleLogin, handleRegister, authMiddleware, requireRole } from "./auth";
import { getProducts, createProduct, bulkCreateProducts, getProductsWithStock } from "./products";
import { getPreviousWorkers, createDistribution, getDistributions } from "./distributions";
import { getFilteredDistributions, getProductAnalytics, getWorkerAnalytics } from "./reports";

type Variables = {
  userId: number;
  companyId: number;
  userRole: string;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Enable CORS for frontend
app.use("/*", cors());

// Public routes
app.post("/api/auth/login", handleLogin);
app.post("/api/auth/register", handleRegister);

// Protected routes - test endpoint
app.get("/api/auth/me", authMiddleware, async (c) => {
  const userId = c.get("userId") as number;
  const companyId = c.get("companyId") as number;

  const db = c.env.DB as D1Database;

  const user = await db
    .prepare("SELECT user_id, name, role FROM users WHERE id = ? AND company_id = ?")
    .bind(userId, companyId)
    .first<{ user_id: string; name: string; role: string }>();

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json({
    userId: user.user_id,
    name: user.name,
    role: user.role,
    companyId,
  });
});

// Dashboard stats endpoint
app.get("/api/dashboard/stats", authMiddleware, async (c) => {
  const companyId = c.get("companyId") as number;
  const db = c.env.DB as D1Database;

  // Get total stock (sum of initial quantities)
  const totalStock = await db
    .prepare("SELECT COALESCE(SUM(initial_quantity), 0) as total FROM products WHERE company_id = ?")
    .bind(companyId)
    .first<{ total: number }>();

  // Get distributed today
  const today = new Date().toISOString().split("T")[0];
  const distributedToday = await db
    .prepare(
      "SELECT COALESCE(SUM(quantity), 0) as total FROM distributions WHERE company_id = ? AND DATE(distributed_at) = ?"
    )
    .bind(companyId, today)
    .first<{ total: number }>();

  // Get distributed this month
  const thisMonth = new Date().toISOString().slice(0, 7);
  const distributedMonth = await db
    .prepare(
      "SELECT COALESCE(SUM(quantity), 0) as total FROM distributions WHERE company_id = ? AND strftime('%Y-%m', distributed_at) = ?"
    )
    .bind(companyId, thisMonth)
    .first<{ total: number }>();

  // Get active workers (unique workers this month)
  const activeWorkers = await db
    .prepare(
      "SELECT COUNT(DISTINCT worker_name) as total FROM distributions WHERE company_id = ? AND strftime('%Y-%m', distributed_at) = ?"
    )
    .bind(companyId, thisMonth)
    .first<{ total: number }>();

  return c.json({
    totalStock: totalStock?.total || 0,
    distributedToday: distributedToday?.total || 0,
    distributedMonth: distributedMonth?.total || 0,
    activeWorkers: activeWorkers?.total || 0,
  });
});

// Recent distributions endpoint
app.get("/api/dashboard/recent", authMiddleware, async (c) => {
  const companyId = c.get("companyId") as number;
  const userRole = c.get("userRole") as string;
  const userId = c.get("userId") as number;
  const db = c.env.DB as D1Database;

  let query = `
    SELECT 
      d.id,
      d.worker_name,
      d.quantity,
      d.distributed_at,
      p.name as product_name,
      u.name as distributed_by
    FROM distributions d
    JOIN products p ON d.product_id = p.id
    JOIN users u ON d.distributed_by_user_id = u.id
    WHERE d.company_id = ?
  `;

  // Workers can only see their own distributions
  if (userRole === "worker") {
    query += " AND d.distributed_by_user_id = ?";
  }

  query += " ORDER BY d.distributed_at DESC LIMIT 10";

  const params = userRole === "worker" ? [companyId, userId] : [companyId];

  const result = await db.prepare(query).bind(...params).all();

  return c.json(result.results || []);
});

// Product routes
app.get("/api/products", authMiddleware, requireRole("admin", "manager"), getProducts);
app.post("/api/products", authMiddleware, requireRole("manager"), createProduct);
app.post("/api/products/bulk", authMiddleware, requireRole("manager"), bulkCreateProducts);
app.get("/api/products/available", authMiddleware, requireRole("manager"), getProductsWithStock);

// Distribution routes
app.get("/api/distributions/workers", authMiddleware, requireRole("manager"), getPreviousWorkers);
app.post("/api/distributions", authMiddleware, requireRole("manager"), createDistribution);
app.get("/api/distributions", authMiddleware, getDistributions);

// Reports routes
app.get("/api/reports/distributions", authMiddleware, getFilteredDistributions);
app.get("/api/reports/product-analytics", authMiddleware, getProductAnalytics);
app.get("/api/reports/worker-analytics", authMiddleware, getWorkerAnalytics);

export default app;
