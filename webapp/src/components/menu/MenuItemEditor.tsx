/**
 * MenuItemEditor Component
 * 
 * Form component for creating and editing menu items.
 * Supports both create and edit modes with validation.
 * 
 * Requirements:
 * - 4.2: Add/update menu items with name, category, price, stock
 * - 4.3: Validate price > 0, required fields
 * - 4.6: Support Portuguese characters in names
 * 
 * @component
 */

import { useState, useEffect } from 'react';
import { Category, MenuItem, tracksStock, isItemAvailable } from '@/types';
import { createMenuItemSchema, validateFormData } from '@/types/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2 } from 'lucide-react';

interface MenuItemEditorProps {
  /** Existing menu item to edit (undefined for create mode) */
  item?: MenuItem;
  /** Callback when form is saved successfully */
  onSave: (item: Partial<MenuItem>) => void | Promise<void>;
  /** Callback when form is cancelled */
  onCancel?: () => void;
  /** Callback to delete the item (edit mode only); errors are shown in the form */
  onDelete?: (item: MenuItem) => void | Promise<void>;
  /** Loading state while saving */
  isLoading?: boolean;
}

interface FormData {
  name: string;
  category: Category | '';
  price: string;
  stockLevel: string;
}

interface FormErrors {
  name?: string;
  category?: string;
  price?: string;
  stockLevel?: string;
  general?: string;
}

/**
 * MenuItemEditor form component for adding and editing menu items
 * 
 * Features:
 * - Validates all fields before submission
 * - Price must be greater than zero
 * - Stock level must be non-negative integer
 * - Portuguese character support in names
 * - Displays field-level error messages
 * - Supports both create and edit modes
 */
export function MenuItemEditor({
  item,
  onSave,
  onCancel,
  onDelete,
  isLoading = false,
}: MenuItemEditorProps) {
  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: item?.name || '',
    category: item?.category || '',
    price: item?.price.toFixed(2) || '',
    stockLevel: item?.stockLevel.toString() || '0',
  });

  // Sem controlo de stock → o campo de stock desaparece
  const [trackStock, setTrackStock] = useState(item ? tracksStock(item) : true);
  // Bloqueado (esgotado) → não pode ser adicionado a pedidos
  const [available, setAvailable] = useState(item ? isItemAvailable(item) : true);

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<keyof FormData, boolean>>({
    name: false,
    category: false,
    price: false,
    stockLevel: false,
  });

  // Update form when item prop changes (edit mode)
  useEffect(() => {
    if (item) {
      setTrackStock(tracksStock(item));
      setAvailable(isItemAvailable(item));
      setFormData({
        name: item.name,
        category: item.category,
        price: item.price.toFixed(2),
        stockLevel: item.stockLevel.toString(),
      });
    }
  }, [item]);

  // Get categories array for dropdown
  const categories = Object.values(Category);

  /**
   * Validates a single field
   */
  const validateField = (name: keyof FormData, value: string) => {
    const newErrors = { ...errors };

    switch (name) {
      case 'name':
        if (!value.trim()) {
          newErrors.name = 'O nome é obrigatório';
        } else if (value.length > 100) {
          newErrors.name = 'O nome não pode ter mais de 100 caracteres';
        } else {
          delete newErrors.name;
        }
        break;

      case 'category':
        if (!value) {
          newErrors.category = 'A categoria é obrigatória';
        } else {
          delete newErrors.category;
        }
        break;

      case 'price':
        const priceNum = parseFloat(value);
        if (!value) {
          newErrors.price = 'O preço é obrigatório';
        } else if (isNaN(priceNum)) {
          newErrors.price = 'O preço deve ser um número válido';
        } else if (priceNum <= 0) {
          newErrors.price = 'O preço deve ser maior que zero';
        } else if (priceNum > 9999.99) {
          newErrors.price = 'Preço demasiado alto (máx. 9999.99)';
        } else {
          delete newErrors.price;
        }
        break;

      case 'stockLevel':
        const stockNum = parseInt(value, 10);
        if (!value && value !== '0') {
          newErrors.stockLevel = 'O nível de stock é obrigatório';
        } else if (isNaN(stockNum)) {
          newErrors.stockLevel = 'O stock deve ser um número válido';
        } else if (stockNum < 0) {
          newErrors.stockLevel = 'O stock não pode ser negativo';
        } else if (!Number.isInteger(stockNum)) {
          newErrors.stockLevel = 'O stock deve ser um número inteiro';
        } else {
          delete newErrors.stockLevel;
        }
        break;
    }

    setErrors(newErrors);
  };

  /**
   * Handles input field changes
   */
  const handleInputChange = (name: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Validate field if it has been touched
    if (touched[name]) {
      validateField(name, value);
    }
  };

  /**
   * Handles field blur (marks field as touched)
   */
  const handleBlur = (name: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    validateField(name, formData[name]);
  };

  /**
   * Validates entire form
   */
  /** Sem controlo de stock: mantém o valor que já existia (não destrói dados) ou 0 num artigo novo. */
  const stockWhenUntracked = () => {
    const n = parseInt(formData.stockLevel, 10);
    return Number.isInteger(n) && n >= 0 ? n : 0;
  };

  const validateForm = (): boolean => {
    // Mark all fields as touched
    setTouched({
      name: true,
      category: true,
      price: true,
      stockLevel: true,
    });

    // Validate all fields (sem controlo de stock, o campo de stock não conta)
    Object.keys(formData).forEach((key) => {
      if (key === 'stockLevel' && !trackStock) return;
      validateField(key as keyof FormData, formData[key as keyof FormData]);
    });

    // Check if any field is empty
    if (!formData.name.trim()) {
      setErrors((prev) => ({ ...prev, name: 'O nome é obrigatório' }));
      return false;
    }
    if (!formData.category) {
      setErrors((prev) => ({ ...prev, category: 'A categoria é obrigatória' }));
      return false;
    }
    if (!formData.price) {
      setErrors((prev) => ({ ...prev, price: 'O preço é obrigatório' }));
      return false;
    }
    if (trackStock && !formData.stockLevel && formData.stockLevel !== '0') {
      setErrors((prev) => ({ ...prev, stockLevel: 'O nível de stock é obrigatório' }));
      return false;
    }

    // Use Zod schema for final validation
    const validationData = {
      name: formData.name.trim(),
      category: formData.category,
      price: parseFloat(formData.price),
      stockLevel: trackStock ? parseInt(formData.stockLevel, 10) : stockWhenUntracked(),
      isActive: item?.isActive ?? true,
      trackStock,
      isAvailable: available,
      // Artigos criados por SQL têm last_modified_by a null; o schema só aceita uuid ou undefined
      lastModifiedBy: item?.lastModifiedBy ?? undefined,
    };

    const result = validateFormData(createMenuItemSchema, validationData);

    if (!result.success) {
      // Erros sem campo visível no formulário passam a aparecer como erro geral
      const visibleFields = ['name', 'category', 'price', 'stockLevel'];
      const hidden = Object.entries(result.errors).filter(([key]) => !visibleFields.includes(key));
      setErrors(
        hidden.length > 0
          ? { ...result.errors, general: `Dados inválidos: ${hidden.map(([, msg]) => msg).join('; ')}` }
          : result.errors
      );
      return false;
    }

    return true;
  };

  /**
   * Handles form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const itemData: Partial<MenuItem> = {
        name: formData.name.trim(),
        category: formData.category as Category,
        price: parseFloat(formData.price),
        stockLevel: trackStock ? parseInt(formData.stockLevel, 10) : stockWhenUntracked(),
        trackStock,
        isAvailable: available,
      };

      // If editing, include the id
      if (item) {
        itemData.id = item.id;
      }

      await onSave(itemData);

      // Clear form if in create mode
      if (!item) {
        setFormData({
          name: '',
          category: '',
          price: '',
          stockLevel: '0',
        });
        setErrors({});
        setTouched({
          name: false,
          category: false,
          price: false,
          stockLevel: false,
        });
      }
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Erro ao guardar o artigo',
      });
    }
  };

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!item || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete(item);
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : 'Erro ao eliminar o artigo' });
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  /**
   * Handles cancel button
   */
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const isEditMode = !!item;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Título do formulário */}
      <div>
        <h3 className="text-lg font-semibold">
          {isEditMode ? 'Editar Artigo do Menu' : 'Adicionar Novo Artigo ao Menu'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isEditMode
            ? 'Atualize os detalhes deste artigo do menu'
            : 'Introduza os detalhes do novo artigo do menu'}
        </p>
      </div>

      {/* Erro geral */}
      {errors.general && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {errors.general}
        </div>
      )}

      {/* Nome */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Nome <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          onBlur={() => handleBlur('name')}
          placeholder="ex: Sandes de Presunto"
          maxLength={100}
          disabled={isLoading}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && touched.name && (
          <p id="name-error" className="text-sm text-destructive">
            {errors.name}
          </p>
        )}
      </div>

      {/* Categoria */}
      <div className="space-y-2">
        <Label htmlFor="category">
          Categoria <span className="text-destructive">*</span>
        </Label>
        <Select
          value={formData.category}
          onValueChange={(value) => {
            handleInputChange('category', value);
            setTouched((prev) => ({ ...prev, category: true }));
            validateField('category', value);
          }}
          disabled={isLoading}
        >
          <SelectTrigger
            id="category"
            aria-invalid={!!errors.category}
            aria-describedby={errors.category ? 'category-error' : undefined}
          >
            <SelectValue placeholder="Selecionar categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && touched.category && (
          <p id="category-error" className="text-sm text-destructive">
            {errors.category}
          </p>
        )}
      </div>

      {/* Preço */}
      <div className="space-y-2">
        <Label htmlFor="price">
          Preço (€) <span className="text-destructive">*</span>
        </Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          min="0.01"
          max="9999.99"
          value={formData.price}
          onChange={(e) => handleInputChange('price', e.target.value)}
          onBlur={() => handleBlur('price')}
          placeholder="0.00"
          disabled={isLoading}
          aria-invalid={!!errors.price}
          aria-describedby={errors.price ? 'price-error' : undefined}
        />
        {errors.price && touched.price && (
          <p id="price-error" className="text-sm text-destructive">
            {errors.price}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Introduz o preço em euros (ex: 5.50)
        </p>
      </div>

      {/* Controlo de stock e disponibilidade */}
      <div className="space-y-3 rounded-md border p-3">
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1"
            checked={!trackStock}
            onChange={(e) => {
              setTrackStock(!e.target.checked);
              setErrors((prev) => { const { stockLevel: _ignored, ...rest } = prev; return rest; });
            }}
            disabled={isLoading}
          />
          <span>
            <span className="font-medium">Sem controlo de stock</span>
            <span className="block text-xs text-muted-foreground">
              O artigo não tem número de stock e não aparece na página de Stock.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1"
            checked={!available}
            onChange={(e) => setAvailable(!e.target.checked)}
            disabled={isLoading}
          />
          <span>
            <span className={`font-medium ${!available ? 'text-red-700' : ''}`}>Bloqueado (esgotado)</span>
            <span className="block text-xs text-muted-foreground">
              Não pode ser adicionado a pedidos até ser desbloqueado.
            </span>
          </span>
        </label>
      </div>

      {/* Nível de Stock (só com controlo de stock) */}
      {trackStock && (
      <div className="space-y-2">
        <Label htmlFor="stockLevel">
          {isEditMode ? 'Stock Atual' : 'Stock Inicial'} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="stockLevel"
          type="number"
          step="1"
          min="0"
          value={formData.stockLevel}
          onChange={(e) => handleInputChange('stockLevel', e.target.value)}
          onBlur={() => handleBlur('stockLevel')}
          placeholder="0"
          disabled={isLoading}
          aria-invalid={!!errors.stockLevel}
          aria-describedby={errors.stockLevel ? 'stockLevel-error' : undefined}
        />
        {errors.stockLevel && touched.stockLevel && (
          <p id="stockLevel-error" className="text-sm text-destructive">
            {errors.stockLevel}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {isEditMode
            ? 'Nível de stock atual. Usa a gestão de stock para ajustes detalhados.'
            : 'Quantidade inicial para este artigo'}
        </p>
      </div>
      )}

      {/* Eliminar (só ao editar) — pede confirmação antes */}
      {isEditMode && onDelete && (
        <div className="rounded-md border border-red-200 bg-red-50/50 p-3">
          {confirmingDelete ? (
            <div className="space-y-2">
              <p className="text-sm text-red-800">
                Eliminar <strong>{item?.name}</strong>? Deixa de aparecer no menu e no stock. Os pedidos e
                relatórios antigos mantêm-se.
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={isLoading || deleting}>
                  {deleting ? 'A eliminar...' : 'Sim, eliminar'}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                  Não
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-700 hover:bg-red-100 hover:text-red-800"
              onClick={() => setConfirmingDelete(true)}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Eliminar artigo
            </Button>
          )}
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? 'A guardar...' : isEditMode ? 'Guardar Alterações' : 'Adicionar Artigo'}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
