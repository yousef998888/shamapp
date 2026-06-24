import { supabase } from '../lib/supabase';
import { Product, ProductImage } from '../types/database';

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
  ar_tags?: string[];
  status?: Product['status'];
}

export interface ProductWithRelations extends Product {
  category?: any;
  images?: ProductImage[];
  attribute_relationships?: any[];
}

class ProductService {
  /**
   * Fetch a single product with all its relations
   */
  async fetchProduct(id: string): Promise<ProductWithRelations> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        images:product_images(*),
        attribute_relationships:product_attribute_relationships(
          attribute:product_attributes(*),
          term:product_attribute_terms(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch product: ${error.message}`);
    }

    return data;
  }

  /**
   * Update an existing product
   */
  async updateProduct(id: string, data: ProductFormData, sellerId: string): Promise<void> {
    const { error } = await supabase
      .from("products")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('seller_id', sellerId);

    if (error) {
      throw new Error(`Failed to update product: ${error.message}`);
    }
  }

  /**
   * Create a new product
   */
  async createProduct(data: ProductFormData, sellerId: string): Promise<string> {
    const { data: product, error } = await supabase
      .from("products")
      .insert({
        ...data,
        seller_id: sellerId,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create product: ${error.message}`);
    }

    return product.id;
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: string, sellerId: string): Promise<void> {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq('id', id)
      .eq('seller_id', sellerId);

    if (error) {
      throw new Error(`Failed to delete product: ${error.message}`);
    }
  }

  /**
   * Update product status
   */
  async updateProductStatus(productId: string, status: Product['status']): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({ status })
      .eq('id', productId);

    if (error) {
      throw new Error(`Failed to update product status: ${error.message}`);
    }
  }

  /**
   * Upload multiple images for a product
   */
  async uploadImages(productId: string, files: File[], existingImagesCount: number = 0): Promise<void> {
    if (files.length === 0) return;

    const uploadPromises = files.map(async (file, index) => {
      const fileExt = file.name.split(".").pop();
      const fileName = `${productId}/${Date.now()}-${index}.${fileExt}`;

      const { error } = await supabase.storage
        .from("product-images")
        .upload(fileName, file);

      if (error) {
        throw new Error(`Failed to upload image ${index + 1}: ${error.message}`);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("product-images").getPublicUrl(fileName);

      return {
        product_id: productId,
        image_url: publicUrl,
        sort_order: existingImagesCount + index,
        is_primary: existingImagesCount === 0 && index === 0,
      };
    });

    const imageData = await Promise.all(uploadPromises);

    const { error } = await supabase
      .from("product_images")
      .insert(imageData);

    if (error) {
      throw new Error(`Failed to save image metadata: ${error.message}`);
    }
  }

  /**
   * Delete multiple images
   */
  async deleteImages(imageIds: string[]): Promise<void> {
    if (imageIds.length === 0) return;

    const { error } = await supabase
      .from("product_images")
      .delete()
      .in('id', imageIds);

    if (error) {
      throw new Error(`Failed to delete images: ${error.message}`);
    }
  }

  /**
   * Update product attribute relationships
   */
  async updateAttributeRelationships(
    productId: string, 
    attributeValues: Record<string, string[]>
  ): Promise<void> {
    // Validate productId
    if (!productId || typeof productId !== 'string') {
      throw new Error('Invalid product ID provided');
    }

    // First delete existing relationships
    await supabase
      .from("product_attribute_relationships")
      .delete()
      .eq('product_id', productId);

    // Filter out empty arrays and invalid values, then create attribute rows
    const attributeRows = Object.entries(attributeValues)
      .filter(([attributeId, termIds]) => 
        attributeId && 
        Array.isArray(termIds) && 
        termIds.length > 0 && 
        termIds.every(termId => 
          termId && 
          typeof termId === 'string' && 
          termId !== 'undefined' &&
          termId.trim() !== '' &&
          // Basic UUID format validation (8-4-4-4-12 format)
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(termId)
        )
      )
      .flatMap(([attributeId, termIds]) =>
        termIds.map(termId => ({
          product_id: productId,
          attribute_id: attributeId,
          term_id: termId,
        }))
      );
    
    if (attributeRows.length > 0) {
      const { error } = await supabase
        .from("product_attribute_relationships")
        .insert(attributeRows);
        
      if (error) {
        throw new Error(`Failed to save product attributes: ${error.message}`);
      }
    }
  }

  /**
   * Check if user owns the product
   */
  async checkProductOwnership(productId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('products')
      .select('seller_id')
      .eq('id', productId)
      .single();

    if (error) return false;
    return data.seller_id === userId;
  }

  /**
   * Fetch user's products
   */
  async fetchUserProducts(userId: string) {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        images:product_images(*)
      `)
      .eq('seller_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch user products: ${error.message}`);
    }

    return data;
  }
}

export default new ProductService(); 
