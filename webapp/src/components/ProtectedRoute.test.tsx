/**
 * Unit Tests for ProtectedRoute Component
 * 
 * Tests authentication checks, redirects, and destination persistence
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { authService } from '@/services/auth.service';

// Mock the auth service
vi.mock('@/services/auth.service', () => ({
  authService: {
    validateSession: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
}));

// Test component to display the current location
function LocationDisplay() {
  const location = useLocation();
  return (
    <div>
      <div data-testid="pathname">{location.pathname}</div>
      <div data-testid="state">{JSON.stringify(location.state)}</div>
    </div>
  );
}

// Protected content component
function ProtectedContent() {
  return <div data-testid="protected-content">Protected Content</div>;
}

// Login page component
function LoginPage() {
  return (
    <div>
      <div data-testid="login-page">Login Page</div>
      <LocationDisplay />
    </div>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should display loading state while validating authentication', async () => {
    // Mock validateSession to return a promise that doesn't resolve immediately
    let resolveValidation: (value: boolean) => void;
    const validationPromise = new Promise<boolean>((resolve) => {
      resolveValidation = resolve;
    });

    vi.mocked(authService.validateSession).mockReturnValue(validationPromise);
    vi.mocked(authService.onAuthStateChange).mockReturnValue(() => {});

    render(
      <MemoryRouter initialEntries={['/']}>
        <ProtectedRoute>
          <ProtectedContent />
        </ProtectedRoute>
      </MemoryRouter>
    );

    // Should show loading state
    expect(screen.getByText('Verificando autenticação...')).toBeInTheDocument();

    // Resolve the validation
    resolveValidation!(true);
  });

  it('should render protected content when user is authenticated', async () => {
    // Mock validateSession to return true (authenticated)
    vi.mocked(authService.validateSession).mockResolvedValue(true);
    vi.mocked(authService.onAuthStateChange).mockReturnValue(() => {});

    render(
      <MemoryRouter initialEntries={['/']}>
        <ProtectedRoute>
          <ProtectedContent />
        </ProtectedRoute>
      </MemoryRouter>
    );

    // Wait for authentication check to complete
    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect to login when user is not authenticated', async () => {
    // Mock validateSession to return false (not authenticated)
    vi.mocked(authService.validateSession).mockResolvedValue(false);
    vi.mocked(authService.onAuthStateChange).mockReturnValue(() => {});

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ProtectedContent />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for redirect to complete
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    // Should not render protected content
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should persist intended destination when redirecting to login', async () => {
    // Mock validateSession to return false (not authenticated)
    vi.mocked(authService.validateSession).mockResolvedValue(false);
    vi.mocked(authService.onAuthStateChange).mockReturnValue(() => {});

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <ProtectedContent />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for redirect to complete
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    // Check that the intended destination is preserved in location state
    const stateElement = screen.getByTestId('state');
    const state = JSON.parse(stateElement.textContent || '{}');
    expect(state.from).toBe('/dashboard');
  });

  it('should redirect to custom login path when specified', async () => {
    // Mock validateSession to return false (not authenticated)
    vi.mocked(authService.validateSession).mockResolvedValue(false);
    vi.mocked(authService.onAuthStateChange).mockReturnValue(() => {});

    function CustomLoginPage() {
      return <div data-testid="custom-login">Custom Login</div>;
    }

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute redirectTo="/custom-login">
                <ProtectedContent />
              </ProtectedRoute>
            }
          />
          <Route path="/custom-login" element={<CustomLoginPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for redirect to complete
    await waitFor(() => {
      expect(screen.getByTestId('custom-login')).toBeInTheDocument();
    });
  });

  it('should handle authentication state changes in real-time', async () => {
    let authStateCallback: ((session: any) => void) | null = null;

    // Mock validateSession to return false initially
    vi.mocked(authService.validateSession).mockResolvedValue(false);
    vi.mocked(authService.onAuthStateChange).mockImplementation((callback) => {
      authStateCallback = callback;
      return () => {}; // unsubscribe function
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ProtectedContent />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Should initially redirect to login
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    // Simulate user login via auth state change
    if (authStateCallback) {
      authStateCallback({ user: { id: '1', username: 'test' } } as any);
    }

    // Should now show protected content
    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  it('should handle validation errors gracefully', async () => {
    // Mock validateSession to throw an error
    vi.mocked(authService.validateSession).mockRejectedValue(
      new Error('Network error')
    );
    vi.mocked(authService.onAuthStateChange).mockReturnValue(() => {});

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ProtectedContent />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Should redirect to login after error
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    // Should log the error
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error validating authentication:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('should cleanup subscription on unmount', async () => {
    const unsubscribe = vi.fn();

    vi.mocked(authService.validateSession).mockResolvedValue(true);
    vi.mocked(authService.onAuthStateChange).mockReturnValue(unsubscribe);

    const { unmount } = render(
      <MemoryRouter initialEntries={['/']}>
        <ProtectedRoute>
          <ProtectedContent />
        </ProtectedRoute>
      </MemoryRouter>
    );

    // Wait for component to mount and authenticate
    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    // Unmount the component
    unmount();

    // Should have called the unsubscribe function
    await waitFor(() => {
      expect(unsubscribe).toHaveBeenCalled();
    });
  });
});
