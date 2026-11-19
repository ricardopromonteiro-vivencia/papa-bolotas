/**
 * CategoryFilter Component
 * 
 * Displays category buttons for filtering menu items.
 * Shows "All" option plus all available categories.
 * 
 * Requirements:
 * - 2.1, 2.2, 2.3: Responsive design across screen sizes
 * - 4.8: Display menu items grouped by category
 */

import { Category } from '@/types';
import { Button } from '@/components/ui/button';

interface CategoryFilterProps {
  /**
   * Currently selected category (null for "All")
   */
  selectedCategory: Category | null;
  
  /**
   * Callback when a category is selected
   */
  onSelectCategory: (category: Category | null) => void;
  
  /**
   * Optional CSS classes
   */
  className?: string;
}

/**
 * CategoryFilter component
 * 
 * Provides category filter buttons with responsive layout
 */
export function CategoryFilter({
  selectedCategory,
  onSelectCategory,
  className = '',
}: CategoryFilterProps) {
  // All available categories
  const categories = [
    { label: 'Todos', value: null },
    { label: Category.SANDES, value: Category.SANDES },
    { label: Category.TABUAS, value: Category.TABUAS },
    { label: Category.BATATAS, value: Category.BATATAS },
    { label: Category.DOCES, value: Category.DOCES },
    { label: Category.BEBIDAS, value: Category.BEBIDAS },
  ];

  return (
    <div
      className={`flex flex-wrap gap-2 ${className}`}
      role="toolbar"
      aria-label="Filtro de categorias"
    >
      {categories.map(({ label, value }) => {
        const isSelected = selectedCategory === value;
        
        return (
          <Button
            key={value || 'all'}
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelectCategory(value)}
            className={`
              min-w-[80px]
              ${isSelected ? 'font-semibold' : ''}
            `}
            aria-pressed={isSelected}
            aria-label={`Filtrar por ${label}`}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}

export default CategoryFilter;
