import React from 'react';
import { Order } from '../../types/database';

interface ProductInfoProps {
  order: Order;
  currentUserId: string;
}

export function ProductInfo({ order, currentUserId }: ProductInfoProps) {
  const isBuyer = currentUserId === order.buyer_id;

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency || 'GBP',
      minimumFractionDigits: 2,
    }).format(price);
  };

  return (
    <div className="bg-white border-b p-4">
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
          {order.product?.images?.[0] ? (
            <img
              src={order.product.images[0].image_url}
              alt={order.product.images[0].alt_text || order.product?.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
              <span className="text-xs">No image</span>
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-row items-center justify-between min-w-0">
          <div>

          <h3 className="font-medium text-sm text-gray-900 truncate">
            {order.product?.title || 'Product'}
          </h3>
          <p className="text-sm text-gray-500">
            {isBuyer ? 'Includes Buyer Protection' : `Order ID: ${order.id.slice(0, 8)}...`}
          </p>
          </div>
          <div>
          <p className="text-lg font-semibold text-gray-900">
            {formatPrice(order.unit_price, order.currency)}
          </p>
          </div>
        </div>
      </div>
    </div>
  );
} 