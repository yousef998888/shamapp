import { useState, useCallback } from 'react';
import { getPricing, PricingRequest, PricingResponse } from '../services/DeliveryService';
import { Address } from '../components/Location/AddressSelector';

interface DeliveryEstimation {
  price: number;
  currency: string;
  isLoading: boolean;
  error: string | null;
  // Enhanced delivery details
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

export function useDeliveryEstimation() {
  const [homeDelivery, setHomeDelivery] = useState<DeliveryEstimation>({
    price: 2.90, // fallback price
    currency: 'GBP',
    isLoading: false,
    error: null,
    serviceName: 'Standard Delivery',
    serviceDetails: 'Royal Mail 48',
    estimatedDays: '2-3 working days',
    deliveryDateRange: null,
    sourceLocation: '',
    destinationLocation: '',
  });

  const [pickupDelivery, setPickupDelivery] = useState<DeliveryEstimation>({
    price: 2.29, // fallback price
    currency: 'GBP',
    isLoading: false,
    error: null,
    serviceName: 'Collect+ Standard',
    serviceDetails: 'Pickup from local collection point',
    estimatedDays: '2-4 working days',
    deliveryDateRange: null,
    sourceLocation: '',
    destinationLocation: '',
  });

  // Helper function to calculate delivery date range
  const calculateDeliveryDates = (minDays: number, maxDays: number) => {
    const today = new Date();
    const earliest = new Date(today);
    const latest = new Date(today);
    
    // Add working days (skip weekends)
    let addedDays = 0;
    let currentDate = new Date(today);
    
    // Calculate earliest date
    while (addedDays < minDays) {
      currentDate.setDate(currentDate.getDate() + 1);
      // Skip weekends (Saturday = 6, Sunday = 0)
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        addedDays++;
      }
    }
    earliest.setTime(currentDate.getTime());
    
    // Calculate latest date
    addedDays = 0;
    currentDate = new Date(today);
    while (addedDays < maxDays) {
      currentDate.setDate(currentDate.getDate() + 1);
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        addedDays++;
      }
    }
    latest.setTime(currentDate.getTime());
    
    return { earliest, latest };
  };

  const estimateDelivery = useCallback(async (
    destination: Address,
    source?: Address,
    weightClass: string = 'light'
  ) => {
    // Default source location (seller's location or warehouse)
    const defaultSource = source || {
      street: 'Warehouse',
      city: 'London',
      postcode: 'SW1A 1AA',
      country: 'UK'
    };

    const sourceCityCode = getCityCode(defaultSource.city);
    const destinationCityCode = getCityCode(destination.city);

    const sourceLocationStr = `${defaultSource.city}, ${defaultSource.country}`;
    const destinationLocationStr = `${destination.city}, ${destination.country}`;

    if (!sourceCityCode || !destinationCityCode) {
      console.warn('Could not find city codes for pricing estimation');
      return;
    }

    // Set loading state for both delivery types
    setHomeDelivery(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null,
      sourceLocation: sourceLocationStr,
      destinationLocation: destinationLocationStr,
    }));
    setPickupDelivery(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null,
      sourceLocation: sourceLocationStr,
      destinationLocation: destinationLocationStr,
    }));

    try {
      // Estimate home delivery cost
      const homeRequest: PricingRequest = {
        source: sourceCityCode,
        destination: destinationCityCode,
        weight_class: weightClass,
      };

      const homeResponse: PricingResponse = await getPricing(homeRequest);
      
      if (homeResponse.success) {
        const homeDeliveryDates = calculateDeliveryDates(2, 3);
        const pickupDeliveryDates = calculateDeliveryDates(2, 4);
        
        setHomeDelivery({
          price: homeResponse.data.estimated_price,
          currency: homeResponse.data.currency,
          isLoading: false,
          error: null,
          serviceName: 'Standard Delivery',
          serviceDetails: 'Royal Mail 48',
          estimatedDays: '2-3 working days',
          deliveryDateRange: homeDeliveryDates,
          sourceLocation: sourceLocationStr,
          destinationLocation: destinationLocationStr,
        });

        // For pickup, typically it's cheaper, so we can apply a discount
        const pickupPrice = Math.max(homeResponse.data.estimated_price * 0.8, 2.29); // 20% cheaper but minimum £2.29

        setPickupDelivery({
          price: pickupPrice,
          currency: homeResponse.data.currency,
          isLoading: false,
          error: null,
          serviceName: 'Collect+ Standard',
          serviceDetails: 'Pickup from local collection point',
          estimatedDays: '2-4 working days',
          deliveryDateRange: pickupDeliveryDates,
          sourceLocation: sourceLocationStr,
          destinationLocation: destinationLocationStr,
        });
      }

    } catch (error) {
      console.error('Error estimating delivery cost:', error);
      
      // Set error state but keep fallback prices with estimated dates
      const errorMessage = 'Failed to get delivery estimate. Using standard rates.';
      const fallbackHomeDeliveryDates = calculateDeliveryDates(2, 3);
      const fallbackPickupDeliveryDates = calculateDeliveryDates(2, 4);
      
      setHomeDelivery(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        deliveryDateRange: fallbackHomeDeliveryDates,
        sourceLocation: sourceLocationStr,
        destinationLocation: destinationLocationStr,
      }));
      
      setPickupDelivery(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        deliveryDateRange: fallbackPickupDeliveryDates,
        sourceLocation: sourceLocationStr,
        destinationLocation: destinationLocationStr,
      }));
    }
  }, []);

  const reset = useCallback(() => {
    setHomeDelivery({
      price: 2.90,
      currency: 'GBP',
      isLoading: false,
      error: null,
      serviceName: 'Standard Delivery',
      serviceDetails: 'Royal Mail 48',
      estimatedDays: '2-3 working days',
      deliveryDateRange: null,
      sourceLocation: '',
      destinationLocation: '',
    });
    setPickupDelivery({
      price: 2.29,
      currency: 'GBP',
      isLoading: false,
      error: null,
      serviceName: 'Collect+ Standard',
      serviceDetails: 'Pickup from local collection point',
      estimatedDays: '2-4 working days',
      deliveryDateRange: null,
      sourceLocation: '',
      destinationLocation: '',
    });
  }, []);

  return {
    homeDelivery,
    pickupDelivery,
    estimateDelivery,
    reset,
  };
}

// Helper function to map city names to codes
// In a real app, this would come from the DeliveryService.getCities() API
function getCityCode(cityName: string): string | null {
  const cityMappings: Record<string, string> = {
    'london': '1',
    'manchester': '2',
    'birmingham': '3',
    'liverpool': '4',
    'leeds': '5',
    'sheffield': '6',
    'bristol': '7',
    'glasgow': '8',
    'edinburgh': '9',
    'cardiff': '10',
    // Add more city mappings as needed
  };

  const normalizedCity = cityName.toLowerCase().trim();
  return cityMappings[normalizedCity] || '1'; // Default to London if city not found
} 