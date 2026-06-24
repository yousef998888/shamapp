import { supabase } from '@/lib/supabase';
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
    // Use environment variable or default to your server URL
    this.baseUrl = this.getServerUrl();
  }

  private normalizeServerUrl(url?: string | null): string {
    if (!url) {
      return '';
    }

    return url.trim().replace(/\/+$/, '');
  }

  private getServerUrl(): string {
    const envUrl = this.normalizeServerUrl(import.meta.env.VITE_SERVER_URL);
    if (envUrl) {
      return envUrl;
    }

    return 'http://localhost:6666';
  }

  /**
   * Process a product to generate embeddings and tags
   */
  async processProduct(productData: ProductAIRequest): Promise<ProductAIResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/product-ai/process-product`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      const rawBody = await response.text();

      if (!response.ok) {
        try {
          const errorData: ProductAIError = JSON.parse(rawBody);
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        } catch {
          throw new Error(`HTTP error! status: ${response.status}. Raw response: ${rawBody || 'No body returned.'}`);
        }
      }

      try {
        const result: ProductAIResponse = JSON.parse(rawBody);
        return result;
      } catch {
        throw new Error(`Failed to parse AI response JSON. Raw body: ${rawBody || 'No body returned.'}`);
      }
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
    tags: string[],
    arTags: string[] = []
  ): Promise<{ success: boolean; productId?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          ...productData,
          embedding,
          tags,
          ar_tags: arTags,
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
