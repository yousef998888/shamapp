
import { useTranslation } from 'react-i18next';
import { MapPin, Info, Truck, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/shadcn/card';
import { Badge } from '@/components/shadcn/badge';

interface DeliveryEstimation {
  price: number;
  currency: string;
  isLoading: boolean;
  error: string | null;
  serviceName: string;
  serviceDetails: string;
  estimatedDays: string;
  deliveryDateRange: {
    earliest: Date;
    latest: Date;
  } | null;
  sourceLocation: string;
  destinationLocation: string;
}

interface DeliveryEstimationDisplayProps {
  delivery: DeliveryEstimation;
  type: 'home' | 'pickup';
  isSelected?: boolean;
}

export function DeliveryEstimationDisplay({ 
  delivery, 
  type, 
  isSelected = false 
}: DeliveryEstimationDisplayProps) {
  const { t } = useTranslation();

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency || 'GBP',
      minimumFractionDigits: 2,
    }).format(price);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const formatDateRange = (deliveryDateRange: { earliest: Date; latest: Date } | null) => {
    if (!deliveryDateRange) return 'Calculating...';
    
    const { earliest, latest } = deliveryDateRange;
    if (earliest.toDateString() === latest.toDateString()) {
      return `Expected on ${formatDate(earliest)}`;
    }
    
    return `Estimated between ${formatDate(earliest)} and ${formatDate(latest)}`;
  };

  if (delivery.isLoading) {
    return (
      <Card className={`transition-all ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardContent className="p-4 space-y-3">
        {/* Postage and Service Info */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <span className="font-medium text-lg">
              {type === 'home' ? t('checkout.postage') : t('checkout.pickup')}:
            </span>
            <span className="text-lg font-semibold text-green-600">
              {formatPrice(delivery.price, delivery.currency)}
            </span>
            <span className="text-sm text-gray-600">{delivery.serviceName}</span>
          </div>
          <button className="text-blue-600 hover:underline text-sm flex items-center gap-1">
            {t('checkout.seeDetails')}
            <Info className="h-3 w-3" />
          </button>
        </div>

        {/* Service Details */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {type === 'home' ? (
            <Truck className="h-4 w-4" />
          ) : (
            <Package className="h-4 w-4" />
          )}
          <span>{delivery.serviceDetails}</span>
        </div>

        {/* Source Location */}
        {delivery.sourceLocation && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4" />
            <span>
              {t('checkout.locatedIn')}: {delivery.sourceLocation}
            </span>
          </div>
        )}

        {/* Delivery Estimation */}
        <div className="space-y-1">
          <div className="text-sm font-medium text-gray-800">
            {t('checkout.delivery')}:
          </div>
          <div className="text-sm text-gray-700">
            {formatDateRange(delivery.deliveryDateRange)}
          </div>
          {delivery.estimatedDays && (
            <Badge variant="secondary" className="text-xs">
              {delivery.estimatedDays}
            </Badge>
          )}
        </div>

        {/* Error Message */}
        {delivery.error && (
          <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
            {delivery.error}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 