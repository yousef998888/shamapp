import { supabase } from "../utils/supabase";
import { Platform } from 'react-native';
import type { Product } from '@/types/database';

export interface ProductAIRequest {
  productId?: string;
  title: string;
  description: string;
  ar_title?: string;
  ar_description?: string;
  deviceLanguage?: string;
}

export interface ProductAIResponse {
  success: boolean;
  embedding: number[];
  tags: string[];
  ar_tags?: string[];
  updatedProductId?: string;
  productStatusAfterUpdate?: Product['status'];
  translations?: {
    title: string;
    ar_title: string;
    description: string;
    ar_description: string;
  };
  stats: {
    embedding_dimension: number;
    tags_count: number;
    ar_tags_count?: number;
  };
}

export interface ProductAIError {
  error: string;
  message?: string;
  details?: any[];
}

class ProductAIService {
  private baseUrl: string;

  constructor() {
    // Use environment variable or determine URL based on platform
    this.baseUrl = this.getServerUrl();
    
    // Debug logging
    if (__DEV__) {
      console.log('ProductAIService initialized:', {
        platform: Platform.OS,
        serverUrl: this.baseUrl,
        environment: Platform.OS === 'web' ? 'web' : 'mobile',
      });
    }
  }

  private getServerUrl(): string {
    // Check for environment variable first
    if (process.env.EXPO_PUBLIC_SERVER_URL) {
      return process.env.EXPO_PUBLIC_SERVER_URL;
    }
    throw new Error('EXPO_PUBLIC_SERVER_URL is not set');

  }

  /**
   * Process a product to generate embeddings and tags
   */
  async processProduct(productData: ProductAIRequest): Promise<ProductAIResponse> {
    try {
      const url = `${this.baseUrl}/api/product-ai/process-product`;
      console.log(`🤖 Processing product with AI${productData.productId ? ` (productId: ${productData.productId})` : ''}...`);
      console.log('Server URL:', this.baseUrl);
      console.log('Full URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorData: ProductAIError = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result: ProductAIResponse = await response.json();
      return result;
    } catch (error) {
      console.error('Product AI processing error:', error);
      throw error;
    }
  }

  /**
   * Check if the AI service is available
   */
  async checkStatus(): Promise<{ status: string; openaiConfigured: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/product-ai/status`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('AI service status check failed:', error);
      throw error;
    }
  }

  /**
   * Save product with AI-generated embeddings and tags to Supabase
   */
  async saveProductWithAI(
    productData: any,
    embedding: number[],
    tags: string[]
  ): Promise<{ success: boolean; productId?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          ...productData,
          embedding,
          tags,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, productId: data.id };
    } catch (error) {
      console.error('Save product with AI error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

export default new ProductAIService();
