/**
 * StockDashboard Component
 * 
 * Displays all menu items with their stock levels, with sorting and filtering capabilities.
 * Shows low stock warnings when stock reaches zero.
 * 
 * Requirements:
 * - 8.2: Display current stock level for all menu items
 * - 8.5: Display low stock warning when stock = 0
 */

import { useState, useEffect, useMemo } from 'react';
import { StockLevel } from '@/types';
import { stockService } from '@/services/stock.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Loader2, 
  AlertCircle, 
  AlertTriangle,
  Package,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
} from 'lucide-react';

/**
 * Sort options for stock items
 */
type SortOption = 'name-asc' | 'name-desc' | 'stock-asc' | 'stock-desc';

/**
 * Filter options for stock items
 */
type FilterOption = 'all' | 'low-stock' | 'in-stock' | 'category';

interface StockDashboardProps {
  /**
   * Optional CSS classes
   */
  className?: string;
  
  /**
   * Optional callback when refresh is triggered
   */
  onRefresh?: () => void;
}

/**
 * StockDashboard component
 * 
 * Displays comprehensive stock overview with real-time updates
 */
export function StockDashboard({
  className = '',
  onRefresh,
}: StockDashboardProps) {
  // State
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('name-asc');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');

  /**
   * Load stock levels from service
   */
  const loadStockLevels = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const levels = await stockService.getStockLevels();
      setStockLevels(levels);
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to load stock levels:', err);
      setError('Falha ao carregar níveis de stock. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load stock levels on component mount and set up auto-refresh
   */
  useEffect(() => {
    loadStockLevels();
    
    // Auto-refresh every 30 seconds for real-time updates
    const intervalId = setInterval(loadStockLevels, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  /**
   * Filter, sort, and search stock items
   */
  const processedItems = useMemo(() => {
    let items = [...stockLevels];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      items = items.filter((item) =>
        item.itemName.toLowerCase().includes(query)
      );
    }

    // Apply filter options
    if (filterOption === 'low-stock') {
      items = items.filter((item) => item.currentLevel === 0);
    } else if (filterOption === 'in-stock') {
      items = items.filter((item) => item.currentLevel > 0);
    }

    // Apply sorting
    items.sort((a, b) => {
      switch (sortOption) {
        case 'name-asc':
          return a.itemName.localeCompare(b.itemName);
        case 'name-desc':
          return b.itemName.localeCompare(a.itemName);
        case 'stock-asc':
          return a.currentLevel - b.currentLevel;
        case 'stock-desc':
          return b.currentLevel - a.currentLevel;
        default:
          return 0;
      }
    });

    return items;
  }, [stockLevels, searchQuery, sortOption, filterOption]);

  /**
   * Calculate statistics
   */
  const statistics = useMemo(() => {
    const totalItems = stockLevels.length;
    const lowStockItems = stockLevels.filter((item) => item.currentLevel === 0).length;
    const inStockItems = stockLevels.filter((item) => item.currentLevel > 0).length;
    const totalStock = stockLevels.reduce((sum, item) => sum + item.currentLevel, 0);

    return { totalItems, lowStockItems, inStockItems, totalStock };
  }, [stockLevels]);

  /**
   * Handle sort option change
   */
  const handleSortChange = (value: SortOption) => {
    setSortOption(value);
  };

  /**
   * Handle filter option change
   */
  const handleFilterChange = (value: FilterOption) => {
    setFilterOption(value);
  };

  /**
   * Render sort icon based on current sort option
   */
  const renderSortIcon = () => {
    if (sortOption.includes('asc')) {
      return <ArrowUp className="h-4 w-4" />;
    } else if (sortOption.includes('desc')) {
      return <ArrowDown className="h-4 w-4" />;
    }
    return <ArrowUpDown className="h-4 w-4" />;
  };

  // Loading state
  if (loading && stockLevels.length === 0) {
    return (
      <div
        className={`flex items-center justify-center min-h-[400px] ${className}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          <p className="text-muted-foreground">A carregar stock...</p>
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
              onClick={loadStockLevels}
              className="ml-2 underline font-medium hover:no-underline"
            >
              Tentar novamente
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Main render
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Statistics */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Total</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalStock}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Stock</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statistics.inStockItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Baixo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{statistics.lowStockItems}</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls: Search, Filter, Sort */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Pesquisar item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                aria-label="Pesquisar itens de stock"
              />
            </div>

            {/* Filter */}
            <Select value={filterOption} onValueChange={handleFilterChange}>
              <SelectTrigger aria-label="Filtrar itens">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Itens</SelectItem>
                <SelectItem value="low-stock">Stock Baixo (0)</SelectItem>
                <SelectItem value="in-stock">Em Stock (&gt;0)</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortOption} onValueChange={handleSortChange}>
              <SelectTrigger aria-label="Ordenar itens">
                {renderSortIcon()}
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Nome (A-Z)</SelectItem>
                <SelectItem value="name-desc">Nome (Z-A)</SelectItem>
                <SelectItem value="stock-asc">Stock (Menor)</SelectItem>
                <SelectItem value="stock-desc">Stock (Maior)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Refresh Button */}
          <div className="mt-4">
            <Button
              onClick={loadStockLevels}
              variant="outline"
              size="sm"
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A atualizar...
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" />
                  Atualizar Stock
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {processedItems.length} {processedItems.length === 1 ? 'item encontrado' : 'itens encontrados'}
        {searchQuery && ` para "${searchQuery}"`}
      </div>

      {/* Stock Items List */}
      {processedItems.length > 0 ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {processedItems.map((item) => (
            <Card
              key={item.itemId}
              className={`transition-colors ${
                item.currentLevel === 0
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-950'
                  : ''
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base font-semibold">
                    {item.itemName}
                  </CardTitle>
                  {item.currentLevel === 0 && (
                    <AlertTriangle
                      className="h-5 w-5 text-orange-600 flex-shrink-0"
                      aria-label="Stock baixo"
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* Stock Level */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Stock Atual:</span>
                    <span
                      className={`text-2xl font-bold ${
                        item.currentLevel === 0
                          ? 'text-orange-600'
                          : item.currentLevel < 10
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      }`}
                    >
                      {item.currentLevel}
                    </span>
                  </div>

                  {/* Last Adjusted */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Última atualização:</span>
                    <span>
                      {new Date(item.lastAdjustedAt).toLocaleDateString('pt-PT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Low Stock Warning */}
                  {item.currentLevel === 0 && (
                    <Alert variant="default" className="mt-2 border-orange-500">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-xs">
                        Stock esgotado. Reabasteça este item.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nenhum item encontrado com os filtros selecionados.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default StockDashboard;
