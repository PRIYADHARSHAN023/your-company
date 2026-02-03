import { Context } from "hono";
import bcrypt from "bcryptjs";
import { LoginSchema, RegisterSchema } from "@/shared/types";

// Simple JWT-like token generation (Base64 encoded JSON)
function generateToken(userId: number, companyId: number, role: string): string {
  const payload = {
    userId,
    companyId,
    role,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  };
  return btoa(JSON.stringify(payload));
}

export function verifyToken(token: string): { userId: number; companyId: number; role: string } | null {
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp < Date.now()) {
      return null;
    }
    return { userId: payload.userId, companyId: payload.companyId, role: payload.role };
  } catch {
    return null;
  }
}

export async function handleLogin(c: Context) {
  try {
    const body = await c.req.json();
    const input = LoginSchema.parse(body);

    const db = c.env.DB as D1Database;

    // Get or create company
    let company = await db
      .prepare("SELECT id FROM companies WHERE name = ?")
      .bind(input.companyName)
      .first<{ id: number }>();

    if (!company) {
      return c.json({ error: "Company not found. Please register first." }, 404);
    }

    // Find user
    const user = await db
      .prepare(
        "SELECT id, company_id, user_id, password_hash, name, role FROM users WHERE company_id = ? AND user_id = ?"
      )
      .bind(company.id, input.userId)
      .first<{
        id: number;
        company_id: number;
        user_id: string;
        password_hash: string;
        name: string;
        role: string;
      }>();

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Verify password
    const isValid = await bcrypt.compare(input.password, user.password_hash);
    if (!isValid) {
      return c.json({ error: "Invalid password" }, 401);
    }

    // Generate token
    const token = generateToken(user.id, user.company_id, user.role);

    return c.json({
      token,
      userId: user.user_id,
      name: user.name,
      role: user.role,
      companyId: user.company_id,
    });
  } catch (error) {
    console.error("Login error:", error);
    return c.json({ error: "Invalid request" }, 400);
  }
}

export async function handleRegister(c: Context) {
  try {
    const body = await c.req.json();
    const input = RegisterSchema.parse(body);

    const db = c.env.DB as D1Database;

    // Get or create company
    let company = await db
      .prepare("SELECT id FROM companies WHERE name = ?")
      .bind(input.companyName)
      .first<{ id: number }>();

    if (!company) {
      const result = await db
        .prepare("INSERT INTO companies (name) VALUES (?)")
        .bind(input.companyName)
        .run();
      company = { id: result.meta.last_row_id as number };
    }

    // Check if user already exists
    const existingUser = await db
      .prepare("SELECT id FROM users WHERE company_id = ? AND user_id = ?")
      .bind(company.id, input.userId)
      .first();

    if (existingUser) {
      return c.json({ error: "User ID already exists in this company" }, 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, 10);

    // Create user
    const result = await db
      .prepare(
        "INSERT INTO users (company_id, user_id, password_hash, name, role) VALUES (?, ?, ?, ?, ?)"
      )
      .bind(company.id, input.userId, passwordHash, input.name, input.role)
      .run();

    const newUserId = result.meta.last_row_id as number;

    // Generate token
    const token = generateToken(newUserId, company.id, input.role);

    return c.json({
      token,
      userId: input.userId,
      name: input.name,
      role: input.role,
      companyId: company.id,
    });
  } catch (error) {
    console.error("Register error:", error);
    return c.json({ error: "Invalid request" }, 400);
  }
}

// Middleware to verify authentication
export async function authMiddleware(c: Context, next: () => Promise<void>) {
  const authHeader = c.req.header("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  // Store user info in context
  c.set("userId", payload.userId);
  c.set("companyId", payload.companyId);
  c.set("userRole", payload.role);

  await next();
}

// Middleware to check role
export function requireRole(...allowedRoles: string[]) {
  return async (c: Context, next: () => Promise<void>) => {
    const userRole = c.get("userRole") as string;

    if (!allowedRoles.includes(userRole)) {
      return c.json({ error: "Forbidden: insufficient permissions" }, 403);
    }

    await next();
  };
}
