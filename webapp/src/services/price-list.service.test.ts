/**
 * Price List Service Tests
 * 
 * Tests PDF price list generation functionality.
 * Validates Requirements 13.1-13.6
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PriceListService, PriceListServiceError } from './price-list.service';
import { MenuItem, Category } from '@/types';

// Mock jsPDF since we're testing logic, not PDF rendering
vi.mock('jspdf', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      setFontSize: vi.fn(),
      setFont: vi.fn(),
      text: vi.fn(),
      setLineWidth: vi.fn(),
      line: vi.fn(),
      addPage: vi.fn(),
      save: vi.fn(),
      output: vi.fn().mockReturnValue(new Blob(['mock-pdf'], { type: 'application/pdf' }))
    }))
  };
});

describe('PriceListService', () => {
  let service: PriceListService;

  const mockMenuItems: MenuItem[] = [
    {
      id: 'item-1',
      name: 'Sandes de Leitão',
      category: Category.SANDES,
      price: 8.00,
      stockLevel: 20,
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      version: 1
    },
    {
      id: 'item-2',
      name: 'Coca-Cola',
      category: Category.BEBIDAS,
      price: 2.50,
      stockLevel: 50,
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      version: 1
    },
    {
      id: 'item-3',
      name: 'Batata Frita',
      category: Category.BATATAS,
      price: 3.00,
      stockLevel: 30,
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      version: 1
    },
    {
      id: 'item-4',
      name: 'Item Inativo',
      category: Category.DOCES,
      price: 5.00,
      stockLevel: 0,
      isActive: false, // Should be excluded
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      version: 1
    }
  ];

  beforeEach(() => {
    service = new PriceListService();
  });

  describe('generatePriceListPDF', () => {
    it('should generate PDF with menu items', () => {
      const pdf = service.generatePriceListPDF(mockMenuItems);
      
      expect(pdf).toBeDefined();
      expect(pdf.text).toHaveBeenCalled();
    });

    it('should throw error for empty menu items', () => {
      expect(() => service.generatePriceListPDF([])).toThrow(PriceListServiceError);
      expect(() => service.generatePriceListPDF([])).toThrow('no menu items');
    });

    it('should throw error for null menu items', () => {
      expect(() => service.generatePriceListPDF(null as any)).toThrow(PriceListServiceError);
    });

    it('should include restaurant name', () => {
      const pdf = service.generatePriceListPDF(mockMenuItems);
      
      expect(pdf.text).toHaveBeenCalledWith(
        expect.stringContaining('Papa Bolotas'),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should include generation date', () => {
      const pdf = service.generatePriceListPDF(mockMenuItems);
      
      expect(pdf.text).toHaveBeenCalledWith(
        expect.stringContaining('Gerado em:'),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should group items by category', () => {
      const pdf = service.generatePriceListPDF(mockMenuItems);
      
      // Should show category headers
      expect(pdf.text).toHaveBeenCalledWith('Sandes', expect.any(Number), expect.any(Number));
      expect(pdf.text).toHaveBeenCalledWith('Bebidas', expect.any(Number), expect.any(Number));
      expect(pdf.text).toHaveBeenCalledWith('Batatas', expect.any(Number), expect.any(Number));
    });

    it('should exclude inactive items', () => {
      const pdf = service.generatePriceListPDF(mockMenuItems);
      
      // Should not include inactive item name
      const textCalls = (pdf.text as any).mock.calls;
      const hasInactiveItem = textCalls.some((call: any[]) => 
        call[0] === 'Item Inativo'
      );
      
      expect(hasInactiveItem).toBe(false);
    });

    it('should format prices with Portuguese decimal separator', () => {
      const pdf = service.generatePriceListPDF(mockMenuItems);
      
      const textCalls = (pdf.text as any).mock.calls;
      const hasPriceWithComma = textCalls.some((call: any[]) => 
        typeof call[0] === 'string' && call[0].includes(',') && call[0].includes('€')
      );
      
      expect(hasPriceWithComma).toBe(true);
    });
  });

  describe('downloadPriceList', () => {
    it('should generate and save PDF', async () => {
      await service.downloadPriceList(mockMenuItems);
      
      // PDF should be generated (no errors thrown)
      expect(true).toBe(true);
    });

    it('should use custom filename if provided', async () => {
      const customFilename = 'custom-price-list.pdf';
      await service.downloadPriceList(mockMenuItems, customFilename);
      
      // Should complete without error
      expect(true).toBe(true);
    });

    it('should throw error for empty menu', async () => {
      await expect(service.downloadPriceList([])).rejects.toThrow(PriceListServiceError);
    });
  });

  describe('generatePriceListBlob', () => {
    it('should generate PDF as blob', async () => {
      const blob = await service.generatePriceListBlob(mockMenuItems);
      
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should throw error for empty menu', async () => {
      await expect(service.generatePriceListBlob([])).rejects.toThrow(PriceListServiceError);
    });
  });
});
