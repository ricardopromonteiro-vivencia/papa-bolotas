/**
 * MenuItem Component
 * 
 * Displays a single menu item card with name, price, and stock level.
 * Clickable to select the item.
 * 
 * - Artigos sem controlo de stock não mostram o número de stock.
 * - Artigos bloqueados (esgotados) aparecem marcados; a página de Vendas não os deixa
 *   adicionar ao pedido (nas Definições continuam a abrir para editar/desbloquear).
 * 
 * Requirements:
 * - 2.1, 2.2, 2.3: Responsive design
 * - 4.8: Display item name, price, and stock level
 */

import { MenuItem as MenuItemType, tracksStock, isItemAvailable, isSellable } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Ban } from 'lucide-react';

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
  const hasStock = tracksStock(item);
  // Esgotado: bloqueado à mão ou com controlo de stock e stock a 0
  const blocked = !isSellable(item);
  const blockedByHand = !isItemAvailable(item);

  const label = [
    item.name,
    `${item.price.toFixed(2)} euros`,
    blocked ? 'esgotado' : hasStock ? `stock: ${item.stockLevel}` : 'sem controlo de stock',
  ].join(', ');

  return (
    <Card
      className={`
        cursor-pointer 
        transition-all 
        hover:shadow-lg 
        hover:scale-[1.02]
        active:scale-[0.98]
        ${blocked ? 'opacity-50 border-red-300 bg-gray-50' : ''}
        ${className}
      `}
      onClick={() => onSelect(item)}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-disabled={blocked || undefined}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(item);
        }
      }}
    >
      <CardContent className="p-4">
        {/* Item Name */}
        <h3 className={`font-semibold text-lg mb-2 line-clamp-2 min-h-[56px] ${blocked ? 'line-through text-gray-500' : ''}`}>
          {item.name}
        </h3>

        {/* Price and Stock Row */}
        <div className="flex items-center justify-between gap-2">
          {/* Price */}
          <div className="text-2xl font-bold text-primary">
            €{item.price.toFixed(2)}
          </div>

          {/* Estado: esgotado / stock */}
          {blocked ? (
            <div className="flex items-center gap-1 text-sm font-semibold text-red-700">
              <Ban className="h-4 w-4" aria-hidden="true" />
              <span>Esgotado</span>
            </div>
          ) : hasStock ? (
            <div
              className={`
                flex items-center gap-1 text-sm font-medium
                ${item.stockLevel < 5 ? 'text-amber-700' : 'text-muted-foreground'}
              `}
            >
              {item.stockLevel < 5 && <AlertCircle className="h-4 w-4" aria-hidden="true" />}
              <span>
                Stock: {item.stockLevel}
              </span>
            </div>
          ) : null}
        </div>

        {/* Porque está esgotado */}
        {blocked && (
          <div className="mt-2 text-xs text-red-700 font-medium">
            {blockedByHand ? 'Bloqueado nas Definições' : 'Stock a 0 — reponha na página Stock'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MenuItem;
