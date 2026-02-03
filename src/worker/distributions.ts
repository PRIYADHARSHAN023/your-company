import { Context } from "hono";

interface CreateDistributionInput {
  workerName: string;
  workerGender: string | null;
  workerMobile: string | null;
  products: Array<{
    productId: number;
    quantity: number;
  }>;
}

export async function getPreviousWorkers(c: Context) {
  const companyId = c.get("companyId") as number;
  const db = c.env.DB as D1Database;

  const query = `
    SELECT DISTINCT 
      worker_name,
      worker_gender,
      worker_mobile
    FROM distributions
    WHERE company_id = ?
    ORDER BY MAX(distributed_at) DESC
    LIMIT 20
  `;

  const result = await db.prepare(query).bind(companyId).all();

  return c.json(result.results || []);
}

export async function createDistribution(c: Context) {
  const companyId = c.get("companyId") as number;
  const userId = c.get("userId") as number;
  const db = c.env.DB as D1Database;

  try {
    const body = (await c.req.json()) as CreateDistributionInput;

    // Validate products and check stock
    for (const product of body.products) {
      // Get current remaining stock
      const stockQuery = `
        SELECT 
          p.initial_quantity - COALESCE(SUM(d.quantity), 0) as remaining
        FROM products p
        LEFT JOIN distributions d ON p.id = d.product_id
        WHERE p.id = ? AND p.company_id = ?
        GROUP BY p.id
      `;

      const stock = await db
        .prepare(stockQuery)
        .bind(product.productId, companyId)
        .first<{ remaining: number }>();

      if (!stock) {
        return c.json({ error: "Product not found" }, 404);
      }

      if (stock.remaining < product.quantity) {
        return c.json(
          {
            error: `Insufficient stock for product. Available: ${stock.remaining}, Requested: ${product.quantity}`,
          },
          400
        );
      }
    }

    // Create distributions
    const insertPromises = body.products.map((product) =>
      db
        .prepare(
          `INSERT INTO distributions 
          (company_id, product_id, worker_name, worker_gender, worker_mobile, quantity, distributed_by_user_id) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          companyId,
          product.productId,
          body.workerName,
          body.workerGender,
          body.workerMobile,
          product.quantity,
          userId
        )
        .run()
    );

    await Promise.all(insertPromises);

    return c.json({
      success: true,
      count: body.products.length,
    });
  } catch (error) {
    console.error("Failed to create distribution:", error);
    return c.json({ error: "Failed to create distribution" }, 500);
  }
}

export async function getDistributions(c: Context) {
  const companyId = c.get("companyId") as number;
  const userRole = c.get("userRole") as string;
  const userId = c.get("userId") as number;
  const db = c.env.DB as D1Database;

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

  // Workers can only see their own distributions
  if (userRole === "worker") {
    query += " AND d.distributed_by_user_id = ?";
  }

  query += " ORDER BY d.distributed_at DESC";

  const params = userRole === "worker" ? [companyId, userId] : [companyId];

  const result = await db.prepare(query).bind(...params).all();

  return c.json(result.results || []);
}
