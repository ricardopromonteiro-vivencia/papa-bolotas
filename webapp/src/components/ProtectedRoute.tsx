/**
 * Protected Route Component
 * 
 * A route wrapper that checks authentication state before rendering children.
 * Redirects to login if unauthenticated and persists the intended destination
 * for post-login redirect.
 * 
 * Requirements:
 * - 1.3: Check authentication state on route access
 * - 1.5: Redirect to login if unauthenticated, maintain authentication state
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '@/services/auth.service';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

/**
 * ProtectedRoute Component
 * 
 * Wraps protected routes to ensure only authenticated users can access them.
 * If the user is not authenticated, they are redirected to the login page
 * with their intended destination preserved in the location state.
 * 
 * @example
 * ```tsx
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 * ```
 * 
 * @example
 * ```tsx
 * <ProtectedRoute redirectTo="/custom-login">
 *   <AdminPanel />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({ 
  children, 
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const location = useLocation();
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const validateAuth = async () => {
      try {
        // Check if the user has a valid authentication session
        const isValid = await authService.validateSession();
        
        if (isMounted) {
          setIsAuthenticated(isValid);
          setIsValidating(false);
        }
      } catch (error) {
        console.error('Error validating authentication:', error);
        
        if (isMounted) {
          setIsAuthenticated(false);
          setIsValidating(false);
        }
      }
    };

    validateAuth();

    // Subscribe to auth state changes for real-time updates
    const unsubscribe = authService.onAuthStateChange((session) => {
      if (isMounted) {
        setIsAuthenticated(session !== null);
      }
    });

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Show loading state while validating authentication
  if (isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">A verificar autenticação...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login with the intended destination
  if (!isAuthenticated) {
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
}

export default ProtectedRoute;
