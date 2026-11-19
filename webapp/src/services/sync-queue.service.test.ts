/**
 * Sync Queue Service Tests
 * 
 * Tests queue management, retry logic, and exponential backoff.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncQueueService, SyncQueueError } from './sync-queue.service';
import { db } from '@/lib/db';
import { SyncOperation, SyncStatus, SyncQueueItem } from '@/types';

// Mock uuid
vi.mock('uuid', () => ({
  v4: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
}));

describe('SyncQueueService', () => {
  let service: SyncQueueService;

  beforeEach(async () => {
    service = new SyncQueueService();
    // Clear sync queue before each test
    await db.syncQueue.clear();
  });

  afterEach(async () => {
    await db.syncQueue.clear();
  });

  describe('addToQueue', () => {
    it('should add item to sync queue', async () => {
      const item = await service.addToQueue(
        'order',
        'order-1',
        SyncOperation.CREATE,
        { total: 10.00 }
      );

      expect(item.entityType).toBe('order');
      expect(item.entityId).toBe('order-1');
      expect(item.operation).toBe(SyncOperation.CREATE);
      expect(item.status).toBe(SyncStatus.PENDING);
      expect(item.retryCount).toBe(0);

      // Verify in database
      const dbItem = await db.syncQueue.get(item.id);
      expect(dbItem).toBeDefined();
      expect(dbItem?.entityId).toBe('order-1');
    });

    it('should set timestamp on queue item', async () => {
      const before = new Date();
      const item = await service.addToQueue('order', 'order-1', SyncOperation.CREATE, {});
      const after = new Date();

      expect(item.timestamp).toBeInstanceOf(Date);
      expect(item.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(item.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should store operation data', async () => {
      const data = { total: 25.50, items: ['item-1', 'item-2'] };
      const item = await service.addToQueue('order', 'order-1', SyncOperation.UPDATE, data);

      expect(item.data).toEqual(data);
    });
  });

  describe('getPendingItems', () => {
    it('should return pending items ordered by timestamp', async () => {
      await service.addToQueue('order', 'order-1', SyncOperation.CREATE, {});
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.addToQueue('order', 'order-2', SyncOperation.CREATE, {});
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.addToQueue('order', 'order-3', SyncOperation.CREATE, {});

      const items = await service.getPendingItems();

      expect(items).toHaveLength(3);
      expect(items[0].entityId).toBe('order-1');
      expect(items[1].entityId).toBe('order-2');
      expect(items[2].entityId).toBe('order-3');
    });

    it('should not return syncing or synced items', async () => {
      const item1 = await service.addToQueue('order', 'order-1', SyncOperation.CREATE, {});
      await service.addToQueue('order', 'order-2', SyncOperation.CREATE, {});
      const item3 = await service.addToQueue('order', 'order-3', SyncOperation.CREATE, {});

      await service.markAsSyncing(item1.id);
      await service.markAsSynced(item3.id);

      const items = await service.getPendingItems();

      expect(items).toHaveLength(1);
      expect(items[0].entityId).toBe('order-2');
    });
  });

  describe('getFailedItems', () => {
    it('should return failed items that can be retried', async () => {
      const item1 = await service.addToQueue('order', 'order-1', SyncOperation.CREATE, {});
      const item2 = await service.addToQueue('order', 'order-2', SyncOperation.CREATE, {});

      await service.markAsFailed(item1.id, 'Network error');
      await service.markAsFailed(item2.id, 'Server error');

      const items = await service.getFailedItems();

      expect(items).toHaveLength(2);
    });

    it('should not return failed items that exceeded max retries', async () => {
      const item = await service.addToQueue('order', 'order-1', SyncOperation.CREATE, {});

      // Fail 5 times (max retries)
      for (let i = 0; i < 5; i++) {
        await service.markAsFailed(item.id, 'Network error');
      }

      const items = await service.getFailedItems();

      expect(items).toHaveLength(0);
    });
  });

  describe('markAsSyncing', () => {
    it('should update status to syncing', async () => {
      const item = await service.addToQueue('order', 'order-1', SyncOperation.CREATE, {});

      await service.markAsSyncing(item.id);

      const updated = await db.syncQueue.get(item.id);
      expect(updated?.status).toBe(SyncStatus.SYNCING);
      expect(updated?.lastAttempt).toBeInstanceOf(Date);
    });
  });

  describe('markAsSynced', () => {
    it('should update status to synced', async () => {
      const item = await service.addToQueue('order', 'order-1', SyncOperation.CREATE, {});

      await service.markAsSynced(item.id);

      const updated = await db.syncQueue.get(item.id);
      expect(updated?.status).toBe(SyncStatus.SYNCED);
      expect(updated?.error).toBeUndefined();
    });
  });

  describe('markAsFailed', () => {
    it('should update status to failed with error', async () => {
      const item = await service.addToQueue('order', 'order-1', SyncOperation.CREATE, {});

      await service.markAsFailed(item.id, 'Network timeout');

      const updated = await db.syncQueue.get(item.id);
      expect(updated?.status).toBe(SyncStatus.FAILED);
      expect(updated?.error).toBe('Network timeout');
      expect(updated?.retryCount).toBe(1);
    });

    it('should increment retry count on each failure', async () => {
      const item = await service.addToQueue('order', 'order-1', SyncOperation.CREATE, {});

      await service.markAsFailed(item.id, 'Error 1');
      await service.markAsFailed(item.id, 'Error 2');
      await service.markAsFailed(item.id, 'Error 3');

      const updated = await db.syncQueue.get(item.id);
      expect(updated?.retryCount).toBe(3);
    });
  });

  describe('calculateBackoff', () => {
    it('should calculate exponential backoff', () => {
      expect(service.calculateBackoff(0)).toBe(1000); // 1 second
      expect(service.calculateBackoff(1)).toBe(2000); // 2 seconds
      expect(service.calculateBackoff(2)).toBe(4000); // 4 seconds
      expect(service.calculateBackoff(3)).toBe(8000); // 8 seconds
      expect(service.calculateBackoff(4)).toBe(16000); // 16 seconds
    });

    it('should cap backoff at maximum', () => {
      const backoff = service.calculateBackoff(10);
      expect(backoff).toBe(60000); // Capped at 1 minute
    });
  });

  describe('shouldRetry', () => {
    it('should return false if max retries exceeded', () => {
      const item: SyncQueueItem = {
        id: 'test-id',
        entityType: 'order',
        entityId: 'order-1',
        operation: SyncOperation.CREATE,
        data: {},
        status: SyncStatus.FAILED,
        retryCount: 5,
        timestamp: new Date(),
      };

      expect(service.shouldRetry(item)).toBe(false);
    });

    it('should return true if backoff period has elapsed', () => {
      const item: SyncQueueItem = {
        id: 'test-id',
        entityType: 'order',
        entityId: 'order-1',
        operation: SyncOperation.CREATE,
        data: {},
        status: SyncStatus.FAILED,
        retryCount: 1,
        timestamp: new Date(),
        lastAttempt: new Date(Date.now() - 3000), // 3 seconds ago
      };

      expect(service.shouldRetry(item)).toBe(true);
    });

    it('should return false if backoff period has not elapsed', () => {
      const item: SyncQueueItem = {
        id: 'test-id',
        entityType: 'order',
        entityId: 'order-1',
        operation: SyncOperation.CREATE,
        data: {},
        status: SyncStatus.FAILED,
        retryCount: 1,
        timestamp: new Date(),
        lastAttempt: new Date(Date.now() - 500), // 0.5 seconds ago (backoff is 2 seconds)
      };

      expect(service.shouldRetry(item)).toBe(false);
    });
  });

  describe('resetToPending', () => {
    it('should reset failed item to pending', async () => {
      const item = await service.addToQueue('order', 'order-1', SyncOperation.CREATE, {});
      await service.markAsFailed(item.id, 'Error');

      await service.resetToPending(item.id);

      const updated = await db.syncQueue.get(item.id);
      expect(updated?.status).toBe(SyncStatus.PENDING);
    });
  });

  describe('removeFromQueue', () => {
    it('should remove item from queue', async () => {
      const item = await service.addToQueue('order', 'order-1', SyncOperation.CREATE, {});

      await service.removeFromQueue(item.id);

      const deleted = await db.syncQueue.get(item.id);
      expect(deleted).toBeUndefined();
    });
  });

  describe('clearSyncedItems', () => {
    it('should remove all synced items', async () => {
      const item1 = await service.addToQueue('order', 'order-1', SyncOperation.CREATE, {});
      const item2 = await service.addToQueue('order', 'order-2', SyncOperation.CREATE, {});
      const item3 = await service.addToQueue('order', 'order-3', SyncOperation.CREATE, {});

      await service.markAsSynced(item1.id);
      await service.markAsSynced(item3.id);

      await service.clearSyncedItems();

      const remaining = await db.syncQueue.toArray();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(item2.id);
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const item1 = await service.addToQueue('order', 'order-1', SyncOperation.CREATE, {});
      const item2 = await service.addToQueue('order', 'order-2', SyncOperation.CREATE, {});
      const item3 = await service.addToQueue('order', 'order-3', SyncOperation.CREATE, {});
      const item4 = await service.addToQueue('order', 'order-4', SyncOperation.CREATE, {});

      await service.markAsSyncing(item1.id);
      await service.markAsSynced(item2.id);
      await service.markAsFailed(item3.id, 'Error');

      const stats = await service.getQueueStats();

      expect(stats.pending).toBe(1);
      expect(stats.syncing).toBe(1);
      expect(stats.synced).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.total).toBe(4);
    });
  });

  describe('getItemsForEntity', () => {
    it('should return items for specific entity', async () => {
      await service.addToQueue('order', 'order-1', SyncOperation.CREATE, {});
      await service.addToQueue('order', 'order-1', SyncOperation.UPDATE, {});
      await service.addToQueue('order', 'order-2', SyncOperation.CREATE, {});

      const items = await service.getItemsForEntity('order', 'order-1');

      expect(items).toHaveLength(2);
      expect(items.every(item => item.entityId === 'order-1')).toBe(true);
    });
  });
});
