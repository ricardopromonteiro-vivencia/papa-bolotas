/**
 * Database Configuration Tests
 * Verifies that the IndexedDB database is properly configured and functional
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db, PapaBolotas } from './db';
import { Category, AdjustmentType, SyncOperation, SyncStatus } from '../types';

describe('PapaBolotas Database', () => {
  let testDb: PapaBolotas;

  beforeEach(async () => {
    // Create a fresh test database instance
    testDb = new PapaBolotas();
    await testDb.open();
    await testDb.clearAll();
  });

  afterEach(async () => {
    // Clean up after each test
    await testDb.close();
    await testDb.delete();
  });

  describe('Database Initialization', () => {
    it('should create database with correct name', () => {
      expect(testDb.name).toBe('PapaBolotas');
    });

    it('should create all required tables', () => {
      expect(testDb.users).toBeDefined();
      expect(testDb.menuItems).toBeDefined();
      expect(testDb.orders).toBeDefined();
      expect(testDb.orderItems).toBeDefined();
      expect(testDb.sessions).toBeDefined();
      expect(testDb.stockAdjustments).toBeDefined();
      expect(testDb.auditLogs).toBeDefined();
      expect(testDb.syncQueue).toBeDefined();
    });

    it('should initialize with empty tables', async () => {
      const stats = await testDb.getStats();
      
      expect(stats.users).toBe(0);
      expect(stats.menuItems).toBe(0);
      expect(stats.orders).toBe(0);
      expect(stats.orderItems).toBe(0);
      expect(stats.sessions).toBe(0);
      expect(stats.stockAdjustments).toBe(0);
      expect(stats.auditLogs).toBe(0);
      expect(stats.syncQueue).toBe(0);
    });
  });

  describe('Menu Items Table', () => {
    it('should store and retrieve menu items', async () => {
      const menuItem = {
        id: 'item-1',
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 5.50,
        stockLevel: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      await testDb.menuItems.add(menuItem);
      const retrieved = await testDb.menuItems.get('item-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Sandes de Leitão');
      expect(retrieved?.price).toBe(5.50);
      expect(retrieved?.stockLevel).toBe(10);
    });

    it('should filter menu items by category', async () => {
      await testDb.menuItems.bulkAdd([
        {
          id: 'item-1',
          name: 'Sandes de Leitão',
          category: Category.SANDES,
          price: 5.50,
          stockLevel: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
        {
          id: 'item-2',
          name: 'Coca-Cola',
          category: Category.BEBIDAS,
          price: 2.00,
          stockLevel: 20,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
      ]);

      const sandes = await testDb.menuItems
        .where('category')
        .equals(Category.SANDES)
        .toArray();

      expect(sandes).toHaveLength(1);
      expect(sandes[0].name).toBe('Sandes de Leitão');
    });

    it('should filter active menu items', async () => {
      await testDb.menuItems.bulkAdd([
        {
          id: 'item-1',
          name: 'Active Item',
          category: Category.SANDES,
          price: 5.50,
          stockLevel: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
        {
          id: 'item-2',
          name: 'Inactive Item',
          category: Category.SANDES,
          price: 3.00,
          stockLevel: 5,
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
      ]);

      const activeItems = await testDb.menuItems
        .filter(item => item.isActive === true)
        .toArray();

      expect(activeItems).toHaveLength(1);
      expect(activeItems[0].name).toBe('Active Item');
    });
  });

  describe('Orders Table', () => {
    it('should store and retrieve orders', async () => {
      const order = {
        id: 'order-1',
        orderNumber: 1,
        sessionId: 'session-1',
        total: 10.50,
        isComplimentary: false,
        isCancelled: false,
        items: [],
        createdAt: new Date(),
        version: 1,
      };

      await testDb.orders.add(order);
      const retrieved = await testDb.orders.get('order-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.orderNumber).toBe(1);
      expect(retrieved?.total).toBe(10.50);
    });

    it('should filter orders by session', async () => {
      await testDb.orders.bulkAdd([
        {
          id: 'order-1',
          orderNumber: 1,
          sessionId: 'session-1',
          total: 10.50,
          isComplimentary: false,
          isCancelled: false,
          items: [],
          createdAt: new Date(),
          version: 1,
        },
        {
          id: 'order-2',
          orderNumber: 2,
          sessionId: 'session-2',
          total: 15.00,
          isComplimentary: false,
          isCancelled: false,
          items: [],
          createdAt: new Date(),
          version: 1,
        },
      ]);

      const session1Orders = await testDb.orders
        .where('sessionId')
        .equals('session-1')
        .toArray();

      expect(session1Orders).toHaveLength(1);
      expect(session1Orders[0].orderNumber).toBe(1);
    });

    it('should exclude cancelled orders when filtering', async () => {
      await testDb.orders.bulkAdd([
        {
          id: 'order-1',
          orderNumber: 1,
          sessionId: 'session-1',
          total: 10.50,
          isComplimentary: false,
          isCancelled: false,
          items: [],
          createdAt: new Date(),
          version: 1,
        },
        {
          id: 'order-2',
          orderNumber: 2,
          sessionId: 'session-1',
          total: 0,
          isComplimentary: false,
          isCancelled: true,
          items: [],
          createdAt: new Date(),
          cancelledAt: new Date(),
          version: 1,
        },
      ]);

      const activeOrders = await testDb.orders
        .filter(order => order.isCancelled === false)
        .toArray();

      expect(activeOrders).toHaveLength(1);
      expect(activeOrders[0].orderNumber).toBe(1);
    });
  });

  describe('Sessions Table', () => {
    it('should store and retrieve sessions', async () => {
      const session = {
        id: 'session-1',
        userId: 'user-1',
        startedAt: new Date(),
        isActive: true,
        version: 1,
      };

      await testDb.sessions.add(session);
      const retrieved = await testDb.sessions.get('session-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.userId).toBe('user-1');
      expect(retrieved?.isActive).toBe(true);
    });

    it('should find active session', async () => {
      await testDb.sessions.bulkAdd([
        {
          id: 'session-1',
          userId: 'user-1',
          startedAt: new Date(Date.now() - 1000),
          endedAt: new Date(),
          isActive: false,
          version: 1,
        },
        {
          id: 'session-2',
          userId: 'user-1',
          startedAt: new Date(),
          isActive: true,
          version: 1,
        },
      ]);

      const activeSession = await testDb.sessions
        .filter(session => session.isActive === true)
        .first();

      expect(activeSession).toBeDefined();
      expect(activeSession?.id).toBe('session-2');
    });
  });

  describe('Sync Queue Table', () => {
    it('should store and retrieve sync queue items', async () => {
      const queueItem = {
        id: 'queue-1',
        entityType: 'orders',
        entityId: 'order-1',
        operation: SyncOperation.CREATE,
        data: { test: 'data' },
        timestamp: new Date(),
        retryCount: 0,
        status: SyncStatus.PENDING,
      };

      await testDb.syncQueue.add(queueItem);
      const retrieved = await testDb.syncQueue.get('queue-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.entityType).toBe('orders');
      expect(retrieved?.status).toBe(SyncStatus.PENDING);
    });

    it('should filter pending sync items', async () => {
      await testDb.syncQueue.bulkAdd([
        {
          id: 'queue-1',
          entityType: 'orders',
          entityId: 'order-1',
          operation: SyncOperation.CREATE,
          data: {},
          timestamp: new Date(Date.now() - 1000),
          retryCount: 0,
          status: SyncStatus.PENDING,
        },
        {
          id: 'queue-2',
          entityType: 'menuItems',
          entityId: 'item-1',
          operation: SyncOperation.UPDATE,
          data: {},
          timestamp: new Date(),
          retryCount: 0,
          status: SyncStatus.SYNCED,
        },
      ]);

      const pendingItems = await testDb.syncQueue
        .where('status')
        .equals(SyncStatus.PENDING)
        .toArray();

      expect(pendingItems).toHaveLength(1);
      expect(pendingItems[0].entityType).toBe('orders');
    });
  });

  describe('Stock Adjustments Table', () => {
    it('should store and retrieve stock adjustments', async () => {
      const adjustment = {
        id: 'adj-1',
        menuItemId: 'item-1',
        adjustmentType: AdjustmentType.MANUAL,
        quantityChange: -5,
        previousLevel: 10,
        newLevel: 5,
        reason: 'Manual adjustment',
        createdAt: new Date(),
      };

      await testDb.stockAdjustments.add(adjustment);
      const retrieved = await testDb.stockAdjustments.get('adj-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.quantityChange).toBe(-5);
      expect(retrieved?.newLevel).toBe(5);
    });

    it('should filter adjustments by menu item', async () => {
      await testDb.stockAdjustments.bulkAdd([
        {
          id: 'adj-1',
          menuItemId: 'item-1',
          adjustmentType: AdjustmentType.MANUAL,
          quantityChange: -5,
          previousLevel: 10,
          newLevel: 5,
          createdAt: new Date(Date.now() - 1000),
        },
        {
          id: 'adj-2',
          menuItemId: 'item-2',
          adjustmentType: AdjustmentType.ORDER,
          quantityChange: -2,
          previousLevel: 20,
          newLevel: 18,
          createdAt: new Date(),
        },
      ]);

      const item1Adjustments = await testDb.stockAdjustments
        .where('menuItemId')
        .equals('item-1')
        .toArray();

      expect(item1Adjustments).toHaveLength(1);
      expect(item1Adjustments[0].newLevel).toBe(5);
    });
  });

  describe('Database Operations', () => {
    it('should clear all data', async () => {
      // Add some test data
      await testDb.menuItems.add({
        id: 'item-1',
        name: 'Test Item',
        category: Category.SANDES,
        price: 5.50,
        stockLevel: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      });

      await testDb.orders.add({
        id: 'order-1',
        orderNumber: 1,
        sessionId: 'session-1',
        total: 10.50,
        isComplimentary: false,
        isCancelled: false,
        items: [],
        createdAt: new Date(),
        version: 1,
      });

      // Clear all
      await testDb.clearAll();

      // Verify all tables are empty
      const stats = await testDb.getStats();
      expect(stats.menuItems).toBe(0);
      expect(stats.orders).toBe(0);
    });

    it('should get accurate statistics', async () => {
      // Add test data
      await testDb.menuItems.bulkAdd([
        {
          id: 'item-1',
          name: 'Item 1',
          category: Category.SANDES,
          price: 5.50,
          stockLevel: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
        {
          id: 'item-2',
          name: 'Item 2',
          category: Category.BEBIDAS,
          price: 2.00,
          stockLevel: 20,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
      ]);

      await testDb.orders.add({
        id: 'order-1',
        orderNumber: 1,
        sessionId: 'session-1',
        total: 10.50,
        isComplimentary: false,
        isCancelled: false,
        items: [],
        createdAt: new Date(),
        version: 1,
      });

      const stats = await testDb.getStats();

      expect(stats.menuItems).toBe(2);
      expect(stats.orders).toBe(1);
    });
  });
});
