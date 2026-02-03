import { Context } from "hono";

export async function getFilteredDistributions(c: Context) {
  const companyId = c.get("companyId") as number;
  const userRole = c.get("userRole") as string;
  const userId = c.get("userId") as number;
  const db = c.env.DB as D1Database;

  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");
  const worker = c.req.query("worker");
  const product = c.req.query("product");
  const category = c.req.query("category");

  let query = `
    SELECT 
      d.id,
      d.worker_name,
      d.worker_gender,
      d.worker_mobile,
      d.quantity,
      d.distributed_at,
      p.name as product_name,
      p.category as product_category,
      u.name as distributed_by
    FROM distributions d
    JOIN products p ON d.product_id = p.id
    JOIN users u ON d.distributed_by_user_id = u.id
    WHERE d.company_id = ?
  `;

  const params: any[] = [companyId];

  // Workers can only see their own distributions
  if (userRole === "worker") {
    query += " AND d.distributed_by_user_id = ?";
    params.push(userId);
  }

  // Apply filters
  if (startDate) {
    query += " AND DATE(d.distributed_at) >= ?";
    params.push(startDate);
  }

  if (endDate) {
    query += " AND DATE(d.distributed_at) <= ?";
    params.push(endDate);
  }

  if (worker) {
    query += " AND d.worker_name = ?";
    params.push(worker);
  }

  if (product) {
    query += " AND p.name = ?";
    params.push(product);
  }

  if (category) {
    query += " AND p.category = ?";
    params.push(category);
  }

  query += " ORDER BY d.distributed_at DESC";

  const result = await db.prepare(query).bind(...params).all();

  return c.json(result.results || []);
}

export async function getProductAnalytics(c: Context) {
  const companyId = c.get("companyId") as number;
  const userRole = c.get("userRole") as string;
  const userId = c.get("userId") as number;
  const db = c.env.DB as D1Database;

  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");
  const category = c.req.query("category");

  let query = `
    SELECT 
      p.name as product_name,
      p.category,
      SUM(d.quantity) as total_distributed,
      COUNT(d.id) as distribution_count
    FROM products p
    JOIN distributions d ON p.id = d.product_id
    WHERE p.company_id = ?
  `;

  const params: any[] = [companyId];

  // Workers can only see their own distributions
  if (userRole === "worker") {
    query += " AND d.distributed_by_user_id = ?";
    params.push(userId);
  }

  // Apply filters
  if (startDate) {
    query += " AND DATE(d.distributed_at) >= ?";
    params.push(startDate);
  }

  if (endDate) {
    query += " AND DATE(d.distributed_at) <= ?";
    params.push(endDate);
  }

  if (category) {
    query += " AND p.category = ?";
    params.push(category);
  }

  query += " GROUP BY p.id ORDER BY total_distributed DESC";

  const result = await db.prepare(query).bind(...params).all();

  return c.json(result.results || []);
}

export async function getWorkerAnalytics(c: Context) {
  const companyId = c.get("companyId") as number;
  const userRole = c.get("userRole") as string;
  const userId = c.get("userId") as number;
  const db = c.env.DB as D1Database;

  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");
  const worker = c.req.query("worker");

  let query = `
    SELECT 
      d.worker_name,
      SUM(d.quantity) as total_items,
      COUNT(d.id) as distribution_count,
      MAX(d.distributed_at) as last_distribution
    FROM distributions d
    WHERE d.company_id = ?
  `;

  const params: any[] = [companyId];

  // Workers can only see their own distributions
  if (userRole === "worker") {
    query += " AND d.distributed_by_user_id = ?";
    params.push(userId);
  }

  // Apply filters
  if (startDate) {
    query += " AND DATE(d.distributed_at) >= ?";
    params.push(startDate);
  }

  if (endDate) {
    query += " AND DATE(d.distributed_at) <= ?";
    params.push(endDate);
  }

  if (worker) {
    query += " AND d.worker_name = ?";
    params.push(worker);
  }

  query += " GROUP BY d.worker_name ORDER BY total_items DESC";

  const result = await db.prepare(query).bind(...params).all();

  return c.json(result.results || []);
}
