import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/contexts/AuthContext";
import FavoritesService from "@/services/FavoritesService";

export function useFavorites() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Query for fetching user's favorite products
  const {
    data: favoriteProducts = [],
    isLoading: isFavoritesLoading,
    error: favoritesError,
    refetch: refetchFavorites,
  } = useQuery({
    queryKey: ["userFavorites", user?.id],
    queryFn: () => {
      if (!user?.id) {
        return Promise.resolve([]);
      }
      return FavoritesService.fetchUserFavoritesQueryFn(user.id);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query for getting favorites count
  const {
    data: favoritesCount = 0,
    isLoading: isCountLoading,
  } = useQuery({
    queryKey: ["userFavoritesCount", user?.id],
    queryFn: () => {
      if (!user?.id) {
        return Promise.resolve(0);
      }
      return FavoritesService.fetchUserFavoritesCountQueryFn(user.id);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for adding product to favorites
  const addToFavoritesMutation = useMutation({
    mutationFn: FavoritesService.addToFavoritesMutationFn,
    onSuccess: () => {
      toast.success(t('favorites.messages.addedToFavorites', 'Added to favorites'));
      // Invalidate and refetch favorites data
      queryClient.invalidateQueries({ queryKey: ["userFavorites", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["userFavoritesCount", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["favoriteIds"] });
    },
    onError: (error: Error) => {
      if (error.message.includes("already in favorites")) {
        toast.error(t('favorites.messages.alreadyInFavorites', 'Product is already in your favorites'));
      } else {
        toast.error(error.message || t('favorites.messages.addFailed', 'Failed to add to favorites'));
      }
    },
  });

  // Mutation for removing product from favorites
  const removeFromFavoritesMutation = useMutation({
    mutationFn: FavoritesService.removeFromFavoritesMutationFn,
    onSuccess: () => {
      toast.success(t('favorites.messages.removedFromFavorites', 'Removed from favorites'));
      // Invalidate and refetch favorites data
      queryClient.invalidateQueries({ queryKey: ["userFavorites", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["userFavoritesCount", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["favoriteIds"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('favorites.messages.removeFailed', 'Failed to remove from favorites'));
    },
  });

  // Function to add product to favorites
  const addToFavorites = (productId: string) => {
    if (!user?.id) {
      toast.error(t('auth.messages.loginRequired', 'You must be logged in to add favorites'));
      return;
    }
    addToFavoritesMutation.mutate({ userId: user.id, productId });
  };

  // Function to remove product from favorites
  const removeFromFavorites = (productId: string) => {
    if (!user?.id) {
      toast.error(t('auth.messages.loginRequired', 'You must be logged in to manage favorites'));
      return;
    }
    removeFromFavoritesMutation.mutate({ userId: user.id, productId });
  };

  // Function to toggle favorite status
  const toggleFavorite = (productId: string, isCurrentlyFavorited: boolean) => {
    if (isCurrentlyFavorited) {
      removeFromFavorites(productId);
    } else {
      addToFavorites(productId);
    }
  };

  // Check if a product is in favorites (from local state)
  const isProductFavorited = (productId: string): boolean => {
    return favoriteProducts.some(product => product.id === productId);
  };

  return {
    // Data
    favoriteProducts,
    favoritesCount,
    
    // Loading states
    isFavoritesLoading,
    isCountLoading,
    isAddingToFavorites: addToFavoritesMutation.isPending,
    isRemovingFromFavorites: removeFromFavoritesMutation.isPending,
    
    // Error states
    favoritesError: favoritesError?.message,
    addError: addToFavoritesMutation.error?.message,
    removeError: removeFromFavoritesMutation.error?.message,
    
    // Actions
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isProductFavorited,
    refetchFavorites,
  };
}

// Hook for checking if specific products are favorited (useful for product lists)
export function useFavoriteStatus(productIds: string[]) {
  const { user } = useAuthContext();

  const {
    data: favoriteIds = [],
    isLoading,
  } = useQuery({
    queryKey: ["favoriteIds", user?.id, productIds],
    queryFn: () => {
      if (!user?.id || productIds.length === 0) {
        return Promise.resolve([]);
      }
      return FavoritesService.fetchUserFavoriteIdsQueryFn({ userId: user.id, productIds });
    },
    enabled: !!user?.id && productIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const isProductFavorited = (productId: string): boolean => {
    return favoriteIds.includes(productId);
  };

  return {
    favoriteIds,
    isLoading,
    isProductFavorited,
  };
}

// Hook for checking if a single product is favorited
export function useIsFavorite(productId: string) {
  const { user } = useAuthContext();

  const {
    data: isFavorited = false,
    isLoading,
  } = useQuery({
    queryKey: ["isFavorite", user?.id, productId],
    queryFn: () => {
      if (!user?.id || !productId) {
        return Promise.resolve(false);
      }
      return FavoritesService.checkIsFavoriteQueryFn({ userId: user.id, productId });
    },
    enabled: !!user?.id && !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    isFavorited,
    isLoading,
  };
} 