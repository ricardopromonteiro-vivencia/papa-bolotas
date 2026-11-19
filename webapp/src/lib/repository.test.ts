/**
 * Unit tests for LocalRepository
 * 
 * Tests CRUD operations, query methods, and transaction support
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalRepository } from './repository';
import { db } from './db';
import type {
  MenuItem,
  Order,
  Session,
  StockAdjustment,
  Category,
  AdjustmentType,
  SyncOperation,
  SyncStatus,
  UserRole,
} from '../types';

describe('LocalRepository', () => {
  let repository: LocalRepository;

  beforeEach(async () => {
    repository = new LocalRepository();
    // Clear all data before each test
    await db.clearAll();
  });

  afterEach(async () => {
    // Clean up after each test
    await db.clearAll();
  });

  // ==========================================================================
  // USER OPERATIONS
  // ==========================================================================

  describe('User Operations', () => {
    it('creates a new user', async () => {
      const user = await repository.createUser({
        username: 'testuser',
        role: 'admin' as UserRole,
      });

      expect(user.id).toBeDefined();
      expect(user.username).toBe('testuser');
      expect(user.role).toBe('admin');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('gets user by username', async () => {
      await repository.createUser({
        username: 'testuser',
        role: 'admin' as UserRole,
      });

      const user = await repository.getUserByUsername('testuser');
      expect(user).toBeDefined();
      expect(user?.username).toBe('testuser');
    });

    it('updates an existing user', async () => {
      const user = await repository.createUser({
        username: 'testuser',
        role: 'admin' as UserRole,
      });

      // Small delay to ensure updatedAt timestamp is different
      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = await repository.updateUser(user.id, {
        username: 'updateduser',
      });

      expect(updated).toBeDefined();
      expect(updated?.username).toBe('updateduser');
      expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(user.updatedAt.getTime());
    });

    it('deletes a user', async () => {
      const user = await repository.createUser({
        username: 'testuser',
        role: 'admin' as UserRole,
      });

      await repository.deleteUser(user.id);

      const deleted = await repository.getUser(user.id);
      expect(deleted).toBeUndefined();
    });
  });

  // ==========================================================================
  // MENU ITEM OPERATIONS
  // ==========================================================================

  describe('Menu Item Operations', () => {
    it('creates a new menu item', async () => {
      const item = await repository.createMenuItem({
        name: 'Sandes de Leitão',
        category: 'Sandes' as Category,
        price: 5.50,
        stockLevel: 10,
        isActive: true,
      });

      expect(item.id).toBeDefined();
      expect(item.name).toBe('Sandes de Leitão');
      expect(item.price).toBe(5.50);
      expect(item.stockLevel).toBe(10);
      expect(item.version).toBe(1);
    });

    it('gets menu items by category', async () => {
      await repository.createMenuItem({
        name: 'Sandes de Leitão',
        category: 'Sandes' as Category,
        price: 5.50,
        stockLevel: 10,
        isActive: true,
      });

      await repository.createMenuItem({
        name: 'Coca Cola',
        category: 'Bebidas' as Category,
        price: 2.00,
        stockLevel: 20,
        isActive: true,
      });

      const sandes = await repository.getMenuItemsByCategory('Sandes' as Category);
      expect(sandes).toHaveLength(1);
      expect(sandes[0].name).toBe('Sandes de Leitão');
    });

    it('filters menu items by stock level', async () => {
      await repository.createMenuItem({
        name: 'Low Stock Item',
        category: 'Sandes' as Category,
        price: 5.00,
        stockLevel: 2,
        isActive: true,
      });

      await repository.createMenuItem({
        name: 'High Stock Item',
        category: 'Sandes' as Category,
        price: 5.00,
        stockLevel: 20,
        isActive: true,
      });

      const items = await repository.getMenuItems({
        minStock: 10,
      });

      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('High Stock Item');
    });

    it('searches menu items by name', async () => {
      await repository.createMenuItem({
        name: 'Sandes de Leitão',
        category: 'Sandes' as Category,
        price: 5.50,
        stockLevel: 10,
        isActive: true,
      });

      await repository.createMenuItem({
        name: 'Coca Cola',
        category: 'Bebidas' as Category,
        price: 2.00,
        stockLevel: 20,
        isActive: true,
      });

      const items = await repository.getMenuItems({
        searchTerm: 'leitão',
      });

      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('Sandes de Leitão');
    });

    it('gets low stock items', async () => {
      await repository.createMenuItem({
        name: 'Low Stock Item',
        category: 'Sandes' as Category,
        price: 5.00,
        stockLevel: 3,
        isActive: true,
      });

      await repository.createMenuItem({
        name: 'Normal Stock Item',
        category: 'Sandes' as Category,
        price: 5.00,
        stockLevel: 20,
        isActive: true,
      });

      const lowStock = await repository.getLowStockItems(5);
      expect(lowStock).toHaveLength(1);
      expect(lowStock[0].name).toBe('Low Stock Item');
    });

    it('updates menu item and increments version', async () => {
      const item = await repository.createMenuItem({
        name: 'Test Item',
        category: 'Sandes' as Category,
        price: 5.00,
        stockLevel: 10,
        isActive: true,
      });

      const updated = await repository.updateMenuItem(item.id, {
        price: 6.00,
      });

      expect(updated).toBeDefined();
      expect(updated?.price).toBe(6.00);
      expect(updated?.version).toBe(2);
    });

    it('soft deletes menu item', async () => {
      const item = await repository.createMenuItem({
        name: 'Test Item',
        category: 'Sandes' as Category,
        price: 5.00,
        stockLevel: 10,
        isActive: true,
      });

      await repository.deleteMenuItem(item.id);

      const deleted = await repository.getMenuItem(item.id);
      expect(deleted).toBeDefined();
      expect(deleted?.isActive).toBe(false);
    });
  });

  // ==========================================================================
  // ORDER OPERATIONS
  // ==========================================================================

  describe('Order Operations', () => {
    let sessionId: string;
    let menuItemId: string;

    beforeEach(async () => {
      // Create test session
      const user = await repository.createUser({
        username: 'testuser',
        role: 'admin' as UserRole,
      });
      const session = await repository.createSession(user.id);
      sessionId = session.id;

      // Create test menu item
      const item = await repository.createMenuItem({
        name: 'Test Item',
        category: 'Sandes' as Category,
        price: 5.00,
        stockLevel: 10,
        isActive: true,
      });
      menuItemId = item.id;
    });

    it('creates a new order with items', async () => {
      const order = await repository.createOrder(
        {
          sessionId,
          total: 10.00,
          isComplimentary: false,
          isCancelled: false,
          items: [
            {
              menuItemId,
              menuItemName: 'Test Item',
              quantity: 2,
              unitPrice: 5.00,
              subtotal: 10.00,
            },
          ],
        },
        1
      );

      expect(order.id).toBeDefined();
      expect(order.orderNumber).toBe(1);
      expect(order.total).toBe(10.00);
      expect(order.items).toHaveLength(1);
      expect(order.items[0].quantity).toBe(2);
    });

    it('gets orders by session', async () => {
      await repository.createOrder(
        {
          sessionId,
          total: 10.00,
          isComplimentary: false,
          isCancelled: false,
          items: [
            {
              menuItemId,
              menuItemName: 'Test Item',
              quantity: 2,
              unitPrice: 5.00,
              subtotal: 10.00,
            },
          ],
        },
        1
      );

      const orders = await repository.getOrdersBySession(sessionId);
      expect(orders).toHaveLength(1);
      expect(orders[0].orderNumber).toBe(1);
    });

    it('filters complimentary orders', async () => {
      await repository.createOrder(
        {
          sessionId,
          total: 0,
          isComplimentary: true,
          isCancelled: false,
          items: [
            {
              menuItemId,
              menuItemName: 'Test Item',
              quantity: 1,
              unitPrice: 5.00,
              subtotal: 0,
            },
          ],
        },
        1
      );

      await repository.createOrder(
        {
          sessionId,
          total: 10.00,
          isComplimentary: false,
          isCancelled: false,
          items: [
            {
              menuItemId,
              menuItemName: 'Test Item',
              quantity: 2,
              unitPrice: 5.00,
              subtotal: 10.00,
            },
          ],
        },
        2
      );

      const complimentary = await repository.getOrders({
        sessionId,
        isComplimentary: true,
      });

      expect(complimentary).toHaveLength(1);
      expect(complimentary[0].total).toBe(0);
    });

    it('cancels an order', async () => {
      const order = await repository.createOrder(
        {
          sessionId,
          total: 10.00,
          isComplimentary: false,
          isCancelled: false,
          items: [
            {
              menuItemId,
              menuItemName: 'Test Item',
              quantity: 2,
              unitPrice: 5.00,
              subtotal: 10.00,
            },
          ],
        },
        1
      );

      const cancelled = await repository.cancelOrder(order.id, 'admin-user-id');
      expect(cancelled).toBeDefined();
      expect(cancelled?.isCancelled).toBe(true);
      expect(cancelled?.cancelledBy).toBe('admin-user-id');
      expect(cancelled?.cancelledAt).toBeInstanceOf(Date);
    });

    it('gets next order number correctly', async () => {
      const firstOrderNumber = await repository.getNextOrderNumber(sessionId);
      expect(firstOrderNumber).toBe(1);

      await repository.createOrder(
        {
          sessionId,
          total: 10.00,
          isComplimentary: false,
          isCancelled: false,
          items: [
            {
              menuItemId,
              menuItemName: 'Test Item',
              quantity: 2,
              unitPrice: 5.00,
              subtotal: 10.00,
            },
          ],
        },
        firstOrderNumber
      );

      const secondOrderNumber = await repository.getNextOrderNumber(sessionId);
      expect(secondOrderNumber).toBe(2);
    });
  });

  // ==========================================================================
  // SESSION OPERATIONS
  // ==========================================================================

  describe('Session Operations', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await repository.createUser({
        username: 'testuser',
        role: 'admin' as UserRole,
      });
      userId = user.id;
    });

    it('creates a new session', async () => {
      const session = await repository.createSession(userId);

      expect(session.id).toBeDefined();
      expect(session.userId).toBe(userId);
      expect(session.isActive).toBe(true);
      expect(session.startedAt).toBeInstanceOf(Date);
    });

    it('gets active session for user', async () => {
      await repository.createSession(userId);

      const activeSession = await repository.getActiveSession(userId);
      expect(activeSession).toBeDefined();
      expect(activeSession?.isActive).toBe(true);
    });

    it('closes a session', async () => {
      const session = await repository.createSession(userId);

      const closed = await repository.closeSession(session.id, 100.00, 98.50);
      expect(closed).toBeDefined();
      expect(closed?.isActive).toBe(false);
      expect(closed?.expectedCash).toBe(100.00);
      expect(closed?.actualCash).toBe(98.50);
      expect(closed?.discrepancy).toBe(-1.50);
      expect(closed?.endedAt).toBeInstanceOf(Date);
    });
  });

  // ==========================================================================
  // STOCK ADJUSTMENT OPERATIONS
  // ==========================================================================

  describe('Stock Adjustment Operations', () => {
    let menuItemId: string;

    beforeEach(async () => {
      const item = await repository.createMenuItem({
        name: 'Test Item',
        category: 'Sandes' as Category,
        price: 5.00,
        stockLevel: 10,
        isActive: true,
      });
      menuItemId = item.id;
    });

    it('creates stock adjustment and updates menu item', async () => {
      const adjustment = await repository.createStockAdjustment({
        menuItemId,
        adjustmentType: 'manual' as AdjustmentType,
        quantityChange: -3,
        previousLevel: 10,
        newLevel: 7,
        reason: 'Manual adjustment',
      });

      expect(adjustment.id).toBeDefined();
      expect(adjustment.quantityChange).toBe(-3);

      // Verify menu item stock was updated
      const menuItem = await repository.getMenuItem(menuItemId);
      expect(menuItem?.stockLevel).toBe(7);
    });

    it('gets stock adjustments by menu item', async () => {
      await repository.createStockAdjustment({
        menuItemId,
        adjustmentType: 'manual' as AdjustmentType,
        quantityChange: -3,
        previousLevel: 10,
        newLevel: 7,
      });

      const adjustments = await repository.getStockAdjustmentsByItem(menuItemId);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].menuItemId).toBe(menuItemId);
    });

    it('filters stock adjustments by type', async () => {
      await repository.createStockAdjustment({
        menuItemId,
        adjustmentType: 'manual' as AdjustmentType,
        quantityChange: -3,
        previousLevel: 10,
        newLevel: 7,
      });

      await repository.createStockAdjustment({
        menuItemId,
        adjustmentType: 'order' as AdjustmentType,
        quantityChange: -2,
        previousLevel: 7,
        newLevel: 5,
      });

      const manualAdjustments = await repository.getStockAdjustments({
        adjustmentType: 'manual' as AdjustmentType,
      });

      expect(manualAdjustments).toHaveLength(1);
      expect(manualAdjustments[0].adjustmentType).toBe('manual');
    });
  });

  // ==========================================================================
  // SYNC QUEUE OPERATIONS
  // ==========================================================================

  describe('Sync Queue Operations', () => {
    it('adds item to sync queue', async () => {
      const item = await repository.addToSyncQueue(
        'orders',
        'order-id-123',
        'create' as SyncOperation,
        { total: 10.00 }
      );

      expect(item.id).toBeDefined();
      expect(item.entityType).toBe('orders');
      expect(item.operation).toBe('create');
      expect(item.status).toBe('pending');
      expect(item.retryCount).toBe(0);
    });

    it('gets pending sync items', async () => {
      await repository.addToSyncQueue(
        'orders',
        'order-id-123',
        'create' as SyncOperation,
        { total: 10.00 }
      );

      const pending = await repository.getPendingSyncItems();
      expect(pending).toHaveLength(1);
      expect(pending[0].status).toBe('pending');
    });

    it('marks item as synced', async () => {
      const item = await repository.addToSyncQueue(
        'orders',
        'order-id-123',
        'create' as SyncOperation,
        { total: 10.00 }
      );

      await repository.markAsSynced(item.id);

      const updated = await repository.getSyncQueueItem(item.id);
      expect(updated?.status).toBe('synced');
    });

    it('marks item as failed and increments retry count', async () => {
      const item = await repository.addToSyncQueue(
        'orders',
        'order-id-123',
        'create' as SyncOperation,
        { total: 10.00 }
      );

      await repository.markAsFailed(item.id);

      const updated = await repository.getSyncQueueItem(item.id);
      expect(updated?.status).toBe('failed');
      expect(updated?.retryCount).toBe(1);
    });

    it('clears synced items from queue', async () => {
      const item1 = await repository.addToSyncQueue(
        'orders',
        'order-id-1',
        'create' as SyncOperation,
        {}
      );

      const item2 = await repository.addToSyncQueue(
        'orders',
        'order-id-2',
        'create' as SyncOperation,
        {}
      );

      await repository.markAsSynced(item1.id);

      const cleared = await repository.clearSyncedItems();
      expect(cleared).toBe(1);

      const remaining = await repository.getSyncQueueItems();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(item2.id);
    });
  });

  // ==========================================================================
  // TRANSACTION SUPPORT
  // ==========================================================================

  describe('Transaction Support', () => {
    it('executes multiple operations atomically', async () => {
      const user = await repository.createUser({
        username: 'testuser',
        role: 'admin' as UserRole,
      });

      const session = await repository.transaction(async () => {
        const newSession = await repository.createSession(user.id);
        await repository.createAuditLog({
          userId: user.id,
          action: 'session_start',
          entityType: 'sessions',
          entityId: newSession.id,
        });
        return newSession;
      });

      expect(session).toBeDefined();

      const logs = await repository.getAuditLogs({ userId: user.id });
      expect(logs).toHaveLength(1);
    });
  });

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  describe('Utility Methods', () => {
    it('gets database statistics', async () => {
      await repository.createUser({
        username: 'testuser',
        role: 'admin' as UserRole,
      });

      await repository.createMenuItem({
        name: 'Test Item',
        category: 'Sandes' as Category,
        price: 5.00,
        stockLevel: 10,
        isActive: true,
      });

      const stats = await repository.getStats();
      expect(stats.users).toBe(1);
      expect(stats.menuItems).toBe(1);
    });

    it('checks if database is ready', () => {
      const isReady = repository.isReady();
      expect(isReady).toBe(true);
    });
  });
});
