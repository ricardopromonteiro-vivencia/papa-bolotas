/**
 * Receipt Service
 * 
 * Handles receipt generation and formatting for thermal printers.
 * Formats receipts with 32-character width suitable for thermal printer output.
 * 
 * Requirements:
 * - 12.1: Generate receipt when order is registered
 * - 12.2: Include restaurant name "Papa Bolotas"
 * - 12.3: Include order number, date, and time
 * - 12.4: List all menu items with quantities, prices, and subtotals
 * - 12.5: Display order total
 * - 12.6: Include customer observations
 * - 12.7: Display "OFERTA" indicator for complimentary orders
 * - 12.8: Format for thermal printer (32-character width)
 */

import { Order, OrderItem } from '@/types';

/**
 * Receipt data structure
 */
export interface ReceiptData {
  orderId: string;
  orderNumber: number;
  date: Date;
  items: OrderItem[];
  total: number;
  isComplimentary: boolean;
  isCancellation: boolean;
  observations?: string;
  cancellationReason?: string;
}

/**
 * Custom error class for receipt service failures
 */
export class ReceiptServiceError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ReceiptServiceError';
  }
}

/**
 * Receipt Service
 * 
 * Provides receipt generation with thermal printer formatting (32 characters wide).
 * All text is formatted in Portuguese as per requirements.
 */
export class ReceiptService {
  /**
   * Maximum line width for thermal printer
   */
  private readonly LINE_WIDTH = 32;

  /**
   * Pad a string to center it within the line width
   * 
   * @param text - Text to center
   * @returns Centered text
   */
  private centerText(text: string): string {
    const padding = Math.max(0, Math.floor((this.LINE_WIDTH - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  /**
   * Create a line with text on left and right
   * 
   * @param left - Left-aligned text
   * @param right - Right-aligned text
   * @returns Formatted line
   */
  private createLine(left: string, right: string): string {
    const spacesNeeded = this.LINE_WIDTH - left.length - right.length;
    if (spacesNeeded < 0) {
      // Text is too long, truncate left text
      const truncatedLeft = left.substring(0, this.LINE_WIDTH - right.length - 3) + '...';
      return truncatedLeft + right;
    }
    return left + ' '.repeat(spacesNeeded) + right;
  }

  /**
   * Create a separator line
   * 
   * @param char - Character to use for separator (default: '-')
   * @returns Separator line
   */
  private separator(char: string = '-'): string {
    return char.repeat(this.LINE_WIDTH);
  }



  /**
   * Format currency amount
   * 
   * @param amount - Amount in euros
   * @returns Formatted currency string (e.g., "5,50€")
   */
  private formatCurrency(amount: number): string {
    return amount.toFixed(2).replace('.', ',') + '€';
  }

  /**
   * Format date and time
   * 
   * @param date - Date to format
   * @returns Formatted date string (e.g., "25/12/2024 14:30")
   */
  private formatDateTime(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  /**
   * Wrap long text into multiple lines
   * 
   * @param text - Text to wrap
   * @param maxWidth - Maximum width per line
   * @returns Array of wrapped lines
   */
  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      
      if (testLine.length <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [''];
  }

  /**
   * Generate receipt text for an order
   * 
   * Requirement 12.1-12.8: Complete receipt generation
   * 
   * @param receiptData - Receipt data containing order information
   * @returns Formatted receipt text (32 characters wide)
   */
  generateReceipt(receiptData: ReceiptData): string {
    try {
      // Validate input
      if (!receiptData) {
        throw new ReceiptServiceError(
          'Os dados do recibo são obrigatórios',
          'INVALID_RECEIPT_DATA'
        );
      }

      if (!receiptData.items || receiptData.items.length === 0) {
        throw new ReceiptServiceError(
          'O recibo deve conter pelo menos um artigo',
          'EMPTY_RECEIPT'
        );
      }

      const lines: string[] = [];

      // Header - Restaurant name (Requirement 12.2)
      lines.push('');
      lines.push(this.centerText('PAPA BOLOTAS'));
      lines.push(this.separator('='));
      lines.push('');

      // Cancellation indicator if applicable
      if (receiptData.isCancellation) {
        lines.push(this.centerText('*** ANULAÇÃO ***'));
        lines.push('');
      }

      // Order number and date/time (Requirement 12.3)
      lines.push(this.createLine('Pedido:', `#${receiptData.orderNumber}`));
      lines.push(this.formatDateTime(receiptData.date));
      lines.push(this.separator('-'));
      lines.push('');

      // Order items (Requirement 12.4)
      for (const item of receiptData.items) {
        // Item name with quantity
        const itemLine = `${item.quantity}x ${item.menuItemName}`;
        const wrappedItemLines = this.wrapText(itemLine, this.LINE_WIDTH);
        
        // First line with price
        if (wrappedItemLines.length > 0) {
          const firstLine = wrappedItemLines[0];
          if (firstLine) {
            const priceText = this.formatCurrency(item.subtotal);
            lines.push(this.createLine(firstLine, priceText));
            
            // Additional wrapped lines (if item name is long)
            for (let i = 1; i < wrappedItemLines.length; i++) {
              const wrappedLine = wrappedItemLines[i];
              if (wrappedLine) {
                lines.push(wrappedLine);
              }
            }
          }
        }
      }

      lines.push('');
      lines.push(this.separator('-'));

      // Total (Requirement 12.5)
      lines.push(this.createLine('TOTAL:', this.formatCurrency(receiptData.total)));

      // Complimentary indicator (Requirement 12.7)
      if (receiptData.isComplimentary) {
        lines.push('');
        lines.push(this.centerText('*** OFERTA ***'));
      }

      // Observations (Requirement 12.6)
      if (receiptData.observations && receiptData.observations.trim()) {
        lines.push('');
        lines.push(this.separator('-'));
        lines.push('Observações:');
        const obsLines = this.wrapText(receiptData.observations, this.LINE_WIDTH);
        obsLines.forEach(line => lines.push(line));
      }

      // Cancellation reason (for cancellation receipts)
      if (receiptData.isCancellation && receiptData.cancellationReason) {
        lines.push('');
        lines.push(this.separator('-'));
        lines.push('Motivo:');
        const reasonLines = this.wrapText(receiptData.cancellationReason, this.LINE_WIDTH);
        reasonLines.forEach(line => lines.push(line));
      }

      // Footer
      lines.push('');
      lines.push(this.separator('='));
      lines.push(this.centerText('Obrigado!'));
      lines.push('');

      // Join all lines with newline character
      return lines.join('\n');
    } catch (error) {
      if (error instanceof ReceiptServiceError) {
        throw error;
      }
      throw new ReceiptServiceError(
        'Falha ao gerar o recibo',
        'RECEIPT_GENERATION_ERROR'
      );
    }
  }

  /**
   * Generate receipt from Order object
   * 
   * Convenience method to generate receipt directly from an Order.
   * 
   * @param order - Order object
   * @returns Formatted receipt text
   */
  generateReceiptFromOrder(order: Order): string {
    const receiptData: ReceiptData = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      date: order.createdAt,
      items: order.items,
      total: order.total,
      isComplimentary: order.isComplimentary,
      isCancellation: false,
      observations: order.observations,
    };

    return this.generateReceipt(receiptData);
  }

  /**
   * Generate cancellation receipt
   * 
   * Creates a receipt documenting the cancellation of an order.
   * 
   * Requirement 7.8: Generate cancellation receipt
   * 
   * @param order - Cancelled order
   * @param cancellationReason - Reason for cancellation
   * @returns Formatted cancellation receipt text
   */
  generateCancellationReceipt(order: Order, cancellationReason?: string): string {
    if (!order.isCancelled) {
      throw new ReceiptServiceError(
        'O pedido não está cancelado',
        'ORDER_NOT_CANCELLED'
      );
    }

    const receiptData: ReceiptData = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      date: order.cancelledAt || order.createdAt,
      items: order.items,
      total: 0, // Cancelled orders have zero total
      isComplimentary: false,
      isCancellation: true,
      observations: order.observations,
      cancellationReason: cancellationReason || 'Pedido anulado',
    };

    return this.generateReceipt(receiptData);
  }

  /**
   * Validate that receipt text meets thermal printer constraints
   * 
   * Verifies all lines are within 32-character width.
   * 
   * @param receiptText - Generated receipt text
   * @returns true if valid, false otherwise
   */
  validateReceiptFormat(receiptText: string): boolean {
    const lines = receiptText.split('\n');
    
    for (const line of lines) {
      if (line.length > this.LINE_WIDTH) {
        if (import.meta.env.DEV) {
          console.warn(`Receipt line exceeds ${this.LINE_WIDTH} characters: "${line}" (${line.length} chars)`);
        }
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get receipt line width
   * 
   * @returns Line width for thermal printer
   */
  getLineWidth(): number {
    return this.LINE_WIDTH;
  }
}

/**
 * Global receipt service instance
 */
export const receiptService = new ReceiptService();

export default receiptService;
