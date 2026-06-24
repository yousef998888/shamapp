import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Initialize Supabase client with service_role key (bypasses RLS)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 [Orders Route] Supabase config:', {
  url: supabaseUrl,
  hasServiceKey: !!supabaseServiceKey,
  serviceKeyPrefix: supabaseServiceKey ? supabaseServiceKey.substring(0, 20) + '...' : 'NOT SET',
  envVarsChecked: ['SUPABASE_SERVICE_ROLE_KEY', 'VITE_SUPABASE_SERVICE_ROLE_KEY']
});

if (!supabaseServiceKey) {
  console.error('⚠️ SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
  console.error('⚠️ Checked:', {
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    VITE_SUPABASE_SERVICE_ROLE_KEY: !!process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  });
}

const supabase = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })
  : null;

// Schema for updating product stock
const updateStockSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
  variantId: z.string().uuid().optional().nullable(),
});

/**
 * POST /api/orders/update-stock
 * Update product or variant stock when an order is created
 * This endpoint uses service_role to bypass RLS
 */
router.post('/update-stock', async (req: Request, res: Response) => {
  try {
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
        message: 'Supabase service role key not configured'
      });
    }

    const validationResult = updateStockSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: validationResult.error.errors[0].message
      });
    }

    const { productId, quantity, variantId } = validationResult.data;

    // Fetch product to check if it has variants
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, has_variants, quantity_available, seller_id')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        message: productError?.message || 'Product does not exist'
      });
    }

    // Update variant stock if variantId is provided
    if (product.has_variants && variantId) {
      const { data: variant, error: variantError } = await supabase
        .from('product_variants')
        .select('id, quantity_available, quantity_reserved')
        .eq('id', variantId)
        .eq('product_id', productId)
        .single();

      if (variantError || !variant) {
        return res.status(404).json({
          success: false,
          error: 'Variant not found',
          message: variantError?.message || 'Variant does not exist'
        });
      }

      const newQuantity = Math.max(0, (variant.quantity_available ?? 0) - quantity);
      const newReserved = (variant.quantity_reserved ?? 0) + quantity;

      const { data: updatedVariant, error: updateError } = await supabase
        .from('product_variants')
        .update({
          quantity_available: newQuantity,
          quantity_reserved: newReserved,
        })
        .eq('id', variantId)
        .eq('product_id', productId)
        .select('id, quantity_available, quantity_reserved')
        .single();

      if (updateError || !updatedVariant) {
        console.error('Failed to update variant stock:', updateError);
        return res.status(500).json({
          success: false,
          error: 'Update failed',
          message: updateError?.message || 'Failed to update variant stock'
        });
      }

      return res.json({
        success: true,
        data: {
          type: 'variant',
          variantId: updatedVariant.id,
          quantityAvailable: updatedVariant.quantity_available,
          quantityReserved: updatedVariant.quantity_reserved,
        }
      });
    } else {
      // Update simple product stock
      const currentQuantity = product.quantity_available ?? 0;
      const newQuantity = Math.max(0, currentQuantity - quantity);

      const { data: updatedProduct, error: updateError } = await supabase
        .from('products')
        .update({
          quantity_available: newQuantity,
        })
        .eq('id', productId)
        .select('id, quantity_available')
        .single();

      if (updateError || !updatedProduct) {
        console.error('Failed to update product stock:', updateError);
        return res.status(500).json({
          success: false,
          error: 'Update failed',
          message: updateError?.message || 'Failed to update product stock'
        });
      }

      return res.json({
        success: true,
        data: {
          type: 'product',
          productId: updatedProduct.id,
          quantityAvailable: updatedProduct.quantity_available,
        }
      });
    }
  } catch (error) {
    console.error('Error updating stock:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to update stock'
    });
  }
});

export default router;

