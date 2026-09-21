import { z } from 'zod';
export const id = z.coerce.number().int().positive();
const text = z.string().trim().min(1).max(100);
const money = z.coerce.number().positive().max(100000).multipleOf(0.01);
const date = z.iso.date();
export const orderInput = z
  .object({
    branch_id: id,
    customer_id: id,
    promotion_id: id.nullable().optional(),
    items: z
      .array(
        z.object({
          menu_item_id: id,
          quantity: z.coerce.number().int().min(1).max(50),
        }),
      )
      .min(1)
      .max(30),
  })
  .refine(
    (v) => new Set(v.items.map((i) => i.menu_item_id)).size === v.items.length,
    'Each menu item must appear once',
  );
export const paymentInput = z.object({
  method: z.enum(['cash', 'card', 'upi']),
});
export const feedbackInput = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(500).default(''),
});
export const catalog = {
  branches: {
    table: 'branches',
    schema: z.object({
      name: text,
      city: text.max(80),
      active: z.boolean().default(true),
    }),
  },
  customers: {
    table: 'customers',
    schema: z.object({
      name: text,
      email: z.email().max(150),
      phone: z.string().max(25).nullable().default(null),
    }),
  },
  categories: {
    table: 'menu_categories',
    schema: z.object({ name: text.max(80) }),
  },
  menu: {
    table: 'menu_items',
    schema: z.object({
      name: text,
      category_id: id,
      price: money,
      active: z.boolean().default(true),
    }),
  },
  ingredients: {
    table: 'ingredients',
    schema: z.object({ name: text, unit: z.enum(['g', 'ml', 'piece']) }),
  },
  suppliers: {
    table: 'suppliers',
    schema: z.object({ name: text, email: z.email().max(150) }),
  },
  promotions: {
    table: 'promotions',
    schema: z
      .object({
        code: text.max(30),
        discount_percent: z.coerce.number().positive().max(100),
        starts_on: date,
        ends_on: date,
      })
      .refine(
        (v) => v.ends_on >= v.starts_on,
        'End date must follow start date',
      ),
  },
  campaigns: {
    table: 'marketing_campaigns',
    schema: z.object({
      name: text,
      promotion_id: id,
      channel: z.enum(['email', 'social', 'in-store']),
      budget: z.coerce.number().min(0).max(10000000),
    }),
  },
};
export const employeeInput = z
  .object({
    name: text,
    email: z.email().max(150),
    branch_id: id.nullable(),
    role: z.enum(['admin', 'manager', 'staff']),
    active: z.boolean().default(true),
    password: z.string().min(10).max(72).optional(),
  })
  .refine(
    (v) => v.role === 'admin' || v.branch_id,
    'Manager and staff need a branch',
  );
export const recipeInput = z
  .array(
    z.object({
      ingredient_id: id,
      quantity: z.coerce.number().positive().max(100000),
    }),
  )
  .min(1)
  .max(30)
  .refine(
    (v) => new Set(v.map((i) => i.ingredient_id)).size === v.length,
    'Ingredients must be unique',
  );
