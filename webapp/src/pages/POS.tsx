/**
 * POS Page - Main order panel
 * 
 * Layout: menu grid on the left, order panel on the right.
 * Uses the existing MenuGrid, OrderPanel, OrderHistory and SessionStatusDisplay components.
 */

import { useRef, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { sessionService } from '@/services/session.service';
import { MenuGrid } from '@/components/menu/MenuGrid';
import { OrderPanel, OrderPanelRef } from '@/components/orders/OrderPanel';
import { OrderHistory } from '@/components/orders/OrderHistory';
import { SessionStatusDisplay } from '@/components/session/SessionStatusDisplay';
import { CashRegisterClosure } from '@/components/session/CashRegisterClosure';
import { PrinterStatusCard } from '@/components/printer/PrinterStatus';
import { MenuItem, Session } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DoorOpen } from 'lucide-react';

export default function POSPage() {
  const { user } = useAuth();
  const orderPanelRef = useRef<OrderPanelRef>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [closureOpen, setClosureOpen] = useState(false);
  // Recarrega a lista de artigos depois de cada pedido (stock atualizado e esgotados bloqueados)
  const [menuRefresh, setMenuRefresh] = useState(0);

  /* ── start / restore session ── */
  useEffect(() => {
    if (!user) return;

    const initSession = async () => {
      try {
        let active = await sessionService.getActiveSession(user.id);
        if (!active) {
          active = await sessionService.startSession(user.id);
        }
        setSession(active);
      } catch (err) {
        console.error('Failed to init session:', err);
      }
    };

    initSession();
  }, [user]);

  const handleItemSelect = (item: MenuItem) => {
    orderPanelRef.current?.addItem(item);
  };

  const handleClosureSuccess = async () => {
    setClosureOpen(false);
    // Start new session
    if (user) {
      const newSession = await sessionService.startSession(user.id);
      setSession(newSession);
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">A iniciar sessão...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2 bg-white border-b border-gray-200 shrink-0">
        <SessionStatusDisplay sessionId={session.id} />
        <PrinterStatusCard className="w-full sm:w-auto sm:max-w-xs" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setClosureOpen(true)}
          className="ml-auto text-red-600 border-red-200 hover:bg-red-50"
        >
          <DoorOpen className="h-4 w-4 mr-1" />
          Fechar Caixa
        </Button>
      </div>

      {/* ── Layout principal: 2 colunas no computador, empilhado no telemóvel ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: menu + history (tabs on mobile) */}
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="menu" className="h-full flex flex-col">
            <TabsList className="mx-4 mt-3 shrink-0">
              <TabsTrigger value="menu" className="flex-1">Menu</TabsTrigger>
              <TabsTrigger value="history" className="flex-1">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="menu" className="flex-1 overflow-y-auto px-4 pb-4">
              <MenuGrid key={menuRefresh} onItemSelect={handleItemSelect} />
            </TabsContent>

            <TabsContent value="history" className="flex-1 overflow-y-auto px-4 pb-4">
              <OrderHistory sessionId={session.id} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Painel do pedido: um único componente (à direita no computador, em baixo no telemóvel).
            Tem de ser só um, porque o ref aponta sempre para a última instância montada. */}
        <div className="shrink-0 w-full md:w-80 lg:w-96 max-h-[45vh] md:max-h-none border-t md:border-t-0 md:border-l border-gray-200 bg-white overflow-y-auto">
          <OrderPanel
            ref={orderPanelRef}
            sessionId={session.id}
            onOrderRegistered={() => setMenuRefresh(k => k + 1)}
          />
        </div>
      </div>

      {/* Cash register closure dialog */}
      <Dialog open={closureOpen} onOpenChange={setClosureOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Fechar Caixa</DialogTitle>
          </DialogHeader>
          <CashRegisterClosure
            sessionId={session.id}
            onSuccess={handleClosureSuccess}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
