// ==========================================
// Server Action: Inventory Management
// ==========================================

import { ProductSchema, StockReplenishSchema, ProductInput, StockReplenishInput } from '../lib/zod-schemas';
import { db } from '../lib/db';
import { ActionResponse, Product } from '../types/wms';

/**
 * Registers a new product SKU in inventory.
 * Access: ADMIN, WAREHOUSE_WORKER
 */
export async function registerProduct(
  input: ProductInput,
  userRole: string
): Promise<ActionResponse<Product>> {
  try {
    // RBAC Check
    if (userRole !== 'ADMIN' && userRole !== 'WAREHOUSE_WORKER') {
      return {
        success: false,
        message: 'Permission denied. Only Admins and Warehouse Workers can register new products.',
      };
    }

    // Zod Schema Validation
    const validation = ProductSchema.safeParse(input);
    if (!validation.success) {
      const formattedErrors: Record<string, string[]> = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path.join('.') || 'general';
        if (!formattedErrors[path]) formattedErrors[path] = [];
        formattedErrors[path].push(issue.message);
      });

      return {
        success: false,
        message: 'Validation failed. Please correct input errors.',
        errors: formattedErrors,
      };
    }

    const data = validation.data;

    // Database Creation
    const newProduct = await db.addProduct({
      sku: data.sku,
      name: data.name,
      description: data.description || '',
      unitPrice: data.unitPrice,
      stockQuantity: data.stockQuantity,
      minStockLevel: (data as any).minStockLevel || 5,
      categoryId: (data as any).categoryId,
    });

    return {
      success: true,
      message: `Product "${newProduct.name}" (SKU: ${newProduct.sku}) registered successfully with ${newProduct.stockQuantity} units.`,
      data: newProduct,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'An unexpected error occurred while registering product.',
    };
  }
}

/**
 * Replenishes (tops up) stock quantity for an existing product.
 * Access: ADMIN, WAREHOUSE_WORKER
 */
export async function replenishStock(
  input: StockReplenishInput,
  userRole: string
): Promise<ActionResponse<Product>> {
  try {
    if (userRole !== 'ADMIN' && userRole !== 'WAREHOUSE_WORKER') {
      return {
        success: false,
        message: 'Permission denied. Only Admins and Warehouse Workers can replenish stock.',
      };
    }

    const validation = StockReplenishSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        message: 'Invalid stock replenishment input.',
      };
    }

    const { productId, quantityToAdd, userId, notes, isAdjustment } = validation.data;
    const updatedProduct = await db.replenishProduct(productId, quantityToAdd, userId, notes, isAdjustment);

    return {
      success: true,
      message: `Stock replenished for "${updatedProduct.name}". New stock quantity: ${updatedProduct.stockQuantity} units.`,
      data: updatedProduct,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to replenish stock.',
    };
  }
}
