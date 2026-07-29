// ==========================================
// Server Action: Order Creation
// ==========================================

import { CreateOrderSchema, CreateOrderInput } from '../lib/zod-schemas';
import { db } from '../lib/db';
import { ActionResponse, Order } from '../types/wms';

/**
 * Creates a new branch order with multiple items and calculated totals.
 * Updates branch's lastActivityAt timestamp.
 * Access: ADMIN, WAREHOUSE_WORKER
 */
export async function createOrder(
  input: CreateOrderInput,
  currentUserId: string,
  userRole: string
): Promise<ActionResponse<Order>> {
  try {
    // RBAC Check
    if (userRole !== 'ADMIN' && userRole !== 'WAREHOUSE_WORKER') {
      return {
        success: false,
        message: 'Permission denied. Only Admins and Warehouse Workers can place branch orders.',
      };
    }

    // Zod Validation
    const validation = CreateOrderSchema.safeParse(input);
    if (!validation.success) {
      const formattedErrors: Record<string, string[]> = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path.join('.') || 'general';
        if (!formattedErrors[path]) formattedErrors[path] = [];
        formattedErrors[path].push(issue.message);
      });

      return {
        success: false,
        message: 'Order validation failed.',
        errors: formattedErrors,
      };
    }

    const { branchId, items, notes } = validation.data;

    // Database Creation
    const order = await db.createOrder(branchId, currentUserId, items, notes);

    return {
      success: true,
      message: `Order #${order.orderNumber} created successfully for ${order.branchName} (Total: $${order.totalAmount.toFixed(2)}).`,
      data: order,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to create order.',
    };
  }
}
