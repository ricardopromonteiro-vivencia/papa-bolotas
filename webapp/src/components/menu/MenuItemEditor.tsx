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
import { Category, MenuItem } from '@/types';
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

interface MenuItemEditorProps {
  /** Existing menu item to edit (undefined for create mode) */
  item?: MenuItem;
  /** Callback when form is saved successfully */
  onSave: (item: Partial<MenuItem>) => void | Promise<void>;
  /** Callback when form is cancelled */
  onCancel?: () => void;
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
  isLoading = false,
}: MenuItemEditorProps) {
  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: item?.name || '',
    category: item?.category || '',
    price: item?.price.toFixed(2) || '',
    stockLevel: item?.stockLevel.toString() || '0',
  });

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
          newErrors.name = 'Name is required';
        } else if (value.length > 100) {
          newErrors.name = 'Name must be 100 characters or less';
        } else {
          delete newErrors.name;
        }
        break;

      case 'category':
        if (!value) {
          newErrors.category = 'Category is required';
        } else {
          delete newErrors.category;
        }
        break;

      case 'price':
        const priceNum = parseFloat(value);
        if (!value) {
          newErrors.price = 'Price is required';
        } else if (isNaN(priceNum)) {
          newErrors.price = 'Price must be a valid number';
        } else if (priceNum <= 0) {
          newErrors.price = 'Price must be greater than zero';
        } else if (priceNum > 9999.99) {
          newErrors.price = 'Price too high (max 9999.99)';
        } else {
          delete newErrors.price;
        }
        break;

      case 'stockLevel':
        const stockNum = parseInt(value, 10);
        if (!value && value !== '0') {
          newErrors.stockLevel = 'Stock level is required';
        } else if (isNaN(stockNum)) {
          newErrors.stockLevel = 'Stock level must be a valid number';
        } else if (stockNum < 0) {
          newErrors.stockLevel = 'Stock level cannot be negative';
        } else if (!Number.isInteger(stockNum)) {
          newErrors.stockLevel = 'Stock level must be a whole number';
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
  const validateForm = (): boolean => {
    // Mark all fields as touched
    setTouched({
      name: true,
      category: true,
      price: true,
      stockLevel: true,
    });

    // Validate all fields
    Object.keys(formData).forEach((key) => {
      validateField(key as keyof FormData, formData[key as keyof FormData]);
    });

    // Check if any field is empty
    if (!formData.name.trim()) {
      setErrors((prev) => ({ ...prev, name: 'Name is required' }));
      return false;
    }
    if (!formData.category) {
      setErrors((prev) => ({ ...prev, category: 'Category is required' }));
      return false;
    }
    if (!formData.price) {
      setErrors((prev) => ({ ...prev, price: 'Price is required' }));
      return false;
    }
    if (!formData.stockLevel && formData.stockLevel !== '0') {
      setErrors((prev) => ({ ...prev, stockLevel: 'Stock level is required' }));
      return false;
    }

    // Use Zod schema for final validation
    const validationData = {
      name: formData.name.trim(),
      category: formData.category,
      price: parseFloat(formData.price),
      stockLevel: parseInt(formData.stockLevel, 10),
      isActive: item?.isActive ?? true,
      lastModifiedBy: item?.lastModifiedBy,
    };

    const result = validateFormData(createMenuItemSchema, validationData);

    if (!result.success) {
      setErrors(result.errors);
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
        stockLevel: parseInt(formData.stockLevel, 10),
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
        general: error instanceof Error ? error.message : 'Failed to save menu item',
      });
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
      {/* Form Title */}
      <div>
        <h3 className="text-lg font-semibold">
          {isEditMode ? 'Edit Menu Item' : 'Add New Menu Item'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isEditMode
            ? 'Update the details of this menu item'
            : 'Enter the details for the new menu item'}
        </p>
      </div>

      {/* General Error */}
      {errors.general && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {errors.general}
        </div>
      )}

      {/* Name Field */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          onBlur={() => handleBlur('name')}
          placeholder="e.g., Sandes de Leitão"
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

      {/* Category Field */}
      <div className="space-y-2">
        <Label htmlFor="category">
          Category <span className="text-destructive">*</span>
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
            <SelectValue placeholder="Select a category" />
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

      {/* Price Field */}
      <div className="space-y-2">
        <Label htmlFor="price">
          Price (€) <span className="text-destructive">*</span>
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
          Enter the price in euros (e.g., 5.50)
        </p>
      </div>

      {/* Stock Level Field */}
      <div className="space-y-2">
        <Label htmlFor="stockLevel">
          Initial Stock Level <span className="text-destructive">*</span>
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
            ? 'Current stock level. Use stock management to adjust.'
            : 'Starting quantity for this item'}
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? 'Saving...' : isEditMode ? 'Update Item' : 'Add Item'}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
