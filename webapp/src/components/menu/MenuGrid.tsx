/**
 * MenuGrid Component
 * 
 * Displays menu items in a responsive grid layout organized by category.
 * Supports category filtering and responsive design (1/2/3 columns).
 * 
 * Requirements:
 * - 2.1, 2.2, 2.3: Responsive grid layout (1/2/3 columns based on screen size)
 * - 4.8: Display item name, price, and stock level
 */

import { useState, useEffect } from 'react';
import { MenuItem as MenuItemType, Category } from '@/types';
import { menuService } from '@/services/menu.service';
import { CategoryFilter } from './CategoryFilter';
import { MenuItem } from './MenuItem';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';

interface MenuGridProps {
  /**
   * Callback when a menu item is selected
   */
  onItemSelect: (item: MenuItemType) => void;
  
  /**
   * Optional initial category filter
   */
  initialCategory?: Category | null;
  
  /**
   * Optional CSS classes
   */
  className?: string;
}

/**
 * MenuGrid component
 * 
 * Main component for displaying and filtering menu items
 */
export function MenuGrid({
  onItemSelect,
  initialCategory = null,
  className = '',
}: MenuGridProps) {
  // State
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(initialCategory);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter items based on selected category
  const filteredItems = selectedCategory
    ? menuItems.filter((item) => item.category === selectedCategory)
    : menuItems;

  /**
   * Load menu items from service
   */
  const loadMenuItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const items = await menuService.getMenuItems();
      setMenuItems(items);
    } catch (err) {
      console.error('Failed to load menu items:', err);
      setError('Falha ao carregar artigos do menu. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load menu items on component mount
   */
  useEffect(() => {
    loadMenuItems();
  }, []);

  /**
   * Handle category selection
   */
  const handleCategorySelect = (category: Category | null) => {
    setSelectedCategory(category);
  };

  /**
   * Handle item selection
   */
  const handleItemSelect = (item: MenuItemType) => {
    onItemSelect(item);
  };

  // Loading state
  if (loading) {
    return (
      <div
        className={`flex items-center justify-center min-h-[400px] ${className}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          <p className="text-muted-foreground">A carregar menu...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`${className}`}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <button
              onClick={loadMenuItems}
              className="ml-2 underline font-medium hover:no-underline"
            >
              Tentar novamente
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Empty state
  if (menuItems.length === 0) {
    return (
      <div className={`${className}`}>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nenhum artigo de menu disponível. Adicione artigos para começar.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Main render
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Category Filter */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 border-b">
        <CategoryFilter
          selectedCategory={selectedCategory}
          onSelectCategory={handleCategorySelect}
        />
      </div>

      {/* Items Count */}
      <div className="text-sm text-muted-foreground">
        {filteredItems.length} {filteredItems.length === 1 ? 'artigo' : 'artigos'}
        {selectedCategory && ` em ${selectedCategory}`}
      </div>

      {/* Menu Items Grid */}
      {filteredItems.length > 0 ? (
        <div
          className={`
            grid gap-4
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-3
          `}
          role="list"
          aria-label="Artigos do menu"
        >
          {filteredItems.map((item) => (
            <div key={item.id} role="listitem">
              <MenuItem item={item} onSelect={handleItemSelect} />
            </div>
          ))}
        </div>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nenhum artigo encontrado nesta categoria.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default MenuGrid;
