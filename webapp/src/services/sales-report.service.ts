/**
 * Sales Report Service
 * 
 * Service for generating and formatting sales reports for sessions.
 * Wraps SessionService.getSessionStatistics() with additional formatting
 * and presentation capabilities.
 * 
 * @module services/sales-report
 */

import { sessionService } from './session.service';
import type { SalesReport } from '@/types';

/**
 * Custom error class for sales report operations
 */
export class SalesReportError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'SalesReportError';
  }
}

/**
 * Formatted sales report with additional display properties
 */
export interface FormattedSalesReport extends SalesReport {
  /** Formatted total revenue as string (e.g., "€45.50") */
  formattedRevenue: string;
  /** Session duration in human-readable format (e.g., "2h 30m") */
  sessionDuration?: string;
  /** Items sorted by revenue (highest to lowest) */
  topSellingItems: Array<{
    itemName: string;
    quantity: number;
    subtotal: number;
    formattedSubtotal: string;
  }>;
  /** Total number of all orders (completed + complimentary + cancelled) */
  totalOrders: number;
}

/**
 * Service for generating sales reports
 * 
 * Provides methods for generating and formatting sales reports for the current session.
 * Wraps SessionService functionality with additional formatting capabilities.
 */
export class SalesReportService {
  /**
   * Generate a sales report for the current session
   * 
   * Retrieves sales statistics including:
   * - Total revenue (excluding cancelled/complimentary orders)
   * - Order counts by type (completed, complimentary, cancelled)
   * - Item breakdown with quantities and subtotals
   * 
   * **Validates: Requirements 10.2, 10.3, 10.4, 10.5, 10.6**
   * 
   * @param sessionId - ID of the session to generate report for
   * @returns Promise resolving to the sales report
   * @throws {SalesReportError} If session ID is invalid or report generation fails
   */
  async generateReport(sessionId: string): Promise<SalesReport> {
    try {
      if (!sessionId || sessionId.trim().length === 0) {
        throw new SalesReportError(
          'Session ID is required',
          'INVALID_SESSION_ID',
          400
        );
      }

      // Delegate to SessionService for the actual report generation
      const report = await sessionService.getSessionStatistics(sessionId);

      return report;

    } catch (error) {
      if (error instanceof SalesReportError) {
        throw error;
      }

      // Re-throw SessionService errors as SalesReportError
      if (error instanceof Error) {
        throw new SalesReportError(
          `Failed to generate sales report: ${error.message}`,
          'GENERATION_FAILED',
          500
        );
      }

      throw new SalesReportError(
        'An unexpected error occurred while generating sales report',
        'UNEXPECTED_ERROR',
        500
      );
    }
  }

  /**
   * Generate a formatted sales report with additional display properties
   * 
   * Extends the basic sales report with:
   * - Formatted currency strings
   * - Human-readable session duration
   * - Top-selling items sorted by revenue
   * - Total order count
   * 
   * @param sessionId - ID of the session to generate report for
   * @returns Promise resolving to the formatted sales report
   * @throws {SalesReportError} If session ID is invalid or report generation fails
   */
  async generateFormattedReport(sessionId: string): Promise<FormattedSalesReport> {
    try {
      const report = await this.generateReport(sessionId);

      // Calculate session duration
      const sessionDuration = report.sessionEnd 
        ? this.formatDuration(report.sessionStart, report.sessionEnd)
        : this.formatDuration(report.sessionStart, new Date());

      // Sort items by revenue (subtotal) in descending order
      const topSellingItems = [...report.itemsSold]
        .sort((a, b) => b.subtotal - a.subtotal)
        .map(item => ({
          ...item,
          formattedSubtotal: this.formatCurrency(item.subtotal),
        }));

      // Calculate total orders
      const totalOrders = 
        report.completedOrders + 
        report.complimentaryOrders + 
        report.cancelledOrders;

      const formattedReport: FormattedSalesReport = {
        ...report,
        formattedRevenue: this.formatCurrency(report.totalRevenue),
        sessionDuration,
        topSellingItems,
        totalOrders,
      };

      return formattedReport;

    } catch (error) {
      if (error instanceof SalesReportError) {
        throw error;
      }

      throw new SalesReportError(
        'Failed to generate formatted sales report',
        'FORMATTING_FAILED',
        500
      );
    }
  }

  /**
   * Format a number as currency (Euro)
   * 
   * @param amount - Amount to format
   * @returns Formatted currency string (e.g., "€45.50")
   * @private
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }

  /**
   * Format duration between two dates as human-readable string
   * 
   * @param start - Start date
   * @param end - End date
   * @returns Formatted duration string (e.g., "2h 30m")
   * @private
   */
  private formatDuration(start: Date, end: Date): string {
    const durationMs = end.getTime() - start.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Calculate total revenue for a session (convenience method)
   * 
   * @param sessionId - ID of the session
   * @returns Promise resolving to the total revenue
   * @throws {SalesReportError} If session ID is invalid or calculation fails
   */
  async getTotalRevenue(sessionId: string): Promise<number> {
    const report = await this.generateReport(sessionId);
    return report.totalRevenue;
  }

  /**
   * Get item breakdown for a session (convenience method)
   * 
   * @param sessionId - ID of the session
   * @returns Promise resolving to the items sold array
   * @throws {SalesReportError} If session ID is invalid or retrieval fails
   */
  async getItemBreakdown(sessionId: string): Promise<SalesReport['itemsSold']> {
    const report = await this.generateReport(sessionId);
    return report.itemsSold;
  }

  /**
   * Get order counts by type for a session (convenience method)
   * 
   * @param sessionId - ID of the session
   * @returns Promise resolving to order counts object
   * @throws {SalesReportError} If session ID is invalid or retrieval fails
   */
  async getOrderCounts(sessionId: string): Promise<{
    completed: number;
    complimentary: number;
    cancelled: number;
    total: number;
  }> {
    const report = await this.generateReport(sessionId);
    return {
      completed: report.completedOrders,
      complimentary: report.complimentaryOrders,
      cancelled: report.cancelledOrders,
      total: report.completedOrders + report.complimentaryOrders + report.cancelledOrders,
    };
  }
}

// Export singleton instance
export const salesReportService = new SalesReportService();

// Export for testing
export default salesReportService;
