import { supabase } from '../utils/supabase';

export interface UserInteraction {
  userId: string;
  productId: string;
  interactionType: 'view' | 'favorite' | 'unfavorite' | 'search' | 'purchase' | 'share';
  metadata?: {
    searchQuery?: string;
    categoryId?: string;
    price?: number;
    location?: string;
    sessionId?: string;
    timestamp?: string;
  };
}

export interface UserSession {
  sessionId: string;
  userId?: string;
  startTime: string;
  lastActivity: string;
  interactions: UserInteraction[];
  deviceInfo?: {
    platform: string;
    version: string;
  };
}

class UserBehaviorService {
  private currentSession: UserSession | null = null;

  /**
   * Initialize a new user session
   */
  initializeSession(userId?: string): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.currentSession = {
      sessionId,
      userId,
      startTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      interactions: [],
      deviceInfo: {
        platform: 'mobile', // Could be enhanced with actual device detection
        version: '1.0.0'
      }
    };

    return sessionId;
  }

  /**
   * Track a user interaction
   */
  async trackInteraction(interaction: Omit<UserInteraction, 'userId'>): Promise<void> {
    if (!this.currentSession) {
      console.warn('No active session, initializing new one');
      this.initializeSession();
    }

    const fullInteraction: UserInteraction = {
      ...interaction,
      userId: this.currentSession!.userId || 'anonymous',
      metadata: {
        ...interaction.metadata,
        sessionId: this.currentSession!.sessionId,
        timestamp: new Date().toISOString()
      }
    };

    // Add to current session
    this.currentSession!.interactions.push(fullInteraction);
    this.currentSession!.lastActivity = new Date().toISOString();

    // Store in database only if user is logged in (async, don't wait)
    // Anonymous users' interactions are tracked in session but not persisted
    if (this.currentSession!.userId) {
      this.storeInteraction(fullInteraction).catch(error => {
        console.error('Failed to store interaction:', error);
      });
    }

    // Update product view count if it's a view interaction
    if (interaction.interactionType === 'view') {
      this.incrementProductViewCount(interaction.productId).catch(error => {
        console.error('Failed to increment view count:', error);
      });
    }
  }

  /**
   * Track product view
   */
  async trackProductView(productId: string, metadata?: Partial<UserInteraction['metadata']>): Promise<void> {
    await this.trackInteraction({
      productId,
      interactionType: 'view',
      metadata
    });
  }

  /**
   * Track search query
   */
  async trackSearch(query: string, resultsCount: number, userId?: string): Promise<void> {
    await this.trackInteraction({
      productId: '', // No specific product for search
      interactionType: 'search',
      metadata: {
        searchQuery: query,
        sessionId: this.currentSession?.sessionId
      }
    });
  }

  /**
   * Track favorite/unfavorite
   */
  async trackFavorite(productId: string, isFavorite: boolean): Promise<void> {
    await this.trackInteraction({
      productId,
      interactionType: isFavorite ? 'favorite' : 'unfavorite'
    });
  }

  /**
   * Track purchase
   */
  async trackPurchase(productId: string, orderId: string, amount: number): Promise<void> {
    await this.trackInteraction({
      productId,
      interactionType: 'purchase',
      metadata: {
        orderId,
        amount
      }
    });
  }

  /**
   * Get user's interaction history
   */
  async getUserInteractions(
    userId: string,
    limit: number = 100,
    interactionTypes?: UserInteraction['interactionType'][]
  ): Promise<UserInteraction[]> {
    try {
      let query = supabase
        .from('user_interactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (interactionTypes && interactionTypes.length > 0) {
        query = query.in('interaction_type', interactionTypes);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching user interactions:', error);
      return [];
    }
  }

  /**
   * Get user's favorite categories based on interactions
   */
  async getUserFavoriteCategories(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('user_interactions')
        .select(`
          product_id,
          product:products(category_id)
        `)
        .eq('user_id', userId)
        .in('interaction_type', ['view', 'favorite', 'purchase'])
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .limit(200);

      if (error) throw error;

      // Count category occurrences
      const categoryCount = new Map<string, number>();
      data?.forEach(interaction => {
        const categoryId = interaction.product?.category_id;
        if (categoryId) {
          categoryCount.set(categoryId, (categoryCount.get(categoryId) || 0) + 1);
        }
      });

      // Return top categories
      return Array.from(categoryCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([categoryId]) => categoryId);
    } catch (error) {
      console.error('Error fetching favorite categories:', error);
      return [];
    }
  }

  /**
   * Get user's price preferences
   */
  async getUserPricePreferences(userId: string): Promise<{ min: number; max: number; average: number }> {
    try {
      const { data, error } = await supabase
        .from('user_interactions')
        .select(`
          product_id,
          product:products(price, currency)
        `)
        .eq('user_id', userId)
        .in('interaction_type', ['view', 'favorite', 'purchase'])
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .limit(200);

      if (error) throw error;

      const prices = data
        ?.map(interaction => interaction.product?.price)
        .filter(price => typeof price === 'number' && price > 0) || [];

      if (prices.length === 0) {
        return { min: 0, max: 1000, average: 500 };
      }

      return {
        min: Math.min(...prices),
        max: Math.max(...prices),
        average: prices.reduce((sum, price) => sum + price, 0) / prices.length
      };
    } catch (error) {
      console.error('Error fetching price preferences:', error);
      return { min: 0, max: 1000, average: 500 };
    }
  }

  /**
   * Get user's location preferences
   */
  async getUserLocationPreferences(userId: string): Promise<{ latitude: number; longitude: number; radius: number } | null> {
    try {
      // Get user's profile location
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('location')
        .eq('id', userId)
        .single();

      if (profileError || !profile?.location) return null;

      // For now, return a default location - this could be enhanced with actual location tracking
      return {
        latitude: 33.5138, // Damascus coordinates as default
        longitude: 36.2765,
        radius: 50 // 50km radius
      };
    } catch (error) {
      console.error('Error fetching location preferences:', error);
      return null;
    }
  }

  /**
   * Store interaction in database
   * Only called when user is logged in (userId is not 'anonymous')
   */
  private async storeInteraction(interaction: UserInteraction): Promise<void> {
    // Skip if user is anonymous
    if (!interaction.userId || interaction.userId === 'anonymous') {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_interactions')
        .insert({
          user_id: interaction.userId,
          product_id: interaction.productId || null, // Allow null for search interactions
          interaction_type: interaction.interactionType,
          metadata: interaction.metadata,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
      
      console.log(`✅ [UserBehaviorService] Interaction stored: ${interaction.interactionType}`, {
        productId: interaction.productId || 'null',
        metadata: interaction.metadata
      });
    } catch (error) {
      console.error('❌ [UserBehaviorService] Error storing interaction:', error);
      // Don't throw - this is a background operation
    }
  }

  /**
   * Increment product view count
   */
  private async incrementProductViewCount(productId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_product_view_count', {
        product_id: productId
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  }

  /**
   * Get current session
   */
  getCurrentSession(): UserSession | null {
    return this.currentSession;
  }

  /**
   * End current session
   */
  endSession(): void {
    this.currentSession = null;
  }

  /**
   * Get session analytics
   */
  getSessionAnalytics(): {
    totalInteractions: number;
    interactionTypes: Record<string, number>;
    sessionDuration: number;
    mostViewedCategory?: string;
  } {
    if (!this.currentSession) {
      return {
        totalInteractions: 0,
        interactionTypes: {},
        sessionDuration: 0
      };
    }

    const interactions = this.currentSession.interactions;
    const interactionTypes: Record<string, number> = {};
    
    interactions.forEach(interaction => {
      interactionTypes[interaction.interactionType] = 
        (interactionTypes[interaction.interactionType] || 0) + 1;
    });

    const sessionDuration = new Date().getTime() - new Date(this.currentSession.startTime).getTime();

    return {
      totalInteractions: interactions.length,
      interactionTypes,
      sessionDuration: Math.round(sessionDuration / 1000), // in seconds
    };
  }
}

export default new UserBehaviorService();
