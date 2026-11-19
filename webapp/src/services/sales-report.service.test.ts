/**
 * Sales Report Service Tests
 * 
 * Comprehensive unit tests for sales report calculation logic.
 * Validates Requirements 10.2, 10.3, 10.4, 10.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SalesReportService, SalesReportError } from './sales-report.service';
import { sessionService } from './session.service';
import type { SalesReport } from '@/types';

// Mock session service
vi.mock('./session.service', () => ({
  sessionService: {
    getSessionStatistics: vi.fn(),
  },
}));

describe('SalesReportService', () => {
  let service: SalesReportService;
  const mockSessionId = 'test-session-123';

  const mockSalesReport: SalesReport = {
    sessionId: mockSessionId,
    sessionStart: new Date('2024-01-15T09:00:00Z'),
    sessionEnd: new Date('2024-01-15T17:30:00Z'),
    totalRevenue: 145.75,
    completedOrders: 12,
    complimentaryOrders: 2,
    cancelledOrders: 1,
    itemsSold: [
      { itemName: 'Sandes de Leitão', quantity: 8, subtotal: 64.00 },
      { itemName: 'Coca-Cola', quantity: 10, subtotal: 25.00 },
      { itemName: 'Batata Frita', quantity: 5, subtotal: 15.00 },
    ],
  };

  beforeEach(() => {
    service = new SalesReportService();
    vi.clearAllMocks();
  });

  describe('generateReport', () => {
    it('should generate a sales report for valid session ID', async () => {
      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(mockSalesReport);

      const report = await service.generateReport(mockSessionId);

      expect(sessionService.getSessionStatistics).toHaveBeenCalledWith(mockSessionId);
      expect(report).toEqual(mockSalesReport);
      expect(report.totalRevenue).toBe(145.75);
      expect(report.completedOrders).toBe(12);
      expect(report.complimentaryOrders).toBe(2);
      expect(report.cancelledOrders).toBe(1);
      expect(report.itemsSold).toHaveLength(3);
    });

    it('should throw error for empty session ID', async () => {
      await expect(service.generateReport('')).rejects.toThrow(SalesReportError);
      await expect(service.generateReport('')).rejects.toThrow('Session ID is required');
    });

    it('should throw error for whitespace-only session ID', async () => {
      await expect(service.generateReport('   ')).rejects.toThrow(SalesReportError);
    });

    it('should wrap SessionService errors', async () => {
      vi.mocked(sessionService.getSessionStatistics).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(service.generateReport(mockSessionId)).rejects.toThrow(SalesReportError);
      await expect(service.generateReport(mockSessionId)).rejects.toThrow('Failed to generate sales report');
    });
  });

  describe('generateFormattedReport', () => {
    it('should generate formatted report with currency and duration', async () => {
      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(mockSalesReport);

      const formattedReport = await service.generateFormattedReport(mockSessionId);

      expect(formattedReport.formattedRevenue).toContain('145,75');
      expect(formattedReport.formattedRevenue).toContain('€');
      expect(formattedReport.sessionDuration).toBe('8h 30m');
      expect(formattedReport.totalOrders).toBe(15); // 12 + 2 + 1
      expect(formattedReport.topSellingItems).toHaveLength(3);
    });

    it('should sort items by revenue (highest first)', async () => {
      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(mockSalesReport);

      const formattedReport = await service.generateFormattedReport(mockSessionId);

      expect(formattedReport.topSellingItems[0].itemName).toBe('Sandes de Leitão');
      expect(formattedReport.topSellingItems[0].subtotal).toBe(64.00);
      expect(formattedReport.topSellingItems[1].itemName).toBe('Coca-Cola');
      expect(formattedReport.topSellingItems[2].itemName).toBe('Batata Frita');
    });

    it('should format item subtotals as currency', async () => {
      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(mockSalesReport);

      const formattedReport = await service.generateFormattedReport(mockSessionId);

      expect(formattedReport.topSellingItems[0].formattedSubtotal).toContain('64,00');
      expect(formattedReport.topSellingItems[0].formattedSubtotal).toContain('€');
      expect(formattedReport.topSellingItems[1].formattedSubtotal).toContain('25,00');
    });

    it('should calculate duration for active session (no end date)', async () => {
      const activeSessionReport: SalesReport = {
        ...mockSalesReport,
        sessionEnd: undefined,
      };
      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(activeSessionReport);

      const formattedReport = await service.generateFormattedReport(mockSessionId);

      // Should calculate duration from start to now
      expect(formattedReport.sessionDuration).toBeDefined();
    });
  });

  describe('getTotalRevenue', () => {
    it('should return total revenue for session', async () => {
      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(mockSalesReport);

      const revenue = await service.getTotalRevenue(mockSessionId);

      expect(revenue).toBe(145.75);
    });
  });

  describe('getItemBreakdown', () => {
    it('should return items sold array', async () => {
      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(mockSalesReport);

      const items = await service.getItemBreakdown(mockSessionId);

      expect(items).toHaveLength(3);
      expect(items[0].itemName).toBe('Sandes de Leitão');
      expect(items[0].quantity).toBe(8);
      expect(items[0].subtotal).toBe(64.00);
    });
  });

  describe('getOrderCounts', () => {
    it('should return order counts by type', async () => {
      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(mockSalesReport);

      const counts = await service.getOrderCounts(mockSessionId);

      expect(counts.completed).toBe(12);
      expect(counts.complimentary).toBe(2);
      expect(counts.cancelled).toBe(1);
      expect(counts.total).toBe(15);
    });
  });

  // ========================================================================
  // COMPREHENSIVE CALCULATION TESTS
  // ========================================================================

  describe('Revenue Calculation (Requirement 10.2)', () => {
    it('should calculate total revenue excluding cancelled orders', async () => {
      const reportWithCancelled: SalesReport = {
        sessionId: mockSessionId,
        sessionStart: new Date('2024-01-15T09:00:00Z'),
        sessionEnd: new Date('2024-01-15T17:30:00Z'),
        totalRevenue: 100.00, // Only completed orders
        completedOrders: 5,
        complimentaryOrders: 0,
        cancelledOrders: 3,
        itemsSold: [],
      };

      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(reportWithCancelled);

      const revenue = await service.getTotalRevenue(mockSessionId);

      expect(revenue).toBe(100.00);
      expect(revenue).not.toContain(undefined); // Cancelled orders should not affect revenue
    });

    it('should calculate total revenue excluding complimentary orders', async () => {
      const reportWithComplimentary: SalesReport = {
        sessionId: mockSessionId,
        sessionStart: new Date('2024-01-15T09:00:00Z'),
        sessionEnd: new Date('2024-01-15T17:30:00Z'),
        totalRevenue: 75.50, // Only completed orders
        completedOrders: 3,
        complimentaryOrders: 5,
        cancelledOrders: 0,
        itemsSold: [],
      };

      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(reportWithComplimentary);

      const revenue = await service.getTotalRevenue(mockSessionId);

      expect(revenue).toBe(75.50);
      // Complimentary orders (5) should not contribute to revenue
    });

    it('should calculate total revenue with only completed orders', async () => {
      const reportOnlyCompleted: SalesReport = {
        sessionId: mockSessionId,
        sessionStart: new Date('2024-01-15T09:00:00Z'),
        sessionEnd: new Date('2024-01-15T17:30:00Z'),
        totalRevenue: 250.75,
        completedOrders: 10,
        complimentaryOrders: 0,
        cancelledOrders: 0,
        itemsSold: [],
      };

      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(reportOnlyCompleted);

      const revenue = await service.getTotalRevenue(mockSessionId);

      expect(revenue).toBe(250.75);
    });

    it('should return zero revenue when all orders are cancelled', async () => {
      const reportAllCancelled: SalesReport = {
        sessionId: mockSessionId,
        sessionStart: new Date('2024-01-15T09:00:00Z'),
        sessionEnd: new Date('2024-01-15T17:30:00Z'),
        totalRevenue: 0.00,
        completedOrders: 0,
        complimentaryOrders: 0,
        cancelledOrders: 5,
        itemsSold: [],
      };

      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(reportAllCancelled);

      const revenue = await service.getTotalRevenue(mockSessionId);

      expect(revenue).toBe(0.00);
    });

    it('should return zero revenue when all orders are complimentary', async () => {
      const reportAllComplimentary: SalesReport = {
        sessionId: mockSessionId,
        sessionStart: new Date('2024-01-15T09:00:00Z'),
        sessionEnd: new Date('2024-01-15T17:30:00Z'),
        totalRevenue: 0.00,
        completedOrders: 0,
        complimentaryOrders: 8,
        cancelledOrders: 0,
        itemsSold: [],
      };

      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(reportAllComplimentary);

      const revenue = await service.getTotalRevenue(mockSessionId);

      expect(revenue).toBe(0.00);
    });

    it('should handle mixed order types correctly', async () => {
      const reportMixed: SalesReport = {
        sessionId: mockSessionId,
        sessionStart: new Date('2024-01-15T09:00:00Z'),
        sessionEnd: new Date('2024-01-15T17:30:00Z'),
        totalRevenue: 185.50, // Only from completed orders
        completedOrders: 8,
        complimentaryOrders: 3,
        cancelledOrders: 2,
        itemsSold: [],
      };

      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(reportMixed);

      const revenue = await service.getTotalRevenue(mockSessionId);

      expect(revenue).toBe(185.50);
    });

    it('should handle decimal precision correctly', async () => {
      const reportDecimals: SalesReport = {
        sessionId: mockSessionId,
        sessionStart: new Date('2024-01-15T09:00:00Z'),
        sessionEnd: new Date('2024-01-15T17:30:00Z'),
        totalRevenue: 123.45,
        completedOrders: 5,
        complimentaryOrders: 0,
        cancelledOrders: 0,
        itemsSold: [],
      };

      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(reportDecimals);

      const revenue = await service.getTotalRevenue(mockSessionId);

      expect(revenue).toBe(123.45);
      expect(typeof revenue).toBe('number');
    });
  });

  describe('Order Counting by Type (Requirements 10.3, 10.4, 10.5)', () => {
    it('should count completed orders separately', async () => {
      const report: SalesReport = {
        sessionId: mockSessionId,
        sessionStart: new Date('2024-01-15T09:00:00Z'),
        sessionEnd: new Date('2024-01-15T17:30:00Z'),
        totalRevenue: 100.00,
        completedOrders: 15,
        complimentaryOrders: 3,
        cancelledOrders: 2,
        itemsSold: [],
      };

      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(report);

      const counts = await service.getOrderCounts(mockSessionId);

      expect(counts.completed).toBe(15);
    });

    it('should count complimentary orders separately', async () => {
      const report: SalesReport = {
        sessionId: mockSessionId,
        sessionStart: new Date('2024-01-15T09:00:00Z'),
        sessionEnd: new Date('2024-01-15T17:30:00Z'),
        totalRevenue: 100.00,
        completedOrders: 10,
        complimentaryOrders: 5,
        cancelledOrders: 1,
        itemsSold: [],
      };

      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(report);

      const counts = await service.getOrderCounts(mockSessionId);

      expect(counts.complimentary).toBe(5);
    });

    it('should count cancelled orders separately', async () => {
      const report: SalesReport = {
        sessionId: mockSessionId,
        sessionStart: new Date('2024-01-15T09:00:00Z'),
        sessionEnd: new Date('2024-01-15T17:30:00Z'),
        totalRevenue: 100.00,
        completedOrders: 10,
        complimentaryOrders: 2,
        cancelledOrders: 4,
        itemsSold: [],
      };

      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(report);

      const counts = await service.getOrderCounts(mockSessionId);

      expect(counts.cancelled).toBe(4);
    });

    it('should calculate total orders correctly', async () => {
      const report: SalesReport = {
        sessionId: mockSessionId,
        sessionStart: new Date('2024-01-15T09:00:00Z'),
        sessionEnd: new Date('2024-01-15T17:30:00Z'),
        totalRevenue: 100.00,
        completedOrders: 20,
        complimentaryOrders: 5,
        cancelledOrders: 3,
        itemsSold: [],
      };

      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(report);

      const counts = await service.getOrderCounts(mockSessionId);

      expect(counts.total).toBe(28); // 20 + 5 + 3
    });

    it('should handle zero orders of all types', async () => {
      const report: SalesReport = {
        sessionId: mockSessionId,
        sessionStart: new Date('2024-01-15T09:00:00Z'),
        sessionEnd: new Date('2024-01-15T17:30:00Z'),
        totalRevenue: 0.00,
        completedOrders: 0,
        complimentaryOrders: 0,
        cancelledOrders: 0,
        itemsSold: [],
      };

      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(report);

      const counts = await service.getOrderCounts(mockSessionId);

      expect(counts.completed).toBe(0);
      expect(counts.complimentary).toBe(0);
      expect(counts.cancelled).toBe(0);
      expect(counts.total).toBe(0);
    });

    it('should handle session with only one order type', async () => {
      const report: SalesReport = {
        sessionId: mockSessionId,
        sessionStart: new Date('2024-01-15T09:00:00Z'),
        sessionEnd: new Date('2024-01-15T17:30:00Z'),
        totalRevenue: 50.00,
        completedOrders: 5,
        complimentaryOrders: 0,
        cancelledOrders: 0,
        itemsSold: [],
      };

      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(report);

      const counts = await service.getOrderCounts(mockSessionId);

      expect(counts.completed).toBe(5);
      expect(counts.complimentary).toBe(0);
      expect(counts.cancelled).toBe(0);
      expect(counts.total).toBe(5);
    });
  });

  describe('Item Breakdown Aggregation (Requirement 10.6)', () => {
    it('should aggregate item quantities correctly', async () => {
      const report: SalesReport = {
        sessionId: mockSessionId,
        sessionStart: new Date('2024-01-15T09:00:00Z'),
        sessionEnd: new Date('2024-01-15T17:30:00Z'),
        totalRevenue: 100.00,
        completedOrders: 5,
        complimentaryOrders: 0,
        cancelledOrders: 0,
        itemsSold: [
          { itemName: 'Sandes de Leitão', quantity: 10, subtotal: 80.00 },
          { itemName: 'Coca-Cola', quantity: 15, subtotal: 37.50 },
          { itemName: 'Café', quantity: 8, subtotal: 8.00 },
        ],
      };

      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(report);

      const items = await service.getItemBreakdown(mockSessionId);

      expect(items).toHaveLength(3);
      expect(items[0].quantity).toBe(10);
      expect(items[1].quantity).toBe(15);
      expect(items[2].quantity).toBe(8);
    });

    it('should aggregate item subtotals correctly', async () => {
      const report: SalesReport = {
        sessionId: mockSessionId,
        sessionStart: new Date('2024-01-15T09:00:00Z'),
        sessionEnd: new Date('2024-01-15T17:30:00Z'),
        totalRevenue: 125.50,
        completedOrders: 5,
        complimentaryOrders: 0,
        cancelledOrders: 0,
        itemsSold: [
          { itemName: 'Tábua Mista', quantity: 2, subtotal: 100.00 },
          { itemName: 'Batata Frita', quantity: 5, subtotal: 25.50 },
        ],
      };

      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(report);

      const items = await service.getItemBreakdown(mockSessionId);

      expect(items).toHaveLength(2);
      expect(items[0].subtotal).toBe(100.00);
      expect(items[1].subtotal).toBe(25.50);
      
      // Sum of subtotals should match total revenue
      const totalSubtotals = items.reduce((sum, item) => sum + item.subtotal, 0);
      expect(totalSubtotals).toBe(125.50);
    });

    it('should include item names correctly', async () => {
      const report: SalesReport = {
        sessionId: mockSessionId,
        sessionStart: new Date('2024-01-15T09:00:00Z'),
        sessionEnd: new Date('2024-01-15T17:30:00Z'),
        totalRevenue: 50.00,
        completedOrders: 3,
        complimentaryOrders: 0,
        cancelledOrders: 0,
        itemsSold: [
          { itemName: 'Sandes de Leitão', quantity: 3, subtotal: 24.00 },
          { itemName: 'Coca-Cola', quantity: 4, subtotal: 10.00 },
          { itemName: 'Pastel de Nata', quantity: 8, subtotal: 16.00 },
        ],
      };

      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(report);

      const items = await service.getItemBreakdown(mockSessionId);

      expect(items).toHaveLength(3);
      expect(items[0].itemName).toBe('Sandes de Leitão');
      expect(items[1].itemName).toBe('Coca-Cola');
      expect(items[2].itemName).toBe('Pastel de Nata');
    });

    it('should handle empty item breakdown', async () => {
      const report: SalesReport = {
        sessionId: mockSessionId,
        sessionStart: new Date('2024-01-15T09:00:00Z'),
        sessionEnd: new Date('2024-01-15T17:30:00Z'),
        totalRevenue: 0.00,
        completedOrders: 0,
        complimentaryOrders: 0,
        cancelledOrders: 0,
        itemsSold: [],
      };

      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(report);

      const items = await service.getItemBreakdown(mockSessionId);

      expect(items).toEqual([]);
      expect(items).toHaveLength(0);
    });

    it('should handle single item breakdown', async () => {
      const report: SalesReport = {
        sessionId: mockSessionId,
        sessionStart: new Date('2024-01-15T09:00:00Z'),
        sessionEnd: new Date('2024-01-15T17:30:00Z'),
        totalRevenue: 50.00,
        completedOrders: 5,
        complimentaryOrders: 0,
        cancelledOrders: 0,
        itemsSold: [
          { itemName: 'Água', quantity: 20, subtotal: 50.00 },
        ],
      };

      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(report);

      const items = await service.getItemBreakdown(mockSessionId);

      expect(items).toHaveLength(1);
      expect(items[0].itemName).toBe('Água');
      expect(items[0].quantity).toBe(20);
      expect(items[0].subtotal).toBe(50.00);
    });

    it('should handle large quantities', async () => {
      const report: SalesReport = {
        sessionId: mockSessionId,
        sessionStart: new Date('2024-01-15T09:00:00Z'),
        sessionEnd: new Date('2024-01-15T17:30:00Z'),
        totalRevenue: 500.00,
        completedOrders: 50,
        complimentaryOrders: 0,
        cancelledOrders: 0,
        itemsSold: [
          { itemName: 'Café', quantity: 100, subtotal: 100.00 },
          { itemName: 'Água', quantity: 150, subtotal: 300.00 },
          { itemName: 'Pastel de Nata', quantity: 50, subtotal: 100.00 },
        ],
      };

      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(report);

      const items = await service.getItemBreakdown(mockSessionId);

      expect(items).toHaveLength(3);
      expect(items[0].quantity).toBe(100);
      expect(items[1].quantity).toBe(150);
      expect(items[2].quantity).toBe(50);
    });

    it('should preserve item breakdown order', async () => {
      const report: SalesReport = {
        sessionId: mockSessionId,
        sessionStart: new Date('2024-01-15T09:00:00Z'),
        sessionEnd: new Date('2024-01-15T17:30:00Z'),
        totalRevenue: 50.00,
        completedOrders: 3,
        complimentaryOrders: 0,
        cancelledOrders: 0,
        itemsSold: [
          { itemName: 'Item A', quantity: 1, subtotal: 10.00 },
          { itemName: 'Item B', quantity: 2, subtotal: 20.00 },
          { itemName: 'Item C', quantity: 3, subtotal: 20.00 },
        ],
      };

      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(report);

      const items = await service.getItemBreakdown(mockSessionId);

      expect(items[0].itemName).toBe('Item A');
      expect(items[1].itemName).toBe('Item B');
      expect(items[2].itemName).toBe('Item C');
    });
  });

  describe('Exclusion of Cancelled and Complimentary Orders from Revenue', () => {
    it('should not include cancelled order amounts in revenue', async () => {
      const report: SalesReport = {
        sessionId: mockSessionId,
        sessionStart: new Date('2024-01-15T09:00:00Z'),
        sessionEnd: new Date('2024-01-15T17:30:00Z'),
        totalRevenue: 100.00, // Should only include completed orders
        completedOrders: 5,
        complimentaryOrders: 0,
        cancelledOrders: 10, // These 10 cancelled orders should not contribute to revenue
        itemsSold: [],
      };

      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(report);

      const revenue = await service.getTotalRevenue(mockSessionId);
      const counts = await service.getOrderCounts(mockSessionId);

      expect(revenue).toBe(100.00);
      expect(counts.cancelled).toBe(10);
      // Revenue should not be affected by number of cancelled orders
    });

    it('should not include complimentary order amounts in revenue', async () => {
      const report: SalesReport = {
        sessionId: mockSessionId,
        sessionStart: new Date('2024-01-15T09:00:00Z'),
        sessionEnd: new Date('2024-01-15T17:30:00Z'),
        totalRevenue: 75.00, // Should only include completed orders
        completedOrders: 3,
        complimentaryOrders: 7, // These 7 complimentary orders should not contribute to revenue
        cancelledOrders: 0,
        itemsSold: [],
      };

      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(report);

      const revenue = await service.getTotalRevenue(mockSessionId);
      const counts = await service.getOrderCounts(mockSessionId);

      expect(revenue).toBe(75.00);
      expect(counts.complimentary).toBe(7);
      // Revenue should not be affected by number of complimentary orders
    });

    it('should not include both cancelled and complimentary orders in revenue', async () => {
      const report: SalesReport = {
        sessionId: mockSessionId,
        sessionStart: new Date('2024-01-15T09:00:00Z'),
        sessionEnd: new Date('2024-01-15T17:30:00Z'),
        totalRevenue: 200.00, // Only completed orders
        completedOrders: 10,
        complimentaryOrders: 5,
        cancelledOrders: 3,
        itemsSold: [],
      };

      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(report);

      const revenue = await service.getTotalRevenue(mockSessionId);
      const counts = await service.getOrderCounts(mockSessionId);

      expect(revenue).toBe(200.00);
      expect(counts.completed).toBe(10);
      expect(counts.complimentary).toBe(5);
      expect(counts.cancelled).toBe(3);
      expect(counts.total).toBe(18); // 10 + 5 + 3
    });

    it('should exclude cancelled items from item breakdown', async () => {
      const report: SalesReport = {
        sessionId: mockSessionId,
        sessionStart: new Date('2024-01-15T09:00:00Z'),
        sessionEnd: new Date('2024-01-15T17:30:00Z'),
        totalRevenue: 50.00,
        completedOrders: 2,
        complimentaryOrders: 0,
        cancelledOrders: 1,
        itemsSold: [
          // Only items from completed/complimentary orders (not cancelled)
          { itemName: 'Sandes de Leitão', quantity: 2, subtotal: 30.00 },
          { itemName: 'Coca-Cola', quantity: 2, subtotal: 20.00 },
        ],
      };

      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(report);

      const items = await service.getItemBreakdown(mockSessionId);

      // Cancelled order items should not appear in breakdown
      expect(items).toHaveLength(2);
      expect(items.every(item => item.quantity > 0)).toBe(true);
      expect(items.every(item => item.subtotal > 0)).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very large revenue amounts', async () => {
      const report: SalesReport = {
        sessionId: mockSessionId,
        sessionStart: new Date('2024-01-15T09:00:00Z'),
        sessionEnd: new Date('2024-01-15T17:30:00Z'),
        totalRevenue: 999999.99,
        completedOrders: 1000,
        complimentaryOrders: 0,
        cancelledOrders: 0,
        itemsSold: [],
      };

      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(report);

      const revenue = await service.getTotalRevenue(mockSessionId);

      expect(revenue).toBe(999999.99);
      expect(typeof revenue).toBe('number');
    });

    it('should handle many order types', async () => {
      const report: SalesReport = {
        sessionId: mockSessionId,
        sessionStart: new Date('2024-01-15T09:00:00Z'),
        sessionEnd: new Date('2024-01-15T17:30:00Z'),
        totalRevenue: 1000.00,
        completedOrders: 500,
        complimentaryOrders: 250,
        cancelledOrders: 100,
        itemsSold: [],
      };

      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(report);

      const counts = await service.getOrderCounts(mockSessionId);

      expect(counts.completed).toBe(500);
      expect(counts.complimentary).toBe(250);
      expect(counts.cancelled).toBe(100);
      expect(counts.total).toBe(850);
    });

    it('should handle many items in breakdown', async () => {
      const manyItems = Array.from({ length: 50 }, (_, i) => ({
        itemName: `Item ${i + 1}`,
        quantity: i + 1,
        subtotal: (i + 1) * 5.00,
      }));

      const report: SalesReport = {
        sessionId: mockSessionId,
        sessionStart: new Date('2024-01-15T09:00:00Z'),
        sessionEnd: new Date('2024-01-15T17:30:00Z'),
        totalRevenue: 6375.00,
        completedOrders: 100,
        complimentaryOrders: 0,
        cancelledOrders: 0,
        itemsSold: manyItems,
      };

      vi.mocked(sessionService.getSessionStatistics).mockResolvedValue(report);

      const items = await service.getItemBreakdown(mockSessionId);

      expect(items).toHaveLength(50);
      expect(items[0].itemName).toBe('Item 1');
      expect(items[49].itemName).toBe('Item 50');
    });
  });
});
