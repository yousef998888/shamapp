import { supabase } from '@/utils/supabase';
import type { Order, DeliveryMethod, OrderDelivery, Product } from '@/types/database';
import SystemSettingsService from './SystemSettingsService';

interface CreateOrderInput {
  buyer_id: string;
  seller_id: string;
  product_id: string;
  product_variant_id?: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  shipping_fee: number;
  grand_total: number;
  currency: string;
  delivery_method_id?: string | null;
  delivery_type: 'home_delivery' | 'pickup_point' | 'seller_collection';
  delivery_address?: Record<string, any> | null;
  pickup_location_data?: Record<string, any> | null;
  // New fields
  shipping_address_id?: string;
  pickup_address_id?: string;
  contact_phone?: string;
  special_instructions?: string;
  delivery_fee?: number;
  estimated_delivery_date?: string;
  status?: Order['status'];
  initialMessage?: string;
}

class OrderService {
  static async createOrder(orderData: CreateOrderInput): Promise<Order | null> {
    console.log('🚀 [OrderService] createOrder called:', {
      productId: orderData.product_id,
      buyerId: orderData.buyer_id,
      quantity: orderData.quantity,
      variantId: orderData.product_variant_id,
      deliveryType: orderData.delivery_type
    });
    
    try {
      const { error: buyerError } = await supabase
        .from('users')
        .select('id')
        .eq('id', orderData.buyer_id)
        .single();

      if (buyerError && buyerError.code === 'PGRST116') {
        const { data: authUser } = await supabase.auth.getUser();
        if (authUser.user) {
          const { error: insertError } = await supabase.from('users').insert({
            id: orderData.buyer_id,
            email: authUser.user.email || '',
            password_hash: '',
            full_name: authUser.user.user_metadata?.full_name || '',
            username:
              authUser.user.user_metadata?.username ||
              authUser.user.email?.split('@')[0] ||
              '',
            avatar_url: authUser.user.user_metadata?.avatar_url || '',
            phone: authUser.user.phone || '',
            location: '',
            bio: '',
            is_verified: false,
            rating: 0,
            total_sales: 0,
            member_since: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          if (insertError) {
            throw insertError;
          }
        }
      } else if (buyerError && buyerError.code !== 'PGRST116') {
        throw buyerError;
      }

      console.log('🔍 [OrderService] Fetching product for order:', {
        productId: orderData.product_id,
        buyerId: orderData.buyer_id
      });
      
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(`
          id,
          seller_id,
          price,
          currency,
          has_variants,
          quantity_available,
          status,
          variants:product_variants(
            id,
            is_active,
            quantity_available,
            quantity_reserved,
            price_override
          )
        `)
        .eq('id', orderData.product_id)
        .single();

      console.log('🔍 [OrderService] Product fetch result:', {
        productData: productData ? {
          id: productData.id,
          seller_id: productData.seller_id,
          has_variants: productData.has_variants,
          quantity_available: productData.quantity_available,
          status: productData.status,
          variantsCount: (productData as any).variants?.length ?? 0
        } : null,
        error: productError,
        errorCode: productError?.code,
        errorMessage: productError?.message
      });

      if (productError) {
        console.error('❌ [OrderService] Product fetch error:', productError);
        throw productError;
      }

      if (!productData) {
        console.error('❌ [OrderService] Product not found:', orderData.product_id);
        throw new Error('Product not found.');
      }

      const productRecord = productData as any;
      const quantity = Math.max(1, orderData.quantity || 1);

      console.log('📋 [OrderService] Processing order details:', {
        productId: productRecord.id,
        hasVariants: productRecord.has_variants,
        quantityAvailable: productRecord.quantity_available,
        requestedQuantity: quantity,
        requestedVariantId: orderData.product_variant_id,
        variantsCount: productRecord.variants?.length ?? 0
      });

      let variantId: string | null = orderData.product_variant_id ?? null;
      let variantRecord: any = null;

      if (productRecord.has_variants) {
        if (!variantId) {
          console.error('❌ [OrderService] Variant required but not provided');
          throw new Error('Please select a variant before placing the order.');
        }

        variantRecord = (productRecord.variants || []).find(
          (variant: any) => variant.id === variantId,
        );

        console.log('🔍 [OrderService] Variant lookup:', {
          requestedVariantId: variantId,
          found: !!variantRecord,
          variantDetails: variantRecord ? {
            id: variantRecord.id,
            is_active: variantRecord.is_active,
            quantity_available: variantRecord.quantity_available,
            quantity_reserved: variantRecord.quantity_reserved
          } : null,
          allVariants: productRecord.variants?.map((v: any) => ({
            id: v.id,
            is_active: v.is_active,
            quantity_available: v.quantity_available
          }))
        });

        if (!variantRecord) {
          console.error('❌ [OrderService] Variant not found in product variants');
          throw new Error('Selected variant is not available.');
        }

        if (!variantRecord.is_active) {
          console.error('❌ [OrderService] Variant is inactive:', variantId);
          throw new Error('Selected variant is inactive.');
        }

        if ((variantRecord.quantity_available ?? 0) < quantity) {
          console.error('❌ [OrderService] Insufficient variant stock:', {
            variantId,
            available: variantRecord.quantity_available,
            requested: quantity
          });
          throw new Error('Not enough stock for the selected variant.');
        }
      } else {
        variantId = null;
        console.log('📦 [OrderService] Simple product (no variants):', {
          productId: productRecord.id,
          quantityAvailable: productRecord.quantity_available,
          requestedQuantity: quantity
        });
        if ((productRecord.quantity_available ?? 0) < quantity) {
          console.error('❌ [OrderService] Insufficient product stock:', {
            productId: productRecord.id,
            available: productRecord.quantity_available,
            requested: quantity
          });
          throw new Error('Not enough stock available.');
        }
      }

      const unitPrice =
        variantRecord?.price_override ??
        productRecord.price ??
        orderData.unit_price;
      const subtotal = unitPrice * quantity;
      const totalAmount = orderData.total_amount ?? subtotal;
      const shippingFee = orderData.shipping_fee ?? 0;
      const grandTotal = orderData.grand_total ?? totalAmount + shippingFee;
      const currency = productRecord.currency ?? orderData.currency;
      const sellerId = productRecord.seller_id;

      // Fetch selling fee percentage and calculate fees
      const sellingFeePercentage = await SystemSettingsService.getSellingFeePercentage();
      const sellingFeeAmount = (totalAmount * sellingFeePercentage) / 100;
      const sellerPayoutAmount = totalAmount - sellingFeeAmount;

      const resolvedStatus: Order['status'] =
        orderData.status ??
        (orderData.delivery_type === 'seller_collection' ? 'awaiting_collection' : 'pending_payment');

      let deliveryMethodId = orderData.delivery_method_id ?? null;
      if (!deliveryMethodId && orderData.delivery_type === 'seller_collection') {
        const fallbackMethod = await OrderService.getOrCreateDeliveryMethod('seller_collection', {
          display_name: 'Seller Collection',
          base_price: 0,
          estimated_days: 0,
          is_active: true,
        });
        deliveryMethodId = fallbackMethod?.id ?? null;
      }

      if (!deliveryMethodId) {
        throw new Error('Delivery method is not configured for this order type.');
      }

      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          buyer_id: orderData.buyer_id,
          seller_id: sellerId,
          product_id: productRecord.id,
          product_variant_id: variantId,
          quantity,
          unit_price: unitPrice,
          total_amount: totalAmount,
          shipping_fee: shippingFee,
          grand_total: grandTotal,
          currency,
          status: resolvedStatus,
          // New delivery fields
          delivery_method_id: deliveryMethodId,
          delivery_type: orderData.delivery_type,
          shipping_address_id: orderData.shipping_address_id ?? null,
          pickup_address_id: orderData.pickup_address_id ?? null,
          contact_phone: orderData.contact_phone ?? null,
          special_instructions: orderData.special_instructions ?? null,
          delivery_fee: orderData.delivery_fee ?? 0,
          estimated_delivery_date: orderData.estimated_delivery_date ?? null,
          // Selling fee fields
          selling_fee_percentage: sellingFeePercentage,
          selling_fee_amount: sellingFeeAmount,
          seller_payout_amount: sellerPayoutAmount,
        })
        .select('*')
        .single();

      if (error) {
        console.error('❌ [OrderService] Order creation error:', error);
        throw error;
      }

      console.log('✅ [OrderService] Order created successfully:', {
        orderId: order?.id,
        productId: productRecord.id,
        hasVariants: productRecord.has_variants,
        variantId: variantId,
        quantity,
        buyerId: orderData.buyer_id
      });

      try {
        console.log('🔄 [OrderService] Starting stock update process...');
        
        // Call server endpoint to update stock (bypasses RLS)
        const serverUrl = process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3005';
        const updateStockResponse = await fetch(`${serverUrl}/api/orders/update-stock`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: productRecord.id,
            quantity,
            variantId: variantId || null,
          }),
        });

        if (!updateStockResponse.ok) {
          const errorData = await updateStockResponse.json().catch(() => ({}));
          console.error('❌ [OrderService] Server stock update failed:', {
            status: updateStockResponse.status,
            error: errorData
          });
          await supabase.from('orders').delete().eq('id', order.id);
          throw new Error(errorData.message || `Failed to update stock: ${updateStockResponse.statusText}`);
        }

        const updateResult = await updateStockResponse.json();
        console.log('✅ [OrderService] Stock updated via server:', updateResult);
        
        // Stock update successful via server - continue with order processing
      } catch (inventoryError: any) {
        console.error('❌ [OrderService] Stock update failed with error:', {
          error: inventoryError,
          message: inventoryError?.message,
          stack: inventoryError?.stack,
          name: inventoryError?.name,
          code: inventoryError?.code
        });
        throw inventoryError;
      }

      const { error: deliveryError } = await supabase
        .from('order_deliveries')
        .insert({
          order_id: order.id,
          delivery_method_id: deliveryMethodId,
          delivery_type: orderData.delivery_type,
          delivery_address: orderData.delivery_address,
          pickup_location_data: orderData.pickup_location_data,
          // New fields
          shipping_address_id: orderData.shipping_address_id ?? null,
          pickup_address_id: orderData.pickup_address_id ?? null,
          contact_phone: orderData.contact_phone ?? null,
          delivery_fee: orderData.delivery_fee ?? 0,
        });

      if (deliveryError) {
        throw deliveryError;
      }

      const message =
        orderData.initialMessage ??
        (resolvedStatus === 'awaiting_collection'
          ? 'Collection order created. Coordinate pickup details here.'
          : 'Order created via mobile checkout.');
      const { error: messageError } = await supabase
        .from('order_messages')
        .insert({
          order_id: order.id,
          sender_id: orderData.buyer_id,
          receiver_id: orderData.seller_id,
          message,
          message_type: 'system',
        });

      if (messageError) {
        throw messageError;
      }

      await this.syncProductInventoryState(productRecord.id);

      return order as Order;
    } catch (err: any) {
      console.error('❌ [OrderService] createOrder caught error:', {
        error: err,
        message: err?.message,
        stack: err?.stack,
        name: err?.name,
        code: err?.code,
        details: err?.details,
        hint: err?.hint
      });
      return null;
    }
  }

  static async markProductAsUnavailable(productId: string): Promise<void> {
    await this.setProductStatus(productId, 'inactive');
  }

  static async setProductStatus(
    productId: string,
    status: 'active' | 'inactive' | 'sold' | 'draft',
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('products')
        .update({ status })
        .eq('id', productId);

      if (error) {
        throw error;
      }
    } catch (err) {
      console.error('OrderService.setProductStatus error', err);
    }
  }

  static async syncProductInventoryState(productId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          status,
          has_variants,
          quantity_available,
          variants:product_variants(
            id,
            quantity_available,
            is_active
          )
        `)
        .eq('id', productId)
        .single();

      if (error || !data) {
        return;
      }

      const record = data as any;
      let totalAvailable = 0;

      if (record.has_variants) {
        const variants: any[] = record.variants ?? [];
        totalAvailable = variants
          .filter(variant => variant?.is_active)
          .reduce(
            (acc, variant) =>
              acc + Math.max(0, Number(variant?.quantity_available ?? 0)),
            0,
          );
      } else {
        totalAvailable = Math.max(0, Number(record.quantity_available ?? 0));
      }

      const nextStatus: Order['status'] extends never ? never : Product['status'] =
        totalAvailable > 0 ? 'active' : 'sold';

      if (record.status !== nextStatus) {
        await supabase
          .from('products')
          .update({ status: nextStatus })
          .eq('id', productId);
      }
    } catch (err) {
      console.error('OrderService.syncProductInventoryState error', err);
    }
  }

  static async restoreInventoryFromOrder(
    productId: string,
    variantId: string | null,
    quantity: number,
  ): Promise<boolean> {
    let changed = false;
    try {
      if (variantId) {
        const { data: variantRow, error: variantError } = await supabase
          .from('product_variants')
          .select('id, quantity_available, quantity_reserved')
          .eq('id', variantId)
          .maybeSingle();

        if (!variantError && variantRow) {
          const currentAvailable = Number(variantRow.quantity_available ?? 0);
          const currentReserved = Number(variantRow.quantity_reserved ?? 0);
          const newAvailable = currentAvailable + quantity;
          const newReserved = Math.max(0, currentReserved - quantity);

          const { error: updateError } = await supabase
            .from('product_variants')
            .update({
              quantity_available: newAvailable,
              quantity_reserved: newReserved,
            })
            .eq('id', variantId);

          if (updateError) {
            throw updateError;
          }

          changed = true;
        }
      } else {
        const { data: productRow, error: productError } = await supabase
          .from('products')
          .select('quantity_available')
          .eq('id', productId)
          .maybeSingle();

        if (!productError && productRow) {
          const currentAvailable = Number(productRow.quantity_available ?? 0);
          const newAvailable = currentAvailable + quantity;

          const { error: updateError } = await supabase
            .from('products')
            .update({ quantity_available: newAvailable })
            .eq('id', productId);

          if (updateError) {
            throw updateError;
          }

          changed = true;
        }
      }
    } catch (err) {
      console.error('OrderService.restoreInventoryFromOrder error', err);
    }

    return changed;
  }

  static async releaseReservedQuantity(
    productId: string,
    variantId: string | null,
    quantity: number,
  ): Promise<boolean> {
    if (!variantId) {
      return false;
    }

    let changed = false;
    try {
      const { data: variantRow, error: variantError } = await supabase
        .from('product_variants')
        .select('id, quantity_reserved')
        .eq('id', variantId)
        .maybeSingle();

      if (!variantError && variantRow) {
        const currentReserved = Number(variantRow.quantity_reserved ?? 0);
        const newReserved = Math.max(0, currentReserved - quantity);

        const { error: updateError } = await supabase
          .from('product_variants')
          .update({ quantity_reserved: newReserved })
          .eq('id', variantId);

        if (updateError) {
          throw updateError;
        }

        changed = true;
      }
    } catch (err) {
      console.error('OrderService.releaseReservedQuantity error', err);
    }

    return changed;
  }

  private static async getOrCreateDeliveryMethod(
    name: string,
    defaults: { display_name: string; base_price: number; estimated_days: number; is_active?: boolean },
  ): Promise<DeliveryMethod | null> {
    try {
      const { data, error } = await supabase
        .from('delivery_methods')
        .select('*')
        .eq('name', name)
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        return data as DeliveryMethod;
      }

      const { data: inserted, error: insertError } = await supabase
        .from('delivery_methods')
        .insert({
          name,
          display_name: defaults.display_name,
          base_price: defaults.base_price,
          estimated_days: defaults.estimated_days,
          is_active: defaults.is_active ?? true,
        })
        .select('*')
        .single();

      if (insertError) {
        throw insertError;
      }

      return inserted as DeliveryMethod;
    } catch (err) {
      console.error('OrderService.getOrCreateDeliveryMethod error', err);
      return null;
    }
  }

  static async getPickupMethod(): Promise<DeliveryMethod | null> {
    try {

      const { data, error } = await supabase
        .from('delivery_methods')
        .select('*')
        .eq('name', 'pickup_point')
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        return data as DeliveryMethod;
      }

      const { data: inserted, error: insertError } = await supabase
        .from('delivery_methods')
        .insert({
          name: 'pickup_point',
          display_name: 'Pickup Point',
          base_price: 0,
          estimated_days: 1,
          is_active: true,
        })
        .select('*')
        .single();

      if (insertError) {
        throw insertError;
      }

      return inserted as DeliveryMethod;
      
    } catch (err) {
      console.error('OrderService.getPickupMethod error', err);
      return null;
    }
  }

  static async getHomeDeliveryMethod(): Promise<DeliveryMethod | null> {
    return OrderService.getOrCreateDeliveryMethod('home_delivery', {
      display_name: 'Home Delivery',
      base_price: 0,
      estimated_days: 3,
      is_active: true,
    });
  }

  static async getOrders(
    userId: string,
    role: 'buyer' | 'seller',
    options: { includeConversations?: boolean } = {},
  ): Promise<Order[]> {
    const includeConversations = options.includeConversations ?? false;

    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          product:products(
            *,
            product_images(*),
            option_groups:product_option_groups(
              *,
              values:product_option_values(*)
            )
          ),
          buyer:users!orders_buyer_id_fkey(*),
          seller:users!orders_seller_id_fkey(*),
          variant:product_variants!orders_product_variant_id_fkey(
            *,
            option_values:product_variant_values(
              option_value:product_option_values(*)
            )
          ),
          delivery:order_deliveries(
            *,
            delivery_method:delivery_methods(*),
            shipping_address:user_addresses(*),
            pickup_address:user_pickup_addresses(
              *,
              pickup_location:pickup_locations(
                *,
                city:cities(*)
              )
            )
          ),
          payment:order_payments(*),
          statuses:order_statuses(*),
          messages:order_messages(
            *,
            sender:users!order_messages_sender_id_fkey(*),
            receiver:users!order_messages_receiver_id_fkey(*)
          ),
          shipping_address:user_addresses(*),
          pickup_address:user_pickup_addresses(
            *,
            pickup_location:pickup_locations(
              *,
              city:cities(*)
            )
          )
        `)
        .eq(role === 'buyer' ? 'buyer_id' : 'seller_id', userId);

      if (!includeConversations) {
        query = query.eq('is_conversation_only', false);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      let normalised = (data || []).map((order: any) => {
        const deliveryRecord = Array.isArray(order.delivery)
          ? order.delivery[0]
          : order.delivery;

        const delivery = deliveryRecord ?? undefined;
        const pickupAddress =
          order.pickup_address ??
          delivery?.pickup_address ??
          undefined;

        const shippingAddress =
          order.shipping_address ??
          delivery?.shipping_address ??
          undefined;

        return {
          ...order,
          delivery,
          pickup_address: pickupAddress,
          shipping_address: shippingAddress,
        };
      });

      const missingPickupIds = Array.from(
        new Set(
          normalised
            .map(order => {
              if (!order) return null;

              const isPickup =
                order.delivery?.delivery_type === 'pickup_point' ||
                order.delivery_type === 'pickup_point';

              const pickupId =
                order.pickup_address_id ??
                order.delivery?.pickup_address_id ??
                order.delivery?.pickup_address?.id ??
                order.pickup_address?.id;

              const needsLookup =
                isPickup &&
                !order.pickup_address &&
                !order.delivery?.pickup_address &&
                pickupId;

              return needsLookup ? pickupId : null;
            })
            .filter((value): value is string => Boolean(value)),
        ),
      );

      if (missingPickupIds.length > 0) {
        const { data: pickupRows, error: pickupError } = await supabase
          .from('user_pickup_addresses')
          .select(`
            *,
            pickup_location:pickup_locations(
              *,
              city:cities(*)
            )
          `)
          .in('id', missingPickupIds);

        if (!pickupError && pickupRows) {
          const pickupMap = new Map<string, any>(
            pickupRows.map((row: any) => [row.id, row]),
          );

          normalised = normalised.map(order => {
            const pickupId =
              order.pickup_address_id ??
              order.delivery?.pickup_address_id;

            if (pickupId) {
              const resolved = pickupMap.get(pickupId);
              if (resolved) {
                const deliveryWithPickup = order.delivery
                  ? { ...order.delivery, pickup_address: resolved }
                  : order.delivery_type === 'pickup_point'
                  ? {
                      pickup_address: resolved,
                      pickup_address_id: pickupId,
                      delivery_type: 'pickup_point',
                      pickup_location_data: resolved?.pickup_location,
                    }
                  : order.delivery;

                return {
                  ...order,
                  delivery: deliveryWithPickup,
                  pickup_address: resolved,
                };
              }
            }
            return order;
          });
        }
      }

      return normalised as Order[];
    } catch (err) {
      console.error('OrderService.getOrders error', err);
      return [];
    }
  }

  static async getOrder(orderId: string): Promise<Order | null> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          product:products(
            *,
            product_images(*),
            option_groups:product_option_groups(
              *,
              values:product_option_values(*)
            )
          ),
          buyer:users!orders_buyer_id_fkey(*),
          seller:users!orders_seller_id_fkey(*),
          delivery:order_deliveries(
            *,
            delivery_method:delivery_methods(*),
            shipping_address:user_addresses(*),
            pickup_address:user_pickup_addresses(*)
          ),
          payment:order_payments(*),
          statuses:order_statuses(*),
          messages:order_messages(
            *,
            sender:users!order_messages_sender_id_fkey(*),
            receiver:users!order_messages_receiver_id_fkey(*)
          ),
          shipping_address:user_addresses(*),
          pickup_address:user_pickup_addresses(*),
          variant:product_variants!orders_product_variant_id_fkey(
            *,
            option_values:product_variant_values(
              option_value:product_option_values(*)
            )
          )
        `)
        .eq('id', orderId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      const deliveryRecord = Array.isArray(data.delivery) ? data.delivery[0] : data.delivery;

      let pickupAddress =
        data.pickup_address ??
        deliveryRecord?.pickup_address ??
        undefined;

      const pickupId =
        data.pickup_address_id ??
        deliveryRecord?.pickup_address_id;

      if (!pickupAddress && pickupId) {
        const { data: pickupRow, error: pickupError } = await supabase
          .from('user_pickup_addresses')
          .select(`
            *,
            pickup_location:pickup_locations(
              *,
              city:cities(*)
            )
          `)
          .eq('id', pickupId)
          .maybeSingle();

        if (!pickupError && pickupRow) {
          pickupAddress = pickupRow;
        }
      }

      const deliveryWithPickup = deliveryRecord
        ? {
            ...deliveryRecord,
            pickup_address: pickupAddress ?? deliveryRecord?.pickup_address,
            pickup_location_data:
              deliveryRecord?.pickup_location_data ??
              pickupAddress?.pickup_location,
          }
        : deliveryRecord;

      return {
        ...(data as Order),
        delivery: deliveryWithPickup ?? undefined,
        pickup_address: pickupAddress,
        shipping_address: data.shipping_address ?? deliveryRecord?.shipping_address ?? undefined,
      };
    } catch (err) {
      console.error('OrderService.getOrder error', err);
      return null;
    }
  }

  static async updateOrderStatus(
    orderId: string,
    status: Order['status'],
    changedBy: string,
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (orderError) {
        throw orderError;
      }

      const { error: statusError } = await supabase
        .from('order_statuses')
        .insert({
          order_id: orderId,
          status,
          changed_by: changedBy,
          reason,
          metadata,
        });

      if (statusError) {
        throw statusError;
      }

      try {
        const order = await this.getOrder(orderId);
        const productId = order?.product_id;
        if (productId) {
          // Only sync product status based on inventory, not order status
          // Products should stay active until all stock is sold
          await this.syncProductInventoryState(productId);
        }
      } catch (productStatusError) {
        console.error('OrderService.updateOrderStatus product sync error', productStatusError);
      }

      return true;
    } catch (err) {
      console.error('OrderService.updateOrderStatus error', err);
      return false;
    }
  }

  static async updateDeliveryStatus(
    orderId: string,
    deliveryStatus: OrderDelivery['delivery_status'],
    options: {
      trackingNumber?: string;
      invoiceId?: string;
      deliveryNoteUrl?: string;
      shipmentReceiptUrl?: string;
    } = {},
  ): Promise<boolean> {
    try {
      const updateData: Record<string, any> = {
        delivery_status: deliveryStatus,
      };

      if (options.trackingNumber) {
        updateData.tracking_number = options.trackingNumber;
      }
      if (options.invoiceId !== undefined) {
        updateData.invoice_id = options.invoiceId;
      }
      if (options.shipmentReceiptUrl !== undefined) {
        updateData.delivery_note_url = options.shipmentReceiptUrl;
      } else if (options.deliveryNoteUrl !== undefined) {
        updateData.delivery_note_url = options.deliveryNoteUrl;
      }

      const { error } = await supabase
        .from('order_deliveries')
        .update(updateData)
        .eq('order_id', orderId);

      if (error) {
        throw error;
      }

      return true;
    } catch (err) {
      console.error('OrderService.updateDeliveryStatus error', err);
      return false;
    }
  }

  static async uploadPaymentReceipt(orderId: string, receiptUri: string): Promise<string | null> {
    try {
      // Convert URI to array buffer for upload
      const response = await fetch(receiptUri);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Determine file extension from URI or default to jpg
      const fileExt = receiptUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `payment-receipts/${orderId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from("payment-receipts")
        .upload(fileName, uint8Array);

      if (error) {
        console.error(`Storage error details:`, error);
        throw new Error(`Failed to upload receipt: ${error.message}. Please ensure the 'payment-receipts' storage bucket exists in your Supabase project.`);
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("payment-receipts").getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      console.error('OrderService.uploadPaymentReceipt error', err);
      return null;
    }
  }

  static async uploadShipmentReceipt(orderId: string, imageUri: string): Promise<string | null> {
    try {
      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();
      const fileBytes = new Uint8Array(arrayBuffer);

      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `shipping-receipts/${orderId}/${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('shipping-receipts')
        .upload(fileName, fileBytes, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Storage error uploading shipping receipt:', error);
        throw new Error(`Failed to upload shipping receipt: ${error.message}. Please ensure the 'shipping-receipts' storage bucket exists in Supabase.`);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('shipping-receipts').getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      console.error('OrderService.uploadShipmentReceipt error', err);
      return null;
    }
  }

  static async submitPaymentProof(
    orderId: string,
    paymentId: string,
    amount: number,
    currency: string,
    receiptUrl?: string | null
  ): Promise<boolean> {
    try {
      const paymentData: Record<string, any> = {
        order_id: orderId,
        payment_method: 'sham_cash',
        payment_id: paymentId,
        amount,
        currency,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      };

      // Add receipt URL if provided (only if column exists in database)
      if (receiptUrl) {
        paymentData.receipt_url = receiptUrl;
      }

      const { error: paymentError } = await supabase
        .from('order_payments')
        .insert(paymentData);

      if (paymentError) {
        throw paymentError;
      }

      const { error: orderError } = await supabase
        .from('orders')
        .update({
          payment_id: paymentId,
          status: 'payment_submitted',
        })
        .eq('id', orderId);

      if (orderError) {
        throw orderError;
      }

      const order = await this.getOrder(orderId);
      if (order?.buyer_id && order?.seller_id) {
        const { error: messageError } = await supabase
          .from('order_messages')
          .insert({
            order_id: orderId,
            sender_id: order.buyer_id,
            receiver_id: order.seller_id,
            message: `Payment proof submitted with ID: ${paymentId}`,
            message_type: 'payment_status',
          });

        if (messageError) {
          throw messageError;
        }
      }

      return true;
    } catch (err) {
      console.error('OrderService.submitPaymentProof error', err);
      return false;
    }
  }
}

export default OrderService;
