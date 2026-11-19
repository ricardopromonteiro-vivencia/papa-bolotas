/**
 * Authentication Service
 * 
 * Handles all authentication operations including login, logout, session validation,
 * and session refresh for the Papa Bolotas POS system.
 * 
 * Requirements:
 * - 1.2: Require username and password credentials
 * - 1.3: Authenticate users and grant access on valid credentials
 * - 1.4: Display error messages on invalid credentials
 * - 1.6: Maintain authentication state and handle logout
 */

import { supabase } from '@/lib/supabase';
import { User, AuthSession, UserRole } from '@/types';
import type { Session as SupabaseSession, AuthError } from '@supabase/supabase-js';

/**
 * Custom error class for authentication failures
 */
export class AuthenticationError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Maps Supabase session to application AuthSession format
 */
function mapSupabaseSession(session: SupabaseSession): AuthSession {
  return {
    user: {
      id: session.user.id,
      username: session.user.email || session.user.user_metadata.username || 'unknown',
      role: UserRole.ADMIN, // All users are admins in MVP
      createdAt: new Date(session.user.created_at),
      updatedAt: new Date(session.user.updated_at || session.user.created_at),
    },
    accessToken: session.access_token,
    refreshToken: session.refresh_token || '',
    expiresAt: new Date(session.expires_at ? session.expires_at * 1000 : Date.now() + 43200000), // 12 hours default
  };
}

/**
 * Authentication Service
 * 
 * Provides methods for user authentication and session management.
 * Uses Supabase Auth as the backend provider.
 */
export class AuthService {
  /**
   * Login with username and password
   * 
   * Requirements:
   * - 1.2: Accept username and password credentials
   * - 1.3: Authenticate and grant access on valid credentials
   * - 1.4: Return error on invalid credentials
   * 
   * @param username - User's username (email format expected by Supabase)
   * @param password - User's password
   * @returns Promise resolving to AuthSession on success
   * @throws AuthenticationError on failure
   */
  async login(username: string, password: string): Promise<AuthSession> {
    try {
      // Validate inputs
      if (!username || username.trim().length === 0) {
        throw new AuthenticationError(
          'Username is required',
          'INVALID_USERNAME',
          400
        );
      }

      if (!password || password.length < 8) {
        throw new AuthenticationError(
          'Password must be at least 8 characters',
          'INVALID_PASSWORD',
          400
        );
      }

      // Attempt sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: username, // Supabase uses email, but we call it username in the UI
        password: password,
      });

      // Handle authentication errors
      if (error) {
        throw this.mapAuthError(error);
      }

      // Verify we received a session
      if (!data.session) {
        throw new AuthenticationError(
          'Authentication failed - no session returned',
          'NO_SESSION',
          500
        );
      }

      // Map Supabase session to our AuthSession format
      const authSession = mapSupabaseSession(data.session);

      // Log successful authentication (for audit trail)
      if (import.meta.env.DEV) {
        console.log('User authenticated successfully:', {
          userId: authSession.user.id,
          username: authSession.user.username,
          expiresAt: authSession.expiresAt,
        });
      }

      return authSession;

    } catch (error) {
      // Re-throw AuthenticationError as-is
      if (error instanceof AuthenticationError) {
        throw error;
      }

      // Wrap unknown errors
      console.error('Unexpected error during login:', error);
      throw new AuthenticationError(
        'An unexpected error occurred during login',
        'UNKNOWN_ERROR',
        500
      );
    }
  }

  /**
   * Logout the current user
   * 
   * Requirements:
   * - 1.6: Clear authentication state on logout
   * 
   * @returns Promise that resolves when logout is complete
   * @throws AuthenticationError if logout fails
   */
  async logout(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw new AuthenticationError(
          'Failed to logout',
          error.message,
          500
        );
      }

      // Log successful logout
      if (import.meta.env.DEV) {
        console.log('User logged out successfully');
      }

    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }

      console.error('Unexpected error during logout:', error);
      throw new AuthenticationError(
        'An unexpected error occurred during logout',
        'LOGOUT_ERROR',
        500
      );
    }
  }

  /**
   * Get the currently authenticated user
   * 
   * Requirements:
   * - 1.6: Maintain authentication state
   * 
   * @returns Current user or null if not authenticated
   */
  getCurrentUser(): User | null {
    try {
      // Get current session synchronously from local storage
      const session = supabase.auth.getSession();

      // Note: getSession() returns a promise in newer versions
      // We'll handle both sync and async cases
      if (session instanceof Promise) {
        // If it's async, we can't return synchronously
        // The caller should use validateSession() instead
        console.warn('getCurrentUser: session is async, returning null');
        return null;
      }

      // Session is available synchronously (older API or cached)
      const supabaseSession = (session as any)?.data?.session;
      
      if (!supabaseSession) {
        return null;
      }

      return {
        id: supabaseSession.user.id,
        username: supabaseSession.user.email || supabaseSession.user.user_metadata.username || 'unknown',
        role: UserRole.ADMIN,
        createdAt: new Date(supabaseSession.user.created_at),
        updatedAt: new Date(supabaseSession.user.updated_at || supabaseSession.user.created_at),
      };

    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Validate the current session
   * 
   * Checks if the user has a valid, non-expired authentication session.
   * This method performs an async check and should be used on route guards
   * and when session validation is critical.
   * 
   * Requirements:
   * - 1.6: Maintain and validate authentication state
   * 
   * @returns Promise resolving to true if session is valid, false otherwise
   */
  async validateSession(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error validating session:', error);
        return false;
      }

      // Check if session exists and is not expired
      if (!session) {
        return false;
      }

      // Check expiration time
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const isExpired = expiresAt < Date.now();

      if (isExpired) {
        if (import.meta.env.DEV) {
          console.log('Session expired, attempting refresh');
        }
        // Attempt to refresh the session
        try {
          await this.refreshSession();
          return true;
        } catch (refreshError) {
          console.error('Failed to refresh expired session:', refreshError);
          return false;
        }
      }

      return true;

    } catch (error) {
      console.error('Unexpected error validating session:', error);
      return false;
    }
  }

  /**
   * Refresh the current authentication session
   * 
   * Attempts to obtain a new access token using the refresh token.
   * Supabase handles this automatically, but this method provides
   * explicit control for manual refresh scenarios.
   * 
   * Requirements:
   * - 1.6: Implement session refresh
   * 
   * @returns Promise resolving to new AuthSession
   * @throws AuthenticationError if refresh fails
   */
  async refreshSession(): Promise<AuthSession> {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        throw new AuthenticationError(
          'Failed to refresh session',
          error.message,
          401
        );
      }

      if (!data.session) {
        throw new AuthenticationError(
          'Session refresh failed - no session returned',
          'NO_SESSION',
          401
        );
      }

      const authSession = mapSupabaseSession(data.session);

      if (import.meta.env.DEV) {
        console.log('Session refreshed successfully:', {
          userId: authSession.user.id,
          expiresAt: authSession.expiresAt,
        });
      }

      return authSession;

    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }

      console.error('Unexpected error refreshing session:', error);
      throw new AuthenticationError(
        'An unexpected error occurred while refreshing session',
        'REFRESH_ERROR',
        500
      );
    }
  }

  /**
   * Subscribe to authentication state changes
   * 
   * Allows components to react to login/logout events
   * 
   * @param callback - Function called when auth state changes
   * @returns Unsubscribe function
   */
  onAuthStateChange(
    callback: (session: AuthSession | null) => void
  ): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          callback(mapSupabaseSession(session));
        } else {
          callback(null);
        }
      }
    );

    // Return cleanup function
    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Map Supabase AuthError to our AuthenticationError
   * 
   * @param error - Supabase auth error
   * @returns Mapped AuthenticationError with user-friendly message
   */
  private mapAuthError(error: AuthError): AuthenticationError {
    // Map common Supabase error codes to user-friendly messages
    const errorMap: Record<string, { message: string; statusCode: number }> = {
      'invalid_credentials': {
        message: 'Invalid username or password',
        statusCode: 401,
      },
      'email_not_confirmed': {
        message: 'Email not confirmed',
        statusCode: 401,
      },
      'user_not_found': {
        message: 'User not found',
        statusCode: 404,
      },
      'weak_password': {
        message: 'Password is too weak',
        statusCode: 400,
      },
      'over_email_send_rate_limit': {
        message: 'Too many requests. Please try again later',
        statusCode: 429,
      },
    };

    const mapped = errorMap[error.message] || errorMap[error.name];

    if (mapped) {
      return new AuthenticationError(
        mapped.message,
        error.message || error.name,
        mapped.statusCode
      );
    }

    // Default error message
    return new AuthenticationError(
      error.message || 'Authentication failed',
      error.name || 'AUTH_ERROR',
      error.status || 500
    );
  }
}

// Export singleton instance
export const authService = new AuthService();

// Export for testing
export default authService;
