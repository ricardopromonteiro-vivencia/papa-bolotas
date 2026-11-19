/**
 * Sync Queue Service
 * 
 * Manages the offline change queue for synchronization with Supabase.
 * Implements persistent queue with retry logic and exponential backoff.
 * 
 * Requirements:
 * - 14.4: Queue offline changes for later sync
 * - 14.5: Process sync queue on reconnection
 * - 14.6: Implement retry with exponential backoff
 */

import { db } from '@/lib/db';
import { SyncQueueItem, SyncOperation, SyncStatus } from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sync queue configuration
 */
const SYNC_CONFIG = {
  MAX_RETRIES: 5,
  INITIAL_BACKOFF_MS: 1000, // 1 second
  MAX_BACKOFF_MS: 60000, // 1 minute
  BACKOFF_MULTIPLIER: 2,
};

/**
 * Custom error class for sync queue failures
 */
export class SyncQueueError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'SyncQueueError';
  }
}

/**
 * Sync Queue Service
 * 
 * Manages offline changes queue with retry logic and exponential backoff.
 */
export class SyncQueueService {
  /**
   * Add operation to sync queue
   * 
   * Requirements 14.4: Queue offline changes
   * 
   * @param entityType - Type of entity (e.g., 'order', 'menuItem')
   * @param entityId - ID of the entity
   * @param operation - Type of operation (create, update, delete)
   * @param data - Entity data to sync
   * @returns Created queue item
   */
  async addToQueue(
    entityType: string,
    entityId: string,
    operation: SyncOperation,
    data: Record<string, unknown>
  ): Promise<SyncQueueItem> {
    try {
      const queueItem: SyncQueueItem = {
        id: uuidv4(),
        entityType,
        entityId,
        operation,
        data,
        status: SyncStatus.PENDING,
        retryCount: 0,
        timestamp: new Date(),
        lastAttempt: undefined,
        error: undefined,
      };

      await db.syncQueue.add(queueItem);

      if (import.meta.env.DEV) {
        console.log(`Added to sync queue: ${entityType}/${entityId} (${operation})`);
      }

      return queueItem;
    } catch (error) {
      throw new SyncQueueError(
        `Failed to add item to sync queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ADD_QUEUE_ERROR'
      );
    }
  }

  /**
   * Get all pending items from sync queue
   * 
   * Returns items ordered by timestamp (oldest first).
   * 
   * @returns Array of pending sync queue items
   */
  async getPendingItems(): Promise<SyncQueueItem[]> {
    try {
      return await db.syncQueue
        .where('status')
        .equals(SyncStatus.PENDING)
        .sortBy('timestamp');
    } catch (error) {
      throw new SyncQueueError(
        `Failed to get pending items: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GET_PENDING_ERROR'
      );
    }
  }

  /**
   * Get failed items that can be retried
   * 
   * Returns items that have failed but haven't exceeded max retries.
   * 
   * @returns Array of failed sync queue items
   */
  async getFailedItems(): Promise<SyncQueueItem[]> {
    try {
      const items = await db.syncQueue
        .where('status')
        .equals(SyncStatus.FAILED)
        .toArray();

      // Filter items that haven't exceeded max retries
      return items.filter(item => item.retryCount < SYNC_CONFIG.MAX_RETRIES);
    } catch (error) {
      throw new SyncQueueError(
        `Failed to get failed items: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GET_FAILED_ERROR'
      );
    }
  }

  /**
   * Mark sync queue item as syncing
   * 
   * @param itemId - Queue item ID
   */
  async markAsSyncing(itemId: string): Promise<void> {
    try {
      await db.syncQueue.update(itemId, {
        status: SyncStatus.SYNCING,
        lastAttempt: new Date(),
      });
    } catch (error) {
      throw new SyncQueueError(
        `Failed to mark item as syncing: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'MARK_SYNCING_ERROR'
      );
    }
  }

  /**
   * Mark sync queue item as synced (success)
   * 
   * @param itemId - Queue item ID
   */
  async markAsSynced(itemId: string): Promise<void> {
    try {
      await db.syncQueue.update(itemId, {
        status: SyncStatus.SYNCED,
        error: undefined,
      });

      if (import.meta.env.DEV) {
        console.log(`Sync queue item synced: ${itemId}`);
      }
    } catch (error) {
      throw new SyncQueueError(
        `Failed to mark item as synced: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'MARK_SYNCED_ERROR'
      );
    }
  }

  /**
   * Mark sync queue item as failed with error
   * 
   * Implements retry logic with exponential backoff.
   * Requirement 14.6: Retry with exponential backoff
   * 
   * @param itemId - Queue item ID
   * @param error - Error message
   */
  async markAsFailed(itemId: string, error: string): Promise<void> {
    try {
      const item = await db.syncQueue.get(itemId);
      
      if (!item) {
        throw new SyncQueueError('Queue item not found', 'ITEM_NOT_FOUND');
      }

      const newRetryCount = item.retryCount + 1;

      await db.syncQueue.update(itemId, {
        status: SyncStatus.FAILED,
        retryCount: newRetryCount,
        error,
      });

      if (import.meta.env.DEV) {
        console.warn(
          `Sync queue item failed (retry ${newRetryCount}/${SYNC_CONFIG.MAX_RETRIES}): ${itemId}`,
          error
        );
      }
    } catch (error) {
      throw new SyncQueueError(
        `Failed to mark item as failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'MARK_FAILED_ERROR'
      );
    }
  }

  /**
   * Calculate backoff delay for retry
   * 
   * Implements exponential backoff with cap.
   * Requirement 14.6: Exponential backoff
   * 
   * @param retryCount - Number of retries already attempted
   * @returns Delay in milliseconds
   */
  calculateBackoff(retryCount: number): number {
    const backoff = SYNC_CONFIG.INITIAL_BACKOFF_MS * Math.pow(SYNC_CONFIG.BACKOFF_MULTIPLIER, retryCount);
    return Math.min(backoff, SYNC_CONFIG.MAX_BACKOFF_MS);
  }

  /**
   * Retry failed item if backoff period has elapsed
   * 
   * @param item - Sync queue item
   * @returns true if item should be retried, false otherwise
   */
  shouldRetry(item: SyncQueueItem): boolean {
    // Check if item has exceeded max retries
    if (item.retryCount >= SYNC_CONFIG.MAX_RETRIES) {
      return false;
    }

    // Check if backoff period has elapsed
    if (item.lastAttempt) {
      const backoffDelay = this.calculateBackoff(item.retryCount);
      const nextRetryTime = new Date(item.lastAttempt.getTime() + backoffDelay);
      const now = new Date();
      
      return now >= nextRetryTime;
    }

    // No last attempt, safe to retry
    return true;
  }

  /**
   * Reset item to pending for retry
   * 
   * @param itemId - Queue item ID
   */
  async resetToPending(itemId: string): Promise<void> {
    try {
      await db.syncQueue.update(itemId, {
        status: SyncStatus.PENDING,
      });

      if (import.meta.env.DEV) {
        console.log(`Reset sync queue item to pending: ${itemId}`);
      }
    } catch (error) {
      throw new SyncQueueError(
        `Failed to reset item to pending: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'RESET_PENDING_ERROR'
      );
    }
  }

  /**
   * Remove item from sync queue
   * 
   * Used to clean up synced items or permanently failed items.
   * 
   * @param itemId - Queue item ID
   */
  async removeFromQueue(itemId: string): Promise<void> {
    try {
      await db.syncQueue.delete(itemId);

      if (import.meta.env.DEV) {
        console.log(`Removed from sync queue: ${itemId}`);
      }
    } catch (error) {
      throw new SyncQueueError(
        `Failed to remove item from queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'REMOVE_QUEUE_ERROR'
      );
    }
  }

  /**
   * Clear all synced items from queue
   * 
   * Cleanup operation to remove successfully synced items.
   */
  async clearSyncedItems(): Promise<void> {
    try {
      const syncedItems = await db.syncQueue
        .where('status')
        .equals(SyncStatus.SYNCED)
        .toArray();

      const itemIds = syncedItems.map(item => item.id);
      await db.syncQueue.bulkDelete(itemIds);

      if (import.meta.env.DEV) {
        console.log(`Cleared ${itemIds.length} synced items from queue`);
      }
    } catch (error) {
      throw new SyncQueueError(
        `Failed to clear synced items: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CLEAR_SYNCED_ERROR'
      );
    }
  }

  /**
   * Get queue statistics
   * 
   * Returns counts of items by status.
   * 
   * @returns Queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number;
    syncing: number;
    synced: number;
    failed: number;
    total: number;
  }> {
    try {
      const [pending, syncing, synced, failed] = await Promise.all([
        db.syncQueue.where('status').equals(SyncStatus.PENDING).count(),
        db.syncQueue.where('status').equals(SyncStatus.SYNCING).count(),
        db.syncQueue.where('status').equals(SyncStatus.SYNCED).count(),
        db.syncQueue.where('status').equals(SyncStatus.FAILED).count(),
      ]);

      const total = pending + syncing + synced + failed;

      return { pending, syncing, synced, failed, total };
    } catch (error) {
      throw new SyncQueueError(
        `Failed to get queue stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GET_STATS_ERROR'
      );
    }
  }

  /**
   * Get items for specific entity
   * 
   * @param entityType - Type of entity
   * @param entityId - ID of entity
   * @returns Array of queue items for entity
   */
  async getItemsForEntity(entityType: string, entityId: string): Promise<SyncQueueItem[]> {
    try {
      return await db.syncQueue
        .where('[entityType+entityId]')
        .equals([entityType, entityId])
        .toArray();
    } catch (error) {
      throw new SyncQueueError(
        `Failed to get items for entity: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GET_ENTITY_ITEMS_ERROR'
      );
    }
  }
}

/**
 * Global sync queue service instance
 */
export const syncQueueService = new SyncQueueService();

export default syncQueueService;
