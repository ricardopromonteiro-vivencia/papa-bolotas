/**
 * Stock Page - Stock management
 */

import { useState } from 'react';
import { StockDashboard } from '@/components/stock/StockDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function StockPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUpdate = () => {
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Gestão de Stock</h1>

      <Tabs defaultValue="dashboard">
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">Stock Atual</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <StockDashboard key={refreshKey} onRefresh={handleUpdate} />
        </TabsContent>
      </Tabs>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
        <p className="text-sm text-muted-foreground">
          💡 Nota: Os ajustes de stock e registo de perdas estão disponíveis nos componentes de stock individuais.
          Esta página mostra apenas a visão geral do stock atual.
        </p>
      </div>
    </div>
  );
}
