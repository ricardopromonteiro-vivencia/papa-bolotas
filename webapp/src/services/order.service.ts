/**
 * Order Service
 * 
 * Handles all order operations including creation, registration, cancellation,
 * and receipt generation. Implements offline-first architecture with automatic
 * stock management and sequential order numbering.
 * 
 * Requirements:
 * - 5.1: Create orders by selecting menu items
 * - 5.7: Assign sequential order numbers
 * - 5.9: Decrement stock on order registration
 * - 6.1: Register complimentary orders (total = 0)
 * - 6.2: Decrement stock for complimentary orders
 */

import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';
import { env } from '@/config/env';
import { 
  Order, 
  OrderItem, 
  Receipt,
  AdjustmentType
} from '@/types';

/**
 * Custom error class for order service failures
 */
export class OrderServiceError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'OrderServiceError';
  }
}

/**
 * Configuration for retry behavior
 */
const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 5000, // 5 seconds
  backoffMultiplier: 2,
};

/**
 * Order Service
 * 
 * Provides comprehensive order management with offline-first architecture.
 * All operations write to IndexedDB first, then sync to Supabase when online.
 */
export class OrderService {
  /**
   * Check if the application is currently online
   * @returns true if online, false if offline
   */
  private isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Sleep utility for retry delays
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry a function with exponential backoff
   * @param fn - Function to retry
   * @param attempt - Current attempt number
   * @returns Result of the function
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    attempt: number = 0
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= RETRY_CONFIG.maxAttempts - 1) {
        throw error;
      }

      const delay = Math.min(
        RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
        RETRY_CONFIG.maxDelay
      );

      if (import.meta.env.DEV) {
        console.log(`Retry attempt ${attempt + 1} after ${delay}ms`);
      }

      await this.sleep(delay);
      return this.retryWithBackoff(fn, attempt + 1);
    }
  }

  /**
   * Generate next sequential order number for a session
   * 
   * Requirement 5.7: Sequential order numbering
   * 
   * @param sessionId - Current session ID
   * @returns Next order number
   */
  private async getNextOrderNumber(sessionId: string): Promise<number> {
    try {
      // Get highest order number for this session from local DB
      const orders = await db.orders
        .where('sessionId')
        .equals(sessionId)
        .toArray();

      if (orders.length === 0) {
        return 1;
      }

      const maxOrderNumber = Math.max(...orders.map(o => o.orderNumber));
      return maxOrderNumber + 1;
    } catch (error) {
      throw new OrderServiceError(
        'Failed to generate order number',
        'ORDER_NUMBER_ERROR',
        500
      );
    }
  }

  /**
   * Decrement stock levels for order items
   * 
   * Requirements 5.9, 6.2: Decrement stock on order registration
   * 
   * @param items - Order items to decrement stock for
   */
  private async decrementStock(items: OrderItem[]): Promise<void> {
    try {
      for (const item of items) {
        // Get current menu item
        const menuItem = await db.menuItems.get(item.menuItemId);
        
        if (!menuItem) {
          throw new OrderServiceError(
            `Menu item not found: ${item.menuItemId}`,
            'MENU_ITEM_NOT_FOUND',
            404
          );
        }

        // Calculate new stock level
        const newStockLevel = menuItem.stockLevel - item.quantity;

        // Allow negative stock (as per requirements - just warn)
        if (newStockLevel < 0 && import.meta.env.DEV) {
          console.warn(`Stock level for ${menuItem.name} is now negative: ${newStockLevel}`);
        }

        // Update menu item stock in local DB
        await db.menuItems.update(menuItem.id, {
          stockLevel: newStockLevel,
          updatedAt: new Date(),
        });

        // Record stock adjustment
        await db.stockAdjustments.add({
          id: crypto.randomUUID(),
          menuItemId: menuItem.id,
          adjustmentType: AdjustmentType.ORDER,
          quantityChange: -item.quantity,
          previousLevel: menuItem.stockLevel,
          newLevel: newStockLevel,
          reason: `Order item`,
          createdAt: new Date(),
        });

        // If online, sync to Supabase
        if (this.isOnline()) {
          try {
            await this.retryWithBackoff(async () => {
              const { error } = await supabase
                .from('menu_items')
                .update({ 
                  stock_level: newStockLevel,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', menuItem.id);

              if (error) throw error;
            });

            // Also record stock adjustment in Supabase
            await this.retryWithBackoff(async () => {
              const { error } = await supabase
                .from('stock_adjustments')
                .insert({
                  menu_item_id: menuItem.id,
                  adjustment_type: AdjustmentType.ORDER,
                  quantity_change: -item.quantity,
                  previous_level: menuItem.stockLevel,
                  new_level: newStockLevel,
                  reason: 'Order item',
                });

              if (error) throw error;
            });
          } catch (error) {
            // Log sync failure but don't throw - operation already succeeded locally
            console.warn('Failed to sync stock update to Supabase:', error);
            
            // Queue for later sync
            await db.syncQueue.add({
              id: crypto.randomUUID(),
              entityType: 'menu_items',
              entityId: menuItem.id,
              operation: 'update' as any,
              data: { stockLevel: newStockLevel },
              timestamp: new Date(),
              retryCount: 0,
              status: 'pending' as any,
            });
          }
        } else {
          // Queue for sync when online
          await db.syncQueue.add({
            id: crypto.randomUUID(),
            entityType: 'menu_items',
            entityId: menuItem.id,
            operation: 'update' as any,
            data: { stockLevel: newStockLevel },
            timestamp: new Date(),
            retryCount: 0,
            status: 'pending' as any,
          });
        }
      }
    } catch (error) {
      if (error instanceof OrderServiceError) {
        throw error;
      }
      throw new OrderServiceError(
        'Failed to decrement stock levels',
        'STOCK_DECREMENT_ERROR',
        500
      );
    }
  }

  /**
   * Validate order items
   * 
   * @param items - Order items to validate
   */
  private validateOrderItems(items: Omit<OrderItem, 'id' | 'orderId'>[]): void {
    if (!items || items.length === 0) {
      throw new OrderServiceError(
        'Order must contain at least one item',
        'EMPTY_ORDER',
        400
      );
    }

    for (const item of items) {
      if (!item.menuItemId || typeof item.menuItemId !== 'string') {
        throw new OrderServiceError(
          'Invalid menu item ID',
          'INVALID_MENU_ITEM_ID',
          400
        );
      }

      if (!item.menuItemName || typeof item.menuItemName !== 'string') {
        throw new OrderServiceError(
          'Invalid menu item name',
          'INVALID_MENU_ITEM_NAME',
          400
        );
      }

      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        throw new OrderServiceError(
          'Item quantity must be a positive number',
          'INVALID_QUANTITY',
          400
        );
      }

      if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
        throw new OrderServiceError(
          'Item unit price must be non-negative',
          'INVALID_UNIT_PRICE',
          400
        );
      }

      if (typeof item.subtotal !== 'number' || item.subtotal < 0) {
        throw new OrderServiceError(
          'Item subtotal must be non-negative',
          'INVALID_SUBTOTAL',
          400
        );
      }

      // Verify subtotal calculation
      const expectedSubtotal = item.quantity * item.unitPrice;
      if (Math.abs(item.subtotal - expectedSubtotal) > 0.01) {
        throw new OrderServiceError(
          'Item subtotal does not match quantity × unit price',
          'INVALID_SUBTOTAL_CALCULATION',
          400
        );
      }
    }
  }

  /**
   * Create a new order (not yet registered)
   * 
   * Creates an order in memory without assigning order number or decrementing stock.
   * Use registerOrder() or registerComplimentary() to finalize the order.
   * 
   * Requirement 5.1: Create orders by selecting menu items
   * 
   * @param sessionId - Current session ID
   * @param items - Order items with menu item details
   * @param observations - Optional customer observations
   * @returns Created order (not yet registered)
   */
  async createOrder(
    sessionId: string,
    items: Omit<OrderItem, 'id' | 'orderId'>[],
    observations?: string
  ): Promise<Order> {
    try {
      // Validate inputs
      if (!sessionId || typeof sessionId !== 'string') {
        throw new OrderServiceError(
          'Invalid session ID',
          'INVALID_SESSION_ID',
          400
        );
      }

      this.validateOrderItems(items);

      // Calculate total
      const total = items.reduce((sum, item) => sum + item.subtotal, 0);

      // Create order object (without order number - assigned on registration)
      const order: Order = {
        id: crypto.randomUUID(),
        orderNumber: 0, // Will be assigned on registration
        sessionId,
        total: Math.round(total * 100) / 100, // Round to 2 decimal places
        isComplimentary: false,
        isCancelled: false,
        observations,
        items: items.map(item => ({
          ...item,
          id: crypto.randomUUID(),
          orderId: '', // Will be set when adding to order
        })),
        createdAt: new Date(),
        version: 1,
      };

      // Set orderId for all items
      order.items = order.items.map(item => ({
        ...item,
        orderId: order.id,
      }));

      return order;
    } catch (error) {
      if (error instanceof OrderServiceError) {
        throw error;
      }
      throw new OrderServiceError(
        'Failed to create order',
        'ORDER_CREATION_ERROR',
        500
      );
    }
  }

  /**
   * Register an order (finalize and save)
   * 
   * Assigns sequential order number, saves to database, and decrements stock.
   * 
   * Requirements:
   * - 5.7: Assign sequential order number
   * - 5.8: Record timestamp
   * - 5.9: Decrement stock levels
   * 
   * @param order - Order to register
   * @returns Registered order with assigned order number
   */
  async registerOrder(order: Order): Promise<Order> {
    try {
      // Validate order
      if (!order || !order.sessionId) {
        throw new OrderServiceError(
          'Invalid order',
          'INVALID_ORDER',
          400
        );
      }

      this.validateOrderItems(order.items);

      // Assign order number
      const orderNumber = await this.getNextOrderNumber(order.sessionId);
      
      const registeredOrder: Order = {
        ...order,
        orderNumber,
        createdAt: new Date(),
        version: 1,
      };

      // Save to local DB first (offline-first)
      await db.orders.add(registeredOrder);

      // Save order items
      for (const item of registeredOrder.items) {
        await db.orderItems.add(item);
      }

      // Decrement stock for all items
      await this.decrementStock(registeredOrder.items);

      // If online, sync to Supabase
      if (this.isOnline()) {
        try {
          await this.retryWithBackoff(async () => {
            // Insert order
            const { error: orderError } = await supabase
              .from('orders')
              .insert({
                id: registeredOrder.id,
                order_number: registeredOrder.orderNumber,
                session_id: registeredOrder.sessionId,
                total: registeredOrder.total,
                is_complimentary: registeredOrder.isComplimentary,
                is_cancelled: registeredOrder.isCancelled,
                observations: registeredOrder.observations,
                created_at: registeredOrder.createdAt.toISOString(),
                version: registeredOrder.version,
              });

            if (orderError) throw orderError;

            // Insert order items
            const { error: itemsError } = await supabase
              .from('order_items')
              .insert(
                registeredOrder.items.map(item => ({
                  id: item.id,
                  order_id: item.orderId,
                  menu_item_id: item.menuItemId,
                  menu_item_name: item.menuItemName,
                  quantity: item.quantity,
                  unit_price: item.unitPrice,
                  subtotal: item.subtotal,
                }))
              );

            if (itemsError) throw itemsError;
          });
        } catch (error) {
          // Log sync failure but don't throw - operation already succeeded locally
          console.warn('Failed to sync order to Supabase:', error);
          
          // Queue for later sync
          await db.syncQueue.add({
            id: crypto.randomUUID(),
            entityType: 'orders',
            entityId: registeredOrder.id,
            operation: 'create' as any,
            data: registeredOrder,
            timestamp: new Date(),
            retryCount: 0,
            status: 'pending' as any,
          });
        }
      } else {
        // Queue for sync when online
        await db.syncQueue.add({
          id: crypto.randomUUID(),
          entityType: 'orders',
          entityId: registeredOrder.id,
          operation: 'create' as any,
          data: registeredOrder,
          timestamp: new Date(),
          retryCount: 0,
          status: 'pending' as any,
        });
      }

      return registeredOrder;
    } catch (error) {
      if (error instanceof OrderServiceError) {
        throw error;
      }
      throw new OrderServiceError(
        'Failed to register order',
        'ORDER_REGISTRATION_ERROR',
        500
      );
    }
  }

  /**
   * Register a complimentary order (total = 0)
   * 
   * Same as registerOrder but sets total to 0 and marks as complimentary.
   * Stock is still decremented.
   * 
   * Requirements:
   * - 6.1: Register complimentary orders with total = 0
   * - 6.2: Decrement stock for complimentary orders
   * 
   * @param order - Order to register as complimentary
   * @returns Registered complimentary order
   */
  async registerComplimentary(order: Order): Promise<Order> {
    try {
      // Set as complimentary and zero total
      const complimentaryOrder: Order = {
        ...order,
        total: 0,
        isComplimentary: true,
      };

      // Use regular registration logic
      return await this.registerOrder(complimentaryOrder);
    } catch (error) {
      if (error instanceof OrderServiceError) {
        throw error;
      }
      throw new OrderServiceError(
        'Failed to register complimentary order',
        'COMPLIMENTARY_ORDER_ERROR',
        500
      );
    }
  }

  /**
   * Cancel an order
   * 
   * Marks order as cancelled, sets total to 0, and restores stock.
   * 
   * Requirements:
   * - 7.3: Cancel order with security code validation
   * - 7.5: Restore stock levels
   * - 7.6: Set total to 0
   * - 7.7: Mark as cancelled
   * 
   * @param orderId - Order ID to cancel
   * @param securityCode - Security code for validation
   * @param cancelledBy - User ID performing cancellation
   */
  async cancelOrder(
    orderId: string,
    securityCode: string,
    cancelledBy?: string
  ): Promise<void> {
    try {
      // Validate inputs
      if (!orderId || typeof orderId !== 'string') {
        throw new OrderServiceError(
          'Invalid order ID',
          'INVALID_ORDER_ID',
          400
        );
      }

      // Validate security code is provided and is a string
      if (!securityCode || typeof securityCode !== 'string') {
        throw new OrderServiceError(
          'Security code required',
          'SECURITY_CODE_REQUIRED',
          400
        );
      }

      // Validate security code format (4-6 digits)
      if (!/^\d{4,6}$/.test(securityCode)) {
        throw new OrderServiceError(
          'Invalid security code format. Must be 4-6 digits.',
          'INVALID_SECURITY_CODE_FORMAT',
          400
        );
      }

      // Validate security code matches configured value
      if (securityCode !== env.security.securityCode) {
        throw new OrderServiceError(
          'Incorrect security code',
          'INCORRECT_SECURITY_CODE',
          403
        );
      }

      // Get order from local DB
      const order = await db.orders.get(orderId);
      
      if (!order) {
        throw new OrderServiceError(
          'Order not found',
          'ORDER_NOT_FOUND',
          404
        );
      }

      if (order.isCancelled) {
        throw new OrderServiceError(
          'Order is already cancelled',
          'ORDER_ALREADY_CANCELLED',
          400
        );
      }

      // Get order items
      const items = await db.orderItems
        .where('orderId')
        .equals(orderId)
        .toArray();

      // Restore stock levels (increment back)
      for (const item of items) {
        const menuItem = await db.menuItems.get(item.menuItemId);
        
        if (!menuItem) {
          console.warn(`Menu item not found during cancellation: ${item.menuItemId}`);
          continue;
        }

        const newStockLevel = menuItem.stockLevel + item.quantity;

        // Update menu item stock in local DB
        await db.menuItems.update(menuItem.id, {
          stockLevel: newStockLevel,
          updatedAt: new Date(),
        });

        // Record stock adjustment
        await db.stockAdjustments.add({
          id: crypto.randomUUID(),
          menuItemId: menuItem.id,
          adjustmentType: AdjustmentType.CANCELLATION,
          quantityChange: item.quantity,
          previousLevel: menuItem.stockLevel,
          newLevel: newStockLevel,
          reason: `Order #${order.orderNumber} cancelled`,
          createdAt: new Date(),
        });

        // Sync to Supabase if online
        if (this.isOnline()) {
          try {
            await this.retryWithBackoff(async () => {
              const { error } = await supabase
                .from('menu_items')
                .update({ 
                  stock_level: newStockLevel,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', menuItem.id);

              if (error) throw error;
            });
          } catch (error) {
            console.warn('Failed to sync stock restoration to Supabase:', error);
          }
        }
      }

      // Update order as cancelled
      const cancelledAt = new Date();
      await db.orders.update(orderId, {
        isCancelled: true,
        total: 0,
        cancelledAt,
        cancelledBy,
      });

      // Sync to Supabase if online
      if (this.isOnline()) {
        try {
          await this.retryWithBackoff(async () => {
            const { error } = await supabase
              .from('orders')
              .update({
                is_cancelled: true,
                total: 0,
                cancelled_at: cancelledAt.toISOString(),
                cancelled_by: cancelledBy,
              })
              .eq('id', orderId);

            if (error) throw error;
          });
        } catch (error) {
          console.warn('Failed to sync order cancellation to Supabase:', error);
          
          // Queue for later sync
          await db.syncQueue.add({
            id: crypto.randomUUID(),
            entityType: 'orders',
            entityId: orderId,
            operation: 'update' as any,
            data: { isCancelled: true, total: 0, cancelledAt, cancelledBy },
            timestamp: new Date(),
            retryCount: 0,
            status: 'pending' as any,
          });
        }
      }
    } catch (error) {
      if (error instanceof OrderServiceError) {
        throw error;
      }
      throw new OrderServiceError(
        'Failed to cancel order',
        'ORDER_CANCELLATION_ERROR',
        500
      );
    }
  }

  /**
   * Get all orders for a session
   * 
   * @param sessionId - Session ID
   * @returns Array of orders for the session
   */
  async getSessionOrders(sessionId: string): Promise<Order[]> {
    try {
      if (!sessionId || typeof sessionId !== 'string') {
        throw new OrderServiceError(
          'Invalid session ID',
          'INVALID_SESSION_ID',
          400
        );
      }

      // Get orders from local DB
      const orders = await db.orders
        .where('sessionId')
        .equals(sessionId)
        .reverse()
        .sortBy('orderNumber');

      // Load items for each order
      const ordersWithItems = await Promise.all(
        orders.map(async (order) => {
          const items = await db.orderItems
            .where('orderId')
            .equals(order.id)
            .toArray();

          return {
            ...order,
            items,
          };
        })
      );

      return ordersWithItems;
    } catch (error) {
      if (error instanceof OrderServiceError) {
        throw error;
      }
      throw new OrderServiceError(
        'Failed to get session orders',
        'GET_ORDERS_ERROR',
        500
      );
    }
  }

  /**
   * Get a specific order by ID
   * 
   * @param orderId - Order ID
   * @returns Order with items, or null if not found
   */
  async getOrder(orderId: string): Promise<Order | null> {
    try {
      if (!orderId || typeof orderId !== 'string') {
        throw new OrderServiceError(
          'Invalid order ID',
          'INVALID_ORDER_ID',
          400
        );
      }

      const order = await db.orders.get(orderId);
      
      if (!order) {
        return null;
      }

      // Load order items
      const items = await db.orderItems
        .where('orderId')
        .equals(orderId)
        .toArray();

      return {
        ...order,
        items,
      };
    } catch (error) {
      if (error instanceof OrderServiceError) {
        throw error;
      }
      throw new OrderServiceError(
        'Failed to get order',
        'GET_ORDER_ERROR',
        500
      );
    }
  }

  /**
   * Generate a receipt for an order
   * 
   * Requirement 12.1: Generate receipt for orders
   * 
   * @param orderId - Order ID
   * @returns Receipt data
   */
  async generateReceipt(orderId: string): Promise<Receipt> {
    try {
      const order = await this.getOrder(orderId);
      
      if (!order) {
        throw new OrderServiceError(
          'Order not found',
          'ORDER_NOT_FOUND',
          404
        );
      }

      const receipt: Receipt = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        date: order.createdAt,
        items: order.items,
        total: order.total,
        isComplimentary: order.isComplimentary,
        observations: order.observations,
      };

      return receipt;
    } catch (error) {
      if (error instanceof OrderServiceError) {
        throw error;
      }
      throw new OrderServiceError(
        'Failed to generate receipt',
        'RECEIPT_GENERATION_ERROR',
        500
      );
    }
  }
}

/**
 * Global order service instance
 */
export const orderService = new OrderService();

export default orderService;
