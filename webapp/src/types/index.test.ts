/**
 * Unit tests for TypeScript type definitions and type guards
 */

import { describe, it, expect } from 'vitest';
import {
  Category,
  UserRole,
  AdjustmentType,
  SyncOperation,
  SyncState,
  SyncStatus,
  isUser,
  isMenuItem,
  isOrder,
  isOrderItem,
  isSession,
  isStockAdjustment,
  isCategory,
  isSyncQueueItem,
  type User,
  type MenuItem,
  type Order,
  type OrderItem,
  type Session,
  type StockAdjustment,
  type SyncQueueItem
} from './index';

describe('Type Guards', () => {
  describe('isUser', () => {
    it('should return true for valid user', () => {
      const user: User = {
        id: '123',
        username: 'admin',
        role: UserRole.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      expect(isUser(user)).toBe(true);
    });

    it('should return false for invalid user (missing fields)', () => {
      const invalid = {
        id: '123',
        username: 'admin'
      };
      expect(isUser(invalid)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isUser(null)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isUser('string')).toBe(false);
      expect(isUser(123)).toBe(false);
    });
  });

  describe('isMenuItem', () => {
    it('should return true for valid menu item', () => {
      const item: MenuItem = {
        id: '123',
        name: 'Sandes Leitão',
        category: Category.SANDES,
        price: 5.50,
        stockLevel: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };
      expect(isMenuItem(item)).toBe(true);
    });

    it('should return false for negative price', () => {
      const item = {
        id: '123',
        name: 'Test',
        category: Category.SANDES,
        price: -5.50,
        stockLevel: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };
      expect(isMenuItem(item)).toBe(false);
    });

    it('should return false for negative stock level', () => {
      const item = {
        id: '123',
        name: 'Test',
        category: Category.SANDES,
        price: 5.50,
        stockLevel: -10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };
      expect(isMenuItem(item)).toBe(false);
    });

    it('should return false for invalid category', () => {
      const item = {
        id: '123',
        name: 'Test',
        category: 'InvalidCategory',
        price: 5.50,
        stockLevel: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };
      expect(isMenuItem(item)).toBe(false);
    });
  });

  describe('isOrderItem', () => {
    it('should return true for valid order item', () => {
      const item: OrderItem = {
        id: '123',
        orderId: 'order-1',
        menuItemId: 'item-1',
        menuItemName: 'Sandes Leitão',
        quantity: 2,
        unitPrice: 5.50,
        subtotal: 11.00
      };
      expect(isOrderItem(item)).toBe(true);
    });

    it('should return false for zero quantity', () => {
      const item = {
        id: '123',
        orderId: 'order-1',
        menuItemId: 'item-1',
        menuItemName: 'Sandes Leitão',
        quantity: 0,
        unitPrice: 5.50,
        subtotal: 0
      };
      expect(isOrderItem(item)).toBe(false);
    });

    it('should return false for negative price', () => {
      const item = {
        id: '123',
        orderId: 'order-1',
        menuItemId: 'item-1',
        menuItemName: 'Sandes Leitão',
        quantity: 2,
        unitPrice: -5.50,
        subtotal: -11.00
      };
      expect(isOrderItem(item)).toBe(false);
    });
  });

  describe('isOrder', () => {
    it('should return true for valid order', () => {
      const order: Order = {
        id: 'order-1',
        orderNumber: 1,
        sessionId: 'session-1',
        total: 11.00,
        isComplimentary: false,
        isCancelled: false,
        items: [{
          id: '123',
          orderId: 'order-1',
          menuItemId: 'item-1',
          menuItemName: 'Sandes Leitão',
          quantity: 2,
          unitPrice: 5.50,
          subtotal: 11.00
        }],
        createdAt: new Date(),
        version: 1
      };
      expect(isOrder(order)).toBe(true);
    });

    it('should return false for negative total', () => {
      const order = {
        id: 'order-1',
        orderNumber: 1,
        sessionId: 'session-1',
        total: -11.00,
        isComplimentary: false,
        isCancelled: false,
        items: [],
        createdAt: new Date(),
        version: 1
      };
      expect(isOrder(order)).toBe(false);
    });

    it('should return false for invalid items array', () => {
      const order = {
        id: 'order-1',
        orderNumber: 1,
        sessionId: 'session-1',
        total: 11.00,
        isComplimentary: false,
        isCancelled: false,
        items: [{ invalid: 'item' }],
        createdAt: new Date(),
        version: 1
      };
      expect(isOrder(order)).toBe(false);
    });
  });

  describe('isSession', () => {
    it('should return true for valid active session', () => {
      const session: Session = {
        id: 'session-1',
        userId: 'user-1',
        startedAt: new Date(),
        isActive: true,
        version: 1
      };
      expect(isSession(session)).toBe(true);
    });

    it('should return true for closed session with end date', () => {
      const session: Session = {
        id: 'session-1',
        userId: 'user-1',
        startedAt: new Date('2024-01-01'),
        endedAt: new Date('2024-01-01T23:59:59'),
        expectedCash: 100,
        actualCash: 98,
        discrepancy: -2,
        isActive: false,
        version: 1
      };
      expect(isSession(session)).toBe(true);
    });

    it('should return false for missing required fields', () => {
      const session = {
        id: 'session-1',
        userId: 'user-1'
      };
      expect(isSession(session)).toBe(false);
    });
  });

  describe('isStockAdjustment', () => {
    it('should return true for valid stock adjustment', () => {
      const adjustment: StockAdjustment = {
        id: '123',
        menuItemId: 'item-1',
        adjustmentType: AdjustmentType.MANUAL,
        quantityChange: -5,
        previousLevel: 20,
        newLevel: 15,
        reason: 'Manual adjustment',
        createdAt: new Date()
      };
      expect(isStockAdjustment(adjustment)).toBe(true);
    });

    it('should return false for invalid adjustment type', () => {
      const adjustment = {
        id: '123',
        menuItemId: 'item-1',
        adjustmentType: 'invalid',
        quantityChange: -5,
        previousLevel: 20,
        newLevel: 15,
        createdAt: new Date()
      };
      expect(isStockAdjustment(adjustment)).toBe(false);
    });
  });

  describe('isCategory', () => {
    it('should return true for valid categories', () => {
      expect(isCategory(Category.SANDES)).toBe(true);
      expect(isCategory(Category.TABUAS)).toBe(true);
      expect(isCategory(Category.BATATAS)).toBe(true);
      expect(isCategory(Category.DOCES)).toBe(true);
      expect(isCategory(Category.BEBIDAS)).toBe(true);
    });

    it('should return false for invalid category', () => {
      expect(isCategory('InvalidCategory')).toBe(false);
      expect(isCategory('')).toBe(false);
      expect(isCategory(null)).toBe(false);
    });
  });

  describe('isSyncQueueItem', () => {
    it('should return true for valid sync queue item', () => {
      const item: SyncQueueItem = {
        id: '123',
        entityType: 'orders',
        entityId: 'order-1',
        operation: SyncOperation.CREATE,
        data: { test: 'data' },
        timestamp: new Date(),
        retryCount: 0,
        status: SyncStatus.PENDING
      };
      expect(isSyncQueueItem(item)).toBe(true);
    });

    it('should return false for invalid operation', () => {
      const item = {
        id: '123',
        entityType: 'orders',
        entityId: 'order-1',
        operation: 'invalid',
        data: { test: 'data' },
        timestamp: new Date(),
        retryCount: 0,
        status: SyncStatus.PENDING
      };
      expect(isSyncQueueItem(item)).toBe(false);
    });

    it('should return false for invalid status', () => {
      const item = {
        id: '123',
        entityType: 'orders',
        entityId: 'order-1',
        operation: SyncOperation.CREATE,
        data: { test: 'data' },
        timestamp: new Date(),
        retryCount: 0,
        status: 'invalid'
      };
      expect(isSyncQueueItem(item)).toBe(false);
    });
  });
});

describe('Enums', () => {
  describe('Category', () => {
    it('should have all required categories', () => {
      expect(Category.SANDES).toBe('Sandes');
      expect(Category.TABUAS).toBe('Tábuas');
      expect(Category.BATATAS).toBe('Batatas');
      expect(Category.DOCES).toBe('Doces');
      expect(Category.BEBIDAS).toBe('Bebidas');
    });
  });

  describe('AdjustmentType', () => {
    it('should have all required adjustment types', () => {
      expect(AdjustmentType.MANUAL).toBe('manual');
      expect(AdjustmentType.ORDER).toBe('order');
      expect(AdjustmentType.CANCELLATION).toBe('cancellation');
      expect(AdjustmentType.LOSS).toBe('loss');
    });
  });

  describe('SyncOperation', () => {
    it('should have all CRUD operations', () => {
      expect(SyncOperation.CREATE).toBe('create');
      expect(SyncOperation.UPDATE).toBe('update');
      expect(SyncOperation.DELETE).toBe('delete');
    });
  });

  describe('SyncState', () => {
    it('should have all sync states', () => {
      expect(SyncState.ONLINE).toBe('online');
      expect(SyncState.OFFLINE).toBe('offline');
      expect(SyncState.SYNCING).toBe('syncing');
      expect(SyncState.ERROR).toBe('error');
    });
  });

  describe('SyncStatus', () => {
    it('should have all sync statuses', () => {
      expect(SyncStatus.PENDING).toBe('pending');
      expect(SyncStatus.SYNCING).toBe('syncing');
      expect(SyncStatus.SYNCED).toBe('synced');
      expect(SyncStatus.FAILED).toBe('failed');
    });
  });
});
