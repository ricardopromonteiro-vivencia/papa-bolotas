/**
 * AuthContext Tests
 * 
 * Tests for authentication context, provider, and hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuthContext } from './AuthContext';
import { authService } from '@/services/auth.service';
import type { AuthSession, User, UserRole } from '@/types';

// Mock the auth service
vi.mock('@/services/auth.service', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    getCurrentSession: vi.fn(),
    validateSession: vi.fn(),
    refreshSession: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
}));

describe('AuthContext', () => {
  const mockUser: User = {
    id: 'user-123',
    username: 'testuser',
    role: 'admin' as UserRole,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockSession: AuthSession = {
    user: mockUser,
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    vi.mocked(authService.validateSession).mockResolvedValue(false);
    vi.mocked(authService.getCurrentUser).mockReturnValue(null);
    vi.mocked(authService.getCurrentSession).mockResolvedValue(null);
    vi.mocked(authService.onAuthStateChange).mockReturnValue(() => {});
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('useAuthContext', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuthContext());
      }).toThrow('useAuthContext must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });

    it('should provide auth context when used within AuthProvider', async () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current).toBeDefined();
        expect(result.current.user).toBeNull();
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isAuthenticated).toBe(false);
      });
    });
  });

  describe('AuthProvider initialization', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it('should validate session on mount', async () => {
      renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(authService.validateSession).toHaveBeenCalledTimes(1);
      });
    });

    it('should restore user state if session is valid', async () => {
      vi.mocked(authService.validateSession).mockResolvedValue(true);
      vi.mocked(authService.getCurrentSession).mockResolvedValue(mockSession);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isAuthenticated).toBe(true);
      });
    });

    it('should not restore user if session is invalid', async () => {
      vi.mocked(authService.validateSession).mockResolvedValue(false);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
      });
    });
  });

  describe('login', () => {
    it('should login successfully and update state', async () => {
      vi.mocked(authService.login).mockResolvedValue(mockSession);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.login('testuser', 'password123');
      });

      expect(authService.login).toHaveBeenCalledWith('testuser', 'password123');
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle login failure and clear state', async () => {
      const loginError = new Error('Invalid credentials');
      vi.mocked(authService.login).mockRejectedValue(loginError);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(async () => {
        await act(async () => {
          await result.current.login('testuser', 'wrongpassword');
        });
      }).rejects.toThrow('Invalid credentials');

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should set loading state during login', async () => {
      vi.mocked(authService.login).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockSession), 100))
      );

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.login('testuser', 'password123');
      });

      // Should be loading immediately after calling login
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isAuthenticated).toBe(true);
      });
    });
  });

  describe('logout', () => {
    it('should logout successfully and clear state', async () => {
      vi.mocked(authService.login).mockResolvedValue(mockSession);
      vi.mocked(authService.logout).mockResolvedValue();

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // First login
      await act(async () => {
        await result.current.login('testuser', 'password123');
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Then logout
      await act(async () => {
        await result.current.logout();
      });

      expect(authService.logout).toHaveBeenCalledTimes(1);
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should clear state even if logout API call fails', async () => {
      vi.mocked(authService.login).mockResolvedValue(mockSession);
      vi.mocked(authService.logout).mockRejectedValue(new Error('Logout failed'));

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // First login
      await act(async () => {
        await result.current.login('testuser', 'password123');
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Then logout (should clear state despite error)
      let thrownError: Error | null = null;
      try {
        await act(async () => {
          await result.current.logout();
        });
      } catch (e) {
        thrownError = e as Error;
      }

      expect(thrownError).toBeTruthy();
      expect(thrownError?.message).toBe('Logout failed');

      // State should still be cleared
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('refreshSession', () => {
    it('should refresh session successfully', async () => {
      vi.mocked(authService.login).mockResolvedValue(mockSession);
      
      const newSession: AuthSession = {
        ...mockSession,
        accessToken: 'new-access-token',
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
      };
      vi.mocked(authService.refreshSession).mockResolvedValue(newSession);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Login first
      await act(async () => {
        await result.current.login('testuser', 'password123');
      });

      // Advance time past MIN_REFRESH_INTERVAL (5 minutes) before refreshing
      vi.useFakeTimers();
      vi.advanceTimersByTime(6 * 60 * 1000); // 6 minutes

      // Refresh session
      await act(async () => {
        await result.current.refreshSession();
      });

      expect(authService.refreshSession).toHaveBeenCalledTimes(1);
      expect(result.current.session?.accessToken).toBe('new-access-token');
      
      vi.useRealTimers();
    });

    it('should clear state if refresh fails', async () => {
      vi.mocked(authService.login).mockResolvedValue(mockSession);
      vi.mocked(authService.refreshSession).mockRejectedValue(new Error('Refresh failed'));

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Login first
      await act(async () => {
        await result.current.login('testuser', 'password123');
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Advance time past MIN_REFRESH_INTERVAL (5 minutes) before refreshing
      vi.useFakeTimers();
      vi.advanceTimersByTime(6 * 60 * 1000); // 6 minutes

      // Refresh should fail and clear state
      let thrownError: Error | null = null;
      try {
        await act(async () => {
          await result.current.refreshSession();
        });
      } catch (e) {
        thrownError = e as Error;
      }

      expect(thrownError).toBeTruthy();
      expect(thrownError?.message).toBe('Refresh failed');

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      
      vi.useRealTimers();
    });

    it('should prevent too frequent refreshes', async () => {
      vi.mocked(authService.login).mockResolvedValue(mockSession);
      vi.mocked(authService.refreshSession).mockResolvedValue(mockSession);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Login first
      await act(async () => {
        await result.current.login('testuser', 'password123');
      });

      // Advance time past MIN_REFRESH_INTERVAL (5 minutes) before first refresh
      vi.useFakeTimers();
      vi.advanceTimersByTime(6 * 60 * 1000); // 6 minutes

      // First refresh - should now proceed since 6 min > 5 min
      await act(async () => {
        await result.current.refreshSession();
      });

      expect(authService.refreshSession).toHaveBeenCalledTimes(1);

      // Immediate second refresh should be skipped (within 5 min of first)
      await act(async () => {
        await result.current.refreshSession();
      });

      // Should still be 1 call (second was skipped)
      expect(authService.refreshSession).toHaveBeenCalledTimes(1);
      
      vi.useRealTimers();
    });
  });

  describe('auto-refresh', () => {
    it('should schedule auto-refresh after login', async () => {
      vi.mocked(authService.login).mockResolvedValue(mockSession);
      vi.mocked(authService.refreshSession).mockResolvedValue(mockSession);
      vi.mocked(authService.validateSession).mockResolvedValue(false);
      vi.mocked(authService.onAuthStateChange).mockReturnValue(() => {});

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      // Wait for initial load to complete with real timers
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Login with real timers
      await act(async () => {
        await result.current.login('testuser', 'password123');
      });

      // Now switch to fake timers to control the auto-refresh timer
      vi.useFakeTimers();

      // Advance time to trigger the auto-refresh (scheduled at ~11 hours)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(11 * 60 * 60 * 1000);
      });

      expect(authService.refreshSession).toHaveBeenCalled();
      
      vi.useRealTimers();
    });

    it('should clear auto-refresh timer on logout', async () => {
      vi.mocked(authService.login).mockResolvedValue(mockSession);
      vi.mocked(authService.logout).mockResolvedValue();
      vi.mocked(authService.refreshSession).mockResolvedValue(mockSession);
      vi.mocked(authService.validateSession).mockResolvedValue(false);
      vi.mocked(authService.onAuthStateChange).mockReturnValue(() => {});

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      // Wait for initial load to complete with real timers
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Login with real timers
      await act(async () => {
        await result.current.login('testuser', 'password123');
      });

      // Logout with real timers
      await act(async () => {
        await result.current.logout();
      });

      // Now switch to fake timers and advance time
      // The auto-refresh timer should have been cleared on logout
      vi.useFakeTimers();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(11 * 60 * 60 * 1000);
      });

      expect(authService.refreshSession).not.toHaveBeenCalled();
      
      vi.useRealTimers();
    });
  });

  describe('auth state change listener', () => {
    it('should subscribe to auth state changes on mount', async () => {
      renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(authService.onAuthStateChange).toHaveBeenCalledTimes(1);
      });
    });

    it('should update state when auth state changes', async () => {
      let stateChangeCallback: ((session: AuthSession | null) => void) | null = null;

      vi.mocked(authService.onAuthStateChange).mockImplementation((callback) => {
        stateChangeCallback = callback;
        return () => {};
      });

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Simulate auth state change (user logged in)
      act(() => {
        if (stateChangeCallback) {
          stateChangeCallback(mockSession);
        }
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isAuthenticated).toBe(true);
      });
    });

    it('should clear state when auth state changes to null', async () => {
      let stateChangeCallback: ((session: AuthSession | null) => void) | null = null;

      vi.mocked(authService.onAuthStateChange).mockImplementation((callback) => {
        stateChangeCallback = callback;
        return () => {};
      });

      vi.mocked(authService.login).mockResolvedValue(mockSession);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Login first
      await act(async () => {
        await result.current.login('testuser', 'password123');
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Simulate auth state change (user logged out)
      act(() => {
        if (stateChangeCallback) {
          stateChangeCallback(null);
        }
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
      });
    });
  });
});
