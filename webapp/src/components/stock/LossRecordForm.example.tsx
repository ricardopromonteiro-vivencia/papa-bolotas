/**
 * LossRecordForm Example Usage
 * 
 * This file demonstrates how to use the LossRecordForm component
 */

import { useState } from 'react';
import { LossRecordForm } from './LossRecordForm';
import { Category, MenuItem } from '@/types';

/**
 * Example showing LossRecordForm with a sample menu item
 */
export function LossRecordFormExample() {
  const [menuItem] = useState<MenuItem>({
    id: '1',
    name: 'Sandes de Leitão',
    category: Category.SANDES,
    price: 6.50,
    stockLevel: 15,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  });

  const handleSuccess = () => {
    console.log('Loss recorded successfully!');
    // Reload menu items or update UI
  };

  const handleCancel = () => {
    console.log('Loss recording cancelled');
    // Navigate away or close modal
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Registar Perda/Quebra - Exemplo</h1>
      
      <LossRecordForm 
        item={menuItem}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
      
      <div className="mt-8 p-4 border rounded-lg bg-muted/50">
        <h2 className="font-semibold mb-2">Funcionalidades:</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Valida quantidade positiva inteira</li>
          <li>Mostra aviso se a quantidade excede o stock atual</li>
          <li>Requer confirmação para perdas acima do stock</li>
          <li>Regista evento com timestamp automaticamente</li>
          <li>Motivo obrigatório para tracking</li>
        </ul>
      </div>
    </div>
  );
}

export default LossRecordFormExample;
