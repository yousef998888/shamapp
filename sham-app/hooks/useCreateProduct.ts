import { useState } from 'react';
import ProductService, { InventoryConfiguration } from '../services/ProductService';

export interface ProductFormData {
  title: string;
  ar_title: string;
  description: string;
  ar_description: string;
  price: number;
  currency: "SYP" | "USD" | "EUR";
  condition: "new" | "used" | "refurbished";
  category_id: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  is_negotiable: boolean;
  delivery_option?: 'both' | 'postage' | 'collection';
  embedding?: number[];
  tags?: string[];
}

export function useCreateProduct() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutateAsync = async ({
    data,
    sellerId,
    images,
    attributeValues,
    inventory,
  }: {
    data: ProductFormData;
    sellerId: string;
    images: string[]; // Mobile uses string[] for image URIs
    attributeValues: Record<string, string[]>;
    inventory?: InventoryConfiguration;
  }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Create product using mobile ProductService
      const productId = await ProductService.createProduct(data, sellerId);
      
      // Upload images if any
      if (images.length > 0) {
        await ProductService.uploadImagesFromMobile(productId, images);
      }
      
      // Set attribute relationships
      console.log('Creating product attributeValues:', attributeValues);
      
      // Filter out any invalid values before sending to service
      const validAttributeValues = Object.entries(attributeValues)
        .filter(([attributeId, termIds]) => 
          attributeId && 
          Array.isArray(termIds) && 
          termIds.length > 0 && 
          termIds.every(termId => termId && typeof termId === 'string' && termId !== 'undefined')
        )
        .reduce((acc, [attributeId, termIds]) => {
          acc[attributeId] = termIds;
          return acc;
        }, {} as Record<string, string[]>);
      
      console.log('Valid attributeValues after filtering:', validAttributeValues);
      
      if (Object.keys(validAttributeValues).length > 0) {
        await ProductService.updateAttributeRelationships(productId, validAttributeValues);
      }

      const inventoryPayload: InventoryConfiguration =
        inventory ?? { type: 'simple', quantity: 1 };

      await ProductService.configureInventory(productId, inventoryPayload);
      
      return productId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create product';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    mutateAsync,
    isLoading,
    error,
  };
}
