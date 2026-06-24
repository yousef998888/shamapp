import { supabase } from '@/utils/supabase';
import type { Favorite, Product } from '@/types/database';

export interface Wishlist {
  id: string;
  user_id: string;
  name: string;
  name_ar?: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  items?: WishlistItem[];
  item_count?: number;
  sale_count?: number;
}

export interface WishlistItem {
  id: string;
  wishlist_id: string;
  product_id: string;
  added_at: string;
  product?: Product;
}

const FavoriteService = {
  /**
   * Get all favorites for a user (simple favorites without wishlists)
   */
  async getUserFavorites(userId: string): Promise<Favorite[]> {
    const { data, error } = await supabase
      .from('favorites')
      .select(`
        *,
        product:products(
          *,
          category:categories(*),
          images:product_images(*),
          seller:user_profiles(full_name, username, avatar_url)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching favorites:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Add a product to favorites
   */
  async addFavorite(userId: string, productId: string): Promise<Favorite> {
    const { data, error } = await supabase
      .from('favorites')
      .insert({
        user_id: userId,
        product_id: productId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding favorite:', error);
      throw error;
    }

    return data;
  },

  /**
   * Remove a product from favorites
   */
  async removeFavorite(userId: string, productId: string): Promise<void> {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) {
      console.error('Error removing favorite:', error);
      throw error;
    }
  },

  /**
   * Check if a product is favorited
   */
  async isFavorited(userId: string, productId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking favorite:', error);
      return false;
    }

    return !!data;
  },

  /**
   * Get all wishlists for a user
   */
  async getUserWishlists(userId: string): Promise<Wishlist[]> {
    // First, try to get from wishlists table if it exists
    // If not, we'll create a default wishlist from favorites
    try {
      const { data: wishlists, error } = await supabase
        .from('wishlists')
        .select(`
          *,
          items:wishlist_items(
            id,
            product_id,
            added_at,
            product:products(
              *,
              category:categories(*),
              images:product_images(*),
              seller:user_profiles(full_name, username, avatar_url)
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        // If wishlists table doesn't exist, fall back to favorites
        if (error.code === '42P01') {
          return this.getFallbackWishlists(userId);
        }
        throw error;
      }

      // Calculate item count and sale count for each wishlist
      const wishlistsWithCounts = (wishlists || []).map(wishlist => {
        const items = wishlist.items || [];
        const saleCount = items.filter((item: any) => 
          item.product?.status === 'active' && item.product?.price < (item.product?.original_price || item.product?.price)
        ).length;

        return {
          ...wishlist,
          item_count: items.length,
          sale_count: saleCount,
        };
      });

      return wishlistsWithCounts;
    } catch (error) {
      console.error('Error fetching wishlists:', error);
      return this.getFallbackWishlists(userId);
    }
  },

  /**
   * Fallback to create wishlists from favorites if wishlists table doesn't exist
   */
  async getFallbackWishlists(userId: string): Promise<Wishlist[]> {
    const favorites = await this.getUserFavorites(userId);
    
    if (favorites.length === 0) {
      return [];
    }

    // Group favorites by category
    const categoryGroups = favorites.reduce((acc, fav) => {
      const categoryName = fav.product?.category?.name || 'Uncategorized';
      const categoryId = fav.product?.category?.id || 'default';
      
      if (!acc[categoryId]) {
        acc[categoryId] = {
          name: categoryName,
          items: [],
        };
      }
      
      acc[categoryId].items.push(fav);
      return acc;
    }, {} as Record<string, { name: string; items: Favorite[] }>);

    // Convert to wishlist format
    return Object.entries(categoryGroups).map(([categoryId, group], index) => ({
      id: `wishlist-${categoryId}`,
      user_id: userId,
      name: `${group.name} Wishlist`,
      is_public: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: group.items.map(fav => ({
        id: fav.id,
        wishlist_id: `wishlist-${categoryId}`,
        product_id: fav.product_id,
        added_at: fav.created_at,
        product: fav.product,
      })),
      item_count: group.items.length,
      sale_count: group.items.filter(fav => 
        fav.product?.status === 'active'
      ).length,
    }));
  },

  /**
   * Create a new wishlist
   */
  async createWishlist(
    userId: string,
    name: string,
    nameAr?: string,
    description?: string,
    isPublic: boolean = false
  ): Promise<Wishlist> {
    const { data, error } = await supabase
      .from('wishlists')
      .insert({
        user_id: userId,
        name,
        name_ar: nameAr,
        description,
        is_public: isPublic,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating wishlist:', error);
      throw error;
    }

    return { ...data, items: [], item_count: 0, sale_count: 0 };
  },

  /**
   * Update wishlist
   */
  async updateWishlist(
    wishlistId: string,
    updates: Partial<Pick<Wishlist, 'name' | 'name_ar' | 'description' | 'is_public'>>
  ): Promise<Wishlist> {
    const { data, error } = await supabase
      .from('wishlists')
      .update(updates)
      .eq('id', wishlistId)
      .select()
      .single();

    if (error) {
      console.error('Error updating wishlist:', error);
      throw error;
    }

    return data;
  },

  /**
   * Delete wishlist
   */
  async deleteWishlist(wishlistId: string): Promise<void> {
    const { error } = await supabase
      .from('wishlists')
      .delete()
      .eq('id', wishlistId);

    if (error) {
      console.error('Error deleting wishlist:', error);
      throw error;
    }
  },

  /**
   * Get a single wishlist with items
   */
  async getWishlist(wishlistId: string): Promise<Wishlist | null> {
    const { data, error } = await supabase
      .from('wishlists')
      .select(`
        *,
        items:wishlist_items(
          id,
          product_id,
          added_at,
          product:products(
            *,
            category:categories(*),
            images:product_images(*),
            seller:user_profiles(full_name, username, avatar_url),
            attribute_relationships:product_attribute_relationships(
              *,
              attribute:product_attributes(*),
              term:product_attribute_terms(*)
            )
          )
        )
      `)
      .eq('id', wishlistId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching wishlist:', error);
      throw error;
    }

    const items = data.items || [];
    const saleCount = items.filter((item: any) => 
      item.product?.status === 'active' && item.product?.price < (item.product?.original_price || item.product?.price)
    ).length;

    return {
      ...data,
      item_count: items.length,
      sale_count: saleCount,
    };
  },

  /**
   * Add item to wishlist
   */
  async addToWishlist(wishlistId: string, productId: string): Promise<WishlistItem> {
    const { data, error } = await supabase
      .from('wishlist_items')
      .insert({
        wishlist_id: wishlistId,
        product_id: productId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding to wishlist:', error);
      throw error;
    }

    return data;
  },

  /**
   * Remove item from wishlist
   */
  async removeFromWishlist(wishlistId: string, productId: string): Promise<void> {
    const { error } = await supabase
      .from('wishlist_items')
      .delete()
      .eq('wishlist_id', wishlistId)
      .eq('product_id', productId);

    if (error) {
      console.error('Error removing from wishlist:', error);
      throw error;
    }
  },

  /**
   * Toggle favorite status for a product
   */
  async toggleFavorite(userId: string, productId: string): Promise<boolean> {
    const isFav = await this.isFavorited(userId, productId);
    
    if (isFav) {
      await this.removeFavorite(userId, productId);
      return false;
    } else {
      await this.addFavorite(userId, productId);
      return true;
    }
  },

  /**
   * Get all wishlist IDs that contain a specific product
   */
  async getWishlistsContainingProduct(userId: string, productId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('wishlist_items')
        .select('wishlist_id, wishlist:wishlists!inner(user_id)')
        .eq('product_id', productId)
        .eq('wishlist.user_id', userId);

      if (error) {
        // If wishlists table doesn't exist, return empty array
        if (error.code === '42P01') {
          return [];
        }
        throw error;
      }

      return (data || []).map(item => item.wishlist_id);
    } catch (error) {
      console.error('Error checking wishlists:', error);
      return [];
    }
  },

  /**
   * Remove product from all wishlists
   */
  async removeFromAllWishlists(userId: string, productId: string): Promise<void> {
    try {
      const wishlistIds = await this.getWishlistsContainingProduct(userId, productId);
      
      if (wishlistIds.length === 0) return;

      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('product_id', productId)
        .in('wishlist_id', wishlistIds);

      if (error) {
        console.error('Error removing from wishlists:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error removing from all wishlists:', error);
      throw error;
    }
  },
};

export default FavoriteService;

