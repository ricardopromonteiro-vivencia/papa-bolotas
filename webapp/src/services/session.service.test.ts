/**
 * Session Service Tests
 * 
 * Tests for session management including creation, closure, and statistics
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionService, SessionError } from './session.service';
import { supabase } from '@/lib/supabase';
import type { Session, SalesReport } from '@/types';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('SessionService', () => {
  let service: SessionService;
  let mockFrom: any;
  let mockSelect: any;
  let mockInsert: any;
  let mockUpdate: any;
  let mockEq: any;
  let mockOrder: any;
  let mockLimit: any;
  let mockSingle: any;
  let mockMaybeSingle: any;

  beforeEach(() => {
    service = new SessionService();

    // Reset mocks
    vi.clearAllMocks();

    // Setup mock chain - create fresh instances for each test
    mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    mockLimit = vi.fn(() => Promise.resolve({ data: [], error: null }));
    mockOrder = vi.fn(() => ({ 
      limit: mockLimit,
      single: mockSingle,
    }));
    mockEq = vi.fn(() => ({ 
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
      eq: mockEq,
      order: mockOrder,
      limit: mockLimit,
      select: mockSelect,
    }));
    mockSelect = vi.fn(() => ({ 
      eq: mockEq,
      single: mockSingle,
      order: mockOrder,
      limit: mockLimit,
    }));
    mockInsert = vi.fn(() => ({ select: mockSelect }));
    mockUpdate = vi.fn(() => ({ eq: mockEq, select: mockSelect }));

    mockFrom = vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    }));

    (supabase.from as any) = mockFrom;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('startSession', () => {
    it('should create a new session successfully', async () => {
      const userId = 'user-123';
      const mockSessionData = {
        id: 'session-1',
        user_id: userId,
        started_at: new Date().toISOString(),
        is_active: true,
        version: 1,
      };

      // Mock the complete chain for startSession (which calls getActiveSession first)
      mockFrom.mockImplementation((table: string) => {
        if (table === 'sessions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
                    }))
                  }))
                }))
              }))
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockSessionData, error: null })
              }))
            }))
          };
        }
        return { select: mockSelect, insert: mockInsert };
      });

      const result = await service.startSession(userId);

      expect(result).toMatchObject({
        id: 'session-1',
        userId: userId,
        isActive: true,
        version: 1,
      });
      expect(result.startedAt).toBeInstanceOf(Date);
    });

    it('should return existing active session if one exists', async () => {
      const userId = 'user-123';
      const mockExistingSession = {
        id: 'session-existing',
        user_id: userId,
        started_at: new Date().toISOString(),
        is_active: true,
        version: 1,
      };

      // Mock existing active session
      mockFrom.mockImplementation(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockExistingSession, error: null })
                }))
              }))
            }))
          }))
        }))
      }));

      const result = await service.startSession(userId);

      expect(result.id).toBe('session-existing');
    });

    it('should throw error for empty userId', async () => {
      await expect(service.startSession('')).rejects.toThrow(SessionError);
      await expect(service.startSession('')).rejects.toThrow('User ID is required');
    });

    it('should handle database errors during creation', async () => {
      const userId = 'user-123';

      // Reset mockFrom to provide proper chain for getActiveSession
      mockFrom.mockImplementation((table: string) => {
        if (table === 'sessions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
                    }))
                  }))
                }))
              }))
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ 
                  data: null, 
                  error: { message: 'Database connection failed' } 
                })
              }))
            }))
          };
        }
        return { select: mockSelect, insert: mockInsert, update: mockUpdate };
      });

      await expect(service.startSession(userId)).rejects.toThrow(SessionError);
      await expect(service.startSession(userId)).rejects.toThrow('Failed to start session');
    });
  });

  describe('endSession', () => {
    it('should end session successfully with cash reconciliation', async () => {
      const sessionId = 'session-1';
      const actualCash = 150.50;
      const mockSession = {
        id: sessionId,
        user_id: 'user-123',
        started_at: new Date().toISOString(),
        is_active: true,
        version: 1,
      };

      const mockOrders = [
        { total: 50.00 },
        { total: 75.25 },
        { total: 25.00 },
      ];

      const mockUpdatedSession = {
        ...mockSession,
        ended_at: new Date().toISOString(),
        is_active: false,
        expected_cash: 150.25,
        actual_cash: actualCash,
        discrepancy: 0.25,
      };

      // Mock the complete chain for different calls
      mockFrom.mockImplementation((table: string) => {
        if (table === 'sessions') {
          // First call: getSession
          const getSessionCall = {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockSession, error: null })
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: mockUpdatedSession, error: null })
                }))
              }))
            }))
          };
          return getSessionCall;
        }
        if (table === 'orders') {
          // calculateExpectedCash call
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn().mockResolvedValue({ data: mockOrders, error: null })
                }))
              }))
            }))
          };
        }
        return { select: mockSelect, insert: mockInsert, update: mockUpdate };
      });

      const result = await service.endSession(sessionId, actualCash);

      expect(result.isActive).toBe(false);
      expect(result.endedAt).toBeInstanceOf(Date);
      expect(result.expectedCash).toBe(150.25);
      expect(result.actualCash).toBe(150.50);
      expect(result.discrepancy).toBe(0.25);
    });

    it('should throw error for empty sessionId', async () => {
      await expect(service.endSession('', 100)).rejects.toThrow(SessionError);
      await expect(service.endSession('', 100)).rejects.toThrow('Session ID is required');
    });

    it('should throw error for negative actualCash', async () => {
      await expect(service.endSession('session-1', -50)).rejects.toThrow(SessionError);
      await expect(service.endSession('session-1', -50)).rejects.toThrow('Actual cash cannot be negative');
    });

    it('should throw error if session is already closed', async () => {
      const sessionId = 'session-1';
      const mockClosedSession = {
        id: sessionId,
        user_id: 'user-123',
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        is_active: false,
        version: 1,
      };

      mockFrom.mockImplementation(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockClosedSession, error: null })
          }))
        }))
      }));

      await expect(service.endSession(sessionId, 100)).rejects.toThrow(SessionError);
      await expect(service.endSession(sessionId, 100)).rejects.toThrow('Session is already closed');
    });
  });

  describe('getSession', () => {
    it('should retrieve session by ID', async () => {
      const sessionId = 'session-1';
      const mockSession = {
        id: sessionId,
        user_id: 'user-123',
        started_at: new Date().toISOString(),
        is_active: true,
        version: 1,
      };

      mockSingle.mockResolvedValueOnce({ data: mockSession, error: null });

      const result = await service.getSession(sessionId);

      expect(result.id).toBe(sessionId);
      expect(result.userId).toBe('user-123');
      expect(result.isActive).toBe(true);
    });

    it('should throw error for empty sessionId', async () => {
      await expect(service.getSession('')).rejects.toThrow(SessionError);
      await expect(service.getSession('')).rejects.toThrow('Session ID is required');
    });

    it('should throw error if session not found', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { code: 'PGRST116', message: 'Not found' } 
            })
          }))
        }))
      }));

      await expect(service.getSession('non-existent')).rejects.toThrow(SessionError);
      await expect(service.getSession('non-existent')).rejects.toThrow('Session not found');
    });
  });

  describe('getActiveSession', () => {
    it('should retrieve active session for user', async () => {
      const userId = 'user-123';
      const mockSession = {
        id: 'session-active',
        user_id: userId,
        started_at: new Date().toISOString(),
        is_active: true,
        version: 1,
      };

      mockFrom.mockImplementation(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockSession, error: null })
                }))
              }))
            }))
          }))
        }))
      }));

      const result = await service.getActiveSession(userId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('session-active');
      expect(result?.isActive).toBe(true);
    });

    it('should return null if no active session exists', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
                }))
              }))
            }))
          }))
        }))
      }));

      const result = await service.getActiveSession('user-123');

      expect(result).toBeNull();
    });

    it('should throw error for empty userId', async () => {
      await expect(service.getActiveSession('')).rejects.toThrow(SessionError);
      await expect(service.getActiveSession('')).rejects.toThrow('User ID is required');
    });
  });

  describe('getUserSessions', () => {
    it('should retrieve all sessions for a user', async () => {
      const userId = 'user-123';
      const mockSessions = [
        {
          id: 'session-1',
          user_id: userId,
          started_at: new Date().toISOString(),
          is_active: false,
          version: 1,
        },
        {
          id: 'session-2',
          user_id: userId,
          started_at: new Date().toISOString(),
          is_active: true,
          version: 1,
        },
      ];

      mockLimit.mockResolvedValueOnce({ data: mockSessions, error: null });

      const result = await service.getUserSessions(userId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('session-1');
      expect(result[1].id).toBe('session-2');
    });

    it('should respect limit parameter', async () => {
      const userId = 'user-123';

      mockLimit.mockResolvedValueOnce({ data: [], error: null });

      await service.getUserSessions(userId, 10);

      expect(mockLimit).toHaveBeenCalledWith(10);
    });

    it('should throw error for empty userId', async () => {
      await expect(service.getUserSessions('')).rejects.toThrow(SessionError);
      await expect(service.getUserSessions('')).rejects.toThrow('User ID is required');
    });

    it('should return empty array if no sessions found', async () => {
      mockLimit.mockResolvedValueOnce({ data: [], error: null });

      const result = await service.getUserSessions('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('getSessionStatistics', () => {
    it('should calculate session statistics correctly', async () => {
      const sessionId = 'session-1';
      const mockSession = {
        id: sessionId,
        user_id: 'user-123',
        started_at: new Date('2024-01-01T09:00:00Z').toISOString(),
        ended_at: new Date('2024-01-01T17:00:00Z').toISOString(),
        is_active: false,
        version: 1,
      };

      const mockOrders = [
        {
          id: 'order-1',
          total: 50.00,
          is_complimentary: false,
          is_cancelled: false,
          created_at: new Date().toISOString(),
          order_items: [
            { menu_item_name: 'Sandes Leitão', quantity: 2, subtotal: 30.00 },
            { menu_item_name: 'Coca-Cola', quantity: 2, subtotal: 20.00 },
          ],
        },
        {
          id: 'order-2',
          total: 0.00,
          is_complimentary: true,
          is_cancelled: false,
          created_at: new Date().toISOString(),
          order_items: [
            { menu_item_name: 'Café', quantity: 1, subtotal: 0.00 },
          ],
        },
        {
          id: 'order-3',
          total: 0.00,
          is_complimentary: false,
          is_cancelled: true,
          created_at: new Date().toISOString(),
          order_items: [
            { menu_item_name: 'Batatas Fritas', quantity: 1, subtotal: 15.00 },
          ],
        },
        {
          id: 'order-4',
          total: 75.25,
          is_complimentary: false,
          is_cancelled: false,
          created_at: new Date().toISOString(),
          order_items: [
            { menu_item_name: 'Sandes Leitão', quantity: 1, subtotal: 15.00 },
            { menu_item_name: 'Tábua Mista', quantity: 1, subtotal: 60.25 },
          ],
        },
      ];

      // Mock the chain for getSession and getOrders
      mockFrom.mockImplementation((table: string) => {
        if (table === 'sessions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockSession, error: null })
              }))
            }))
          };
        }
        if (table === 'orders') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: mockOrders, error: null })
            }))
          };
        }
        return { select: mockSelect };
      });

      const result = await service.getSessionStatistics(sessionId);

      expect(result.sessionId).toBe(sessionId);
      expect(result.totalRevenue).toBe(125.25); // 50 + 75.25
      expect(result.completedOrders).toBe(2);
      expect(result.complimentaryOrders).toBe(1);
      expect(result.cancelledOrders).toBe(1);
      expect(result.itemsSold).toHaveLength(4); // 4 unique items (Sandes, Coca-Cola, Café, Tábua - excluding cancelled Batatas)
      
      // Check item aggregation
      const sandesItem = result.itemsSold.find(item => item.itemName === 'Sandes Leitão');
      expect(sandesItem).toBeDefined();
      expect(sandesItem?.quantity).toBe(3); // 2 + 1
      expect(sandesItem?.subtotal).toBe(45.00); // 30 + 15
    });

    it('should throw error for empty sessionId', async () => {
      await expect(service.getSessionStatistics('')).rejects.toThrow(SessionError);
      await expect(service.getSessionStatistics('')).rejects.toThrow('Session ID is required');
    });

    it('should handle session with no orders', async () => {
      const sessionId = 'session-empty';
      const mockSession = {
        id: sessionId,
        user_id: 'user-123',
        started_at: new Date().toISOString(),
        is_active: true,
        version: 1,
      };

      // Mock the chain for getSession and getOrders
      mockFrom.mockImplementation((table: string) => {
        if (table === 'sessions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockSession, error: null })
              }))
            }))
          };
        }
        if (table === 'orders') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [], error: null })
            }))
          };
        }
        return { select: mockSelect };
      });

      const result = await service.getSessionStatistics(sessionId);

      expect(result.totalRevenue).toBe(0);
      expect(result.completedOrders).toBe(0);
      expect(result.complimentaryOrders).toBe(0);
      expect(result.cancelledOrders).toBe(0);
      expect(result.itemsSold).toEqual([]);
    });
  });
});
