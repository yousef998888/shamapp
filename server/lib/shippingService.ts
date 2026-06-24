// shippingService.ts
// Business logic for shipping operations with Guba Syria API integration

import { config as shippingConfig, validateConfig, getConfigStatus } from '../config/shipping';

// API response interfaces
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

// Error handling
export class ShippingServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public apiError?: any
  ) {
    super(message);
    this.name = 'ShippingServiceError';
  }
}

/**
 * Shipping service class integrating with Guba Syria API
 */
export class ShippingService {
  /**
   * Make authenticated API request to Guba Syria with retry logic
   */
  private static async makeApiRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any,
    attempt: number = 1
  ): Promise<T> {
    if (!shippingConfig.guba.token) {
      throw new ShippingServiceError('Guba API token not configured', 500);
    }

    const url = `${shippingConfig.guba.baseUrl}/api/v1/shipping${endpoint}`;
    // console.log('makeApiRequest', url);
    // console.log('shippingConfig.guba.token', shippingConfig.guba.token);
    // console.log('body',body);
    // console.log('method',method);
    // console.log('attempt',attempt);

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${shippingConfig.guba.token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'ShamShop-ShippingService/1.0.0',
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(shippingConfig.guba.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Retry on 5xx errors (server errors)
        if (response.status >= 500 && attempt < shippingConfig.guba.retryAttempts) {
          console.warn(`API request failed with ${response.status}, retrying... (attempt ${attempt + 1})`);
          await new Promise(resolve => setTimeout(resolve, shippingConfig.guba.retryDelay));
          return this.makeApiRequest<T>(endpoint, method, body, attempt + 1);
        }
        
        throw new ShippingServiceError(
          `API request failed: ${response.statusText}`,
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ShippingServiceError) {
        throw error;
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ShippingServiceError('API request timeout', 408);
      }

      // Retry on network errors
      if (attempt < shippingConfig.guba.retryAttempts) {
        console.warn(`Network error, retrying... (attempt ${attempt + 1})`);
        await new Promise(resolve => setTimeout(resolve, shippingConfig.guba.retryDelay));
        return this.makeApiRequest<T>(endpoint, method, body, attempt + 1);
      }

      throw new ShippingServiceError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  /**
   * Check if shipping API is active
   */
  static async ping(): Promise<PingResponse> {
    try {
      const response = await this.makeApiRequest<PingResponse>('/ping','POST');
      return response;
    } catch (error) {
      // Fallback to mock response if API is unavailable and fallback is enabled
      if (shippingConfig.service.fallbackToMock) {
        console.warn('Guba API ping failed, using fallback:', error);
        return {
          success: false,
          message: 'Shipping API is temporarily unavailable',
          store: {
            id: 1,
            name: 'Sham Shop',
            email: 'info@shamshop.com'
          },
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        };
      }
      throw error;
    }
  }

  /**
   * Create a new shipping order
   */
  static async createOrder(orderData: CreateOrderRequest): Promise<CreateOrderResponse> {
    try {

      console.log("apiPayload" , orderData);
      
      const response = await this.makeApiRequest<CreateOrderResponse>(
        '/orders',
        'POST',
        orderData
      );
      
      return response;
    } catch (error) {
      if (error instanceof ShippingServiceError) {
        throw error;
      }
      throw new ShippingServiceError(
        `Failed to create shipping order: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  /**
   * Get shipping order status
   */
  static async getOrderStatus(orderCode: string): Promise<OrderStatusResponse> {
    try {
      const response = await this.makeApiRequest<OrderStatusResponse>(
        `/orders/status`,
        'POST',
        {
          order_code: orderCode
        }
      );
      
      return response;
    } catch (error) {
      if (error instanceof ShippingServiceError) {
        throw error;
      }
      throw new ShippingServiceError(
        `Failed to get order status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  /**
   * Get shipping pricing estimate
   */
  static async getPricing(pricingData: PricingRequest): Promise<PricingResponse> {
    try {
      // Validate weight class
      // if (!shippingConfig.weightClasses[pricingData.weight_class as keyof typeof shippingConfig.weightClasses]) {
      //   throw new ShippingServiceError(`Invalid weight class: ${pricingData.weight_class}`, 400);
      // }
      console.log('pricingData', pricingData);

      const response = await this.makeApiRequest<PricingResponse>(
        '/pricing',
        'POST',
        {
          source: pricingData.source,
          destination: pricingData.destination,
          weight_class: pricingData.weight_class,
        }
      );
      
      return response;
    } catch (error) {
      if (error instanceof ShippingServiceError) {
        throw error;
      }
      throw new ShippingServiceError(
        `Failed to get pricing estimate: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  /**
   * Get list of available shipping cities
   */
  static async getCities(): Promise<CitiesResponse> {
    try {
      const response = await this.makeApiRequest<CitiesResponse>('/cities');
      return response;
    } catch (error) {
      if (error instanceof ShippingServiceError) {
        throw error;
      }
      
      // Fallback to mock cities if API fails and fallback is enabled
      if (shippingConfig.service.fallbackToMock) {
        console.warn('Guba API cities request failed, using fallback:', error);
        const cities: City[] = [
          { id: 1, name: 'Damascus', code: 1001, category: 'major' },
          { id: 2, name: 'Aleppo', code: 1002, category: 'major' },
          { id: 3, name: 'Homs', code: 1003, category: 'major' },
          { id: 4, name: 'Latakia', code: 1004, category: 'major' },
          { id: 5, name: 'Hama', code: 1005, category: 'major' },
          { id: 6, name: 'Tartus', code: 1006, category: 'medium' },
          { id: 7, name: 'Deir ez-Zor', code: 1007, category: 'medium' },
          { id: 8, name: 'Al-Hasakah', code: 1008, category: 'medium' },
          { id: 9, name: 'Idlib', code: 1009, category: 'medium' },
          { id: 10, name: 'Daraa', code: 1010, category: 'medium' }
        ];
        
        return {
          success: true,
          data: cities
        };
      }
      throw error;
    }
  }

  /**
   * Validate API configuration
   */
  static validateConfig(): boolean {
    return validateConfig().isValid;
  }

  /**
   * Get API configuration status
   */
  static getConfigStatus() {
    return getConfigStatus();
  }

  /**
   * Get available weight classes
   */
  static getWeightClasses() {
    return shippingConfig.weightClasses;
  }

  /**
   * Get status mappings
   */
  static getStatusMappings() {
    return shippingConfig.statusMappings;
  }
} 