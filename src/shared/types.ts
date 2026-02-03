import z from "zod";

// Auth schemas
export const LoginSchema = z.object({
  companyName: z.string().min(1),
  userId: z.string().min(1),
  password: z.string().min(1),
});

export const RegisterSchema = z.object({
  companyName: z.string().min(1),
  userId: z.string().min(1),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(["admin", "manager", "worker"]),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;

// User types
export interface User {
  id: number;
  company_id: number;
  user_id: string;
  name: string;
  role: "admin" | "manager" | "worker";
  created_at: string;
}

// Product schemas
export const ProductSchema = z.object({
  id: z.number(),
  company_id: z.number(),
  name: z.string(),
  category: z.string().nullable(),
  description: z.string().nullable(),
  initial_quantity: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Product = z.infer<typeof ProductSchema>;

// Distribution schemas
export const DistributionSchema = z.object({
  id: z.number(),
  company_id: z.number(),
  product_id: z.number(),
  worker_name: z.string(),
  worker_gender: z.string().nullable(),
  worker_mobile: z.string().nullable(),
  quantity: z.number(),
  distributed_by_user_id: z.number(),
  distributed_at: z.string(),
});

export type Distribution = z.infer<typeof DistributionSchema>;
