// shipping.ts
// Configuration for Guba Syria Shipping API

export interface WeightClass {
  min: number;
  max: number;
  unit: string;
}

export interface ShippingConfig {
  guba: {
    baseUrl: string;
    token: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  service: {
    fallbackToMock: boolean;
    logLevel: string;
    enableCache: boolean;
    cacheTTL: number;
  };
  weightClasses: Record<string, WeightClass>;
  statusMappings: Record<string, string>;
}

export interface ConfigValidation {
  isValid: boolean;
  errors: string[];
}

export interface ConfigStatus {
  configured: boolean;
  baseUrl: string;
  hasToken: boolean;
  timeout: number;
  retryAttempts: number;
  fallbackEnabled: boolean;
  errors: string[];
}

const shippingConfig: ShippingConfig = {
  // Guba Syria API Configuration
  guba: {
    baseUrl: process.env.DELIVARY_API_URL || 'http://localhost:7777/api/v1/shipping',
    token: process.env.DELIVARY_API_TOKEN || '',
    timeout: parseInt(process.env.DELIVARY_API_TIMEOUT || '30000'), // 30 seconds
    retryAttempts: parseInt(process.env.DELIVARY_API_RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.DELIVARY_API_RETRY_DELAY || '1000'), // 1 second
  },
  
  // Shipping service configuration
  service: {
    fallbackToMock: process.env.SHIPPING_FALLBACK_TO_MOCK === 'true',
    logLevel: process.env.SHIPPING_LOG_LEVEL || 'info',
    enableCache: process.env.SHIPPING_ENABLE_CACHE === 'true',
    cacheTTL: parseInt(process.env.SHIPPING_CACHE_TTL || '300000'), // 5 minutes
  },
  
  // Weight classes mapping
  weightClasses: {
    S: { min: 0, max: 1, unit: 'kg' },
    M: { min: 1, max: 5, unit: 'kg' },
    L: { min: 5, max: 20, unit: 'kg' },
    XL: { min: 20, max: 100, unit: 'kg' },
  },
  
  // Status mappings
  statusMappings: {
    pending: 'pending',
    confirmed: 'confirmed',
    in_transit: 'in_transit',
    delivered: 'delivered',
    cancelled: 'cancelled',
    returned: 'returned',
  },
};

// Validation functions
export const validateConfig = (): ConfigValidation => {
  const errors: string[] = [];
  
  if (!shippingConfig.guba.token) {
    errors.push('GUBA_API_TOKEN is required');
  }
  
  if (!shippingConfig.guba.baseUrl) {
    errors.push('DELIVARY_API_URL is required');
  }
  
  try {
    new URL(shippingConfig.guba.baseUrl);
  } catch (error) {
    errors.push('DELIVARY_API_URL must be a valid URL');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Get configuration status
export const getConfigStatus = (): ConfigStatus => {
  const validation = validateConfig();
  return {
    configured: validation.isValid,
    baseUrl: shippingConfig.guba.baseUrl,
    hasToken: !!shippingConfig.guba.token,
    timeout: shippingConfig.guba.timeout,
    retryAttempts: shippingConfig.guba.retryAttempts,
    fallbackEnabled: shippingConfig.service.fallbackToMock,
    errors: validation.errors,
  };
};

export const config = shippingConfig; 