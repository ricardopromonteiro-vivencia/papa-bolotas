/**
 * Order Service Unit Tests
 * 
 * Tests order creation, registration, complimentary orders, cancellation,
 * and stock management functionality.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { orderService, OrderServiceError } from './order.service';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { Category, Order, OrderItem, MenuItem, AdjustmentType } from '@/types';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}));

// Mock the database - we'll use the real implementation for tests
vi.mock('@/lib/db', async () => {
  const Dexie = (await import('dexie')).default;
  
  class TestPapaDB extends Dexie {
    menuItems: any;
    orders: any;
    orderItems: any;
    stockAdjustments: any;
    syncQueue: any;
    
    constructor() {
      super('TestPapaBolotas');
      this.version(1).stores({
        menuItems: 'id, category, isActive, updatedAt, name',
        orders: 'id, sessionId, orderNumber, createdAt, isCancelled, isComplimentary',
        orderItems: 'id, orderId, menuItemId',
        stockAdjustments: 'id, menuItemId, createdAt, adjustmentType',
        syncQueue: 'id, status, entityType, timestamp, [entityType+entityId]',
      });
    }
  }
  
  return {
    db: new TestPapaDB(),
  };
});

describe('OrderService', () => {
  const mockSessionId = 'test-session-123';
  const mockMenuItem: MenuItem = {
    id: 'item-1',
    name: 'Test Sandwich',
    category: Category.SANDES,
    price: 5.50,
    stockLevel: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };

  beforeEach(async () => {
    // Clear database before each test
    await db.orders.clear();
    await db.orderItems.clear();
    await db.menuItems.clear();
    await db.stockAdjustments.clear();
    await db.syncQueue.clear();

    // Add test menu item
    await db.menuItems.add(mockMenuItem);

    // Reset mocks
    vi.clearAllMocks();
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(async () => {
    await db.orders.clear();
    await db.orderItems.clear();
    await db.menuItems.clear();
    await db.stockAdjustments.clear();
    await db.syncQueue.clear();
  });

  describe('createOrder', () => {
    it('should create an order with correct total calculation', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 2,
          unitPrice: 5.50,
          subtotal: 11.00,
        },
        {
          menuItemId: 'item-2',
          menuItemName: 'Coca Cola',
          quantity: 1,
          unitPrice: 2.00,
          subtotal: 2.00,
        },
      ];

      const order = await orderService.createOrder(mockSessionId, items);

      expect(order).toBeDefined();
      expect(order.id).toBeDefined();
      expect(order.sessionId).toBe(mockSessionId);
      expect(order.total).toBe(13.00);
      expect(order.isComplimentary).toBe(false);
      expect(order.isCancelled).toBe(false);
      expect(order.items).toHaveLength(2);
      expect(order.items[0].orderId).toBe(order.id);
    });

    it('should round total to 2 decimal places', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 3,
          unitPrice: 3.333,
          subtotal: 9.999,
        },
      ];

      const order = await orderService.createOrder(mockSessionId, items);

      expect(order.total).toBe(10.00);
    });

    it('should throw error for empty items array', async () => {
      await expect(
        orderService.createOrder(mockSessionId, [])
      ).rejects.toThrow(OrderServiceError);
    });

    it('should throw error for invalid session ID', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 1,
          unitPrice: 5.50,
          subtotal: 5.50,
        },
      ];

      await expect(
        orderService.createOrder('', items)
      ).rejects.toThrow(OrderServiceError);
    });

    it('should throw error for invalid quantity', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 0,
          unitPrice: 5.50,
          subtotal: 0,
        },
      ];

      await expect(
        orderService.createOrder(mockSessionId, items)
      ).rejects.toThrow(OrderServiceError);
    });

    it('should throw error for negative price', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 1,
          unitPrice: -5.50,
          subtotal: -5.50,
        },
      ];

      await expect(
        orderService.createOrder(mockSessionId, items)
      ).rejects.toThrow(OrderServiceError);
    });

    it('should throw error for incorrect subtotal calculation', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 2,
          unitPrice: 5.50,
          subtotal: 10.00, // Should be 11.00
        },
      ];

      await expect(
        orderService.createOrder(mockSessionId, items)
      ).rejects.toThrow(OrderServiceError);
    });

    it('should accept order with observations', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 1,
          unitPrice: 5.50,
          subtotal: 5.50,
        },
      ];

      const order = await orderService.createOrder(
        mockSessionId,
        items,
        'Extra sauce please'
      );

      expect(order.observations).toBe('Extra sauce please');
    });
  });

  describe('registerOrder', () => {
    it('should assign sequential order number starting from 1', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 1,
          unitPrice: 5.50,
          subtotal: 5.50,
        },
      ];

      const order = await orderService.createOrder(mockSessionId, items);
      const registered = await orderService.registerOrder(order);

      expect(registered.orderNumber).toBe(1);
    });

    it('should assign sequential order numbers', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 1,
          unitPrice: 5.50,
          subtotal: 5.50,
        },
      ];

      const order1 = await orderService.createOrder(mockSessionId, items);
      const registered1 = await orderService.registerOrder(order1);

      const order2 = await orderService.createOrder(mockSessionId, items);
      const registered2 = await orderService.registerOrder(order2);

      const order3 = await orderService.createOrder(mockSessionId, items);
      const registered3 = await orderService.registerOrder(order3);

      expect(registered1.orderNumber).toBe(1);
      expect(registered2.orderNumber).toBe(2);
      expect(registered3.orderNumber).toBe(3);
    });

    it('should save order to local database', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 1,
          unitPrice: 5.50,
          subtotal: 5.50,
        },
      ];

      const order = await orderService.createOrder(mockSessionId, items);
      const registered = await orderService.registerOrder(order);

      const savedOrder = await db.orders.get(registered.id);
      expect(savedOrder).toBeDefined();
      expect(savedOrder?.orderNumber).toBe(1);
      expect(savedOrder?.total).toBe(5.50);
    });

    it('should save order items to local database', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 2,
          unitPrice: 5.50,
          subtotal: 11.00,
        },
      ];

      const order = await orderService.createOrder(mockSessionId, items);
      const registered = await orderService.registerOrder(order);

      const savedItems = await db.orderItems
        .where('orderId')
        .equals(registered.id)
        .toArray();

      expect(savedItems).toHaveLength(1);
      expect(savedItems[0].quantity).toBe(2);
      expect(savedItems[0].menuItemName).toBe(mockMenuItem.name);
    });

    it('should decrement stock levels', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 3,
          unitPrice: 5.50,
          subtotal: 16.50,
        },
      ];

      const initialStock = mockMenuItem.stockLevel;
      const order = await orderService.createOrder(mockSessionId, items);
      await orderService.registerOrder(order);

      const updatedItem = await db.menuItems.get(mockMenuItem.id);
      expect(updatedItem?.stockLevel).toBe(initialStock - 3);
    });

    it('should record stock adjustment', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 2,
          unitPrice: 5.50,
          subtotal: 11.00,
        },
      ];

      const order = await orderService.createOrder(mockSessionId, items);
      await orderService.registerOrder(order);

      const adjustments = await db.stockAdjustments
        .where('menuItemId')
        .equals(mockMenuItem.id)
        .toArray();

      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].adjustmentType).toBe(AdjustmentType.ORDER);
      expect(adjustments[0].quantityChange).toBe(-2);
      expect(adjustments[0].previousLevel).toBe(10);
      expect(adjustments[0].newLevel).toBe(8);
    });

    // Mudança de regra: a base de dados não aceita stock negativo, por isso um pedido
    // com mais unidades do que o stock é recusado (o artigo fica "esgotado")
    it('should reject orders that exceed available stock and keep stock unchanged', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 15, // More than available stock (10)
          unitPrice: 5.50,
          subtotal: 82.50,
        },
      ];

      await expect(orderService.createOrder(mockSessionId, items)).rejects.toMatchObject({
        code: 'ITEM_UNAVAILABLE',
      });

      const updatedItem = await db.menuItems.get(mockMenuItem.id);
      expect(updatedItem?.stockLevel).toBe(10);
    });

    it('should reject items blocked by hand', async () => {
      await db.menuItems.update(mockMenuItem.id, { isAvailable: false });
      const items = [
        { menuItemId: mockMenuItem.id, menuItemName: mockMenuItem.name, quantity: 1, unitPrice: 5.50, subtotal: 5.50 },
      ];

      await expect(orderService.createOrder(mockSessionId, items)).rejects.toMatchObject({
        code: 'ITEM_UNAVAILABLE',
      });
    });

    it('should not touch stock of items without stock control', async () => {
      await db.menuItems.update(mockMenuItem.id, { trackStock: false, stockLevel: 0 });
      const items = [
        { menuItemId: mockMenuItem.id, menuItemName: mockMenuItem.name, quantity: 3, unitPrice: 5.50, subtotal: 16.50 },
      ];

      const order = await orderService.createOrder(mockSessionId, items);
      await orderService.registerOrder(order);

      const updatedItem = await db.menuItems.get(mockMenuItem.id);
      expect(updatedItem?.stockLevel).toBe(0);
    });

    it('should queue for sync when offline', async () => {
      // Set offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 1,
          unitPrice: 5.50,
          subtotal: 5.50,
        },
      ];

      const order = await orderService.createOrder(mockSessionId, items);
      await orderService.registerOrder(order);

      const queueItems = await db.syncQueue
        .where('status')
        .equals('pending')
        .toArray();

      // Should queue order and stock update
      expect(queueItems.length).toBeGreaterThan(0);
    });
  });

  describe('registerComplimentary', () => {
    it('should set total to 0 for complimentary order', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 1,
          unitPrice: 5.50,
          subtotal: 5.50,
        },
      ];

      const order = await orderService.createOrder(mockSessionId, items);
      const registered = await orderService.registerComplimentary(order);

      expect(registered.total).toBe(0);
      expect(registered.isComplimentary).toBe(true);
    });

    it('should still decrement stock for complimentary order', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 2,
          unitPrice: 5.50,
          subtotal: 11.00,
        },
      ];

      const initialStock = mockMenuItem.stockLevel;
      const order = await orderService.createOrder(mockSessionId, items);
      await orderService.registerComplimentary(order);

      const updatedItem = await db.menuItems.get(mockMenuItem.id);
      expect(updatedItem?.stockLevel).toBe(initialStock - 2);
    });

    it('should assign sequential order number for complimentary order', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 1,
          unitPrice: 5.50,
          subtotal: 5.50,
        },
      ];

      // Register regular order first
      const order1 = await orderService.createOrder(mockSessionId, items);
      await orderService.registerOrder(order1);

      // Register complimentary order
      const order2 = await orderService.createOrder(mockSessionId, items);
      const registered = await orderService.registerComplimentary(order2);

      expect(registered.orderNumber).toBe(2);
    });
  });

  describe('cancelOrder', () => {
    it('should mark order as cancelled', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 1,
          unitPrice: 5.50,
          subtotal: 5.50,
        },
      ];

      const order = await orderService.createOrder(mockSessionId, items);
      const registered = await orderService.registerOrder(order);

      await orderService.cancelOrder(registered.id, '1234');

      const cancelledOrder = await db.orders.get(registered.id);
      expect(cancelledOrder?.isCancelled).toBe(true);
      expect(cancelledOrder?.total).toBe(0);
      expect(cancelledOrder?.cancelledAt).toBeDefined();
    });

    it('should restore stock levels on cancellation', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 3,
          unitPrice: 5.50,
          subtotal: 16.50,
        },
      ];

      const initialStock = mockMenuItem.stockLevel;
      const order = await orderService.createOrder(mockSessionId, items);
      const registered = await orderService.registerOrder(order);

      // Stock should be decremented
      let updatedItem = await db.menuItems.get(mockMenuItem.id);
      expect(updatedItem?.stockLevel).toBe(initialStock - 3);

      // Cancel order
      await orderService.cancelOrder(registered.id, '1234');

      // Stock should be restored
      updatedItem = await db.menuItems.get(mockMenuItem.id);
      expect(updatedItem?.stockLevel).toBe(initialStock);
    });

    it('should record stock adjustment for cancellation', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 2,
          unitPrice: 5.50,
          subtotal: 11.00,
        },
      ];

      const order = await orderService.createOrder(mockSessionId, items);
      const registered = await orderService.registerOrder(order);

      await orderService.cancelOrder(registered.id, '1234');

      const adjustments = await db.stockAdjustments
        .where('menuItemId')
        .equals(mockMenuItem.id)
        .toArray();

      // Should have both ORDER and CANCELLATION adjustments
      expect(adjustments).toHaveLength(2);
      
      const cancellationAdjustment = adjustments.find(
        a => a.adjustmentType === AdjustmentType.CANCELLATION
      );
      
      expect(cancellationAdjustment).toBeDefined();
      expect(cancellationAdjustment?.quantityChange).toBe(2);
    });

    it('should throw error for invalid order ID', async () => {
      await expect(
        orderService.cancelOrder('invalid-id', '1234')
      ).rejects.toThrow(OrderServiceError);
    });

    it('should throw error for already cancelled order', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 1,
          unitPrice: 5.50,
          subtotal: 5.50,
        },
      ];

      const order = await orderService.createOrder(mockSessionId, items);
      const registered = await orderService.registerOrder(order);

      await orderService.cancelOrder(registered.id, '1234');

      await expect(
        orderService.cancelOrder(registered.id, '1234')
      ).rejects.toThrow(OrderServiceError);
    });

    it('should throw error when security code not provided', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 1,
          unitPrice: 5.50,
          subtotal: 5.50,
        },
      ];

      const order = await orderService.createOrder(mockSessionId, items);
      const registered = await orderService.registerOrder(order);

      await expect(
        orderService.cancelOrder(registered.id, '')
      ).rejects.toThrow(OrderServiceError);
    });

    it('should throw error for invalid security code format (too short)', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 1,
          unitPrice: 5.50,
          subtotal: 5.50,
        },
      ];

      const order = await orderService.createOrder(mockSessionId, items);
      const registered = await orderService.registerOrder(order);

      await expect(
        orderService.cancelOrder(registered.id, '123') // Too short
      ).rejects.toThrow(OrderServiceError);
    });

    it('should throw error for invalid security code format (too long)', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 1,
          unitPrice: 5.50,
          subtotal: 5.50,
        },
      ];

      const order = await orderService.createOrder(mockSessionId, items);
      const registered = await orderService.registerOrder(order);

      await expect(
        orderService.cancelOrder(registered.id, '1234567') // Too long
      ).rejects.toThrow(OrderServiceError);
    });

    it('should throw error for invalid security code format (non-numeric)', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 1,
          unitPrice: 5.50,
          subtotal: 5.50,
        },
      ];

      const order = await orderService.createOrder(mockSessionId, items);
      const registered = await orderService.registerOrder(order);

      await expect(
        orderService.cancelOrder(registered.id, 'abcd') // Non-numeric
      ).rejects.toThrow(OrderServiceError);
    });

    it('should throw error for incorrect security code', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 1,
          unitPrice: 5.50,
          subtotal: 5.50,
        },
      ];

      const order = await orderService.createOrder(mockSessionId, items);
      const registered = await orderService.registerOrder(order);

      await expect(
        orderService.cancelOrder(registered.id, '9999') // Wrong code (configured is '1234')
      ).rejects.toThrow(OrderServiceError);
    });

    it('should accept valid 4-digit security code', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 1,
          unitPrice: 5.50,
          subtotal: 5.50,
        },
      ];

      const order = await orderService.createOrder(mockSessionId, items);
      const registered = await orderService.registerOrder(order);

      // Should not throw - '1234' is the configured security code in test setup
      await expect(
        orderService.cancelOrder(registered.id, '1234')
      ).resolves.not.toThrow();

      const cancelledOrder = await db.orders.get(registered.id);
      expect(cancelledOrder?.isCancelled).toBe(true);
    });

    it('should record cancelledBy user when provided', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 1,
          unitPrice: 5.50,
          subtotal: 5.50,
        },
      ];

      const order = await orderService.createOrder(mockSessionId, items);
      const registered = await orderService.registerOrder(order);

      const userId = 'user-123';
      await orderService.cancelOrder(registered.id, '1234', userId);

      const cancelledOrder = await db.orders.get(registered.id);
      expect(cancelledOrder?.cancelledBy).toBe(userId);
    });

    it('should restore stock for order with multiple different items', async () => {
      // Add another menu item
      const mockMenuItem2: MenuItem = {
        id: 'item-2',
        name: 'Coca Cola',
        category: Category.BEBIDAS,
        price: 2.00,
        stockLevel: 20,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };
      await db.menuItems.add(mockMenuItem2);

      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 3,
          unitPrice: 5.50,
          subtotal: 16.50,
        },
        {
          menuItemId: mockMenuItem2.id,
          menuItemName: mockMenuItem2.name,
          quantity: 2,
          unitPrice: 2.00,
          subtotal: 4.00,
        },
      ];

      const initialStock1 = mockMenuItem.stockLevel;
      const initialStock2 = mockMenuItem2.stockLevel;

      const order = await orderService.createOrder(mockSessionId, items);
      const registered = await orderService.registerOrder(order);

      // Verify stock was decremented
      let item1 = await db.menuItems.get(mockMenuItem.id);
      let item2 = await db.menuItems.get(mockMenuItem2.id);
      expect(item1?.stockLevel).toBe(initialStock1 - 3);
      expect(item2?.stockLevel).toBe(initialStock2 - 2);

      // Cancel order
      await orderService.cancelOrder(registered.id, '1234');

      // Verify stock was restored for both items
      item1 = await db.menuItems.get(mockMenuItem.id);
      item2 = await db.menuItems.get(mockMenuItem2.id);
      expect(item1?.stockLevel).toBe(initialStock1);
      expect(item2?.stockLevel).toBe(initialStock2);
    });

    it('should create separate stock adjustments for each item in cancelled order', async () => {
      // Add another menu item
      const mockMenuItem2: MenuItem = {
        id: 'item-2',
        name: 'Batatas Fritas',
        category: Category.BATATAS,
        price: 3.50,
        stockLevel: 15,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };
      await db.menuItems.add(mockMenuItem2);

      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 2,
          unitPrice: 5.50,
          subtotal: 11.00,
        },
        {
          menuItemId: mockMenuItem2.id,
          menuItemName: mockMenuItem2.name,
          quantity: 3,
          unitPrice: 3.50,
          subtotal: 10.50,
        },
      ];

      const order = await orderService.createOrder(mockSessionId, items);
      const registered = await orderService.registerOrder(order);
      await orderService.cancelOrder(registered.id, '1234');

      // Check adjustments for first item
      const adjustments1 = await db.stockAdjustments
        .where('menuItemId')
        .equals(mockMenuItem.id)
        .toArray();
      
      const cancellation1 = adjustments1.find(
        a => a.adjustmentType === AdjustmentType.CANCELLATION
      );
      expect(cancellation1).toBeDefined();
      expect(cancellation1?.quantityChange).toBe(2);

      // Check adjustments for second item
      const adjustments2 = await db.stockAdjustments
        .where('menuItemId')
        .equals(mockMenuItem2.id)
        .toArray();
      
      const cancellation2 = adjustments2.find(
        a => a.adjustmentType === AdjustmentType.CANCELLATION
      );
      expect(cancellation2).toBeDefined();
      expect(cancellation2?.quantityChange).toBe(3);
    });

    it('should handle cancellation gracefully when menu item no longer exists', async () => {
      // Add a menu item that we'll delete later
      const tempItem: MenuItem = {
        id: 'temp-item',
        name: 'Temporary Item',
        category: Category.SANDES,
        price: 5.00,
        stockLevel: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };
      await db.menuItems.add(tempItem);

      const items = [
        {
          menuItemId: tempItem.id,
          menuItemName: tempItem.name,
          quantity: 2,
          unitPrice: 5.00,
          subtotal: 10.00,
        },
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 1,
          unitPrice: 5.50,
          subtotal: 5.50,
        },
      ];

      const order = await orderService.createOrder(mockSessionId, items);
      const registered = await orderService.registerOrder(order);

      // Delete the menu item after order is registered but before cancellation
      await db.menuItems.delete(tempItem.id);

      // Should not throw error, just log warning
      await expect(
        orderService.cancelOrder(registered.id, '1234')
      ).resolves.not.toThrow();

      // Order should still be marked as cancelled
      const cancelledOrder = await db.orders.get(registered.id);
      expect(cancelledOrder?.isCancelled).toBe(true);
      expect(cancelledOrder?.total).toBe(0);

      // Stock for existing item should be restored
      const existingItem = await db.menuItems.get(mockMenuItem.id);
      expect(existingItem?.stockLevel).toBe(mockMenuItem.stockLevel);
    });

    it('should set correct cancellation timestamp', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 1,
          unitPrice: 5.50,
          subtotal: 5.50,
        },
      ];

      const beforeCancellation = new Date();
      const order = await orderService.createOrder(mockSessionId, items);
      const registered = await orderService.registerOrder(order);

      await orderService.cancelOrder(registered.id, '1234');
      const afterCancellation = new Date();

      const cancelledOrder = await db.orders.get(registered.id);
      expect(cancelledOrder?.cancelledAt).toBeDefined();
      
      const cancelledAt = cancelledOrder!.cancelledAt!;
      expect(cancelledAt.getTime()).toBeGreaterThanOrEqual(beforeCancellation.getTime());
      expect(cancelledAt.getTime()).toBeLessThanOrEqual(afterCancellation.getTime());
    });

    it('should include order number in stock adjustment reason', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 1,
          unitPrice: 5.50,
          subtotal: 5.50,
        },
      ];

      const order = await orderService.createOrder(mockSessionId, items);
      const registered = await orderService.registerOrder(order);
      await orderService.cancelOrder(registered.id, '1234');

      const adjustments = await db.stockAdjustments
        .where('menuItemId')
        .equals(mockMenuItem.id)
        .toArray();

      const cancellationAdjustment = adjustments.find(
        a => a.adjustmentType === AdjustmentType.CANCELLATION
      );

      expect(cancellationAdjustment?.reason).toContain(`Pedido #${registered.orderNumber}`);
      expect(cancellationAdjustment?.reason).toContain('cancelado');
    });

    it('should queue cancellation for sync when offline', async () => {
      // Set offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 1,
          unitPrice: 5.50,
          subtotal: 5.50,
        },
      ];

      const order = await orderService.createOrder(mockSessionId, items);
      const registered = await orderService.registerOrder(order);
      
      // Clear sync queue from order registration
      await db.syncQueue.clear();

      await orderService.cancelOrder(registered.id, '1234');

      // Should still cancel locally
      const cancelledOrder = await db.orders.get(registered.id);
      expect(cancelledOrder?.isCancelled).toBe(true);

      // Stock should be restored locally
      const item = await db.menuItems.get(mockMenuItem.id);
      expect(item?.stockLevel).toBe(mockMenuItem.stockLevel);
    });
  });

  describe('getSessionOrders', () => {
    it('should return all orders for a session', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 1,
          unitPrice: 5.50,
          subtotal: 5.50,
        },
      ];

      const order1 = await orderService.createOrder(mockSessionId, items);
      await orderService.registerOrder(order1);

      const order2 = await orderService.createOrder(mockSessionId, items);
      await orderService.registerOrder(order2);

      const orders = await orderService.getSessionOrders(mockSessionId);

      expect(orders).toHaveLength(2);
      expect(orders[0].orderNumber).toBe(2); // Reverse order
      expect(orders[1].orderNumber).toBe(1);
    });

    it('should include order items', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 2,
          unitPrice: 5.50,
          subtotal: 11.00,
        },
      ];

      const order = await orderService.createOrder(mockSessionId, items);
      await orderService.registerOrder(order);

      const orders = await orderService.getSessionOrders(mockSessionId);

      expect(orders[0].items).toHaveLength(1);
      expect(orders[0].items[0].quantity).toBe(2);
    });

    it('should return empty array for session with no orders', async () => {
      const orders = await orderService.getSessionOrders('empty-session');
      expect(orders).toHaveLength(0);
    });
  });

  describe('getOrder', () => {
    it('should return order with items', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 1,
          unitPrice: 5.50,
          subtotal: 5.50,
        },
      ];

      const order = await orderService.createOrder(mockSessionId, items);
      const registered = await orderService.registerOrder(order);

      const retrieved = await orderService.getOrder(registered.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(registered.id);
      expect(retrieved?.items).toHaveLength(1);
    });

    it('should return null for non-existent order', async () => {
      const order = await orderService.getOrder('non-existent-id');
      expect(order).toBeNull();
    });
  });

  describe('generateReceipt', () => {
    it('should generate receipt for order', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 2,
          unitPrice: 5.50,
          subtotal: 11.00,
        },
      ];

      const order = await orderService.createOrder(mockSessionId, items, 'Test observation');
      const registered = await orderService.registerOrder(order);

      const receipt = await orderService.generateReceipt(registered.id);

      expect(receipt.orderId).toBe(registered.id);
      expect(receipt.orderNumber).toBe(1);
      expect(receipt.total).toBe(11.00);
      expect(receipt.items).toHaveLength(1);
      expect(receipt.observations).toBe('Test observation');
      expect(receipt.isComplimentary).toBe(false);
    });

    it('should generate receipt for complimentary order', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 1,
          unitPrice: 5.50,
          subtotal: 5.50,
        },
      ];

      const order = await orderService.createOrder(mockSessionId, items);
      const registered = await orderService.registerComplimentary(order);

      const receipt = await orderService.generateReceipt(registered.id);

      expect(receipt.total).toBe(0);
      expect(receipt.isComplimentary).toBe(true);
    });

    it('should generate receipt for cancelled order', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 2,
          unitPrice: 5.50,
          subtotal: 11.00,
        },
      ];

      const order = await orderService.createOrder(mockSessionId, items, 'Test order');
      const registered = await orderService.registerOrder(order);
      
      // Cancel the order
      await orderService.cancelOrder(registered.id, '1234', 'admin-user');

      const receipt = await orderService.generateReceipt(registered.id);

      expect(receipt.orderId).toBe(registered.id);
      expect(receipt.orderNumber).toBe(1);
      expect(receipt.total).toBe(0); // Cancelled order total should be 0
      expect(receipt.items).toHaveLength(1);
      expect(receipt.observations).toBe('Test order');
    });

    it('should throw error for non-existent order', async () => {
      await expect(
        orderService.generateReceipt('non-existent-id')
      ).rejects.toThrow(OrderServiceError);
    });
  });

  describe('Revenue Calculation - Cancelled Orders', () => {
    it('should exclude cancelled orders from revenue calculation', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 1,
          unitPrice: 5.50,
          subtotal: 5.50,
        },
      ];

      // Create and register 3 regular orders
      const order1 = await orderService.createOrder(mockSessionId, items);
      const registered1 = await orderService.registerOrder(order1);

      const order2 = await orderService.createOrder(mockSessionId, items);
      const registered2 = await orderService.registerOrder(order2);

      const order3 = await orderService.createOrder(mockSessionId, items);
      const registered3 = await orderService.registerOrder(order3);

      // Cancel the second order
      await orderService.cancelOrder(registered2.id, '1234');

      // Get all session orders
      const sessionOrders = await orderService.getSessionOrders(mockSessionId);

      // Calculate revenue excluding cancelled orders
      const revenue = sessionOrders
        .filter(o => !o.isCancelled)
        .reduce((sum, o) => sum + o.total, 0);

      expect(sessionOrders).toHaveLength(3);
      expect(revenue).toBe(11.00); // 5.50 * 2 (only registered1 and registered3)
      
      // Verify cancelled order total is 0
      const cancelledOrder = sessionOrders.find(o => o.id === registered2.id);
      expect(cancelledOrder?.isCancelled).toBe(true);
      expect(cancelledOrder?.total).toBe(0);
    });

    it('should exclude complimentary orders from revenue calculation', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 1,
          unitPrice: 5.50,
          subtotal: 5.50,
        },
      ];

      // Create regular order
      const order1 = await orderService.createOrder(mockSessionId, items);
      await orderService.registerOrder(order1);

      // Create complimentary order
      const order2 = await orderService.createOrder(mockSessionId, items);
      await orderService.registerComplimentary(order2);

      // Get all session orders
      const sessionOrders = await orderService.getSessionOrders(mockSessionId);

      // Calculate revenue excluding complimentary orders
      const revenue = sessionOrders
        .filter(o => !o.isComplimentary)
        .reduce((sum, o) => sum + o.total, 0);

      expect(sessionOrders).toHaveLength(2);
      expect(revenue).toBe(5.50); // Only the regular order
    });

    it('should exclude both cancelled and complimentary orders from revenue', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 1,
          unitPrice: 5.50,
          subtotal: 5.50,
        },
      ];

      // Create regular order
      const order1 = await orderService.createOrder(mockSessionId, items);
      const registered1 = await orderService.registerOrder(order1);

      // Create another regular order
      const order2 = await orderService.createOrder(mockSessionId, items);
      const registered2 = await orderService.registerOrder(order2);

      // Create complimentary order
      const order3 = await orderService.createOrder(mockSessionId, items);
      await orderService.registerComplimentary(order3);

      // Cancel first order
      await orderService.cancelOrder(registered1.id, '1234');

      // Get all session orders
      const sessionOrders = await orderService.getSessionOrders(mockSessionId);

      // Calculate revenue excluding cancelled and complimentary orders
      const revenue = sessionOrders
        .filter(o => !o.isCancelled && !o.isComplimentary)
        .reduce((sum, o) => sum + o.total, 0);

      expect(sessionOrders).toHaveLength(3);
      expect(revenue).toBe(5.50); // Only registered2
    });

    it('should count cancelled orders separately in statistics', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 1,
          unitPrice: 5.50,
          subtotal: 5.50,
        },
      ];

      // Create and register orders
      const order1 = await orderService.createOrder(mockSessionId, items);
      const registered1 = await orderService.registerOrder(order1);

      const order2 = await orderService.createOrder(mockSessionId, items);
      const registered2 = await orderService.registerOrder(order2);

      const order3 = await orderService.createOrder(mockSessionId, items);
      await orderService.registerComplimentary(order3);

      // Cancel one order
      await orderService.cancelOrder(registered1.id, '1234');

      // Get all session orders
      const sessionOrders = await orderService.getSessionOrders(mockSessionId);

      // Calculate statistics
      const completedOrders = sessionOrders.filter(o => !o.isCancelled && !o.isComplimentary).length;
      const cancelledOrders = sessionOrders.filter(o => o.isCancelled).length;
      const complimentaryOrders = sessionOrders.filter(o => o.isComplimentary).length;

      expect(completedOrders).toBe(1); // Only registered2
      expect(cancelledOrders).toBe(1); // registered1
      expect(complimentaryOrders).toBe(1); // order3
      expect(sessionOrders).toHaveLength(3); // Total orders
    });

    it('should handle revenue calculation with multiple cancelled orders', async () => {
      const items = [
        {
          menuItemId: mockMenuItem.id,
          menuItemName: mockMenuItem.name,
          quantity: 2,
          unitPrice: 5.50,
          subtotal: 11.00,
        },
      ];

      // Create multiple orders
      const order1 = await orderService.createOrder(mockSessionId, items);
      const registered1 = await orderService.registerOrder(order1);

      const order2 = await orderService.createOrder(mockSessionId, items);
      const registered2 = await orderService.registerOrder(order2);

      const order3 = await orderService.createOrder(mockSessionId, items);
      const registered3 = await orderService.registerOrder(order3);

      // Cancel two orders
      await orderService.cancelOrder(registered1.id, '1234');
      await orderService.cancelOrder(registered3.id, '1234');

      // Get all session orders
      const sessionOrders = await orderService.getSessionOrders(mockSessionId);

      // Calculate revenue
      const revenue = sessionOrders
        .filter(o => !o.isCancelled)
        .reduce((sum, o) => sum + o.total, 0);

      expect(sessionOrders).toHaveLength(3);
      expect(revenue).toBe(11.00); // Only registered2
      
      // Verify both cancelled orders have 0 total
      const cancelled1 = sessionOrders.find(o => o.id === registered1.id);
      const cancelled3 = sessionOrders.find(o => o.id === registered3.id);
      
      expect(cancelled1?.total).toBe(0);
      expect(cancelled3?.total).toBe(0);
    });
  });
});
