/**
 * Página de Stock - visão geral do stock atual
 */

import { StockDashboard } from '@/components/stock/StockDashboard';

export default function StockPage() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Gestão de Stock</h1>
      <StockDashboard />
    </div>
  );
}
