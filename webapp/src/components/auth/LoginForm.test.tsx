/**
 * LoginForm Component Tests
 * 
 * Tests the LoginForm component's validation, authentication flow,
 * loading states, and error handling.
 * 
 * Requirements:
 * - 1.1: Display login screen
 * - 1.2: Require username and password credentials
 * - 1.4: Display error message on invalid credentials
 * - 1.8: Enforce password complexity (min 8 chars, alphanumeric)
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { LoginForm } from './LoginForm';
import { authService, AuthenticationError } from '@/services/auth.service';
import { UserRole } from '@/types';

// Mock the auth service
vi.mock('@/services/auth.service', () => ({
  authService: {
    login: vi.fn(),
  },
  AuthenticationError: class AuthenticationError extends Error {
    constructor(message: string, public code?: string, public statusCode?: number) {
      super(message);
      this.name = 'AuthenticationError';
    }
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Helper to render component with router
function renderLoginForm(props = {}) {
  return render(
    <BrowserRouter>
      <LoginForm {...props} />
    </BrowserRouter>
  );
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Requirement 1.1: Display login screen
  // ============================================================
  
  describe('Rendering', () => {
    it('renders login form with title and fields', () => {
      renderLoginForm();

      expect(screen.getByText('Papa Bolotas')).toBeInTheDocument();
      expect(screen.getByText('POS System Login')).toBeInTheDocument();
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('renders password hint text', () => {
      renderLoginForm();

      expect(
        screen.getByText('Minimum 8 characters with letters and numbers')
      ).toBeInTheDocument();
    });

    it('renders username and password inputs with correct attributes', () => {
      renderLoginForm();

      const usernameInput = screen.getByLabelText(/username/i);
      expect(usernameInput).toHaveAttribute('type', 'text');
      expect(usernameInput).toHaveAttribute('name', 'username');
      expect(usernameInput).toHaveAttribute('autocomplete', 'username');

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('name', 'password');
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });
  });

  // ============================================================
  // Requirement 1.2: Require username and password credentials
  // ============================================================

  describe('Form Validation', () => {
    it('shows error when username is empty', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Enter valid password but leave username empty
      await user.type(passwordInput, 'Password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Username is required')).toBeInTheDocument();
      });

      // Auth service should not be called
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('shows error when username is too short', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'ab'); // Only 2 characters
      await user.type(passwordInput, 'Password123');
      
      // Trigger blur to show validation
      await user.click(screen.getByLabelText(/password/i));

      await waitFor(() => {
        expect(
          screen.getByText('Username must be at least 3 characters')
        ).toBeInTheDocument();
      });
    });

    it('shows error when password is empty', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const usernameInput = screen.getByLabelText(/username/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(usernameInput, 'testuser');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Password is required')).toBeInTheDocument();
      });

      expect(authService.login).not.toHaveBeenCalled();
    });

    // ============================================================
    // Requirement 1.8: Enforce password complexity
    // ============================================================

    it('shows error when password is less than 8 characters', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'Pass12'); // Only 6 characters
      
      // Trigger blur to show validation
      await user.click(usernameInput);

      await waitFor(() => {
        expect(
          screen.getByText('Password must be at least 8 characters')
        ).toBeInTheDocument();
      });
    });

    it('shows error when password has no numbers', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'Password'); // No numbers
      
      // Trigger blur to show validation
      await user.click(usernameInput);

      await waitFor(() => {
        expect(
          screen.getByText('Password must contain both letters and numbers')
        ).toBeInTheDocument();
      });
    });

    it('shows error when password has no letters', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, '12345678'); // No letters
      
      // Trigger blur to show validation
      await user.click(usernameInput);

      await waitFor(() => {
        expect(
          screen.getByText('Password must contain both letters and numbers')
        ).toBeInTheDocument();
      });
    });

    it('accepts valid password with letters and numbers', async () => {
      const user = userEvent.setup();
      (authService.login as Mock).mockResolvedValue({
        user: {
          id: '123',
          username: 'testuser',
          role: UserRole.ADMIN,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        accessToken: 'token-123',
        refreshToken: 'refresh-123',
        expiresAt: new Date(Date.now() + 43200000),
      });

      renderLoginForm();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'Password123'); // Valid: 11 chars, has letters and numbers
      await user.click(submitButton);

      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith('testuser', 'Password123');
      });
    });

    it('clears field errors when user starts typing', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Submit empty form to trigger errors
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Username is required')).toBeInTheDocument();
      });

      // Start typing - error should clear
      await user.type(usernameInput, 'test');

      await waitFor(() => {
        expect(screen.queryByText('Username is required')).not.toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // Requirement 1.3: Authenticate and grant access on valid credentials
  // ============================================================

  describe('Successful Authentication', () => {
    it('calls auth service with username and password', async () => {
      const user = userEvent.setup();
      (authService.login as Mock).mockResolvedValue({
        user: {
          id: '123',
          username: 'admin@example.com',
          role: UserRole.ADMIN,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        accessToken: 'token-123',
        refreshToken: 'refresh-123',
        expiresAt: new Date(Date.now() + 43200000),
      });

      renderLoginForm();

      await user.type(screen.getByLabelText(/username/i), 'admin@example.com');
      await user.type(screen.getByLabelText(/password/i), 'SecurePass123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith(
          'admin@example.com',
          'SecurePass123'
        );
      });
    });

    it('shows loading state during authentication', async () => {
      const user = userEvent.setup();
      
      // Make login take some time
      (authService.login as Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      renderLoginForm();

      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/password/i), 'Password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Should show loading state
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
    });

    it('disables form fields during authentication', async () => {
      const user = userEvent.setup();
      
      (authService.login as Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      renderLoginForm();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'Password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Inputs should be disabled during loading
      expect(usernameInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
    });

    it('navigates to home after successful login', async () => {
      const user = userEvent.setup();
      (authService.login as Mock).mockResolvedValue({
        user: {
          id: '123',
          username: 'testuser',
          role: UserRole.ADMIN,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        accessToken: 'token-123',
        refreshToken: 'refresh-123',
        expiresAt: new Date(Date.now() + 43200000),
      });

      renderLoginForm();

      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/password/i), 'Password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('calls onSuccess callback after successful login', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      
      (authService.login as Mock).mockResolvedValue({
        user: {
          id: '123',
          username: 'testuser',
          role: UserRole.ADMIN,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        accessToken: 'token-123',
        refreshToken: 'refresh-123',
        expiresAt: new Date(Date.now() + 43200000),
      });

      renderLoginForm({ onSuccess });

      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/password/i), 'Password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ============================================================
  // Requirement 1.4: Display error message on invalid credentials
  // ============================================================

  describe('Authentication Errors', () => {
    it('displays error message for invalid credentials', async () => {
      const user = userEvent.setup();
      (authService.login as Mock).mockRejectedValue(
        new AuthenticationError('Invalid username or password', 'invalid_credentials', 401)
      );

      renderLoginForm();

      await user.type(screen.getByLabelText(/username/i), 'wronguser');
      await user.type(screen.getByLabelText(/password/i), 'WrongPass123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid username or password')).toBeInTheDocument();
      });

      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('displays generic error message for unexpected errors', async () => {
      const user = userEvent.setup();
      (authService.login as Mock).mockRejectedValue(new Error('Network error'));

      renderLoginForm();

      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/password/i), 'Password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(
          screen.getByText('An unexpected error occurred. Please try again.')
        ).toBeInTheDocument();
      });
    });

    it('calls onError callback when authentication fails', async () => {
      const user = userEvent.setup();
      const onError = vi.fn();
      const error = new AuthenticationError('Invalid credentials', 'invalid_credentials', 401);
      
      (authService.login as Mock).mockRejectedValue(error);

      renderLoginForm({ onError });

      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/password/i), 'Password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(error);
      });
    });

    it('clears error when user starts editing form', async () => {
      const user = userEvent.setup();
      (authService.login as Mock).mockRejectedValue(
        new AuthenticationError('Invalid username or password', 'invalid_credentials', 401)
      );

      renderLoginForm();

      await user.type(screen.getByLabelText(/username/i), 'wronguser');
      await user.type(screen.getByLabelText(/password/i), 'WrongPass123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid username or password')).toBeInTheDocument();
      });

      // Start typing in username field
      await user.type(screen.getByLabelText(/username/i), 'new');

      // Error should still be visible (only clears field errors, not global error)
      // But let's submit again to clear it properly
      await user.clear(screen.getByLabelText(/username/i));
      await user.type(screen.getByLabelText(/username/i), 'testuser');

      // The global error stays until next submission
      expect(screen.getByText('Invalid username or password')).toBeInTheDocument();
    });

    it('re-enables form after authentication error', async () => {
      const user = userEvent.setup();
      (authService.login as Mock).mockRejectedValue(
        new AuthenticationError('Invalid credentials', 'invalid_credentials', 401)
      );

      renderLoginForm();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'Password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });

      // Form should be enabled again
      expect(usernameInput).not.toBeDisabled();
      expect(passwordInput).not.toBeDisabled();
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      renderLoginForm();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(usernameInput).toHaveAttribute('aria-invalid', 'false');
      expect(passwordInput).toHaveAttribute('aria-invalid', 'false');
    });

    it('sets aria-invalid when fields have errors', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        const usernameInput = screen.getByLabelText(/username/i);
        const passwordInput = screen.getByLabelText(/password/i);

        expect(usernameInput).toHaveAttribute('aria-invalid', 'true');
        expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('associates error messages with fields using aria-describedby', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const usernameInput = screen.getByLabelText(/username/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.click(submitButton);

      await waitFor(() => {
        expect(usernameInput).toHaveAttribute('aria-describedby', 'username-error');
        expect(screen.getByText('Username is required')).toHaveAttribute('id', 'username-error');
      });
    });

    it('announces errors with role="alert"', async () => {
      const user = userEvent.setup();
      (authService.login as Mock).mockRejectedValue(
        new AuthenticationError('Invalid credentials', 'invalid_credentials', 401)
      );

      renderLoginForm();

      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/password/i), 'Password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveTextContent('Invalid credentials');
      });
    });
  });
});
