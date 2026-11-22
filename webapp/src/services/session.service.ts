/**
 * Session Service
 * 
 * Handles work session management including session creation, closure, and statistics.
 * A session represents a work period from login to cash register closure.
 * 
 * Requirements:
 * - 19.1: Auto-create session on user login
 * - 19.2: Record session start timestamp
 * - 19.3: Associate all orders with current session
 * - 19.8: Calculate session statistics (revenue, order counts, item breakdown)
 */

import { supabase } from '@/lib/supabase';
import { Session, SalesReport, Order } from '@/types';

/**
 * Custom error class for session-related failures
 */
export class SessionError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'SessionError';
  }
}

/**
 * Session Service
 * 
 * Provides methods for managing work sessions throughout the restaurant's operation.
 */
export class SessionService {
  /**
   * Start a new session for a user
   * 
   * Requirements:
   * - 19.1: Auto-create session on user login
   * - 19.2: Record session start timestamp
   * 
   * @param userId - ID of the user starting the session
   * @returns Promise resolving to the created Session
   * @throws SessionError if creation fails
   */
  async startSession(userId: string): Promise<Session> {
    try {
      // Validate userId
      if (!userId || userId.trim().length === 0) {
        throw new SessionError(
          'O ID do utilizador é obrigatório para iniciar uma sessão',
          'INVALID_USER_ID',
          400
        );
      }

      // Check if user already has an active session
      const existingSession = await this.getActiveSession(userId);
      if (existingSession) {
        if (import.meta.env.DEV) {
          console.log('User already has an active session:', existingSession.id);
        }
        return existingSession;
      }

      // Create new session
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          user_id: userId,
          started_at: new Date().toISOString(),
          is_active: true,
          version: 1,
        })
        .select()
        .single();

      if (error) {
        throw new SessionError(
          `Falha ao iniciar a sessão: ${error.message}`,
          'CREATE_FAILED',
          500
        );
      }

      if (!data) {
        throw new SessionError(
          'Falha ao iniciar a sessão: nenhum dado devolvido',
          'NO_DATA',
          500
        );
      }

      const session = this.mapToSession(data);

      if (import.meta.env.DEV) {
        console.log('Session started successfully:', {
          sessionId: session.id,
          userId: session.userId,
          startedAt: session.startedAt,
        });
      }

      return session;

    } catch (error) {
      if (error instanceof SessionError) {
        throw error;
      }

      console.error('Unexpected error starting session:', error);
      throw new SessionError(
        'Ocorreu um erro inesperado ao iniciar a sessão',
        'START_ERROR',
        500
      );
    }
  }

  /**
   * End the current active session
   * 
   * Requirements:
   * - 19.5: Finalize session on cash register closure
   * - 19.8: Include session statistics in closure
   * 
   * @param sessionId - ID of the session to end
   * @param actualCash - Actual cash count from register
   * @returns Promise resolving to the updated Session with cash reconciliation
   * @throws SessionError if ending fails
   */
  async endSession(sessionId: string, actualCash: number): Promise<Session> {
    try {
      // Validate inputs
      if (!sessionId || sessionId.trim().length === 0) {
        throw new SessionError(
          'O ID da sessão é obrigatório',
          'INVALID_SESSION_ID',
          400
        );
      }

      if (actualCash < 0) {
        throw new SessionError(
          'O dinheiro contado não pode ser negativo',
          'INVALID_CASH',
          400
        );
      }

      // Get session to verify it exists and is active
      const session = await this.getSession(sessionId);
      if (!session.isActive) {
        throw new SessionError(
          'A sessão já está fechada',
          'SESSION_CLOSED',
          400
        );
      }

      // Calculate expected cash from orders
      const expectedCash = await this.calculateExpectedCash(sessionId);

      // Calculate discrepancy
      const discrepancy = actualCash - expectedCash;

      // Update session
      const { data, error } = await supabase
        .from('sessions')
        .update({
          ended_at: new Date().toISOString(),
          is_active: false,
          expected_cash: expectedCash,
          actual_cash: actualCash,
          discrepancy: discrepancy,
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        throw new SessionError(
          `Falha ao terminar a sessão: ${error.message}`,
          'UPDATE_FAILED',
          500
        );
      }

      if (!data) {
        throw new SessionError(
          'Falha ao terminar a sessão: nenhum dado devolvido',
          'NO_DATA',
          500
        );
      }

      const updatedSession = this.mapToSession(data);

      if (import.meta.env.DEV) {
        console.log('Session ended successfully:', {
          sessionId: updatedSession.id,
          expectedCash,
          actualCash,
          discrepancy,
        });
      }

      return updatedSession;

    } catch (error) {
      if (error instanceof SessionError) {
        throw error;
      }

      console.error('Unexpected error ending session:', error);
      throw new SessionError(
        'Ocorreu um erro inesperado ao terminar a sessão',
        'END_ERROR',
        500
      );
    }
  }

  /**
   * Get a session by ID
   * 
   * @param sessionId - ID of the session to retrieve
   * @returns Promise resolving to the Session
   * @throws SessionError if session not found
   */
  async getSession(sessionId: string): Promise<Session> {
    try {
      if (!sessionId || sessionId.trim().length === 0) {
        throw new SessionError(
          'O ID da sessão é obrigatório',
          'INVALID_SESSION_ID',
          400
        );
      }

      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new SessionError(
            'Sessão não encontrada',
            'NOT_FOUND',
            404
          );
        }
        throw new SessionError(
          `Falha ao obter a sessão: ${error.message}`,
          'FETCH_FAILED',
          500
        );
      }

      if (!data) {
        throw new SessionError(
          'Sessão não encontrada',
          'NOT_FOUND',
          404
        );
      }

      return this.mapToSession(data);

    } catch (error) {
      if (error instanceof SessionError) {
        throw error;
      }

      console.error('Unexpected error getting session:', error);
      throw new SessionError(
        'Ocorreu um erro inesperado ao obter a sessão',
        'GET_ERROR',
        500
      );
    }
  }

  /**
   * Get the active session for a user
   * 
   * Requirements:
   * - 19.4: Track current active session
   * 
   * @param userId - ID of the user
   * @returns Promise resolving to the active Session or null if none exists
   */
  async getActiveSession(userId: string): Promise<Session | null> {
    try {
      if (!userId || userId.trim().length === 0) {
        throw new SessionError(
          'O ID do utilizador é obrigatório',
          'INVALID_USER_ID',
          400
        );
      }

      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new SessionError(
          `Falha ao obter a sessão ativa: ${error.message}`,
          'FETCH_FAILED',
          500
        );
      }

      if (!data) {
        return null;
      }

      return this.mapToSession(data);

    } catch (error) {
      if (error instanceof SessionError) {
        throw error;
      }

      console.error('Unexpected error getting active session:', error);
      throw new SessionError(
        'Ocorreu um erro inesperado ao obter a sessão ativa',
        'GET_ACTIVE_ERROR',
        500
      );
    }
  }

  /**
   * Get all sessions for a user
   * 
   * Requirements:
   * - 19.6: Maintain session history
   * - 19.7: Allow viewing historical session reports
   * 
   * @param userId - ID of the user
   * @param limit - Maximum number of sessions to return (default: 50)
   * @returns Promise resolving to array of Sessions, ordered by most recent first
   */
  async getUserSessions(userId: string, limit: number = 50): Promise<Session[]> {
    try {
      if (!userId || userId.trim().length === 0) {
        throw new SessionError(
          'O ID do utilizador é obrigatório',
          'INVALID_USER_ID',
          400
        );
      }

      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new SessionError(
          `Falha ao obter as sessões do utilizador: ${error.message}`,
          'FETCH_FAILED',
          500
        );
      }

      return (data || []).map(this.mapToSession);

    } catch (error) {
      if (error instanceof SessionError) {
        throw error;
      }

      console.error('Unexpected error getting user sessions:', error);
      throw new SessionError(
        'Ocorreu um erro inesperado ao obter as sessões do utilizador',
        'GET_SESSIONS_ERROR',
        500
      );
    }
  }

  /**
   * Get session statistics
   * 
   * Requirements:
   * - 19.8: Calculate session statistics (revenue, order counts, item breakdown)
   * 
   * @param sessionId - ID of the session
   * @returns Promise resolving to SalesReport with session statistics
   */
  async getSessionStatistics(sessionId: string): Promise<SalesReport> {
    try {
      if (!sessionId || sessionId.trim().length === 0) {
        throw new SessionError(
          'O ID da sessão é obrigatório',
          'INVALID_SESSION_ID',
          400
        );
      }

      // Get session details
      const session = await this.getSession(sessionId);

      // Get all orders for this session
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          total,
          is_complimentary,
          is_cancelled,
          created_at,
          order_items (
            menu_item_name,
            quantity,
            subtotal
          )
        `)
        .eq('session_id', sessionId);

      if (ordersError) {
        throw new SessionError(
          `Falha ao obter os pedidos da sessão: ${ordersError.message}`,
          'FETCH_ORDERS_FAILED',
          500
        );
      }

      // Calculate statistics
      let totalRevenue = 0;
      let completedOrders = 0;
      let complimentaryOrders = 0;
      let cancelledOrders = 0;
      const itemsSoldMap = new Map<string, { quantity: number; subtotal: number }>();

      (orders || []).forEach((order: any) => {
        if (order.is_cancelled) {
          cancelledOrders++;
        } else if (order.is_complimentary) {
          complimentaryOrders++;
        } else {
          completedOrders++;
          totalRevenue += order.total;
        }

        // Aggregate items sold (exclude cancelled orders)
        if (!order.is_cancelled && order.order_items) {
          order.order_items.forEach((item: any) => {
            const existing = itemsSoldMap.get(item.menu_item_name) || { quantity: 0, subtotal: 0 };
            itemsSoldMap.set(item.menu_item_name, {
              quantity: existing.quantity + item.quantity,
              subtotal: existing.subtotal + item.subtotal,
            });
          });
        }
      });

      // Convert itemsSoldMap to array
      const itemsSold = Array.from(itemsSoldMap.entries()).map(([itemName, data]) => ({
        itemName,
        quantity: data.quantity,
        subtotal: data.subtotal,
      }));

      const report: SalesReport = {
        sessionId: session.id,
        sessionStart: session.startedAt,
        sessionEnd: session.endedAt,
        totalRevenue,
        completedOrders,
        complimentaryOrders,
        cancelledOrders,
        itemsSold,
      };

      return report;

    } catch (error) {
      if (error instanceof SessionError) {
        throw error;
      }

      console.error('Unexpected error getting session statistics:', error);
      throw new SessionError(
        'Ocorreu um erro inesperado ao obter as estatísticas da sessão',
        'STATS_ERROR',
        500
      );
    }
  }

  /**
   * Get every order of a session, with its items, straight from Supabase.
   * Used by the closure history, so it works for past sessions and other devices
   * (the local IndexedDB copy may have been cleared).
   *
   * @param sessionId - ID of the session
   * @returns Promise resolving to the orders sorted by order number
   */
  async getSessionOrderDetails(sessionId: string): Promise<Order[]> {
    if (!sessionId || sessionId.trim().length === 0) {
      throw new SessionError('O ID da sessão é obrigatório', 'INVALID_SESSION_ID', 400);
    }

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, order_number, session_id, total, is_complimentary, is_cancelled,
        observations, created_by, created_at, cancelled_at, cancelled_by, version,
        order_items ( id, order_id, menu_item_id, menu_item_name, quantity, unit_price, subtotal )
      `)
      .eq('session_id', sessionId)
      .order('order_number', { ascending: true });

    if (error) {
      throw new SessionError(
        `Falha ao obter os pedidos da sessão: ${error.message}`,
        'FETCH_ORDERS_FAILED',
        500
      );
    }

    return (data || []).map((o: any): Order => ({
      id: o.id,
      orderNumber: o.order_number,
      sessionId: o.session_id,
      total: Number(o.total),
      isComplimentary: o.is_complimentary,
      isCancelled: o.is_cancelled,
      observations: o.observations ?? undefined,
      createdBy: o.created_by ?? undefined,
      createdAt: new Date(o.created_at),
      cancelledAt: o.cancelled_at ? new Date(o.cancelled_at) : undefined,
      cancelledBy: o.cancelled_by ?? undefined,
      version: o.version,
      items: (o.order_items || []).map((i: any) => ({
        id: i.id,
        orderId: i.order_id,
        menuItemId: i.menu_item_id,
        menuItemName: i.menu_item_name,
        quantity: i.quantity,
        unitPrice: Number(i.unit_price),
        subtotal: Number(i.subtotal),
      })),
    }));
  }

  /**
   * Calculate expected cash for a session based on completed orders
   * 
   * @param sessionId - ID of the session
   * @returns Promise resolving to the expected cash amount
   * @private
   */
  private async calculateExpectedCash(sessionId: string): Promise<number> {
    const { data, error } = await supabase
      .from('orders')
      .select('total')
      .eq('session_id', sessionId)
      .eq('is_cancelled', false)
      .eq('is_complimentary', false);

    if (error) {
      throw new SessionError(
        `Falha ao calcular o dinheiro esperado: ${error.message}`,
        'CALC_FAILED',
        500
      );
    }

    const total = (data || []).reduce((sum, order) => sum + (order.total || 0), 0);
    return Number(total.toFixed(2)); // Round to 2 decimal places
  }

  /**
   * Map database record to Session type
   * 
   * @param data - Raw database record
   * @returns Typed Session object
   * @private
   */
  private mapToSession(data: any): Session {
    return {
      id: data.id,
      userId: data.user_id,
      startedAt: new Date(data.started_at),
      endedAt: data.ended_at ? new Date(data.ended_at) : undefined,
      expectedCash: data.expected_cash !== null ? Number(data.expected_cash) : undefined,
      actualCash: data.actual_cash !== null ? Number(data.actual_cash) : undefined,
      discrepancy: data.discrepancy !== null ? Number(data.discrepancy) : undefined,
      isActive: data.is_active,
      version: data.version,
    };
  }
}

// Export singleton instance
export const sessionService = new SessionService();

// Export for testing
export default sessionService;
