import type { Order } from '@/types/database';

export type OrderStatusKey = Order['status'];

interface OrderStatusMeta {
  label: string;
  color: string;
  background: string;
  description: string;
  action?: string;
  timelineDescription: string;
  icon: string;
}

export const ORDER_STATUS_SEQUENCE: OrderStatusKey[] = [
  'pending_payment',
  'payment_submitted',
  'admin_approved',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
];

export const ORDER_STATUS_META: Record<OrderStatusKey, OrderStatusMeta> = {
  pending_payment: {
    label: 'Payment Required',
    color: '#B45309',
    background: '#FEF3C7',
    description: 'Send payment via Sham Cash and submit your payment proof within 24 hours.',
    action: 'Submit Payment Proof',
    timelineDescription: 'We are waiting for your payment proof to move forward.',
    icon: 'clock-outline',
  },
  payment_submitted: {
    label: 'Payment Submitted',
    color: '#047857',
    background: '#ECFDF5',
    description: 'Thanks! Our team is reviewing your payment proof.',
    action: 'Edit Payment Proof',
    timelineDescription: 'Payment proof received. We are verifying the details.',
    icon: 'check-circle-outline',
  },
  admin_approved: {
    label: 'Payment Approved',
    color: '#1D4ED8',
    background: '#DBEAFE',
    description: 'The seller can now dispatch your item. We will notify you when it ships.',
    timelineDescription: 'Payment approved. Seller is preparing your item for dispatch.',
    icon: 'shield-check-outline',
  },
  shipped: {
    label: 'Dispatched',
    color: '#6B21A8',
    background: '#F3E8FF',
    description: 'Your item is on the way. Use the chat to contact the seller if needed.',
    timelineDescription: 'The seller shipped your item. It is currently in transit.',
    icon: 'truck-delivery-outline',
  },
  delivered: {
    label: 'Delivered',
    color: '#059669',
    background: '#D1FAE5',
    description: 'Everything arrived? Confirm receipt to complete the order.', // Will be overridden dynamically
    action: 'Confirm Receipt',
    timelineDescription: 'The order arrived. Please confirm everything looks good.', // Will be overridden dynamically
    icon: 'package-variant-closed',
  },
  completed: {
    label: 'Completed',
    color: '#1F2937',
    background: '#E5E7EB',
    description: 'Thank you for shopping with Sham. Feel free to leave a review for the seller.',
    timelineDescription: 'Order closed successfully. Enjoy your purchase!',
    icon: 'star-circle-outline',
  },
  cancelled: {
    label: 'Cancelled',
    color: '#991B1B',
    background: '#FEE2E2',
    description: 'This order was cancelled. Contact support if you need help.',
    timelineDescription: 'Order cancelled. Reach out to support if this is unexpected.',
    icon: 'close-circle-outline',
  },
};

export const getStatusMeta = (status: OrderStatusKey) => ORDER_STATUS_META[status];
