/**
 * Sync Service
 * 
 * Orchestrates synchronization between local IndexedDB and remote Supabase.
 * Coordinates online/offline operations and manages sync state.
 * 
 * Requirements:
 * - 3.4: Automatic sync on connection restore
 * - 14.4: Queue offline changes for sync
 * - 14.5: Process sync queue on reconnection
 */

import { syncQueueService } from './sync-queue.service';
import { SyncQueueItem, SyncOperation, SyncState } from '@/types';
import { supabase } from '@/lib/supabase';

/**
 * Sync event types
 */
export enum SyncEventType {
  SYNC_STARTED = 'sync_started',
  SYNC_COMPLETED = 'sync_completed',
  SYNC_FAILED = 'sync_failed',
  SYNC_PROGRESS = 'sync_progress',
  STATE_CHANGED = 'state_changed'
}

/**
 * Sync event data
 */
export interface SyncEvent {
  type: SyncEventType;
  timestamp: Date;
  data?: any;
}

/**
 * Sync event listener
 */
export type SyncEventListener = (event: SyncEvent) => void;

/**
 * Custom error class for sync service failures
 */
export class SyncServiceError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'SyncServiceError';
  }
}

/**
 * Sync Service
 * 
 * Orchestrates synchronization between local and remote data stores.
 */
export class SyncService {
  private syncState: SyncState = SyncState.OFFLINE;
  private isSyncing: boolean = false;
  private listeners: Map<SyncEventType, Set<SyncEventListener>> = new Map();
  private autoSyncEnabled: boolean = true;

  constructor() {
    // Initialize event listener map
    Object.values(SyncEventType).forEach(type => {
      this.listeners.set(type, new Set());
    });

    // Monitor connection status
    this.initializeConnectionMonitoring();
  }

  /**
   * Initialize connection monitoring
   * 
   * Requirement 3.4: Auto-sync on connection restore
   */
  private initializeConnectionMonitoring(): void {
    // Listen for online event
    window.addEventListener('online', () => {
      this.handleConnectionRestored();
    });

    // Listen for offline event
    window.addEventListener('offline', () => {
      this.handleConnectionLost();
    });

    // Set initial state
    this.updateSyncState(navigator.onLine ? SyncState.ONLINE : SyncState.OFFLINE);
  }

  /**
   * Handle connection restored event
   * 
   * Requirement 3.4: Automatic sync on connection restore
   */
  private async handleConnectionRestored(): Promise<void> {
    if (import.meta.env.DEV) {
      console.log('Connection restored, initiating sync...');
    }

    this.updateSyncState(SyncState.ONLINE);

    // Auto-sync if enabled
    if (this.autoSyncEnabled) {
      await this.syncNow();
    }
  }

  /**
   * Handle connection lost event
   */
  private handleConnectionLost(): void {
    if (import.meta.env.DEV) {
      console.log('Connection lost');
    }

    this.updateSyncState(SyncState.OFFLINE);
  }

  /**
   * Update sync state and notify listeners
   */
  private updateSyncState(newState: SyncState): void {
    if (this.syncState !== newState) {
      this.syncState = newState;
      
      this.emitEvent({
        type: SyncEventType.STATE_CHANGED,
        timestamp: new Date(),
        data: { state: newState }
      });
    }
  }

  /**
   * Get current sync state
   */
  getSyncState(): SyncState {
    return this.syncState;
  }

  /**
   * Check if currently syncing
   */
  getIsSyncing(): boolean {
    return this.isSyncing;
  }

  /**
   * Sync all pending items in queue
   * 
   * Requirements 14.4, 14.5: Process sync queue
   * 
   * @returns Number of items successfully synced
   */
  async syncNow(): Promise<number> {
    // Prevent concurrent syncs
    if (this.isSyncing) {
      if (import.meta.env.DEV) {
        console.warn('Sync already in progress, skipping');
      }
      return 0;
    }

    // Check if online
    if (!navigator.onLine) {
      if (import.meta.env.DEV) {
        console.warn('Cannot sync while offline');
      }
      return 0;
    }

    try {
      this.isSyncing = true;
      this.updateSyncState(SyncState.SYNCING);

      this.emitEvent({
        type: SyncEventType.SYNC_STARTED,
        timestamp: new Date()
      });

      // Get all pending items
      const pendingItems = await syncQueueService.getPendingItems();
      
      // Get failed items that can be retried
      const failedItems = await syncQueueService.getFailedItems();
      const retryableItems = failedItems.filter(item => 
        syncQueueService.shouldRetry(item)
      );

      const allItems = [...pendingItems, ...retryableItems];

      if (allItems.length === 0) {
        if (import.meta.env.DEV) {
          console.log('No items to sync');
        }
        
        this.emitEvent({
          type: SyncEventType.SYNC_COMPLETED,
          timestamp: new Date(),
          data: { itemsSynced: 0 }
        });

        return 0;
      }

      if (import.meta.env.DEV) {
        console.log(`Syncing ${allItems.length} items...`);
      }

      let syncedCount = 0;

      // Process each item
      for (const item of allItems) {
        try {
          await this.syncItem(item);
          syncedCount++;

          this.emitEvent({
            type: SyncEventType.SYNC_PROGRESS,
            timestamp: new Date(),
            data: { 
              current: syncedCount, 
              total: allItems.length,
              itemId: item.id 
            }
          });
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error);
          // Item is already marked as failed by syncItem
        }
      }

      // Clean up synced items
      await syncQueueService.clearSyncedItems();

      this.emitEvent({
        type: SyncEventType.SYNC_COMPLETED,
        timestamp: new Date(),
        data: { itemsSynced: syncedCount }
      });

      if (import.meta.env.DEV) {
        console.log(`Sync completed: ${syncedCount}/${allItems.length} items synced`);
      }

      return syncedCount;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error('Sync failed:', errorMessage);

      this.emitEvent({
        type: SyncEventType.SYNC_FAILED,
        timestamp: new Date(),
        data: { error: errorMessage }
      });

      throw new SyncServiceError(
        `Sync failed: ${errorMessage}`,
        'SYNC_FAILED'
      );
    } finally {
      this.isSyncing = false;
      this.updateSyncState(navigator.onLine ? SyncState.ONLINE : SyncState.OFFLINE);
    }
  }

  /**
   * Sync individual queue item
   * 
   * @param item - Queue item to sync
   */
  private async syncItem(item: SyncQueueItem): Promise<void> {
    try {
      // Mark as syncing
      await syncQueueService.markAsSyncing(item.id);

      // Perform sync operation based on entity type and operation
      await this.performSyncOperation(item);

      // Mark as synced
      await syncQueueService.markAsSynced(item.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Mark as failed with error
      await syncQueueService.markAsFailed(item.id, errorMessage);
      
      throw error;
    }
  }

  /**
   * Perform sync operation to Supabase
   * 
   * @param item - Queue item to sync
   */
  private async performSyncOperation(item: SyncQueueItem): Promise<void> {
    const { entityType, operation, data } = item;

    // Map entity types to Supabase tables
    const tableMap: Record<string, string> = {
      'menuItem': 'menu_items',
      'order': 'orders',
      'orderItem': 'order_items',
      'session': 'sessions',
      'stockAdjustment': 'stock_adjustments',
      'auditLog': 'audit_logs'
    };

    const tableName = tableMap[entityType];

    if (!tableName) {
      throw new SyncServiceError(
        `Unknown entity type: ${entityType}`,
        'UNKNOWN_ENTITY_TYPE'
      );
    }

    // Perform operation
    switch (operation) {
      case SyncOperation.CREATE:
        await this.syncCreate(tableName, data);
        break;

      case SyncOperation.UPDATE:
        await this.syncUpdate(tableName, data);
        break;

      case SyncOperation.DELETE:
        await this.syncDelete(tableName, data);
        break;

      default:
        throw new SyncServiceError(
          `Unknown operation: ${operation}`,
          'UNKNOWN_OPERATION'
        );
    }
  }

  /**
   * Sync CREATE operation
   */
  private async syncCreate(tableName: string, data: any): Promise<void> {
    const { error } = await supabase
      .from(tableName)
      .insert(data);

    if (error) {
      throw new Error(`Supabase insert error: ${error.message}`);
    }
  }

  /**
   * Sync UPDATE operation
   */
  private async syncUpdate(tableName: string, data: any): Promise<void> {
    const { id, ...updateData } = data;

    const { error } = await supabase
      .from(tableName)
      .update(updateData)
      .eq('id', id);

    if (error) {
      throw new Error(`Supabase update error: ${error.message}`);
    }
  }

  /**
   * Sync DELETE operation
   */
  private async syncDelete(tableName: string, data: any): Promise<void> {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', data.id);

    if (error) {
      throw new Error(`Supabase delete error: ${error.message}`);
    }
  }

  /**
   * Enable or disable auto-sync
   */
  setAutoSyncEnabled(enabled: boolean): void {
    this.autoSyncEnabled = enabled;
    
    if (import.meta.env.DEV) {
      console.log(`Auto-sync ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Check if auto-sync is enabled
   */
  isAutoSyncEnabled(): boolean {
    return this.autoSyncEnabled;
  }

  /**
   * Add event listener
   */
  addEventListener(type: SyncEventType, listener: SyncEventListener): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.add(listener);
    }
  }

  /**
   * Remove event listener
   */
  removeEventListener(type: SyncEventType, listener: SyncEventListener): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: SyncEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in sync event listener:', error);
        }
      });
    }
  }

  /**
   * Get sync queue statistics
   */
  async getQueueStats() {
    return await syncQueueService.getQueueStats();
  }
}

/**
 * Global sync service instance
 */
export const syncService = new SyncService();

export default syncService;
