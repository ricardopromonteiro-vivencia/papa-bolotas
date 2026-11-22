/**
 * ReceiptPreview Component
 * 
 * Displays formatted receipt with print functionality.
 * Supports thermal printer format (32 characters wide) with proper monospace display.
 * Shows different layout for complimentary orders.
 * 
 * Requirements:
 * - 12.9: Provide print function to send receipts to connected printers
 * - 12.10: Support browser print dialog for receipt printing
 */

import { Order } from '@/types';
import { receiptService } from '@/services/receipt.service';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ReceiptPreviewProps {
  /** Order to display as receipt */
  order: Order;
}

export const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({ order }) => {
  const [receiptText, setReceiptText] = useState<string>('');
  const receiptRef = useRef<HTMLDivElement>(null);

  /**
   * Generate receipt text when order changes
   */
  useEffect(() => {
    try {
      const text = receiptService.generateReceiptFromOrder(order);
      setReceiptText(text);
    } catch (error) {
      console.error('Failed to generate receipt:', error);
      setReceiptText('Erro ao gerar o recibo');
    }
  }, [order]);

  /**
   * Handle print button click
   * 
   * Requirement 12.9: Provide print function
   * Requirement 12.10: Support browser print dialog
   */
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="receipt-preview-container">
      {/* Print Button - Hidden during print */}
      <div className="print:hidden mb-4">
        <Button
          onClick={handlePrint}
          variant="default"
          size="default"
          className="w-full"
        >
          <Printer className="h-4 w-4 mr-2" />
          Imprimir Recibo
        </Button>
      </div>

      {/* Receipt Display */}
      <div
        ref={receiptRef}
        className="receipt-preview bg-white border border-gray-300 rounded p-4 shadow-sm"
      >
        <pre className="receipt-text font-mono text-sm whitespace-pre overflow-x-auto">
          {receiptText}
        </pre>
      </div>

      {/* Print Styles */}
      <style>{`
        /* Print media query for thermal printer optimization */
        @media print {
          /* Hide everything except receipt */
          body * {
            visibility: hidden;
          }
          
          .receipt-preview-container,
          .receipt-preview-container * {
            visibility: visible;
          }
          
          .receipt-preview-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          
          /* Optimize for thermal printer (80mm width) */
          .receipt-preview {
            width: 80mm;
            max-width: 80mm;
            margin: 0;
            padding: 0;
            border: none;
            box-shadow: none;
          }
          
          .receipt-text {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12pt;
            line-height: 1.2;
            margin: 0;
            padding: 0;
          }
          
          /* Remove page margins for thermal printer */
          @page {
            margin: 0;
            size: 80mm auto;
          }
        }
        
        /* Screen display styles */
        @media screen {
          .receipt-preview {
            max-width: 400px;
            margin: 0 auto;
          }
          
          .receipt-text {
            font-size: 14px;
            line-height: 1.4;
            color: #000;
          }
        }
      `}</style>
    </div>
  );
};

export default ReceiptPreview;
