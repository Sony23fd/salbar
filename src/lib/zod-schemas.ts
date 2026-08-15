import { z } from 'zod';

// Product Registration Schema
export const ProductSchema = z.object({
  sku: z
    .string()
    .min(3, 'SKU must be at least 3 characters')
    .max(20, 'SKU must not exceed 20 characters')
    .transform((val) => val.toUpperCase().trim()),
  name: z.string().min(2, 'Product name is required').trim(),
  description: z.string().optional(),
  unitPrice: z.coerce
    .number()
    .positive('Unit price must be greater than zero'),
  stockQuantity: z.coerce
    .number()
    .int('Stock quantity must be an integer')
    .nonnegative('Stock quantity cannot be negative'),
  categoryId: z.string().optional(),
  minStockLevel: z.coerce.number().optional(),
  commissionPercent: z.coerce.number().optional(),
  vatPercent: z.coerce.number().optional(),
});

export type ProductInput = z.infer<typeof ProductSchema>;

// Stock Replenishment Schema
export const StockReplenishSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantityToAdd: z.number().int(),
  userId: z.string().min(1, 'User ID is required'),
  notes: z.string().optional(),
  isAdjustment: z.boolean().optional(),
});

export type StockReplenishInput = z.infer<typeof StockReplenishSchema>;

// Order Item Input Schema
export const OrderItemInputSchema = z.object({
  productId: z.string().min(1, 'Product selection is required'),
  quantity: z.coerce
    .number()
    .int('Quantity must be an integer')
    .positive('Order quantity must be at least 1'),
});

// Order Creation Schema
export const CreateOrderSchema = z.object({
  branchId: z.string().min(1, 'Branch selection is required'),
  items: z
    .array(OrderItemInputSchema)
    .min(1, 'At least one order item is required'),
  notes: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

// Delivery Confirmation Schema
export const ConfirmDeliverySchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  driverId: z.string().min(1, 'Delivery Driver ID is required'),
  deliveryNotes: z.string().optional(),
});

export type ConfirmDeliveryInput = z.infer<typeof ConfirmDeliverySchema>;
