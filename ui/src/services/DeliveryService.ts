// DeliveryService.ts
import axiosInstance from '../lib/axios';

export interface PingResponse {
  success: boolean;
  message: string;
  store: {
    id: number;
    name: string;
    email: string;
  };
  timestamp: string;
  version: string;
}

export interface Product {
  name: string;
  price: number;
  quantity: number;
}

export interface CreateOrderRequest {
  source: string;
  destination: string;
  sender_name: string;
  sender_phone: string;
  sender_address: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  products_count: number;
  weight_class: string;
  pickup_date: string;
  products: Product[];
}

export interface CreateOrderResponse {
  success: boolean;
  message: string;
  data: {
    order_code: string;
    status: string;
    estimated_price: number;
    pickup_date: string;
    created_at: string;
  };
}

export interface OrderStatusRequest {
  order_code: string;
}

export interface OrderStatusResponse {
  success: boolean;
  data: {
    order_code: string;
    status: string;
    created_at: string;
    updated_at: string;
    details: {
      sender_name: string;
      receiver_name: string;
      weight_class: string;
      products_count: number;
      pickup_date: string;
    };
  };
}

export interface PricingRequest {
  source: string;
  destination: string;
  weight_class: string;
}

export interface PricingResponse {
  success: boolean;
  data: {
    source: string;
    destination: string;
    weight_class: string;
    estimated_price: number;
    currency: string;
    calculation_date: string;
  };
}

export interface City {
  id: number;
  name: string;
  code: number;
  category: string;
}

export interface CitiesResponse {
  success: boolean;
  data: City[];
}

export interface ErrorResponse {
  error: string;
  message: string;
}

/**
 * Ping the shipping API to check if it is active
 */
export async function ping(): Promise<PingResponse> {
  try {
    const response = await axiosInstance.post('/api/v1/shipping/ping', {});
    return response.data;
  } catch (error: unknown) {
    console.error('Error pinging shipping API:', error);
    throw new Error('Failed to ping shipping API');
  }
}

/**
 * Create a new shipping order
 * @param orderData - Order details
 */
export async function createOrder(
  orderData: CreateOrderRequest
): Promise<CreateOrderResponse> {
  try {
    const response = await axiosInstance.post('/api/v1/shipping/orders', orderData);
    return response.data;
  } catch (error: unknown) {
    console.error('Error creating shipping order:', error);
    throw new Error('Failed to create shipping order');
  }
}

/**
 * Get shipping order status
 * @param orderCode - Order code to check status for
 */
export async function getOrderStatus(
  orderCode: string
): Promise<OrderStatusResponse> {
  try {
    const response = await axiosInstance.post('/api/v1/shipping/orders/status', {
      order_code: orderCode
    });
    return response.data;
  } catch (error: unknown) {
    console.error('Error getting shipping order status:', error);
    throw new Error('Failed to get shipping order status');
  }
}

/**
 * Get shipping pricing estimate
 * @param pricingData - Pricing request details
 */
export async function getPricing(
  pricingData: PricingRequest
): Promise<PricingResponse> {
  try {
    const response = await axiosInstance.post('/api/v1/shipping/pricing', pricingData);
    return response.data;
  } catch (error: unknown) {
    console.error('Error getting shipping pricing:', error);
    throw new Error('Failed to get shipping pricing');
  }
}

/**
 * Get list of available shipping cities
 */
export async function getCities(): Promise<CitiesResponse> {
  try {
    const response = await axiosInstance.get('/api/v1/shipping/cities');
    return response.data;
  } catch (error: unknown) {
    console.error('Error fetching shipping cities:', error);
    throw new Error('Failed to fetch shipping cities');
  }
}

// React Query mutation functions
export const PingMutationFn = async () => {
  return ping();
};

export const createOrderMutationFn = async (orderData: CreateOrderRequest) => {
  return createOrder(orderData);
};

export const getOrderStatusMutationFn = async (orderCode: string) => {
  return getOrderStatus(orderCode);
};

export const getPricingMutationFn = async (pricingData: PricingRequest) => {
  return getPricing(pricingData);
};

export const getCitiesQueryFn = async () => {
  return getCities();
};
