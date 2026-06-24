import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Order } from '@/types/database';

interface ChatStatusCardProps {
  order: Order;
  currentUserId?: string | null;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
}

export function ChatStatusCard({
  order,
  currentUserId,
  onPrimaryAction,
  primaryActionLabel,
}: ChatStatusCardProps) {
  const isBuyer = currentUserId === order.buyer_id;

  const { title, message, actionLabel } = useMemo(() => {
    if (order.is_conversation_only) {
      return {
        title: 'Conversation started',
        message: 'Discuss item details here. When you are ready to buy, complete checkout to convert this chat into an order.',
        actionLabel: undefined,
      };
    }

    switch (order.status) {
      case 'pending_payment':
        return isBuyer
          ? {
              title: 'Payment required',
              message:
                "Send the payment proof so we can notify the seller. You'll get updates the moment it's reviewed.",
              actionLabel: primaryActionLabel ?? 'Send payment proof',
            }
          : {
              title: 'Awaiting payment proof',
              message: 'The buyer has not submitted payment yet. We will notify you as soon as they do.',
              actionLabel: undefined,
            };
      case 'payment_submitted':
        return isBuyer
          ? {
              title: 'Payment submitted',
              message: 'Hang tight while we verify your payment. We will keep you in the loop.',
              actionLabel: primaryActionLabel ?? 'Update payment proof',
            }
          : {
              title: 'Payment under review',
              message: 'The buyer provided payment proof. Our team will approve it shortly.',
              actionLabel: undefined,
            };
      case 'admin_approved':
        return isBuyer
          ? {
              title: 'Payment approved',
              message: 'The seller can now dispatch your item. Expect shipping updates soon.',
              actionLabel: undefined,
            }
          : {
              title: 'Ready to ship',
              message: 'Payment is approved. Ship the item and share tracking details when available.',
              actionLabel: primaryActionLabel ?? 'View shipping tasks',
            };
      case 'shipped':
        return isBuyer
          ? {
              title: 'Item on the way',
              message:
                order.delivery?.tracking_number
                  ? `Tracking number: ${order.delivery.tracking_number}`
                  : 'The seller has shipped your order.',
              actionLabel: undefined,
            }
          : {
              title: 'Shipment in progress',
              message: 'Your parcel is with the carrier. We will notify the buyer about delivery progress.',
              actionLabel: undefined,
            };
      case 'delivered':
        const deliveryType = order.delivery?.delivery_type;
        const isCollectionPoint = deliveryType === 'pickup_point';
        const isSellerCollection = deliveryType === 'seller_collection';
        
        return isBuyer
          ? {
              title: isCollectionPoint ? 'Ready for pickup' : isSellerCollection ? 'Ready for collection' : 'Item delivered',
              message: isCollectionPoint
                ? 'Your order has arrived at the collection point. Confirm receipt once you collect and check the item.'
                : isSellerCollection
                ? 'Ready for collection. Confirm receipt once you collect and check the item.'
                : 'Confirm receipt once you have checked the item. This releases payment to the seller.',
              actionLabel: primaryActionLabel ?? 'Confirm receipt',
            }
          : {
              title: isCollectionPoint ? 'At collection point' : isSellerCollection ? 'Ready for collection' : 'Delivered to buyer',
              message: isCollectionPoint
                ? 'The order has arrived at the collection point. The buyer can now collect it.'
                : isSellerCollection
                ? 'The buyer can collect the item. Encourage them to confirm receipt once they collect.'
                : 'The buyer has the item. Encourage them to confirm receipt if everything is okay.',
              actionLabel: undefined,
            };
      case 'completed':
        return {
          title: 'Order completed',
          message: 'Great job! Feel free to leave feedback and continue shopping on Sham.',
          actionLabel: undefined,
        };
      case 'cancelled':
        return {
          title: 'Order cancelled',
          message: 'This chat remains available if you need to share additional information.',
          actionLabel: undefined,
        };
      default:
        return {
          title: 'Order update',
          message: 'Stay in touch to keep the transaction moving smoothly.',
          actionLabel: undefined,
        };
    }
  }, [isBuyer, order.delivery?.tracking_number, order.status, primaryActionLabel]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onPrimaryAction ? (
        <TouchableOpacity style={styles.actionButton} onPress={onPrimaryAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#312E81',
  },
  message: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: '#4338CA',
  },
  actionButton: {
    marginTop: 10,
    backgroundColor: '#4338CA',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
