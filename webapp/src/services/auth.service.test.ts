/**
 * Unit Tests for Authentication Service
 * 
 * Tests authentication operations including login, logout, session validation,
 * and session refresh functionality.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AuthService, AuthenticationError } from './auth.service';
import { UserRole } from '@/types';
import { supabase } from '@/lib/supabase';
import type { AuthError, Session as SupabaseSession } from '@supabase/supabase-js';

// Mock the Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      refreshSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}));

describe('AuthService', () => {
  let authService: AuthService;

  // Sample test data
  const mockSupabaseSession: SupabaseSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 43200, // 12 hours from now
    expires_in: 43200,
    token_type: 'bearer',
    user: {
      id: 'user-123',
      email: 'admin@papabolotas.com',
      aud: 'authenticated',
      role: 'authenticated',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      app_metadata: {},
      user_metadata: { username: 'admin' },
    },
  };

  beforeEach(() => {
    authService = new AuthService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      // Arrange
      const username = 'admin@papabolotas.com';
      const password = 'password123';

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: {
          user: mockSupabaseSession.user,
          session: mockSupabaseSession,
        },
        error: null,
      });

      // Act
      const result = await authService.login(username, password);

      // Assert
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: username,
        password: password,
      });

      expect(result).toMatchObject({
        user: {
          id: 'user-123',
          username: 'admin@papabolotas.com',
          role: UserRole.ADMIN,
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });

      expect(result.user.createdAt).toBeInstanceOf(Date);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should throw error when username is empty', async () => {
      // Act & Assert
      await expect(
        authService.login('', 'password123')
      ).rejects.toThrow(AuthenticationError);

      await expect(
        authService.login('', 'password123')
      ).rejects.toMatchObject({
        code: 'INVALID_USERNAME',
        statusCode: 400,
      });

      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('should throw error when password is too short', async () => {
      // Act & Assert
      await expect(
        authService.login('admin@papabolotas.com', 'short')
      ).rejects.toThrow(AuthenticationError);

      await expect(
        authService.login('admin@papabolotas.com', 'short')
      ).rejects.toMatchObject({
        code: 'INVALID_PASSWORD',
        statusCode: 400,
      });

      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('should throw error with invalid credentials', async () => {
      // Arrange
      const authError: AuthError = {
        name: 'AuthApiError',
        message: 'invalid_credentials',
        status: 401,
      };

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: authError,
      });

      // Act & Assert
      await expect(
        authService.login('admin@papabolotas.com', 'wrongpassword')
      ).rejects.toThrow(AuthenticationError);

      await expect(
        authService.login('admin@papabolotas.com', 'wrongpassword')
      ).rejects.toMatchObject({
        message: 'Invalid username or password',
        statusCode: 401,
      });
    });

    it('should throw error when no session is returned', async () => {
      // Arrange
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockSupabaseSession.user, session: null },
        error: null,
      });

      // Act & Assert
      await expect(
        authService.login('admin@papabolotas.com', 'password123')
      ).rejects.toThrow(AuthenticationError);

      await expect(
        authService.login('admin@papabolotas.com', 'password123')
      ).rejects.toMatchObject({
        code: 'NO_SESSION',
        statusCode: 500,
      });
    });

    it('should handle rate limit errors', async () => {
      // Arrange
      const authError: AuthError = {
        name: 'AuthApiError',
        message: 'over_email_send_rate_limit',
        status: 429,
      };

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: authError,
      });

      // Act & Assert
      await expect(
        authService.login('admin@papabolotas.com', 'password123')
      ).rejects.toMatchObject({
        message: 'Too many requests. Please try again later',
        statusCode: 429,
      });
    });
  });

  describe('logout', () => {
    it('should successfully logout', async () => {
      // Arrange
      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: null,
      });

      // Act
      await authService.logout();

      // Assert
      expect(supabase.auth.signOut).toHaveBeenCalledOnce();
    });

    it('should throw error when logout fails', async () => {
      // Arrange
      const error = new Error('Network error');
      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: error as any,
      });

      // Act & Assert
      await expect(authService.logout()).rejects.toThrow(AuthenticationError);
      await expect(authService.logout()).rejects.toMatchObject({
        message: 'Failed to logout',
        statusCode: 500,
      });
    });
  });

  describe('validateSession', () => {
    it('should return true for valid session', async () => {
      // Arrange
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSupabaseSession },
        error: null,
      });

      // Act
      const isValid = await authService.validateSession();

      // Assert
      expect(isValid).toBe(true);
      expect(supabase.auth.getSession).toHaveBeenCalledOnce();
    });

    it('should return false when no session exists', async () => {
      // Arrange
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      // Act
      const isValid = await authService.validateSession();

      // Assert
      expect(isValid).toBe(false);
    });

    it('should return false when session validation errors', async () => {
      // Arrange
      const error = new Error('Session validation error');
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: error as any,
      });

      // Act
      const isValid = await authService.validateSession();

      // Assert
      expect(isValid).toBe(false);
    });

    it('should attempt refresh for expired session', async () => {
      // Arrange - expired session
      const expiredSession: SupabaseSession = {
        ...mockSupabaseSession,
        expires_at: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: expiredSession },
        error: null,
      });

      vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
        data: {
          user: mockSupabaseSession.user,
          session: mockSupabaseSession,
        },
        error: null,
      });

      // Act
      const isValid = await authService.validateSession();

      // Assert
      expect(isValid).toBe(true);
      expect(supabase.auth.refreshSession).toHaveBeenCalledOnce();
    });

    it('should return false when refresh fails for expired session', async () => {
      // Arrange - expired session
      const expiredSession: SupabaseSession = {
        ...mockSupabaseSession,
        expires_at: Math.floor(Date.now() / 1000) - 3600,
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: expiredSession },
        error: null,
      });

      const refreshError: AuthError = {
        name: 'AuthApiError',
        message: 'Refresh token expired',
        status: 401,
      };

      vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
        data: { user: null, session: null },
        error: refreshError,
      });

      // Act
      const isValid = await authService.validateSession();

      // Assert
      expect(isValid).toBe(false);
    });
  });

  describe('refreshSession', () => {
    it('should successfully refresh session', async () => {
      // Arrange
      const newSession: SupabaseSession = {
        ...mockSupabaseSession,
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      };

      vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
        data: {
          user: newSession.user,
          session: newSession,
        },
        error: null,
      });

      // Act
      const result = await authService.refreshSession();

      // Assert
      expect(supabase.auth.refreshSession).toHaveBeenCalledOnce();
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('should throw error when refresh fails', async () => {
      // Arrange
      const authError: AuthError = {
        name: 'AuthApiError',
        message: 'Refresh token expired',
        status: 401,
      };

      vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
        data: { user: null, session: null },
        error: authError,
      });

      // Act & Assert
      await expect(authService.refreshSession()).rejects.toThrow(AuthenticationError);
      await expect(authService.refreshSession()).rejects.toMatchObject({
        message: 'Failed to refresh session',
        statusCode: 401,
      });
    });

    it('should throw error when no session is returned', async () => {
      // Arrange
      vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
        data: { user: mockSupabaseSession.user, session: null },
        error: null,
      });

      // Act & Assert
      await expect(authService.refreshSession()).rejects.toMatchObject({
        code: 'NO_SESSION',
        statusCode: 401,
      });
    });
  });

  describe('getCurrentUser', () => {
    it('should return null when no session exists', () => {
      // Arrange
      vi.mocked(supabase.auth.getSession).mockReturnValue({
        data: { session: null },
        error: null,
      } as any);

      // Act
      const user = authService.getCurrentUser();

      // Assert
      expect(user).toBeNull();
    });

    it('should return user when session exists (legacy sync API)', () => {
      // Arrange
      vi.mocked(supabase.auth.getSession).mockReturnValue({
        data: { session: mockSupabaseSession },
        error: null,
      } as any);

      // Act
      const user = authService.getCurrentUser();

      // Assert
      expect(user).toMatchObject({
        id: 'user-123',
        username: 'admin@papabolotas.com',
        role: UserRole.ADMIN,
      });
    });

    it('should return null when getSession returns a promise (async API)', () => {
      // Arrange
      vi.mocked(supabase.auth.getSession).mockReturnValue(
        Promise.resolve({
          data: { session: mockSupabaseSession },
          error: null,
        }) as any
      );

      // Act
      const user = authService.getCurrentUser();

      // Assert
      expect(user).toBeNull();
    });
  });

  describe('onAuthStateChange', () => {
    it('should subscribe to auth state changes', () => {
      // Arrange
      const mockUnsubscribe = vi.fn();
      const mockSubscription = { unsubscribe: mockUnsubscribe };

      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: mockSubscription },
      } as any);

      const callback = vi.fn();

      // Act
      const unsubscribe = authService.onAuthStateChange(callback);

      // Assert
      expect(supabase.auth.onAuthStateChange).toHaveBeenCalledOnce();
      expect(typeof unsubscribe).toBe('function');

      // Test unsubscribe
      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalledOnce();
    });

    it('should call callback with AuthSession when user logs in', () => {
      // Arrange
      let capturedCallback: any;

      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((cb) => {
        capturedCallback = cb;
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        } as any;
      });

      const callback = vi.fn();
      authService.onAuthStateChange(callback);

      // Act - simulate login event
      capturedCallback('SIGNED_IN', mockSupabaseSession);

      // Assert
      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            id: 'user-123',
            username: 'admin@papabolotas.com',
          }),
          accessToken: 'mock-access-token',
        })
      );
    });

    it('should call callback with null when user logs out', () => {
      // Arrange
      let capturedCallback: any;

      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((cb) => {
        capturedCallback = cb;
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        } as any;
      });

      const callback = vi.fn();
      authService.onAuthStateChange(callback);

      // Act - simulate logout event
      capturedCallback('SIGNED_OUT', null);

      // Assert
      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith(null);
    });
  });

  describe('AuthenticationError', () => {
    it('should create error with all properties', () => {
      const error = new AuthenticationError('Test error', 'TEST_CODE', 400);

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('AuthenticationError');
      expect(error).toBeInstanceOf(Error);
    });
  });
});
