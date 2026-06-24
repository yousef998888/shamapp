import { supabase } from '@/lib/supabase';
import { Product } from '@/types/database';

export interface SearchResult {
  id: string;
  title: string;
  ar_title: string;
  category_name?: string;
  category_slug?: string;
}

export interface SearchSuggestion {
  id: string;
  title: string;
  ar_title?: string;
  category_name?: string;
  category_slug?: string;
  product_count?: number;
}

export interface SearchFilters {
  category?: string;
  condition?: string;
  priceMin?: number;
  priceMax?: number;
  location?: string;
  sortBy?: string;
}

const searchProducts = async (query: string, limit: number = 10): Promise<SearchResult[]> => {
  if (!query.trim()) {
    return [];
  }

  try {
    // First try semantic search with embeddings
    try {
      // Generate embedding for the search query (fast endpoint)
      const aiResponse = await fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:3005'}/api/product-ai/generate-embedding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: query,
        }),
      });

      if (aiResponse.ok) {
        const aiResult = await aiResponse.json();
        
        // Use semantic search with embeddings
        const { data, error } = await supabase.rpc('product_search_with_relationships', {
          query_embedding: aiResult.embedding,
          query_text: query,
          limit_count: limit
        });

        if (!error && data && data.length > 0) {
          return data.map((item: any) => ({
            id: item.id,
            title: item.title,
            ar_title: item.ar_title,
            category_name: item.category_name,
            category_slug: item.category_slug
          }));
        }
      }
    } catch (aiError) {
      console.log('AI search failed, falling back to text search:', aiError);
    }

    // Fallback to traditional text search
    const { data, error } = await supabase.rpc('product_suggestion', {
      input: query,
      max_results: limit
    });

    if (error) {
      console.error('Search error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
};

// New function to get search suggestions (like Amazon autocomplete)
const getSearchSuggestions = async (query: string, limit: number = 8): Promise<SearchSuggestion[]> => {
  if (!query.trim()) {
    return [];
  }

  try {
    // Generate embedding for the search query
    const aiResponse = await fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:3005'}/api/product-ai/generate-embedding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: query,
      }),
    });

    if (aiResponse.ok) {
      const aiResult = await aiResponse.json();
      
      // Get grouped suggestions based on embeddings
      const { data, error } = await supabase.rpc('get_search_suggestions', {
        query_embedding: aiResult.embedding,
        query_text: query,
        limit_count: limit
      });

      if (!error && data && data.length > 0) {
        return data.map((item: any) => ({
          id: item.suggestion_id,
          title: item.suggestion_title,
          ar_title: item.suggestion_ar_title,
          category_name: item.category_name,
          category_slug: item.category_slug,
          product_count: item.product_count
        }));
      }
    }
  } catch (aiError) {
    console.log('AI suggestions failed, falling back to text search:', aiError);
  }

  // Fallback: Create simple suggestions from product titles
  const { data, error } = await supabase.rpc('product_suggestion', {
    input: query,
    max_results: limit
  });

  if (error) {
    console.error('Search error:', error);
    return [];
  }

  // Group similar products into suggestions
  const groupedSuggestions: Record<string, SearchSuggestion> = {};
  
  data?.forEach((product: any) => {
    // Create suggestion based on key terms
    const keyTerms = product.title.toLowerCase().split(' ').slice(0, 3).join(' ');
    const suggestionKey = keyTerms;
    
    if (!groupedSuggestions[suggestionKey]) {
      groupedSuggestions[suggestionKey] = {
        id: `suggestion-${suggestionKey}`,
        title: keyTerms,
        category_name: product.category_name,
        category_slug: product.category_slug,
        product_count: 1
      };
    } else {
      groupedSuggestions[suggestionKey].product_count! += 1;
    }
  });

  return Object.values(groupedSuggestions).slice(0, limit);
};

// Helper to decide if a product is within the 72-hour sold window
const isWithinSoldWindow = (product: Product): boolean => {
  const HOURS_72_MS = 72 * 60 * 60 * 1000;
  const updatedAt = new Date(product.updated_at).getTime();
  return Date.now() - updatedAt <= HOURS_72_MS;
};

// Helper to apply common client-side filters
const applyClientFilters = (products: Product[], filters: SearchFilters = {}): Product[] => {
  let filtered = products;

  if (filters.category) {
    filtered = filtered.filter(p => p.category_id === filters.category);
  }
  if (filters.condition) {
    filtered = filtered.filter(p => p.condition === (filters.condition as any));
  }
  if (filters.priceMin !== undefined) {
    filtered = filtered.filter(p => p.price >= (filters.priceMin ?? 0));
  }
  if (filters.priceMax !== undefined) {
    filtered = filtered.filter(p => p.price <= (filters.priceMax ?? Infinity));
  }
  if (filters.location) {
    const q = (filters.location || '').toLowerCase();
    filtered = filtered.filter(p => (p.location || '').toLowerCase().includes(q));
  }

  return filtered;
};

// Helper to push sold items to the bottom while preserving relative order
const moveSoldToBottom = (products: Product[]): Product[] => {
  const active = products.filter(p => p.status !== 'sold');
  const sold = products.filter(p => p.status === 'sold');
  return [...active, ...sold];
};

const searchProductsWithFilters = async (
  query: string,
  filters: SearchFilters = {},
  limit: number = 50
): Promise<{ products: Product[]; totalCount: number }> => {
  if (!query.trim()) {
    return { products: [], totalCount: 0 };
  }

  try {
    // Query active products with improved search
    let activeQuery = supabase
      .from('products')
      .select(`
        *,
        category:categories(name, slug),
        seller:user_profiles(full_name, username, avatar_url),
        images:product_images(*)
      `)
      .eq('status', 'active')
      .or(`title.ilike.%${query}%,ar_title.ilike.%${query}%,description.ilike.%${query}%,ar_description.ilike.%${query}%`);

    // Apply server-side filters where possible
    if (filters.category) {
      activeQuery = activeQuery.eq('category_id', filters.category);
    }
    if (filters.condition) {
      activeQuery = activeQuery.eq('condition', filters.condition);
    }
    if (filters.priceMin !== undefined) {
      activeQuery = activeQuery.gte('price', filters.priceMin);
    }
    if (filters.priceMax !== undefined) {
      activeQuery = activeQuery.lte('price', filters.priceMax);
    }
    if (filters.location) {
      activeQuery = activeQuery.ilike('location', `%${filters.location}%`);
    }

    // Apply sorting for active items
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'price_low':
          activeQuery = activeQuery.order('price', { ascending: true });
          break;
        case 'price_high':
          activeQuery = activeQuery.order('price', { ascending: false });
          break;
        case 'newest':
          activeQuery = activeQuery.order('created_at', { ascending: false });
          break;
        case 'oldest':
          activeQuery = activeQuery.order('created_at', { ascending: true });
          break;
        default:
          activeQuery = activeQuery.order('created_at', { ascending: false });
      }
    } else {
      activeQuery = activeQuery.order('created_at', { ascending: false });
    }

    // Query sold products within the last 72 hours
    const soldSinceIso = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    let recentSoldQuery = supabase
      .from('products')
      .select(`
        *,
        category:categories(name, slug),
        seller:user_profiles(full_name, username, avatar_url),
        images:product_images(*)
      `)
      .eq('status', 'sold')
      .gte('updated_at', soldSinceIso)
      .or(`title.ilike.%${query}%,ar_title.ilike.%${query}%,description.ilike.%${query}%,ar_description.ilike.%${query}%`);

    // Apply same server-side filters to sold query
    if (filters.category) {
      recentSoldQuery = recentSoldQuery.eq('category_id', filters.category);
    }
    if (filters.condition) {
      recentSoldQuery = recentSoldQuery.eq('condition', filters.condition);
    }
    if (filters.priceMin !== undefined) {
      recentSoldQuery = recentSoldQuery.gte('price', filters.priceMin);
    }
    if (filters.priceMax !== undefined) {
      recentSoldQuery = recentSoldQuery.lte('price', filters.priceMax);
    }
    if (filters.location) {
      recentSoldQuery = recentSoldQuery.ilike('location', `%${filters.location}%`);
    }

    const [{ data: activeData, error: activeError }, { data: soldData, error: soldError }] = await Promise.all([
      activeQuery.range(0, limit - 1),
      recentSoldQuery.range(0, limit - 1),
    ]);

    if (activeError || soldError) {
      console.error('Search error:', activeError || soldError);
      return { products: [], totalCount: 0 };
    }

    // Combine results: active first, then recent sold
    const combined = [
      ...(activeData || []),
      ...(soldData || []),
    ];

    const totalCount = combined.length;

    // Limit results to requested limit after combining
    const paginated = combined.slice(0, limit);

    return { products: paginated, totalCount };
  } catch (error) {
    console.error('Search error:', error);
    return { products: [], totalCount: 0 };
  }
};

const searchProductsWithPgroonga = async (
  query: string,
  filters: SearchFilters = {},
  limit: number = 50
): Promise<{ products: Product[]; totalCount: number }> => {
  if (!query.trim()) {
    return { products: [], totalCount: 0 };
  }

  try {
    // Try to use the database function first
    const { data: searchData, error: searchError } = await supabase.rpc(
      "product_search_results",
      {
        p_input: query,
        p_max_results: 1000, // Fetch a larger set for client-side filtering
      }
    );

    if (searchError) {
      console.warn("Database function search failed, falling back to built-in search:", searchError);
      // Fall back to the working search method
      return await searchProductsWithFilters(query, filters, limit);
    }

    if (!searchData || searchData.length === 0) {
      console.log("No results from database function, trying fallback search");
      // Fall back to the working search method
      return await searchProductsWithFilters(query, filters, limit);
    }
    
    // Start with active products and recently sold (<=72h)
    let filteredProducts = (searchData as Product[]).filter(p =>
      p.status === 'active' || (p.status === 'sold' && isWithinSoldWindow(p))
    );

    // Apply filters on the client
    filteredProducts = applyClientFilters(filteredProducts, filters);

    const totalCount = filteredProducts.length;

    // Apply sorting within each group, then push sold to bottom
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'price_low':
          filteredProducts.sort((a, b) => a.price - b.price);
          break;
        case 'price_high':
          filteredProducts.sort((a, b) => b.price - a.price);
          break;
        case 'newest':
          filteredProducts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          break;
        case 'oldest':
          filteredProducts.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          break;
      }
    }

    // Ensure sold items are not on top
    filteredProducts = moveSoldToBottom(filteredProducts);

    const paginatedProducts = filteredProducts.slice(0, limit);

    return { products: paginatedProducts, totalCount: totalCount };
  } catch (error) {
    console.error("Search error:", error);
    // Fall back to the working search method
    return await searchProductsWithFilters(query, filters, limit);
  }
};

const SearchService = {
  searchProducts,
  getSearchSuggestions,
  searchProductsWithFilters,
  searchProductsWithPgroonga,
  // Add a simple debug search function
  debugSearch: async (query: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, title, ar_title, status')
        .limit(5);
      
      if (error) {
        console.error('Debug search error:', error);
        return null;
      }
      
      console.log('Debug search results:', data);
      return data;
    } catch (error) {
      console.error('Debug search exception:', error);
      return null;
    }
  }
};

export default SearchService;