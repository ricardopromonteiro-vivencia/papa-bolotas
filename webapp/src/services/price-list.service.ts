/**
 * Price List Service
 * 
 * Generates PDF price lists with menu items grouped by category.
 * Uses jsPDF for PDF generation with A4 format.
 * 
 * Requirements:
 * - 13.1: Generate price list in PDF format
 * - 13.2: Group items by category
 * - 13.3: Display item names and prices
 * - 13.4: Include restaurant name
 * - 13.5: Include generation date
 * - 13.6: Format for A4 paper size
 */

import jsPDF from 'jspdf';
import { MenuItem, Category } from '@/types';

/**
 * Custom error class for price list service failures
 */
export class PriceListServiceError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'PriceListServiceError';
  }
}

/**
 * Price List Service
 * 
 * Generates PDF price lists with menu items organized by category.
 */
export class PriceListService {
  private readonly RESTAURANT_NAME = 'Papa Bolotas';
  private readonly PAGE_WIDTH = 210; // A4 width in mm
  private readonly PAGE_HEIGHT = 297; // A4 height in mm
  private readonly MARGIN = 20;
  private readonly LINE_HEIGHT = 7;

  /**
   * Format currency amount in Portuguese format
   * 
   * @param amount - Amount in euros
   * @returns Formatted currency string (e.g., "5,50€")
   */
  private formatCurrency(amount: number): string {
    return amount.toFixed(2).replace('.', ',') + '€';
  }

  /**
   * Format date and time in Portuguese format
   * 
   * @param date - Date to format
   * @returns Formatted date string (e.g., "15/01/2024 14:30")
   */
  private formatDateTime(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} às ${hours}:${minutes}`;
  }

  /**
   * Group menu items by category
   * 
   * @param items - Menu items to group
   * @returns Object with categories as keys and item arrays as values
   */
  private groupByCategory(items: MenuItem[]): Record<Category, MenuItem[]> {
    const grouped = {} as Record<Category, MenuItem[]>;

    // Initialize all categories
    Object.values(Category).forEach(category => {
      grouped[category as Category] = [];
    });

    // Group items
    items.forEach(item => {
      if (item.isActive) {
        grouped[item.category].push(item);
      }
    });

    return grouped;
  }

  /**
   * Generate price list PDF
   * 
   * Requirements 13.1-13.6: Complete PDF generation
   * 
   * @param menuItems - Menu items to include in price list
   * @returns jsPDF instance with generated price list
   */
  generatePriceListPDF(menuItems: MenuItem[]): jsPDF {
    try {
      // Validate input
      if (!menuItems || menuItems.length === 0) {
        throw new PriceListServiceError(
          'Não é possível gerar a lista de preços: nenhum artigo do menu fornecido',
          'EMPTY_MENU'
        );
      }

      // Create PDF with A4 format (Requirement 13.6)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let yPosition = this.MARGIN;

      // Header - Restaurant name (Requirement 13.4)
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text(this.RESTAURANT_NAME, this.PAGE_WIDTH / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Title
      doc.setFontSize(16);
      doc.text('Lista de Preços', this.PAGE_WIDTH / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Generation date (Requirement 13.5)
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const generationDate = this.formatDateTime(new Date());
      doc.text(`Gerado em: ${generationDate}`, this.PAGE_WIDTH / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Group items by category (Requirement 13.2)
      const groupedItems = this.groupByCategory(menuItems);

      // Render each category (Requirement 13.3)
      Object.entries(groupedItems).forEach(([category, items]) => {
        // Skip empty categories
        if (items.length === 0) return;

        // Check if we need a new page
        if (yPosition > this.PAGE_HEIGHT - 40) {
          doc.addPage();
          yPosition = this.MARGIN;
        }

        // Category header
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(category, this.MARGIN, yPosition);
        yPosition += this.LINE_HEIGHT;

        // Draw separator line
        doc.setLineWidth(0.5);
        doc.line(this.MARGIN, yPosition, this.PAGE_WIDTH - this.MARGIN, yPosition);
        yPosition += this.LINE_HEIGHT;

        // Items in category
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');

        items.forEach(item => {
          // Check if we need a new page
          if (yPosition > this.PAGE_HEIGHT - this.MARGIN) {
            doc.addPage();
            yPosition = this.MARGIN;
          }

          // Item name (left-aligned)
          doc.text(item.name, this.MARGIN + 5, yPosition);

          // Item price (right-aligned)
          const priceText = this.formatCurrency(item.price);
          doc.text(priceText, this.PAGE_WIDTH - this.MARGIN - 5, yPosition, { align: 'right' });

          yPosition += this.LINE_HEIGHT;
        });

        // Add spacing between categories
        yPosition += 5;
      });

      return doc;
    } catch (error) {
      if (error instanceof PriceListServiceError) {
        throw error;
      }
      throw new PriceListServiceError(
        `Falha ao gerar a lista de preços: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        'PDF_GENERATION_ERROR'
      );
    }
  }

  /**
   * Generate and download price list PDF
   * 
   * Generates PDF and triggers browser download.
   * 
   * @param menuItems - Menu items to include
   * @param filename - Optional custom filename (default: 'lista-precos-papa-bolotas.pdf')
   */
  async downloadPriceList(menuItems: MenuItem[], filename?: string): Promise<void> {
    try {
      const doc = this.generatePriceListPDF(menuItems);
      const defaultFilename = `lista-precos-papa-bolotas-${Date.now()}.pdf`;
      doc.save(filename || defaultFilename);
    } catch (error) {
      if (error instanceof PriceListServiceError) {
        throw error;
      }
      throw new PriceListServiceError(
        'Falha ao transferir a lista de preços',
        'DOWNLOAD_ERROR'
      );
    }
  }

  /**
   * Generate price list PDF as blob
   * 
   * Useful for preview or custom handling.
   * 
   * @param menuItems - Menu items to include
   * @returns PDF blob
   */
  async generatePriceListBlob(menuItems: MenuItem[]): Promise<Blob> {
    try {
      const doc = this.generatePriceListPDF(menuItems);
      return doc.output('blob');
    } catch (error) {
      if (error instanceof PriceListServiceError) {
        throw error;
      }
      throw new PriceListServiceError(
        'Falha ao gerar o ficheiro PDF',
        'BLOB_GENERATION_ERROR'
      );
    }
  }
}

/**
 * Global price list service instance
 */
export const priceListService = new PriceListService();

export default priceListService;
