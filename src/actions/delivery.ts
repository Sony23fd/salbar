// ==========================================
// Server Action: Atomic Delivery Confirmation
// ==========================================

import { ConfirmDeliverySchema, ConfirmDeliveryInput } from '../lib/zod-schemas';
import { db } from '../lib/db';
import { ActionResponse, Order } from '../types/wms';

/**
 * CRITICAL RULE: Confirm Delivery with Atomic Stock Deduction
 * Executes atomic db.$transaction to deduct ordered quantities from inventory.
 * If warehouse stock is insufficient for ANY item in the order, rejects the transaction.
 * Records exact deliveredAt timestamp, assigned driver (deliveredById), and appends OrderHistory log.
 * Access: DELIVERY_DRIVER, ADMIN
 */
export async function confirmDelivery(
  input: ConfirmDeliveryInput,
  userRole: string
): Promise<ActionResponse<Order>> {
  try {
    // RBAC Check
    if (userRole !== 'DELIVERY_DRIVER' && userRole !== 'ADMIN') {
      return {
        success: false,
        message: 'Permission denied. Only Delivery Drivers and Admins can confirm order deliveries.',
      };
    }

    // Zod Validation
    const validation = ConfirmDeliverySchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        message: 'Invalid delivery confirmation parameters.',
      };
    }

    const { orderId, driverId, deliveryNotes } = validation.data;

    // Execute Atomic Database    // ATOMIC TRANSACTION: Confirm Delivery
    const confirmedOrder = await db.confirmDelivery(orderId, driverId, deliveryNotes);

    return {
      success: true,
      message: `Delivery confirmed for Order #${confirmedOrder.orderNumber}! Inventory stock deducted atomically. Branch activity updated.`,
      data: confirmedOrder,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Delivery confirmation failed.',
    };
  }
}
