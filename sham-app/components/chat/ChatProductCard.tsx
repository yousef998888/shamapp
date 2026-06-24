import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { Order } from '@/types/database';

interface ChatProductCardProps {
  order: Order;
}

const formatPrice = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency || 'GBP',
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
};

export function ChatProductCard({ order }: ChatProductCardProps) {
  const image = order.product?.images?.[0]?.image_url;
  const priceValue = order.product?.price ?? order.unit_price ?? 0;
  const priceCurrency = order.product?.currency ?? order.currency ?? 'GBP';
  
  // Build variant description if variant exists
  const variantDescription = React.useMemo(() => {
    if (!order.product_variant_id || !(order as any).variant || !order.product?.option_groups) {
      return null;
    }
    
    const variant = (order as any).variant;
    const parts: string[] = [];
    
    variant.option_values?.forEach((vv: any) => {
      const optionValue = vv.option_value;
      if (!optionValue) return;
      
      const optionGroup = order.product?.option_groups?.find(group => 
        group.values?.some(v => v.id === optionValue.id)
      );
      
      if (optionGroup) {
        parts.push(`${optionGroup.name}: ${optionValue.name}`);
      }
    });
    
    return parts.length > 0 ? parts.join(', ') : null;
  }, [order.product_variant_id, (order as any).variant, order.product?.option_groups]);

  return (
    <View style={styles.container}>
      {image ? (
        <Image source={{ uri: image }} style={styles.thumbnail} />
      ) : (
        <View style={styles.thumbnailFallback}>
          <Text style={styles.thumbnailFallbackText}>No image</Text>
        </View>
      )}
      <View style={styles.textGroup}>
        <View style={styles.titleGroup}>
          <Text style={styles.title} numberOfLines={1}>
            {order.product?.title || 'Product'}
          </Text>
          {variantDescription && (
            <Text style={styles.variantText} numberOfLines={1}>
              {variantDescription}
            </Text>
          )}
        </View>
        <Text style={styles.price}>{formatPrice(priceValue, priceCurrency)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbnail: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  thumbnailFallback: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailFallbackText: {
    fontSize: 9,
    color: '#6B7280',
  },
  textGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleGroup: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  variantText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontStyle: 'italic',
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4338CA',
  },
});
