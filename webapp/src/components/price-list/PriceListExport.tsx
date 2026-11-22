/**
 * PriceListExport Component
 * 
 * Button component for generating and downloading PDF price lists.
 * Shows loading state during generation and handles errors gracefully.
 * 
 * Requirement 13.7: Provide export function to generate PDF price list
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { priceListService } from '@/services/price-list.service';
import { menuService } from '@/services/menu.service';

interface PriceListExportProps {
  /** Optional custom button text */
  buttonText?: string;
  /** Optional button variant */
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
  /** Optional size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Optional className for styling */
  className?: string;
  /** Optional callback after successful export */
  onSuccess?: () => void;
  /** Optional callback on error */
  onError?: (error: Error) => void;
}

/**
 * Price List Export Component
 * 
 * Button that generates and downloads a PDF price list when clicked.
 */
export const PriceListExport: React.FC<PriceListExportProps> = ({
  buttonText = 'Exportar Lista de Preços',
  variant = 'default',
  size = 'default',
  className,
  onSuccess,
  onError
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  /**
   * Handle PDF generation and download
   * 
   * Requirement 13.7: Generate and download PDF price list
   */
  const handleExport = async () => {
    try {
      setIsGenerating(true);

      // Fetch active menu items
      const menuItems = await menuService.getMenuItems();

      if (menuItems.length === 0) {
        alert('Não há artigos no menu para exportar.');
        return;
      }

      // Generate and download PDF
      await priceListService.downloadPriceList(menuItems);

      // Success callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error generating price list:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Ocorreu um erro ao gerar a lista de preços.';
      
      alert(`Erro ao exportar: ${errorMessage}`);
      
      if (onError && error instanceof Error) {
        onError(error);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isGenerating}
      variant={variant}
      size={size}
      className={className}
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          A gerar PDF...
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4 mr-2" />
          {buttonText}
        </>
      )}
    </Button>
  );
};

export default PriceListExport;
