import { Context } from "hono";

interface CreateProductInput {
  name: string;
  category: string | null;
  description: string | null;
  quantity: number;
}

interface BulkProductInput {
  products: Array<{
    name: string;
    category: string | null;
    quantity: number;
  }>;
}

export async function getProducts(c: Context) {
  const companyId = c.get("companyId") as number;
  const db = c.env.DB as D1Database;

  // Get products with remaining quantity calculated from distributions
  const query = `
    SELECT 
      p.id,
      p.name,
      p.category,
      p.description,
      p.initial_quantity,
      p.initial_quantity - COALESCE(SUM(d.quantity), 0) as remaining_quantity,
      p.created_at,
      p.updated_at
    FROM products p
    LEFT JOIN distributions d ON p.id = d.product_id
    WHERE p.company_id = ?
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `;

  const result = await db.prepare(query).bind(companyId).all();

  return c.json(result.results || []);
}

export async function createProduct(c: Context) {
  const companyId = c.get("companyId") as number;
  const db = c.env.DB as D1Database;

  try {
    const body = (await c.req.json()) as CreateProductInput;

    const result = await db
      .prepare(
        "INSERT INTO products (company_id, name, category, description, initial_quantity) VALUES (?, ?, ?, ?, ?)"
      )
      .bind(
        companyId,
        body.name,
        body.category,
        body.description,
        body.quantity
      )
      .run();

    return c.json({
      success: true,
      id: result.meta.last_row_id,
    });
  } catch (error) {
    console.error("Failed to create product:", error);
    return c.json({ error: "Failed to create product" }, 500);
  }
}

export async function bulkCreateProducts(c: Context) {
  const companyId = c.get("companyId") as number;
  const db = c.env.DB as D1Database;

  try {
    const body = (await c.req.json()) as BulkProductInput;

    // Insert all products
    const insertPromises = body.products.map((product) =>
      db
        .prepare(
          "INSERT INTO products (company_id, name, category, initial_quantity) VALUES (?, ?, ?, ?)"
        )
        .bind(companyId, product.name, product.category, product.quantity)
        .run()
    );

    await Promise.all(insertPromises);

    return c.json({
      success: true,
      count: body.products.length,
    });
  } catch (error) {
    console.error("Failed to bulk create products:", error);
    return c.json({ error: "Failed to create products" }, 500);
  }
}

export async function getProductsWithStock(c: Context) {
  const companyId = c.get("companyId") as number;
  const db = c.env.DB as D1Database;

  // Get only products with remaining stock
  const query = `
    SELECT 
      p.id,
      p.name,
      p.category,
      p.initial_quantity - COALESCE(SUM(d.quantity), 0) as remaining_quantity
    FROM products p
    LEFT JOIN distributions d ON p.id = d.product_id
    WHERE p.company_id = ?
    GROUP BY p.id
    HAVING remaining_quantity > 0
    ORDER BY p.name
  `;

  const result = await db.prepare(query).bind(companyId).all();

  return c.json(result.results || []);
}
