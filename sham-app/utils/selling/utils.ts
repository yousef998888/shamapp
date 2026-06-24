import type { Order } from '@/types/database';

export const ORDER_STATUS_META: Record<Order['status'], { label: string; background: string; color: string }> = {
    pending_payment: { label: 'Payment pending', background: '#FEF3C7', color: '#B45309' },
    awaiting_collection: { label: 'Awaiting collection', background: '#E0F2FE', color: '#0369A1' },
    payment_submitted: { label: 'Payment submitted', background: '#E0E7FF', color: '#4338CA' },
    admin_approved: { label: 'Payment approved', background: '#DCFCE7', color: '#15803D' },
    shipped: { label: 'Shipped', background: '#DBEAFE', color: '#1D4ED8' },
    delivered: { label: 'Delivered', background: '#E0F2FE', color: '#0369A1' },
    completed: { label: 'Completed', background: '#ECFDF5', color: '#047857' },
    cancelled: { label: 'Cancelled', background: '#FEE2E2', color: '#B91C1C' },
};

export const getStatusMeta = (status: Order['status']) => 
    ORDER_STATUS_META[status] ?? ORDER_STATUS_META.pending_payment;

export const formatPrice = (amount?: number | null, currency?: string) => {
    if (amount == null) {
        return '—';
    }
    const symbol = currency === 'SYP' ? 'SYP' : '$';
    return `${symbol}${Number(amount).toFixed(2)}`;
};

export const buildAddressLines = (order: Order | null | undefined, t: any): string[] => {
    if (!order) {
        return [];
    }

    const lines: string[] = [];
    if (!order.delivery) {
        return lines;
    }

    if (order.delivery.delivery_type === 'home_delivery') {
        const address: any = order.delivery.shipping_address ?? order.delivery.delivery_address;
        if (address && typeof address === 'object') {
            const possible = [
                address.recipient_name || address.name,
                address.street || address.line1,
                address.street2 || address.line2,
                [address.city, address.state, address.postal_code].filter(Boolean).join(', '),
                address.country,
            ];
            possible
                .filter((part: any) => part && String(part).trim().length)
                .forEach((part: any) => lines.push(String(part).trim()));
        } else if (typeof address === 'string') {
            lines.push(address);
        }
    } else if (order.delivery.delivery_type === 'pickup_point') {
        const pickup: any = order.delivery.pickup_address ?? order.delivery.pickup_location_data;
        if (pickup && typeof pickup === 'object') {
            const possible = [
                pickup.name,
                pickup.address || pickup.street,
                [pickup.city, pickup.state, pickup.postal_code].filter(Boolean).join(', '),
                pickup.phone,
            ];
            possible
                .filter((part: any) => part && String(part).trim().length)
                .forEach((part: any) => lines.push(String(part).trim()));
        } else if (typeof pickup === 'string') {
            lines.push(pickup);
        }
    } else if (order.delivery.delivery_type === 'seller_collection') {
        lines.push(t.arrangeCollection || 'Arrange collection directly with the buyer');
    }

    if (order.delivery.delivery_type !== 'pickup_point') {
        const deliveryPhone = order.delivery?.contact_phone ?? order.contact_phone;
        if (deliveryPhone) {
            lines.push(deliveryPhone);
        }
    }

    if (order.special_instructions) {
        lines.push(order.special_instructions);
    }

    return lines;
};

export const getShippingSummary = (order: Order, t: any): string => {
    const lines = buildAddressLines(order, t);
    if (lines.length === 0) {
        if (order.delivery?.delivery_type === 'pickup_point') {
            return t.collectionPointPending || 'Collection point pending';
        }
        if (order.delivery?.delivery_type === 'seller_collection') {
            return t.collectionToBeArranged || 'Collection to be arranged';
        }
        return t.shippingAddressPending || 'Shipping address pending';
    }
    return lines[0];
};

export const getBuyerContactLines = (order: Order, t: any): string[] => {
    const lines: string[] = [];
    const buyer: any = order.buyer;
    if (buyer?.full_name || buyer?.username) {
        lines.push(buyer.full_name || buyer.username);
    }
    if (buyer?.phone) {
        lines.push(`${t.phone || 'Phone'}: ${buyer.phone}`);
    }
    if (buyer?.email) {
        lines.push(`${t.email || 'Email'}: ${buyer.email}`);
    }
    const deliveryPhone = order.delivery?.contact_phone || order.contact_phone;
    if (deliveryPhone && deliveryPhone !== buyer?.phone) {
        lines.push(`${t.alternatePhone || 'Alternate phone'}: ${deliveryPhone}`);
    }
    return lines;
};

export const getVariantDescription = (order: Order): string | null => {
    if (!order.product_variant_id || !(order as any).variant) {
        return null;
    }

    const product = order.product as any;
    if (!product?.option_groups) {
        return null;
    }

    const variant = (order as any).variant;
    const parts: string[] = [];
    
    variant.option_values?.forEach((vv: any) => {
        const optionValue = vv.option_value;
        if (!optionValue) return;
        
        const optionGroup = product.option_groups?.find((group: any) => 
            group.values?.some((v: any) => v.id === optionValue.id)
        );
        
        if (optionGroup) {
            parts.push(`${optionGroup.name}: ${optionValue.name}`);
        }
    });
    
    return parts.length > 0 ? parts.join(', ') : null;
};

