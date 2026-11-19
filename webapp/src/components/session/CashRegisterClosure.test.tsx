/**
 * Tests for CashRegisterClosure Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CashRegisterClosure } from './CashRegisterClosure';
import { sessionService } from '@/services/session.service';
import type { SalesReport } from '@/types';

// Mock the session service
vi.mock('@/services/session.service', () => ({
  sessionService: {
    getSessionStatistics: vi.fn(),
    endSession: vi.fn(),
  },
}));

describe('CashRegisterClosure', () => {
  const mockSessionId = 'test-session-123';
  const mockStatistics: SalesReport = {
    sessionId: mockSessionId,
    sessionStart: new Date('2024-01-01T10:00:00Z'),
    sessionEnd: undefined,
    totalRevenue: 150.50,
    completedOrders: 10,
    complimentaryOrders: 2,
    cancelledOrders: 1,
    itemsSold: [
      { itemName: 'Sandes Leitão', quantity: 5, subtotal: 75.00 },
      { itemName: 'Coca-Cola', quantity: 10, subtotal: 75.50 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(mockStatistics);
  });

  it('displays session statistics on load', async () => {
    render(<CashRegisterClosure sessionId={mockSessionId} />);

    await waitFor(() => {
      expect(screen.getByText('Completed Orders')).toBeInTheDocument();
      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    });

    // Check that statistics are displayed
    const completedOrdersValue = screen.getByText('10');
    expect(completedOrdersValue).toBeInTheDocument();

    expect(sessionService.getSessionStatistics).toHaveBeenCalledWith(mockSessionId);
  });

  it('calculates discrepancy correctly when actual cash matches expected', async () => {
    const user = userEvent.setup();
    render(<CashRegisterClosure sessionId={mockSessionId} />);

    await waitFor(() => {
      expect(screen.getByText('Expected Cash')).toBeInTheDocument();
    });

    const actualCashInput = screen.getByLabelText('Actual Cash Count');
    await user.clear(actualCashInput);
    await user.type(actualCashInput, '150.50');

    await waitFor(() => {
      expect(screen.getByText('Perfect match! Cash register balanced.')).toBeInTheDocument();
    });
  });

  it('calculates positive discrepancy for cash surplus', async () => {
    const user = userEvent.setup();
    render(<CashRegisterClosure sessionId={mockSessionId} />);

    await waitFor(() => {
      expect(screen.getByText('Expected Cash')).toBeInTheDocument();
    });

    const actualCashInput = screen.getByLabelText('Actual Cash Count');
    await user.clear(actualCashInput);
    await user.type(actualCashInput, '160.00');

    await waitFor(() => {
      expect(screen.getByText('Cash surplus detected.')).toBeInTheDocument();
    });
  });

  it('calculates negative discrepancy for cash shortage', async () => {
    const user = userEvent.setup();
    render(<CashRegisterClosure sessionId={mockSessionId} />);

    await waitFor(() => {
      expect(screen.getByText('Expected Cash')).toBeInTheDocument();
    });

    const actualCashInput = screen.getByLabelText('Actual Cash Count');
    await user.clear(actualCashInput);
    await user.type(actualCashInput, '140.00');

    await waitFor(() => {
      expect(screen.getByText('Cash shortage detected.')).toBeInTheDocument();
    });
  });

  it('closes cash register successfully when confirmed', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const mockClosedSession = {
      id: mockSessionId,
      userId: 'user-123',
      startedAt: new Date('2024-01-01T10:00:00Z'),
      endedAt: new Date('2024-01-01T18:00:00Z'),
      expectedCash: 150.50,
      actualCash: 150.50,
      discrepancy: 0,
      isActive: false,
      version: 1,
    };

    vi.mocked(sessionService.endSession).mockResolvedValue(mockClosedSession);

    render(<CashRegisterClosure sessionId={mockSessionId} onSuccess={onSuccess} />);

    await waitFor(() => {
      expect(screen.getByText('Expected Cash')).toBeInTheDocument();
    });

    // Enter actual cash
    const actualCashInput = screen.getByLabelText('Actual Cash Count');
    await user.clear(actualCashInput);
    await user.type(actualCashInput, '150.50');

    // Click close button
    const closeButton = screen.getByRole('button', { name: /close cash register/i });
    await user.click(closeButton);

    // Confirm in dialog
    const confirmButton = await screen.findByRole('button', { name: /confirm closure/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(sessionService.endSession).toHaveBeenCalledWith(mockSessionId, 150.50);
      expect(onSuccess).toHaveBeenCalledWith(mockClosedSession);
    });
  });

  it('disables close button when actual cash is invalid', async () => {
    render(<CashRegisterClosure sessionId={mockSessionId} />);

    await waitFor(() => {
      expect(screen.getByText('Expected Cash')).toBeInTheDocument();
    });

    const closeButton = screen.getByRole('button', { name: /close cash register/i });
    expect(closeButton).toBeDisabled();
  });

  it('handles error when loading statistics fails', async () => {
    const onError = vi.fn();
    const error = new Error('Failed to load statistics');
    vi.mocked(sessionService.getSessionStatistics).mockRejectedValue(error);

    render(<CashRegisterClosure sessionId={mockSessionId} onError={onError} />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      expect(onError).toHaveBeenCalledWith(error);
    });
  });
});
