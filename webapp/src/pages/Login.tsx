/**
 * Login Page
 * 
 * Main authentication page that displays the login form.
 * Requirements:
 * - 1.1: Display login screen when webapp loads
 */

import { LoginForm } from '@/components/auth';

/**
 * Login page component
 * 
 * Provides a centered login form with branding
 */
export function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <LoginForm />
    </div>
  );
}

export default Login;
