import { supabase } from "@/lib/supabase";
import { Favorite, Product } from "@/types/database";

// --- Add Product to Favorites ---
const addToFavoritesMutationFn = async ({
  userId,
  productId,
}: {
  userId: string;
  productId: string;
}) => {
  // Check if already favorited
  const { data: existing, error: checkError } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .single();

  if (checkError && checkError.code !== "PGRST116") {
    throw new Error(checkError.message || "Failed to check favorite status");
  }

  if (existing) {
    throw new Error("Product is already in favorites");
  }

  const { data, error } = await supabase
    .from("favorites")
    .insert([
      {
        user_id: userId,
        product_id: productId,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(error.message || "Failed to add to favorites");
  }

  return data;
};

// --- Remove Product from Favorites ---
const removeFromFavoritesMutationFn = async ({
  userId,
  productId,
}: {
  userId: string;
  productId: string;
}) => {
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", productId);

  if (error) {
    throw new Error(error.message || "Failed to remove from favorites");
  }
};

// --- Check if Product is Favorited ---
const checkIsFavoriteQueryFn = async ({
  userId,
  productId,
}: {
  userId: string;
  productId: string;
}): Promise<boolean> => {
  const { data, error } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error checking favorite status:", error);
    return false;
  }

  return !!data;
};

// --- Fetch User's Favorite Products ---
const fetchUserFavoritesQueryFn = async (userId: string): Promise<Product[]> => {
  const { data, error } = await supabase
    .from("favorites")
    .select(`
      id,
      created_at,
      product:products(
        *,
        category:categories(name, slug),
        seller:user_profiles(id, full_name, username, avatar_url, is_verified, rating, total_sales, member_since),
        images:product_images(*),
        attribute_relationships:product_attribute_relationships(
          attribute:product_attributes(*),
          term:product_attribute_terms(*)
        )
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Failed to fetch favorites");
  }

  // Extract products from the favorites data
  return (data || []).map((favorite: any) => favorite.product).filter(Boolean);
};

// --- Get Favorite IDs for Multiple Products ---
const fetchUserFavoriteIdsQueryFn = async ({
  userId,
  productIds,
}: {
  userId: string;
  productIds: string[];
}): Promise<string[]> => {
  if (productIds.length === 0) return [];

  const { data, error } = await supabase
    .from("favorites")
    .select("product_id")
    .eq("user_id", userId)
    .in("product_id", productIds);

  if (error) {
    console.error("Error fetching favorite IDs:", error);
    return [];
  }

  return (data || []).map((fav: any) => fav.product_id);
};

// --- Get Favorites Count for User ---
const fetchUserFavoritesCountQueryFn = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from("favorites")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching favorites count:", error);
    return 0;
  }

  return count || 0;
};

const FavoritesService = {
  addToFavoritesMutationFn,
  removeFromFavoritesMutationFn,
  checkIsFavoriteQueryFn,
  fetchUserFavoritesQueryFn,
  fetchUserFavoriteIdsQueryFn,
  fetchUserFavoritesCountQueryFn,
};

export default FavoritesService; 