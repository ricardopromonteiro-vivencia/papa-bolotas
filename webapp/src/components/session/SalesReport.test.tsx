import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SalesReport } from './SalesReport';
import { salesReportService } from '@/services/sales-report.service';
import type { FormattedSalesReport } from '@/services/sales-report.service';

// Mock the sales report service
vi.mock('@/services/sales-report.service', () => ({
  salesReportService: {
    generateFormattedReport: vi.fn(),
  },
  SalesReportError: class SalesReportError extends Error {
    constructor(message: string, public code: string, public statusCode: number = 500) {
      super(message);
      this.name = 'SalesReportError';
    }
  },
}));

describe('SalesReport', () => {
  const mockSessionId = 'test-session-123';
  
  const mockReport: FormattedSalesReport = {
    sessionId: mockSessionId,
    sessionStart: new Date('2024-01-15T10:00:00'),
    sessionEnd: undefined,
    totalRevenue: 145.50,
    formattedRevenue: '€145,50',
    completedOrders: 12,
    complimentaryOrders: 2,
    cancelledOrders: 1,
    sessionDuration: '2h 30m',
    totalOrders: 15,
    itemsSold: [
      { itemName: 'Sandes de Leitão', quantity: 5, subtotal: 25.00 },
      { itemName: 'Coca-Cola', quantity: 8, subtotal: 12.00 },
    ],
    topSellingItems: [
      { 
        itemName: 'Sandes de Leitão', 
        quantity: 5, 
        subtotal: 25.00,
        formattedSubtotal: '€25,00'
      },
      { 
        itemName: 'Coca-Cola', 
        quantity: 8, 
        subtotal: 12.00,
        formattedSubtotal: '€12,00'
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(salesReportService.generateFormattedReport).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<SalesReport sessionId={mockSessionId} autoRefresh={false} />);

    expect(screen.getByText('Sales Report')).toBeInTheDocument();
  });

  it('displays sales report data when loaded successfully', async () => {
    vi.mocked(salesReportService.generateFormattedReport).mockResolvedValue(mockReport);

    render(<SalesReport sessionId={mockSessionId} autoRefresh={false} />);

    await waitFor(() => {
      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    });

    // Revenue appears multiple times in the component (total, header, footer)
    const revenueElements = screen.getAllByText('€145,50');
    expect(revenueElements.length).toBeGreaterThan(0);

    expect(screen.getByText('Completed Orders')).toBeInTheDocument();
    expect(screen.getByText('2h 30m')).toBeInTheDocument();
  });

  it('displays item breakdown table', async () => {
    vi.mocked(salesReportService.generateFormattedReport).mockResolvedValue(mockReport);

    render(<SalesReport sessionId={mockSessionId} autoRefresh={false} />);

    await waitFor(() => {
      expect(screen.getByText('Item Sales Breakdown')).toBeInTheDocument();
    });

    expect(screen.getByText('Sandes de Leitão')).toBeInTheDocument();
    expect(screen.getByText('Coca-Cola')).toBeInTheDocument();
    expect(screen.getByText('€25,00')).toBeInTheDocument();
    expect(screen.getByText('€12,00')).toBeInTheDocument();
  });

  it('displays error message when report loading fails', async () => {
    vi.mocked(salesReportService.generateFormattedReport).mockRejectedValue(
      new Error('Failed to load report')
    );

    render(<SalesReport sessionId={mockSessionId} autoRefresh={false} />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Report')).toBeInTheDocument();
    });
  });

  it('displays empty state when no items sold', async () => {
    const emptyReport = {
      ...mockReport,
      topSellingItems: [],
      itemsSold: [],
    };

    vi.mocked(salesReportService.generateFormattedReport).mockResolvedValue(emptyReport);

    render(<SalesReport sessionId={mockSessionId} autoRefresh={false} />);

    await waitFor(() => {
      expect(screen.getByText('No items sold yet')).toBeInTheDocument();
    });
  });
});
