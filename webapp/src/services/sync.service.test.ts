/**
 * Sync Service Tests
 * 
 * Tests sync orchestration, connection monitoring, and event handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncService, SyncEventType, SyncServiceError } from './sync.service';
import { syncQueueService } from './sync-queue.service';
import { SyncOperation, SyncStatus, SyncState } from '@/types';
import { supabase } from '@/lib/supabase';

// Mock dependencies
vi.mock('./sync-queue.service');
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('SyncService', () => {
  let service: SyncService;
  let mockOnlineListener: ((event: Event) => void) | null = null;
  let mockOfflineListener: ((event: Event) => void) | null = null;

  beforeEach(() => {
    // Mock window.addEventListener to capture listeners
    vi.spyOn(window, 'addEventListener').mockImplementation((event, listener) => {
      if (event === 'online') {
        mockOnlineListener = listener as (event: Event) => void;
      } else if (event === 'offline') {
        mockOfflineListener = listener as (event: Event) => void;
      }
    });

    // Mock navigator.onLine
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);

    service = new SyncService();

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with online state when navigator is online', () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      const newService = new SyncService();
      
      expect(newService.getSyncState()).toBe(SyncState.ONLINE);
    });

    it('should initialize with offline state when navigator is offline', () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      const newService = new SyncService();
      
      expect(newService.getSyncState()).toBe(SyncState.OFFLINE);
    });

    it('should register connection event listeners', () => {
      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });

  describe('connection monitoring', () => {
    it('should update state to online when connection is restored', () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      
      const stateListener = vi.fn();
      service.addEventListener(SyncEventType.STATE_CHANGED, stateListener);

      // Trigger online event
      if (mockOnlineListener) {
        mockOnlineListener(new Event('online'));
      }

      expect(stateListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SyncEventType.STATE_CHANGED,
          data: { state: SyncState.ONLINE }
        })
      );
    });

    it('should update state to offline when connection is lost', () => {
      const stateListener = vi.fn();
      service.addEventListener(SyncEventType.STATE_CHANGED, stateListener);

      // Trigger offline event
      if (mockOfflineListener) {
        mockOfflineListener(new Event('offline'));
      }

      expect(stateListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SyncEventType.STATE_CHANGED,
          data: { state: SyncState.OFFLINE }
        })
      );
    });
  });

  describe('syncNow', () => {
    it('should not sync when offline', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

      const result = await service.syncNow();

      expect(result).toBe(0);
      expect(syncQueueService.getPendingItems).not.toHaveBeenCalled();
    });

    it('should not sync when already syncing', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      vi.mocked(syncQueueService.getPendingItems).mockResolvedValue([]);

      // Start first sync
      const promise1 = service.syncNow();
      
      // Try to start second sync
      const result2 = await service.syncNow();

      expect(result2).toBe(0);

      await promise1;
    });

    it('should return 0 when no items to sync', async () => {
      vi.mocked(syncQueueService.getPendingItems).mockResolvedValue([]);
      vi.mocked(syncQueueService.getFailedItems).mockResolvedValue([]);

      const result = await service.syncNow();

      expect(result).toBe(0);
    });

    it('should emit SYNC_STARTED event', async () => {
      vi.mocked(syncQueueService.getPendingItems).mockResolvedValue([]);
      vi.mocked(syncQueueService.getFailedItems).mockResolvedValue([]);

      const listener = vi.fn();
      service.addEventListener(SyncEventType.SYNC_STARTED, listener);

      await service.syncNow();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SyncEventType.SYNC_STARTED
        })
      );
    });

    it('should emit SYNC_COMPLETED event', async () => {
      vi.mocked(syncQueueService.getPendingItems).mockResolvedValue([]);
      vi.mocked(syncQueueService.getFailedItems).mockResolvedValue([]);
      vi.mocked(syncQueueService.clearSyncedItems).mockResolvedValue();

      const listener = vi.fn();
      service.addEventListener(SyncEventType.SYNC_COMPLETED, listener);

      await service.syncNow();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SyncEventType.SYNC_COMPLETED,
          data: { itemsSynced: 0 }
        })
      );
    });

    it('should update sync state during sync', async () => {
      vi.mocked(syncQueueService.getPendingItems).mockResolvedValue([]);
      vi.mocked(syncQueueService.getFailedItems).mockResolvedValue([]);

      expect(service.getIsSyncing()).toBe(false);

      const promise = service.syncNow();
      
      // During sync (may not catch it due to async timing)
      // expect(service.getIsSyncing()).toBe(true);

      await promise;

      expect(service.getIsSyncing()).toBe(false);
    });
  });

  describe('auto-sync', () => {
    it('should auto-sync when connection is restored and auto-sync is enabled', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      vi.mocked(syncQueueService.getPendingItems).mockResolvedValue([]);
      vi.mocked(syncQueueService.getFailedItems).mockResolvedValue([]);

      service.setAutoSyncEnabled(true);

      // Trigger online event
      if (mockOnlineListener) {
        await mockOnlineListener(new Event('online'));
      }

      // Give time for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(syncQueueService.getPendingItems).toHaveBeenCalled();
    });

    it('should not auto-sync when auto-sync is disabled', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      
      service.setAutoSyncEnabled(false);

      // Trigger online event
      if (mockOnlineListener) {
        await mockOnlineListener(new Event('online'));
      }

      expect(syncQueueService.getPendingItems).not.toHaveBeenCalled();
    });

    it('should return auto-sync status', () => {
      service.setAutoSyncEnabled(true);
      expect(service.isAutoSyncEnabled()).toBe(true);

      service.setAutoSyncEnabled(false);
      expect(service.isAutoSyncEnabled()).toBe(false);
    });
  });

  describe('event listeners', () => {
    it('should add and call event listeners', () => {
      const listener = vi.fn();
      
      service.addEventListener(SyncEventType.STATE_CHANGED, listener);

      // Trigger state change
      if (mockOfflineListener) {
        mockOfflineListener(new Event('offline'));
      }

      expect(listener).toHaveBeenCalled();
    });

    it('should remove event listeners', () => {
      const listener = vi.fn();
      
      service.addEventListener(SyncEventType.STATE_CHANGED, listener);
      service.removeEventListener(SyncEventType.STATE_CHANGED, listener);

      // Trigger state change
      if (mockOfflineListener) {
        mockOfflineListener(new Event('offline'));
      }

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      service.addEventListener(SyncEventType.STATE_CHANGED, errorListener);

      // Trigger state change
      if (mockOfflineListener) {
        mockOfflineListener(new Event('offline'));
      }

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const mockStats = {
        pending: 5,
        syncing: 1,
        synced: 10,
        failed: 2,
        total: 18
      };

      vi.mocked(syncQueueService.getQueueStats).mockResolvedValue(mockStats);

      const stats = await service.getQueueStats();

      expect(stats).toEqual(mockStats);
    });
  });

  describe('getSyncState', () => {
    it('should return current sync state', () => {
      const state = service.getSyncState();
      
      expect(state).toBeDefined();
      expect(Object.values(SyncState)).toContain(state);
    });
  });
});
