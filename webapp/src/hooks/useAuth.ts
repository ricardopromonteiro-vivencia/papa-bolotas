/**
 * useAuth Hook
 * 
 * Convenience hook for accessing authentication context.
 * Re-exports the useAuthContext hook with a shorter, more conventional name.
 * 
 * Requirements:
 * - 1.5: Provide easy access to authentication state
 * - 1.6: Enable components to interact with auth system
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isAuthenticated, login, logout } = useAuth();
 *   
 *   if (!isAuthenticated) {
 *     return <LoginPrompt />;
 *   }
 *   
 *   return <div>Welcome {user.username}</div>;
 * }
 * ```
 */

export { useAuthContext as useAuth } from '@/contexts/AuthContext';
