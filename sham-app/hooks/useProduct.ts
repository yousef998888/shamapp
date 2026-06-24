import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ProductService, {
  InventoryConfiguration,
  ProductFormData,
  ProductWithRelations,
} from '../services/ProductService';
import CategoryService from '../services/CategoryService';
import { ProductAttribute } from '../types/database';

// Query Keys
export const productKeys = {
  all: ['products'] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
  attributes: (categoryId: string) => [...productKeys.all, 'attributes', categoryId] as const,
  userProducts: (userId: string) => [...productKeys.all, 'user', userId] as const,
};

/**
 * Hook to fetch a single product with all relations
 */
export function useProduct(id: string | undefined, userId?: string) {
  return useQuery({
    queryKey: productKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Product ID is required');
      
      const product = await ProductService.fetchProduct(id);
      
      // Check ownership if userId is provided
      if (userId && product.seller_id !== userId) {
        throw new Error('You are not authorized to access this product');
      }
      
      return product;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch category attributes
 */
export function useCategoryAttributes(categoryId: string | undefined) {
  return useQuery({
    queryKey: productKeys.attributes(categoryId || ''),
    queryFn: () => {
      if (!categoryId) return [];
      return CategoryService.fetchAttributesAndTermsForCategories([categoryId]);
    },
    enabled: !!categoryId,
    staleTime: 10 * 60 * 1000, // 10 minutes - attributes don't change often
  });
}

/**
 * Hook to update a product
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
      sellerId,
      newImages,
      imagesToDelete,
      attributeValues,
      existingImagesCount,
    }: {
      id: string;
      data: ProductFormData;
      sellerId: string;
      newImages: File[];
      imagesToDelete: string[];
      attributeValues: Record<string, string[]>;
      existingImagesCount: number;
    }) => {
      // Update product data
      await ProductService.updateProduct(id, data, sellerId);
      
      // Handle image deletion
      if (imagesToDelete.length > 0) {
        await ProductService.deleteImages(imagesToDelete);
      }
      
      // Handle new image uploads
      if (newImages.length > 0) {
        const finalExistingCount = existingImagesCount - imagesToDelete.length;
        await ProductService.uploadImages(id, newImages, finalExistingCount);
      }
      
      // Update attribute relationships
      // Add validation and logging for debugging
      console.log('useProduct: attributeValues before service call:', attributeValues);
      
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
      
      console.log('useProduct: validAttributeValues after filtering:', validAttributeValues);
      
      await ProductService.updateAttributeRelationships(id, validAttributeValues);
      
      return id;
    },
    onSuccess: (productId) => {
      // Invalidate and refetch product data
      queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
    onError: (error: Error) => {
      console.error('Error updating product:', error);
      // Handle error without toast (for native apps)
    },
  });
}

/**
 * Hook to create a product
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      data,
      sellerId,
      images,
      attributeValues,
      inventory,
    }: {
      data: ProductFormData;
      sellerId: string;
      images: File[];
      attributeValues: Record<string, string[]>;
      inventory?: InventoryConfiguration;
    }) => {
      // Create product
      const productId = await ProductService.createProduct(data, sellerId);
      
      // Upload images if any
      if (images.length > 0) {
        await ProductService.uploadImages(productId, images);
      }
      
      // Set attribute relationships
      // Add validation and logging for debugging
      console.log('useProduct: create product attributeValues before service call:', attributeValues);
      
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
      
      console.log('useProduct: create product validAttributeValues after filtering:', validAttributeValues);
      
      await ProductService.updateAttributeRelationships(productId, validAttributeValues);

      const inventoryPayload: InventoryConfiguration =
        inventory ?? { type: 'simple', quantity: 1 };

      await ProductService.configureInventory(productId, inventoryPayload);
      
      return productId;
    },
    onSuccess: (productId) => {
      // Invalidate queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
    onError: (error: Error) => {
      console.error('Error creating product:', error);
    },
  });
}

/**
 * Hook to delete a product
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, sellerId }: { id: string; sellerId: string }) => {
      await ProductService.deleteProduct(id, sellerId);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
    onError: (error: Error) => {
      console.error('Error deleting product:', error);
    },
  });
}

/**
 * Hook to fetch user's products
 */
export function useUserProducts(userId: string | undefined) {
  return useQuery({
    queryKey: productKeys.userProducts(userId || ''),
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return ProductService.fetchUserProducts(userId);
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to check product ownership
 */
export function useProductOwnership(productId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: [...productKeys.detail(productId || ''), 'ownership', userId],
    queryFn: async () => {
      if (!productId || !userId) return false;
      return ProductService.checkProductOwnership(productId, userId);
    },
    enabled: !!(productId && userId),
    staleTime: 10 * 60 * 1000, // 10 minutes - ownership doesn't change often
  });
} 
