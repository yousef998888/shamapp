import { supabase } from '../utils/supabase';
import {
  Product,
  ProductImage,
  ProductAttribute,
  OptionSource,
} from '../types/database';

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
  has_variants?: boolean;
  quantity_available?: number | null;
}

export interface ProductWithRelations extends Product {
  category?: any;
  images?: ProductImage[];
  attribute_relationships?: any[];
}

type SimpleInventoryConfig = {
  type: 'simple';
  quantity: number;
};

type VariantOptionValueInput = {
  tempId: string;
  name: string;
  attributeTermId?: string | null;
  isCustom: boolean;
  displayOrder: number;
};

type VariantOptionGroupInput = {
  tempId: string;
  name: string;
  source: OptionSource;
  attributeId?: string | null;
  displayOrder: number;
  values: VariantOptionValueInput[];
};

type VariantCombinationInput = {
  options: Array<{
    groupTempId: string;
    valueTempId: string;
  }>;
  quantity: number;
  enabled: boolean;
  sku?: string | null;
};

type VariantInventoryConfig = {
  type: 'variants';
  optionGroups: VariantOptionGroupInput[];
  variants: VariantCombinationInput[];
};

export type InventoryConfiguration = SimpleInventoryConfig | VariantInventoryConfig;

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
        seller:user_profiles(full_name, username, avatar_url),
        images:product_images(*),
        attribute_relationships:product_attribute_relationships(
          attribute:product_attributes(*),
          term:product_attribute_terms(*)
        ),
        option_groups:product_option_groups(
          *,
          values:product_option_values(*)
        ),
        variants:product_variants(
          *,
          option_values:product_variant_values(
            option_value:product_option_values(*)
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('ProductService.fetchProduct error:', error);
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
   * Configure inventory for a product.
   * Supports both simple quantity and variant-based stock.
   */
  async configureInventory(
    productId: string,
    configuration: InventoryConfiguration
  ): Promise<void> {
    if (configuration.type === 'simple') {
      await this.configureSimpleInventoryInternal(productId, configuration.quantity);
      return;
    }

    await this.configureVariantInventoryInternal(productId, configuration);
  }

  async configureSimpleInventoryInternal(productId: string, quantity: number): Promise<void> {
    await this.clearExistingInventory(productId);

    const { error } = await supabase
      .from('products')
      .update({
        has_variants: false,
        quantity_available: quantity,
      })
      .eq('id', productId);

    if (error) {
      throw new Error(`Failed to update simple inventory: ${error.message}`);
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

      const { data, error } = await supabase.storage
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
   * Upload images from mobile (React Native) - handles URI strings
   */
  async uploadImagesFromMobile(productId: string, imageUris: string[], existingImagesCount: number = 0): Promise<void> {
    if (imageUris.length === 0) return;

    // Verify product exists and user owns it before uploading
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, seller_id')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      throw new Error(`Product not found or access denied. Cannot upload images. ${productError?.message || ''}`);
    }

    // Get current user to verify ownership
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== product.seller_id) {
      throw new Error('You do not have permission to upload images for this product.');
    }

    const uploadPromises = imageUris.map(async (uri, index) => {
      try {
        // For React Native, we need to use a different approach
        // Convert URI to base64 first, then to a format Supabase can accept
        const response = await fetch(uri);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${productId}/${Date.now()}-${index}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from("product-images")
          .upload(fileName, uint8Array, {
            contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
            upsert: false,
          });

        if (error) {
          console.error(`Storage error details:`, error);
          // Try to get more details about the error
          let errorMessage = error.message || 'Unknown error';
          if (error.message?.includes('JSON Parse error')) {
            errorMessage = 'Storage API returned an unexpected response. Please check: 1) The product-images bucket exists, 2) RLS policies are configured correctly, 3) You are authenticated.';
          }
          throw new Error(`Failed to upload image ${index + 1}: ${errorMessage}`);
        }

        if (!data) {
          throw new Error(`Upload succeeded but no data returned for image ${index + 1}`);
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
      } catch (err) {
        console.error(`Error uploading image ${index + 1}:`, err);
        throw err;
      }
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

  async clearExistingInventory(productId: string): Promise<void> {
    const { error: deleteVariantsError } = await supabase
      .from('product_variants')
      .delete()
      .eq('product_id', productId);

    if (deleteVariantsError) {
      throw new Error(`Failed to clear existing variants: ${deleteVariantsError.message}`);
    }

    const { error: deleteGroupsError } = await supabase
      .from('product_option_groups')
      .delete()
      .eq('product_id', productId);

    if (deleteGroupsError) {
      throw new Error(`Failed to clear existing option groups: ${deleteGroupsError.message}`);
    }
  }


  async configureVariantInventoryInternal(
    productId: string,
    config: VariantInventoryConfig
  ): Promise<void> {
    await this.clearExistingInventory(productId);

    if (config.optionGroups.length === 0) {
      throw new Error('At least one option group is required when configuring variants.');
    }

    const groupTempIds: string[] = [];
    const groupInsertPayload = config.optionGroups.map(group => {
      groupTempIds.push(group.tempId);
      return {
        product_id: productId,
        name: group.name,
        source: group.source,
        category_attribute_id: group.attributeId ?? null,
        display_order: group.displayOrder,
      };
    });

    const { data: insertedGroups, error: groupInsertError } = await supabase
      .from('product_option_groups')
      .insert(groupInsertPayload)
      .select('id');

    if (groupInsertError) {
      throw new Error(`Failed to insert option groups: ${groupInsertError.message}`);
    }

    const groupIdMap = new Map<string, string>();
    insertedGroups?.forEach((groupRow, index) => {
      groupIdMap.set(groupTempIds[index], groupRow.id);
    });

    const valueTempIds: string[] = [];
    const valueInsertPayload = config.optionGroups.flatMap(group =>
      group.values.map(value => {
        valueTempIds.push(value.tempId);
        const groupId = groupIdMap.get(group.tempId);
        if (!groupId) {
          throw new Error('Failed to resolve option group during value insertion.');
        }
        return {
          option_group_id: groupId,
          name: value.name,
          attribute_term_id: value.attributeTermId ?? null,
          is_custom: value.isCustom,
          display_order: value.displayOrder,
        };
      })
    );

    const { data: insertedValues, error: valueInsertError } = await supabase
      .from('product_option_values')
      .insert(valueInsertPayload)
      .select('id');

    if (valueInsertError) {
      throw new Error(`Failed to insert option values: ${valueInsertError.message}`);
    }

    const valueIdMap = new Map<string, string>();
    insertedValues?.forEach((valueRow, index) => {
      valueIdMap.set(valueTempIds[index], valueRow.id);
    });

    const variantInsertPayload = config.variants.map(variant => ({
      product_id: productId,
      sku: variant.sku ?? null,
      is_active: variant.enabled,
      quantity_available: Math.max(0, variant.quantity),
      quantity_reserved: 0,
      price_override: null,
    }));

    const { data: insertedVariants, error: variantInsertError } = await supabase
      .from('product_variants')
      .insert(variantInsertPayload)
      .select('id');

    if (variantInsertError) {
      throw new Error(`Failed to insert product variants: ${variantInsertError.message}`);
    }

    const variantValuePayload = config.variants.flatMap((variant, index) => {
      const variantId = insertedVariants?.[index]?.id;
      if (!variantId) {
        throw new Error('Failed to resolve inserted variant id.');
      }

      return variant.options.map(option => {
        const optionValueId = valueIdMap.get(option.valueTempId);
        if (!optionValueId) {
          throw new Error('Failed to resolve option value id for variant.');
        }
        return {
          variant_id: variantId,
          option_value_id: optionValueId,
        };
      });
    });

    if (variantValuePayload.length > 0) {
      const { error: variantValueInsertError } = await supabase
        .from('product_variant_values')
        .insert(variantValuePayload);

      if (variantValueInsertError) {
        throw new Error(`Failed to insert variant value mappings: ${variantValueInsertError.message}`);
      }
    }

    const { error: productUpdateError } = await supabase
      .from('products')
      .update({
        has_variants: true,
        quantity_available: null,
      })
      .eq('id', productId);

    if (productUpdateError) {
      throw new Error(`Failed to update product inventory state: ${productUpdateError.message}`);
    }
  }
}

export default new ProductService();
