/**
 * MenuItem Component
 * 
 * Displays a single menu item card with name, price, and stock level.
 * Clickable to select the item.
 * 
 * Requirements:
 * - 2.1, 2.2, 2.3: Responsive design
 * - 4.8: Display item name, price, and stock level
 */

import { MenuItem as MenuItemType } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface MenuItemProps {
  /**
   * Menu item to display
   */
  item: MenuItemType;
  
  /**
   * Callback when item is selected
   */
  onSelect: (item: MenuItemType) => void;
  
  /**
   * Optional CSS classes
   */
  className?: string;
}

/**
 * MenuItem component
 * 
 * Displays individual menu item as a clickable card
 */
export function MenuItem({ item, onSelect, className = '' }: MenuItemProps) {
  const isOutOfStock = item.stockLevel === 0;

  return (
    <Card
      className={`
        cursor-pointer 
        transition-all 
        hover:shadow-lg 
        hover:scale-[1.02]
        active:scale-[0.98]
        ${isOutOfStock ? 'opacity-60' : ''}
        ${className}
      `}
      onClick={() => onSelect(item)}
      role="button"
      tabIndex={0}
      aria-label={`${item.name}, ${item.price.toFixed(2)} euros, stock: ${item.stockLevel}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(item);
        }
      }}
    >
      <CardContent className="p-4">
        {/* Item Name */}
        <h3 className="font-semibold text-lg mb-2 line-clamp-2 min-h-[56px]">
          {item.name}
        </h3>

        {/* Price and Stock Row */}
        <div className="flex items-center justify-between gap-2">
          {/* Price */}
          <div className="text-2xl font-bold text-primary">
            €{item.price.toFixed(2)}
          </div>

          {/* Stock Level */}
          <div
            className={`
              flex items-center gap-1 text-sm font-medium
              ${isOutOfStock ? 'text-destructive' : 'text-muted-foreground'}
            `}
          >
            {isOutOfStock && (
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
            )}
            <span>
              Stock: {item.stockLevel}
            </span>
          </div>
        </div>

        {/* Out of stock warning */}
        {isOutOfStock && (
          <div className="mt-2 text-xs text-destructive font-medium">
            Sem stock disponível
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MenuItem;
