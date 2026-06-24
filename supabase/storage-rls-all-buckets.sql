-- Storage RLS policies for all buckets
-- This ensures proper access control for all storage buckets
-- 
-- Note: If policies already exist, drop them first using:
-- DROP POLICY IF EXISTS "policy_name" ON storage.objects;

-- ============================================================================
-- PRODUCT IMAGES (Public bucket)
-- Path structure: {productId}/{timestamp}-{index}.{ext}
-- ============================================================================

-- Drop existing policies if they exist (uncomment if needed)
-- DROP POLICY IF EXISTS "Public can read product images" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can upload images for their own products" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can update images for their own products" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can delete images for their own products" ON storage.objects;
-- DROP POLICY IF EXISTS "Service role can manage all product images" ON storage.objects;

-- Policy: Anyone can read product images (public bucket)
CREATE POLICY "Public can read product images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Policy: Users can upload product images for their own products
CREATE POLICY "Users can upload images for their own products"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' AND
  EXISTS (
    SELECT 1 FROM public.products
    WHERE id::text = split_part(name, '/', 1)
    AND seller_id = auth.uid()
  )
);

-- Policy: Users can update product images for their own products
CREATE POLICY "Users can update images for their own products"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images' AND
  EXISTS (
    SELECT 1 FROM public.products
    WHERE id::text = split_part(name, '/', 1)
    AND seller_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'product-images' AND
  EXISTS (
    SELECT 1 FROM public.products
    WHERE id::text = split_part(name, '/', 1)
    AND seller_id = auth.uid()
  )
);

-- Policy: Users can delete product images for their own products
CREATE POLICY "Users can delete images for their own products"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' AND
  EXISTS (
    SELECT 1 FROM public.products
    WHERE id::text = split_part(name, '/', 1)
    AND seller_id = auth.uid()
  )
);

-- Policy: Service role can manage all product images
CREATE POLICY "Service role can manage all product images"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

-- ============================================================================
-- PROFILE IMAGES (Public bucket)
-- Path structure: profiles/{userId}/{type}-{timestamp}.{ext}
-- ============================================================================

-- Policy: Anyone can read profile images (public bucket)
CREATE POLICY "Public can read profile images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-images');

-- Policy: Users can upload their own profile images
CREATE POLICY "Users can upload their own profile images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-images' AND
  split_part(name, '/', 2) = auth.uid()::text
);

-- Policy: Users can update their own profile images
CREATE POLICY "Users can update their own profile images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-images' AND
  split_part(name, '/', 2) = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profile-images' AND
  split_part(name, '/', 2) = auth.uid()::text
);

-- Policy: Users can delete their own profile images
CREATE POLICY "Users can delete their own profile images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-images' AND
  split_part(name, '/', 2) = auth.uid()::text
);

-- Policy: Service role can manage all profile images
CREATE POLICY "Service role can manage all profile images"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'profile-images')
WITH CHECK (bucket_id = 'profile-images');

-- ============================================================================
-- PAYMENT RECEIPTS (Private bucket)
-- Path structure: payment-receipts/{orderId}/{timestamp}.{ext}
-- ============================================================================

-- Policy: Users can read payment receipts for their own orders (as buyer or seller)
CREATE POLICY "Users can read their own payment receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-receipts' AND
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE id::text = split_part(name, '/', 2)
    AND (buyer_id = auth.uid() OR seller_id = auth.uid())
  )
);

-- Policy: Users can upload payment receipts for their own orders
CREATE POLICY "Users can upload payment receipts for their own orders"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-receipts' AND
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE id::text = split_part(name, '/', 2)
    AND (buyer_id = auth.uid() OR seller_id = auth.uid())
  )
);

-- Policy: Users can update payment receipts for their own orders
CREATE POLICY "Users can update payment receipts for their own orders"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment-receipts' AND
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE id::text = split_part(name, '/', 2)
    AND (buyer_id = auth.uid() OR seller_id = auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'payment-receipts' AND
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE id::text = split_part(name, '/', 2)
    AND (buyer_id = auth.uid() OR seller_id = auth.uid())
  )
);

-- Policy: Users can delete payment receipts for their own orders
CREATE POLICY "Users can delete payment receipts for their own orders"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-receipts' AND
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE id::text = split_part(name, '/', 2)
    AND (buyer_id = auth.uid() OR seller_id = auth.uid())
  )
);

-- Policy: Service role can manage all payment receipts
CREATE POLICY "Service role can manage all payment receipts"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'payment-receipts')
WITH CHECK (bucket_id = 'payment-receipts');

-- ============================================================================
-- SHIPPING RECEIPTS (Private bucket)
-- Path structure: shipping-receipts/{orderId}/{timestamp}.{ext}
-- ============================================================================

-- Policy: Users can read shipping receipts for their own orders (as buyer or seller)
CREATE POLICY "Users can read their own shipping receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'shipping-receipts' AND
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE id::text = split_part(name, '/', 2)
    AND (buyer_id = auth.uid() OR seller_id = auth.uid())
  )
);

-- Policy: Users can upload shipping receipts for their own orders
CREATE POLICY "Users can upload shipping receipts for their own orders"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shipping-receipts' AND
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE id::text = split_part(name, '/', 2)
    AND (buyer_id = auth.uid() OR seller_id = auth.uid())
  )
);

-- Policy: Users can update shipping receipts for their own orders
CREATE POLICY "Users can update shipping receipts for their own orders"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'shipping-receipts' AND
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE id::text = split_part(name, '/', 2)
    AND (buyer_id = auth.uid() OR seller_id = auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'shipping-receipts' AND
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE id::text = split_part(name, '/', 2)
    AND (buyer_id = auth.uid() OR seller_id = auth.uid())
  )
);

-- Policy: Users can delete shipping receipts for their own orders
CREATE POLICY "Users can delete shipping receipts for their own orders"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'shipping-receipts' AND
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE id::text = split_part(name, '/', 2)
    AND (buyer_id = auth.uid() OR seller_id = auth.uid())
  )
);

-- Policy: Service role can manage all shipping receipts
CREATE POLICY "Service role can manage all shipping receipts"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'shipping-receipts')
WITH CHECK (bucket_id = 'shipping-receipts');

-- ============================================================================
-- VERIFICATION DOCUMENTS (Private bucket)
-- Path structure: {userId}/filename.ext
-- ============================================================================

-- Policy: Users can upload their own verification documents
CREATE POLICY "Users can upload their own verification documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'verification-documents' AND
  split_part(name, '/', 1) = auth.uid()::text
);

-- Policy: Users can read their own verification documents
CREATE POLICY "Users can read their own verification documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-documents' AND
  split_part(name, '/', 1) = auth.uid()::text
);

-- Policy: Users can update their own verification documents
CREATE POLICY "Users can update their own verification documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'verification-documents' AND
  split_part(name, '/', 1) = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'verification-documents' AND
  split_part(name, '/', 1) = auth.uid()::text
);

-- Policy: Users can delete their own verification documents
CREATE POLICY "Users can delete their own verification documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'verification-documents' AND
  split_part(name, '/', 1) = auth.uid()::text
);

-- Policy: Service role can read all verification documents for review
CREATE POLICY "Service role can read all verification documents"
ON storage.objects
FOR SELECT
TO service_role
USING (bucket_id = 'verification-documents');

-- Policy: Service role can manage all verification documents
CREATE POLICY "Service role can manage all verification documents"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'verification-documents')
WITH CHECK (bucket_id = 'verification-documents');


-- Policy: Buyers can update product stock when they have an order for that product
-- This allows stock reservation during order creation
CREATE POLICY "Buyers can update stock for products they ordered"
ON "public"."products"
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  -- Allow if user is the seller (existing behavior)
  (auth.uid() = seller_id)
  OR
  -- OR if user is a buyer with a pending order for this product
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE product_id = products.id
    AND buyer_id = auth.uid()
    AND status IN ('pending_payment', 'payment_submitted', 'admin_approved', 'shipped', 'delivered', 'awaiting_collection')
  )
)
WITH CHECK (
  -- Same conditions for the check
  (auth.uid() = seller_id)
  OR
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE product_id = products.id
    AND buyer_id = auth.uid()
    AND status IN ('pending_payment', 'payment_submitted', 'admin_approved', 'shipped', 'delivered', 'awaiting_collection')
  )
);