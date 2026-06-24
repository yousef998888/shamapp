import { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import RecommendationService, { RecommendationResult, RecommendationContext } from '@/services/RecommendationService';
import UserBehaviorService from '@/services/UserBehaviorService';

export interface UseRecommendationsOptions {
  type: 'personalized' | 'highlights' | 'trending';
  limit?: number;
  enabled?: boolean;
  refetchInterval?: number; // in milliseconds
}

export interface UseRecommendationsReturn {
  recommendations: RecommendationResult | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isRefreshing: boolean;
}

export function useRecommendations({
  type,
  limit = 8,
  enabled = true,
  refetchInterval,
}: UseRecommendationsOptions): UseRecommendationsReturn {
  const { user, isAuthenticated } = useAuthContext();
  const [recommendations, setRecommendations] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadRecommendations = async (isRefresh = false) => {
    if (!enabled) return;

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Initialize user behavior tracking if authenticated
      if (isAuthenticated && user?.id) {
        UserBehaviorService.initializeSession(user.id);
      }

      const context: RecommendationContext = {
        userId: user?.id,
        limit,
      };

      const result = await RecommendationService.getCarouselRecommendations(type, context);
      setRecommendations(result);
    } catch (err) {
      console.error(`Error loading ${type} recommendations:`, err);
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const refetch = async () => {
    await loadRecommendations(true);
  };

  useEffect(() => {
    loadRecommendations();
  }, [type, user?.id, isAuthenticated, enabled, limit]);

  // Auto-refetch interval
  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    const interval = setInterval(() => {
      loadRecommendations(true);
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [refetchInterval, enabled]);

  return {
    recommendations,
    loading,
    error,
    refetch,
    isRefreshing,
  };
}

// Convenience hooks for specific recommendation types
export function usePersonalizedRecommendations(limit?: number) {
  return useRecommendations({
    type: 'personalized',
    limit,
    enabled: true,
  });
}

export function useHighlightRecommendations(limit?: number) {
  return useRecommendations({
    type: 'highlights',
    limit,
    enabled: true,
  });
}

export function useTrendingRecommendations(limit?: number) {
  return useRecommendations({
    type: 'trending',
    limit,
    enabled: true,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
}

// Hook for tracking user interactions
export function useUserBehaviorTracking() {
  const { user, isAuthenticated } = useAuthContext();

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      UserBehaviorService.initializeSession(user.id);
    }
  }, [isAuthenticated, user?.id]);

  const trackProductView = (productId: string, metadata?: any) => {
    UserBehaviorService.trackProductView(productId, metadata);
  };

  const trackSearch = (query: string, resultsCount: number) => {
    UserBehaviorService.trackSearch(query, resultsCount);
  };

  const trackFavorite = (productId: string, isFavorite: boolean) => {
    UserBehaviorService.trackFavorite(productId, isFavorite);
  };

  const trackPurchase = (productId: string, orderId: string, amount: number) => {
    UserBehaviorService.trackPurchase(productId, orderId, amount);
  };

  return {
    trackProductView,
    trackSearch,
    trackFavorite,
    trackPurchase,
    getSessionAnalytics: () => UserBehaviorService.getSessionAnalytics(),
  };
}
