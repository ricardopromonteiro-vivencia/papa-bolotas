/**
 * ProtectedRoute Component
 * 
 * Route wrapper that requires authentication to access.
 * Redirects unauthenticated users to login, preserving the intended destination
 * for post-login redirect.
 * 
 * Requirements:
 * - 1.3: Check authentication state on route access
 * - 1.5: Redirect to login if unauthenticated
 * - Persist intended destination for post-login redirect
 */

import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * ProtectedRoute Props
 */
interface ProtectedRouteProps {
  /** Child components to render if authenticated */
  children: ReactNode;
  /** Path to redirect to if unauthenticated (default: /login) */
  redirectTo?: string;
}

/**
 * ProtectedRoute Component
 * 
 * Checks authentication state and either:
 * - Renders children if user is authenticated
 * - Shows loading spinner while checking authentication
 * - Redirects to login if user is not authenticated
 * 
 * The intended destination is preserved in location state so users
 * can be redirected back after successful login.
 * 
 * Requirements:
 * - 1.3: Check authentication state on route access
 * - 1.5: Redirect to login if unauthenticated
 * 
 * @example
 * ```tsx
 * <Routes>
 *   <Route path="/login" element={<Login />} />
 *   <Route path="/orders" element={
 *     <ProtectedRoute>
 *       <OrdersPage />
 *     </ProtectedRoute>
 *   } />
 * </Routes>
 * ```
 */
export function ProtectedRoute({ 
  children, 
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  // This prevents flashing the login page while validating session
  if (isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center bg-gray-50"
        role="status"
        aria-label="Loading authentication status"
      >
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  // Preserve the intended destination in location state for post-login redirect
  if (!isAuthenticated) {
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // User is authenticated, render protected content
  return <>{children}</>;
}

export default ProtectedRoute;
