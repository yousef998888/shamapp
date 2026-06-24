import { supabase } from '../utils/supabase';
import { ProductWithRelations } from './ProductService';
import SearchService from './SearchService';
import { Product } from '../types/database';

export interface RecommendationStrategy {
  name: string;
  weight: number;
  description: string;
}

export interface RecommendationContext {
  userId?: string;
  userLocation?: {
    latitude: number;
    longitude: number;
    radius?: number; // in km
  };
  priceRange?: {
    min: number;
    max: number;
  };
  categories?: string[];
  limit?: number;
}

export interface RecommendationResult {
  products: ProductWithRelations[];
  strategy: string;
  confidence: number;
  metadata?: any;
}

class RecommendationService {
  private strategies: RecommendationStrategy[] = [
    { name: 'collaborative', weight: 0.4, description: 'Users with similar preferences' },
    { name: 'content_based', weight: 0.3, description: 'Similar products based on content' },
    { name: 'trending', weight: 0.2, description: 'Popular and trending items' },
    { name: 'location_based', weight: 0.1, description: 'Nearby and location-relevant items' }
  ];

  /**
   * Get personalized recommendations for carousels
   */
  async getCarouselRecommendations(
    carouselType: 'personalized' | 'highlights' | 'trending',
    context: RecommendationContext = {}
  ): Promise<RecommendationResult> {
    const limit = context.limit || 4;

    try {
      let result: RecommendationResult;
      
      switch (carouselType) {
        case 'personalized':
          result = await this.getPersonalizedRecommendations(context, limit);
          break;
        case 'highlights':
          result = await this.getHighlightRecommendations(context, limit);
          break;
        case 'trending':
          result = await this.getTrendingRecommendations(context, limit);
          break;
        default:
          throw new Error(`Unknown carousel type: ${carouselType}`);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ [RecommendationService] Error in getCarouselRecommendations:`, error);
      throw error;
    }
  }

  /**
   * Personalized recommendations based on user behavior
   */
  private async getPersonalizedRecommendations(
    context: RecommendationContext,
    limit: number
  ): Promise<RecommendationResult> {
    if (!context.userId) {
      return this.getTrendingRecommendations(context, limit);
    }

    try {
      const userPreferences = await this.getUserPreferences(context.userId);
      
      // Strategy 1: Collaborative filtering - users with similar favorites
      console.log(`🤝 [RecommendationService] Getting collaborative recommendations...`);
      const collaborativeProducts = await this.getCollaborativeRecommendations(
        context.userId,
        userPreferences.favoriteCategories,
        Math.ceil(limit * 0.1)
      );
      console.log(`🤝 [RecommendationService] Collaborative products: ${collaborativeProducts.length}`);

      // Strategy 2: Content-based - similar to user's favorites
      console.log(`🧠 [RecommendationService] Getting content-based recommendations...`);
      const contentBasedProducts = await this.getContentBasedRecommendations(
        userPreferences.favoriteProducts,
        Math.ceil(limit * 0.1)
      );
      console.log(`🧠 [RecommendationService] Content-based products: ${contentBasedProducts.length}`);

      // Strategy 3: Category-based - from user's preferred categories
      console.log(`📂 [RecommendationService] Getting category-based recommendations...`);
      const categoryProducts = await this.getCategoryBasedRecommendations(
        userPreferences.favoriteCategories,
        Math.ceil(limit * 0.2)
      );
      console.log(`📂 [RecommendationService] Category products: ${categoryProducts.length}`);

      // Strategy 4: Search-based - from user's search queries
      console.log(`🔍 [RecommendationService] Getting search-based recommendations...`);
      const searchProducts = await this.getSearchBasedRecommendations(
        userPreferences.searchQueries,
        limit
      );
      console.log(`🔍 [RecommendationService] Search products: ${searchProducts.length}`);

      // Combine and deduplicate
      const allProducts = [...collaborativeProducts, ...contentBasedProducts, ...categoryProducts, ...searchProducts];
      console.log(`🔄 [RecommendationService] Total products before deduplication: ${allProducts.length}`);
      
      const uniqueProducts = this.deduplicateProducts(allProducts).slice(0, limit);
      console.log(`✅ [RecommendationService] Final unique products: ${uniqueProducts.length}`);

      if (uniqueProducts.length === 0) {
        console.log(`⚠️ [RecommendationService] No personalized products found, falling back to trending`);
        return this.getTrendingRecommendations(context, limit);
      }

      return {
        products: uniqueProducts,
        strategy: 'personalized',
        confidence: this.calculateConfidence(uniqueProducts.length, limit),
        metadata: {
          userPreferences,
          strategiesUsed: ['collaborative', 'content_based', 'category_based']
        }
      };
    } catch (error) {
      console.error('❌ [RecommendationService] Error getting personalized recommendations:', error);
      // Fallback to trending
      return this.getTrendingRecommendations(context, limit);
    }
  }

  /**
   * Highlight recommendations - featured and high-quality products
   */
  private async getHighlightRecommendations(
    context: RecommendationContext,
    limit: number
  ): Promise<RecommendationResult> {
    try {
      // Get products with high engagement (views, favorites) and good ratings
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          images:product_images(*),
          seller:user_profiles(full_name, username, avatar_url, rating),
          favorites_count:favorites(count),
          view_count
        `)
        .eq('status', 'active')
        .not('embedding', 'is', null)
        .order('view_count', { ascending: false })
        .limit(limit * 2); // Get more to filter by quality

      if (error) throw error;

      // Filter and score products
      const scoredProducts = data
        .map(product => ({
          ...product,
          score: this.calculateHighlightScore(product)
        }))
        .filter(product => product.score > 0.5) // Quality threshold
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return {
        products: scoredProducts,
        strategy: 'highlights',
        confidence: 0.8,
        metadata: {
          qualityThreshold: 0.5,
          scoringFactors: ['view_count', 'favorites_count', 'seller_rating']
        }
      };
    } catch (error) {
      console.error('Error getting highlight recommendations:', error);
      return this.getTrendingRecommendations(context, limit);
    }
  }

  /**
   * Trending recommendations - popular and recently active products
   */
  private async getTrendingRecommendations(
    context: RecommendationContext,
    limit: number
  ): Promise<RecommendationResult> {
    try {
      
      // Time-decayed popularity score
      const timeDecay = this.getTimeDecayFactor();
      
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          images:product_images(*),
          seller:user_profiles(full_name, username, avatar_url),
          favorites_count:favorites(count)
        `)
        .eq('status', 'active')
        .gte('created_at', thirtyDaysAgo)
        .order('view_count', { ascending: false })
        .limit(limit);


      if (error) {
        console.error(`❌ [RecommendationService] Database error:`, error);
        throw error;
      }

      if (!data || data.length === 0) {
        return this.getFallbackRecommendations(limit);
      }

      // Apply time decay and other factors
      const trendingProducts = data.map(product => ({
        ...product,
        trendingScore: this.calculateTrendingScore(product, timeDecay)
      })).sort((a, b) => b.trendingScore - a.trendingScore);


      return {
        products: trendingProducts,
        strategy: 'trending',
        confidence: 0.7,
        metadata: {
          timeDecay,
          timeWindow: '30_days'
        }
      };
    } catch (error) {
      console.error('❌ [RecommendationService] Error getting trending recommendations:', error);
      // Ultimate fallback - just get recent products
      return this.getFallbackRecommendations(limit);
    }
  }

  /**
   * Get user preferences and behavior patterns
   */
  private async getUserPreferences(userId: string) {
    console.log(`🔍 [RecommendationService] Getting user preferences for: ${userId}`);
    
    // Get user's favorites (latest first)
    const { data: favorites, error: favoritesError } = await supabase
      .from('favorites')
      .select(`
        product_id,
        product:products(category_id, price, currency)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    console.log(`❤️ [RecommendationService] Favorites:`, {
      count: favorites?.length || 0,
      error: favoritesError?.message || 'none'
    });

    // Get user's purchase history (latest first)
    const { data: purchases, error: purchasesError } = await supabase
      .from('orders')
      .select(`
        product_id,
        product:products(category_id, price, currency)
      `)
      .eq('buyer_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50);

    console.log(`🛒 [RecommendationService] Purchases:`, {
      count: purchases?.length || 0,
      error: purchasesError?.message || 'none'
    });

    // Get user's viewed products from user_interactions (latest first)
    const { data: viewedInteractions, error: viewedError } = await supabase
      .from('user_interactions')
      .select(`
        product_id,
        product:products(category_id, price, currency)
      `)
      .eq('user_id', userId)
      .eq('interaction_type', 'view')
      .not('product_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    console.log(`👀 [RecommendationService] Viewed products:`, {
      count: viewedInteractions?.length || 0,
      error: viewedError?.message || 'none',
      products: viewedInteractions?.map(v => ({ 
        id: v.product_id, 
        category: v.product?.category_id,
        price: v.product?.price 
      })) || []
    });

    // Get user's search history (latest first)
    const { data: searchInteractions, error: searchError } = await supabase
      .from('user_interactions')
      .select('metadata')
      .eq('user_id', userId)
      .eq('interaction_type', 'search')
      .order('created_at', { ascending: false })
      .limit(20);

    console.log(`🔍 [RecommendationService] Search history:`, {
      count: searchInteractions?.length || 0,
      error: searchError?.message || 'none',
      searches: searchInteractions?.map(s => s.metadata?.searchQuery).filter(Boolean) || []
    });

    // Analyze preferences
    const allInteractions = [
      ...(favorites || []).map(f => f.product),
      ...(purchases || []).map(p => p.product),
      ...(viewedInteractions || []).map(v => v.product)
    ].filter(Boolean);

    const favoriteCategories = this.getMostFrequentCategories(allInteractions);
    const priceRange = this.calculatePriceRange(allInteractions);
    const searchQueries = searchInteractions?.map(s => s.metadata?.searchQuery).filter(Boolean) || [];

    console.log(`📊 [RecommendationService] User preferences calculated:`, {
      favoriteCategories,
      priceRange,
      totalInteractions: allInteractions.length,
      searchQueries,
      recentSearches: searchQueries.slice(0, 3) // Show first 3 most recent
    });

      return {
        favoriteCategories,
        favoriteProducts: allInteractions.slice(0, 10),
        priceRange,
        searchQueries,
        totalInteractions: allInteractions.length
      };
  }

  /**
   * Collaborative filtering - find users with similar preferences
   */
  private async getCollaborativeRecommendations(
    userId: string,
    favoriteCategories: string[],
    limit: number
  ): Promise<ProductWithRelations[]> {
    if (favoriteCategories.length === 0) return [];

    const { data, error } = await supabase
      .from('favorites')
      .select(`
        user_id,
        product:products(
          *,
          category:categories(*),
          images:product_images(*),
          seller:user_profiles(full_name, username, avatar_url)
        )
      `)
      .in('product.category_id', favoriteCategories)
      .neq('user_id', userId)
      .limit(limit * 3); // Get more to filter

    if (error) return [];

    // Group by user and find similar users
    const userFavorites = new Map();
    data?.forEach(fav => {
      if (!userFavorites.has(fav.user_id)) {
        userFavorites.set(fav.user_id, []);
      }
      userFavorites.get(fav.user_id).push(fav.product);
    });

    // Find users with most overlap
    const similarUsers = Array.from(userFavorites.entries())
      .map(([uid, products]) => ({
        userId: uid,
        products,
        overlap: this.calculateCategoryOverlap(favoriteCategories, products)
      }))
      .filter(user => user.overlap > 0.3)
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, 3);

    // Get products from similar users
    const recommendations = similarUsers
      .flatMap(user => user.products)
      .filter(product => product && product.status === 'active')
      .slice(0, limit);

    return recommendations;
  }

  /**
   * Content-based filtering using embeddings
   */
  private async getContentBasedRecommendations(
    favoriteProducts: any[],
    limit: number
  ): Promise<ProductWithRelations[]> {
    if (favoriteProducts.length === 0) return [];

    // Get embeddings for favorite products
    const favoriteEmbeddings = favoriteProducts
      .filter(p => p.embedding)
      .map(p => p.embedding);

    if (favoriteEmbeddings.length === 0) return [];

    // Average the embeddings
    const avgEmbedding = this.averageEmbeddings(favoriteEmbeddings);

    // Find similar products using vector similarity
    const { data, error } = await supabase.rpc('product_search', {
      query_embedding: avgEmbedding,
      query_text: '', // Not needed for pure embedding search
      limit_count: limit
    });

    if (error) return [];

    return data || [];
  }

  /**
   * Category-based recommendations
   */
  private async getCategoryBasedRecommendations(
    favoriteCategories: string[],
    limit: number
  ): Promise<ProductWithRelations[]> {
    if (favoriteCategories.length === 0) return [];

    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        images:product_images(*),
        seller:user_profiles(full_name, username, avatar_url)
      `)
      .in('category_id', favoriteCategories)
      .eq('status', 'active')
      .order('view_count', { ascending: false })
      .limit(limit);

    if (error) return [];

    return data || [];
  }

  /**
   * Search-based recommendations using AI embeddings via server endpoint
   */
  private async getSearchBasedRecommendations(
    searchQueries: string[],
    limit: number
  ): Promise<ProductWithRelations[]> {
    if (searchQueries.length === 0) {
      console.log(`🔍 [RecommendationService] No search queries provided`);
      return [];
    }

    console.log(`🔍 [RecommendationService] Getting AI search recommendations for:`, {
      queries: searchQueries,
      limit,
      mostRecent: searchQueries[0] // First one is most recent due to DESC ordering
    });

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3005'}/api/recommendations/search-based`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchQueries,
          limit
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log(`🤖 [RecommendationService] AI search response:`, {
        success: data.success,
        query: data.query,
        productCount: data.products?.length || 0,
        products: data.products?.map(p => ({ 
          id: p.id, 
          title: p.title,
          similarity: p.similarity_score 
        })) || []
      });
      
      if (!data.success) {
        throw new Error(data.message || 'Server returned error');
      }

      return data.products || [];
    } catch (error) {
      console.error(`❌ [RecommendationService] AI search-based recommendation error:`, error);
      return [];
    }
  }

  /**
   * Fallback recommendations for edge cases
   */
  private async getFallbackRecommendations(limit: number): Promise<RecommendationResult> {
    console.log(`🔄 [RecommendationService] Using fallback recommendations with limit: ${limit}`);
    
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        images:product_images(*),
        seller:user_profiles(full_name, username, avatar_url)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    console.log(`📊 [RecommendationService] Fallback query result:`, {
      error: error?.message || 'No error',
      dataCount: data?.length || 0,
      data: data?.map(p => ({ id: p.id, title: p.title })) || []
    });

    if (error) {
      console.error(`❌ [RecommendationService] Fallback query error:`, error);
      return {
        products: [],
        strategy: 'fallback',
        confidence: 0.1,
        metadata: { error: error.message }
      };
    }

    return {
      products: data || [],
      strategy: 'fallback',
      confidence: 0.1,
      metadata: { fallbackReason: 'no_data_available' }
    };
  }

  // Helper methods
  private calculateHighlightScore(product: any): number {
    const viewScore = Math.min(product.view_count / 100, 1); // Normalize view count
    const favoritesScore = Math.min((product.favorites_count?.[0]?.count || 0) / 10, 1);
    const sellerScore = product.seller?.rating || 0;
    
    return (viewScore * 0.4) + (favoritesScore * 0.3) + (sellerScore * 0.3);
  }

  private calculateTrendingScore(product: any, timeDecay: number): number {
    const viewScore = Math.min(product.view_count / 50, 1);
    const favoritesScore = Math.min((product.favorites_count?.[0]?.count || 0) / 5, 1);
    const recencyScore = timeDecay;
    
    return (viewScore * 0.5) + (favoritesScore * 0.3) + (recencyScore * 0.2);
  }

  private getTimeDecayFactor(): number {
    // More recent products get higher scores
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    return 1.0; // Simplified for now
  }

  private getMostFrequentCategories(products: any[]): string[] {
    const categoryCount = new Map();
    products.forEach(product => {
      if (product?.category_id) {
        categoryCount.set(product.category_id, (categoryCount.get(product.category_id) || 0) + 1);
      }
    });

    return Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([categoryId]) => categoryId);
  }

  private calculatePriceRange(products: any[]): { min: number; max: number } {
    const prices = products
      .map(p => p?.price)
      .filter(price => typeof price === 'number' && price > 0);

    if (prices.length === 0) return { min: 0, max: 1000 };

    return {
      min: Math.min(...prices) * 0.5,
      max: Math.max(...prices) * 1.5
    };
  }

  private calculateCategoryOverlap(categories1: string[], products: any[]): number {
    const categories2 = products.map(p => p?.category_id).filter(Boolean);
    const intersection = categories1.filter(cat => categories2.includes(cat));
    return intersection.length / Math.max(categories1.length, categories2.length);
  }

  private averageEmbeddings(embeddings: number[][]): number[] {
    if (embeddings.length === 0) return [];
    
    const dimension = embeddings[0].length;
    const avg = new Array(dimension).fill(0);
    
    embeddings.forEach(embedding => {
      embedding.forEach((value, index) => {
        avg[index] += value;
      });
    });
    
    return avg.map(value => value / embeddings.length);
  }

  private deduplicateProducts(products: ProductWithRelations[]): ProductWithRelations[] {
    const seen = new Set();
    return products.filter(product => {
      if (seen.has(product.id)) return false;
      seen.add(product.id);
      return true;
    });
  }

  private calculateConfidence(actualCount: number, requestedCount: number): number {
    return Math.min(actualCount / requestedCount, 1);
  }
}

export default new RecommendationService();
