/**
 * Authentication Context
 * 
 * Provides authentication state and methods throughout the application.
 * Implements automatic session refresh and state persistence.
 * 
 * Requirements:
 * - 1.5: Maintain authentication state during the entire session
 * - 1.6: Handle logout and clear authentication state
 * - 15.7: Expire sessions after 12 hours of inactivity
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { authService } from '@/services/auth.service';
import { User, AuthSession } from '@/types';

/**
 * Authentication context value interface
 */
interface AuthContextValue {
  /** Current authenticated user, null if not authenticated */
  user: User | null;
  /** Current authentication session */
  session: AuthSession | null;
  /** Whether authentication is being checked/loaded */
  isLoading: boolean;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Login with username and password */
  login: (username: string, password: string) => Promise<void>;
  /** Logout current user */
  logout: () => Promise<void>;
  /** Manually trigger session refresh */
  refreshSession: () => Promise<void>;
}

/**
 * Authentication Context
 * Provides auth state and methods to child components
 */
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Session refresh interval (11 hours - before 12 hour expiration)
 * Requirement 15.7: Sessions expire after 12 hours of inactivity
 */
const SESSION_REFRESH_INTERVAL = 11 * 60 * 60 * 1000; // 11 hours in milliseconds

/**
 * Minimum time before refresh (prevent too frequent refreshes)
 */
const MIN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Authentication Provider Props
 */
interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Authentication Provider Component
 * 
 * Manages authentication state, automatic session refresh, and provides
 * auth context to child components.
 * 
 * Requirements:
 * - 1.5: Maintain authentication state
 * - 1.6: Handle logout and clear state
 * - 15.7: Auto-refresh before 12-hour expiration
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Ref to store refresh timer
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshRef = useRef<number>(0);

  /**
   * Clear the automatic refresh timer
   */
  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  /**
   * Setup automatic session refresh
   * 
   * Requirement 15.7: Auto-refresh session before 12-hour expiration
   */
  const setupAutoRefresh = useCallback((authSession: AuthSession) => {
    // Clear any existing timer
    clearRefreshTimer();

    // Calculate time until refresh needed
    const now = Date.now();
    const expiresAt = authSession.expiresAt.getTime();
    const timeUntilExpiry = expiresAt - now;

    // Only setup refresh if session hasn't expired yet
    if (timeUntilExpiry > 0) {
      // Refresh 1 hour before expiration, or halfway if expiry is sooner
      const refreshIn = Math.min(
        SESSION_REFRESH_INTERVAL,
        Math.max(timeUntilExpiry - (60 * 60 * 1000), timeUntilExpiry / 2)
      );

      if (import.meta.env.DEV) {
        console.log('Auto-refresh scheduled in:', Math.round(refreshIn / 1000 / 60), 'minutes');
      }

      refreshTimerRef.current = setTimeout(async () => {
        try {
          await refreshSession();
        } catch (error) {
          console.error('Auto-refresh failed:', error);
          // On refresh failure, clear auth state (session expired)
          handleLogout();
        }
      }, refreshIn);
    }
  }, [clearRefreshTimer]);

  /**
   * Refresh the current session
   * 
   * Requirements:
   * - 1.6: Implement automatic session refresh
   */
  const refreshSession = useCallback(async () => {
    // Prevent too frequent refreshes
    const now = Date.now();
    if (now - lastRefreshRef.current < MIN_REFRESH_INTERVAL) {
      if (import.meta.env.DEV) {
        console.log('Skipping refresh - too soon since last refresh');
      }
      return;
    }

    try {
      if (import.meta.env.DEV) {
        console.log('Refreshing session...');
      }

      const newSession = await authService.refreshSession();
      
      setSession(newSession);
      setUser(newSession.user);
      lastRefreshRef.current = now;

      // Setup next auto-refresh
      setupAutoRefresh(newSession);

      if (import.meta.env.DEV) {
        console.log('Session refreshed successfully');
      }
    } catch (error) {
      console.error('Failed to refresh session:', error);
      // Clear auth state on refresh failure
      handleLogout();
      throw error;
    }
  }, [setupAutoRefresh]);

  /**
   * Login with username and password
   * 
   * Requirements:
   * - 1.5: Authenticate user and maintain state
   */
  const login = useCallback(async (username: string, password: string) => {
    try {
      setIsLoading(true);
      
      const authSession = await authService.login(username, password);
      
      setSession(authSession);
      setUser(authSession.user);
      lastRefreshRef.current = Date.now();

      // Setup auto-refresh for new session
      setupAutoRefresh(authSession);

      if (import.meta.env.DEV) {
        console.log('Login successful, auth state updated');
      }
    } catch (error) {
      // Clear any partial state on login failure
      setSession(null);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [setupAutoRefresh]);

  /**
   * Internal logout handler (without async operations)
   */
  const handleLogout = useCallback(() => {
    // Clear refresh timer
    clearRefreshTimer();
    
    // Clear auth state
    setSession(null);
    setUser(null);
    lastRefreshRef.current = 0;

    if (import.meta.env.DEV) {
      console.log('Auth state cleared');
    }
  }, [clearRefreshTimer]);

  /**
   * Logout the current user
   * 
   * Requirements:
   * - 1.6: Clear authentication state on logout
   */
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Call auth service to logout from Supabase
      await authService.logout();
      
      // Clear local state
      handleLogout();

      if (import.meta.env.DEV) {
        console.log('Logout successful');
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Clear state anyway, even if API call fails
      handleLogout();
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [handleLogout]);

  /**
   * Initialize authentication state on mount
   * 
   * Requirements:
   * - 1.5: Maintain authentication state (restore from storage)
   */
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Validate current session
        const isValid = await authService.validateSession();

        if (!isMounted) return;

        if (isValid) {
          // Get current user (may return null if async)
          const currentUser = authService.getCurrentUser();
          
          if (currentUser) {
            setUser(currentUser);
            
            // Create a session object (we don't have full session details from getCurrentUser)
            // This will be updated on next refresh
            const mockSession: AuthSession = {
              user: currentUser,
              accessToken: '', // Will be refreshed
              refreshToken: '',
              expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
            };
            
            setSession(mockSession);
            
            // Setup auto-refresh
            setupAutoRefresh(mockSession);

            if (import.meta.env.DEV) {
              console.log('Restored authentication state');
            }
          }
        } else {
          // No valid session
          if (import.meta.env.DEV) {
            console.log('No valid session found');
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Subscribe to auth state changes from Supabase
    const unsubscribe = authService.onAuthStateChange((authSession) => {
      if (!isMounted) return;

      if (authSession) {
        setSession(authSession);
        setUser(authSession.user);
        lastRefreshRef.current = Date.now();
        setupAutoRefresh(authSession);

        if (import.meta.env.DEV) {
          console.log('Auth state changed: user logged in');
        }
      } else {
        handleLogout();

        if (import.meta.env.DEV) {
          console.log('Auth state changed: user logged out');
        }
      }
    });

    // Cleanup function
    return () => {
      isMounted = false;
      unsubscribe();
      clearRefreshTimer();
    };
  }, [setupAutoRefresh, handleLogout, clearRefreshTimer]);

  /**
   * Cleanup refresh timer on unmount
   */
  useEffect(() => {
    return () => {
      clearRefreshTimer();
    };
  }, [clearRefreshTimer]);

  // Context value
  const value: AuthContextValue = {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access authentication context
 * 
 * Must be used within an AuthProvider.
 * 
 * @returns Authentication context value
 * @throws Error if used outside AuthProvider
 */
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  
  return context;
}

// Export context for testing purposes
export { AuthContext };
