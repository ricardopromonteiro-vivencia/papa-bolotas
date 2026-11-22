/**
 * Settings Page - Menu management + exports
 */

import { useState } from 'react';
import { MenuGrid } from '@/components/menu/MenuGrid';
import { MenuItemEditor } from '@/components/menu/MenuItemEditor';
import { PriceListExport } from '@/components/price-list/PriceListExport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MenuItem } from '@/types';
import { menuService } from '@/services/menu.service';
import { useAuth } from '@/hooks/useAuth';
import { Plus } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const openCreate = () => {
    setEditingItem(null);
    setEditorOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    setEditorOpen(true);
  };

  const handleSaved = async (data: Partial<MenuItem>) => {
    const fields = {
      name: data.name!,
      category: data.category!,
      price: data.price!,
      stockLevel: data.stockLevel!,
      trackStock: data.trackStock !== false,
      isAvailable: data.isAvailable !== false,
      lastModifiedBy: user?.id,
    };

    // Erros lançados aqui aparecem no formulário (MenuItemEditor apanha-os)
    if (editingItem) {
      await menuService.updateMenuItem(editingItem.id, fields);
    } else {
      await menuService.createMenuItem({ ...fields, isActive: true });
    }

    setEditorOpen(false);
    setRefreshKey(k => k + 1);
  };

  // Elimina o artigo do menu (fica inativo: o histórico de pedidos mantém-se)
  const handleDelete = async (item: MenuItem) => {
    await menuService.deleteMenuItem(item.id);
    setEditorOpen(false);
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Definições</h1>

      <Tabs defaultValue="menu">
        <TabsList className="mb-6">
          <TabsTrigger value="menu">Menu</TabsTrigger>
          <TabsTrigger value="export">Exportar</TabsTrigger>
        </TabsList>

        {/* ── Menu management ── */}
        <TabsContent value="menu">
          <div className="flex justify-end mb-4">
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Artigo
            </Button>
          </div>

          {/* Re-use MenuGrid in read-only mode; click = edit */}
          <MenuGrid
            key={refreshKey}
            onItemSelect={openEdit}
          />
        </TabsContent>

        {/* ── Export ── */}
        <TabsContent value="export">
          <div className="max-w-sm space-y-4">
            <p className="text-gray-600 text-sm">
              Exporta a lista de preços atual em formato PDF pronto a imprimir.
            </p>
            <PriceListExport />
          </div>
        </TabsContent>
      </Tabs>

      {/* Create / Edit dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            {/* O título visível é o do formulário; este fica para leitores de ecrã */}
            <DialogTitle className="sr-only">
              {editingItem ? 'Editar Artigo' : 'Novo Artigo de Menu'}
            </DialogTitle>
          </DialogHeader>
          <MenuItemEditor
            key={editingItem?.id ?? 'new'}
            item={editingItem ?? undefined}
            onSave={handleSaved}
            onCancel={() => setEditorOpen(false)}
            onDelete={handleDelete}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
