/**
 * LoginForm Component
 * 
 * Provides user authentication interface with username/password fields,
 * validation, loading states, and error display.
 * 
 * Requirements:
 * - 1.1: Display login screen when webapp loads
 * - 1.2: Require username and password credentials
 * - 1.4: Display error message on invalid credentials
 * - 1.8: Enforce password complexity (min 8 chars, alphanumeric)
 */

import { useState, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authService, AuthenticationError } from '@/services/auth.service';

interface LoginFormProps {
  /** Callback invoked after successful authentication */
  onSuccess?: () => void;
  /** Callback invoked when authentication fails */
  onError?: (error: Error) => void;
}

/**
 * Validates username format
 * Requirements: 1.2 - Username validation
 */
function validateUsername(username: string): string | null {
  if (!username || username.trim().length === 0) {
    return 'Username is required';
  }
  if (username.length < 3) {
    return 'Username must be at least 3 characters';
  }
  return null;
}

/**
 * Validates password format
 * Requirements: 1.8 - Password complexity (min 8 chars, alphanumeric)
 */
function validatePassword(password: string): string | null {
  if (!password || password.length === 0) {
    return 'Password is required';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  // Check for alphanumeric (at least one letter and one number)
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) {
    return 'Password must contain both letters and numbers';
  }
  return null;
}

/**
 * LoginForm Component
 * 
 * Displays a form with username and password fields, validates input,
 * handles authentication via AuthService, and manages loading/error states.
 */
export function LoginForm({ onSuccess, onError }: LoginFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the intended destination from location state (set by ProtectedRoute)
  const from = (location.state as { from?: string })?.from || '/';
  
  // Form field states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Field-level validation errors
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  /**
   * Handles form submission
   * Requirements:
   * - 1.2: Submit username and password credentials
   * - 1.4: Display error on invalid credentials
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Clear previous errors
    setError(null);
    setUsernameError(null);
    setPasswordError(null);

    // Client-side validation
    const usernameValidation = validateUsername(username);
    const passwordValidation = validatePassword(password);

    if (usernameValidation || passwordValidation) {
      setUsernameError(usernameValidation);
      setPasswordError(passwordValidation);
      return;
    }

    // Attempt authentication
    setIsLoading(true);
    
    try {
      // Call auth service
      const authSession = await authService.login(username, password);
      
      // Authentication successful
      console.log('Login successful:', authSession.user.username);
      
      // Invoke success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Navigate to intended destination or home/dashboard
      navigate(from, { replace: true });
      
    } catch (err) {
      // Handle authentication error
      const errorMessage = err instanceof AuthenticationError
        ? err.message
        : 'An unexpected error occurred. Please try again.';
      
      setError(errorMessage);
      
      // Invoke error callback if provided
      if (onError && err instanceof Error) {
        onError(err);
      }
      
      console.error('Login failed:', err);
      
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles username field blur (validate on blur)
   */
  const handleUsernameBlur = () => {
    if (username) {
      setUsernameError(validateUsername(username));
    }
  };

  /**
   * Handles password field blur (validate on blur)
   */
  const handlePasswordBlur = () => {
    if (password) {
      setPasswordError(validatePassword(password));
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Papa Bolotas</h1>
        <p className="mt-2 text-sm text-gray-600">POS System Login</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Global error message */}
        {error && (
          <div 
            className="p-4 rounded-md bg-red-50 border border-red-200"
            role="alert"
            aria-live="polite"
          >
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Username field */}
        <div className="space-y-2">
          <Label htmlFor="username">
            Username
          </Label>
          <Input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              // Clear field error on change
              if (usernameError) setUsernameError(null);
            }}
            onBlur={handleUsernameBlur}
            disabled={isLoading}
            className={usernameError ? 'border-red-500 focus-visible:ring-red-500' : ''}
            aria-invalid={usernameError ? 'true' : 'false'}
            aria-describedby={usernameError ? 'username-error' : undefined}
          />
          {usernameError && (
            <p 
              id="username-error" 
              className="text-sm text-red-600"
              role="alert"
            >
              {usernameError}
            </p>
          )}
        </div>

        {/* Password field */}
        <div className="space-y-2">
          <Label htmlFor="password">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              // Clear field error on change
              if (passwordError) setPasswordError(null);
            }}
            onBlur={handlePasswordBlur}
            disabled={isLoading}
            className={passwordError ? 'border-red-500 focus-visible:ring-red-500' : ''}
            aria-invalid={passwordError ? 'true' : 'false'}
            aria-describedby={passwordError ? 'password-error' : undefined}
          />
          {passwordError && (
            <p 
              id="password-error" 
              className="text-sm text-red-600"
              role="alert"
            >
              {passwordError}
            </p>
          )}
          <p className="text-xs text-gray-500">
            Minimum 8 characters with letters and numbers
          </p>
        </div>

        {/* Submit button */}
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="inline-block animate-spin mr-2">⏳</span>
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>
    </div>
  );
}

export default LoginForm;
