/**
 * Real-time Subscription Service Tests
 * 
 * Tests real-time subscription setup and event handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  RealtimeSubscriptionService, 
  RealtimeEventType,
  RealtimeSubscriptionError 
} from './realtime-subscription.service';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: vi.fn(),
    removeChannel: vi.fn()
  }
}));

vi.mock('@/lib/db', () => ({
  db: {
    menuItems: {
      get: vi.fn(),
      add: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    },
    orders: {
      get: vi.fn(),
      add: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    },
    sessions: {
      get: vi.fn(),
      add: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    },
    stockAdjustments: {
      get: vi.fn(),
      add: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    }
  }
}));

describe('RealtimeSubscriptionService', () => {
  let service: RealtimeSubscriptionService;
  let mockChannel: any;

  beforeEach(() => {
    service = new RealtimeSubscriptionService();

    // Mock channel
    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return Promise.resolve();
      })
    };

    vi.mocked(supabase.channel).mockReturnValue(mockChannel);
    vi.clearAllMocks();
  });

  describe('subscribeToAll', () => {
    it('should subscribe to all tables', async () => {
      await service.subscribeToAll();

      expect(supabase.channel).toHaveBeenCalledTimes(4);
      expect(supabase.channel).toHaveBeenCalledWith('menu_items-changes');
      expect(supabase.channel).toHaveBeenCalledWith('orders-changes');
      expect(supabase.channel).toHaveBeenCalledWith('sessions-changes');
      expect(supabase.channel).toHaveBeenCalledWith('stock_adjustments-changes');
    });

    it('should set up INSERT, UPDATE, DELETE listeners for each table', async () => {
      await service.subscribeToAll();

      // Each table should have 3 event listeners (INSERT, UPDATE, DELETE)
      expect(mockChannel.on).toHaveBeenCalledTimes(12); // 4 tables × 3 events
    });

    it('should mark as subscribed after successful subscription', async () => {
      expect(service.getIsSubscribed()).toBe(false);

      await service.subscribeToAll();

      expect(service.getIsSubscribed()).toBe(true);
    });

    it('should not subscribe twice', async () => {
      await service.subscribeToAll();
      await service.subscribeToAll();

      // Should only subscribe once
      expect(supabase.channel).toHaveBeenCalledTimes(4);
    });

    it('should emit CONNECTED event', async () => {
      const listener = vi.fn();
      service.addEventListener(RealtimeEventType.CONNECTED, listener);

      await service.subscribeToAll();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: RealtimeEventType.CONNECTED,
          table: 'all'
        })
      );
    });

    it('should track active channel count', async () => {
      expect(service.getActiveChannelCount()).toBe(0);

      await service.subscribeToAll();

      expect(service.getActiveChannelCount()).toBe(4);
    });
  });

  describe('unsubscribeFromAll', () => {
    it('should unsubscribe from all channels', async () => {
      await service.subscribeToAll();
      await service.unsubscribeFromAll();

      expect(supabase.removeChannel).toHaveBeenCalledTimes(4);
      expect(service.getIsSubscribed()).toBe(false);
      expect(service.getActiveChannelCount()).toBe(0);
    });

    it('should emit DISCONNECTED event', async () => {
      const listener = vi.fn();
      service.addEventListener(RealtimeEventType.DISCONNECTED, listener);

      await service.subscribeToAll();
      await service.unsubscribeFromAll();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: RealtimeEventType.DISCONNECTED,
          table: 'all'
        })
      );
    });

    it('should handle unsubscribe when not subscribed', async () => {
      await service.unsubscribeFromAll();

      expect(supabase.removeChannel).not.toHaveBeenCalled();
    });
  });

  describe('event listeners', () => {
    it('should add and call event listeners', async () => {
      const listener = vi.fn();
      service.addEventListener(RealtimeEventType.CONNECTED, listener);

      await service.subscribeToAll();

      expect(listener).toHaveBeenCalled();
    });

    it('should remove event listeners', async () => {
      const listener = vi.fn();
      
      service.addEventListener(RealtimeEventType.CONNECTED, listener);
      service.removeEventListener(RealtimeEventType.CONNECTED, listener);

      await service.subscribeToAll();

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', async () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      service.addEventListener(RealtimeEventType.CONNECTED, errorListener);
      await service.subscribeToAll();

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('getIsSubscribed', () => {
    it('should return false initially', () => {
      expect(service.getIsSubscribed()).toBe(false);
    });

    it('should return true after subscription', async () => {
      await service.subscribeToAll();
      
      expect(service.getIsSubscribed()).toBe(true);
    });

    it('should return false after unsubscription', async () => {
      await service.subscribeToAll();
      await service.unsubscribeFromAll();
      
      expect(service.getIsSubscribed()).toBe(false);
    });
  });

  describe('getActiveChannelCount', () => {
    it('should return 0 initially', () => {
      expect(service.getActiveChannelCount()).toBe(0);
    });

    it('should return channel count after subscription', async () => {
      await service.subscribeToAll();
      
      expect(service.getActiveChannelCount()).toBe(4);
    });

    it('should return 0 after unsubscription', async () => {
      await service.subscribeToAll();
      await service.unsubscribeFromAll();
      
      expect(service.getActiveChannelCount()).toBe(0);
    });
  });
});
