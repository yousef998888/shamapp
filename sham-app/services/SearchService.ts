import { supabase } from '@/utils/supabase';
import type { Product } from '@/types/database';
import { getDeviceLanguage } from '@/utils/languageDetection';

export interface SearchSuggestion {
  id: string;
  title: string;
  ar_title?: string;
  category_name?: string;
  category_slug?: string;
}

const searchProducts = async (query: string, limit: number = 12): Promise<SearchSuggestion[]> => {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  try {
    // First try semantic search with embeddings
    try {
      // Generate embedding for the search query with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const aiResponse = await fetch(`${process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3005'}/api/product-ai/generate-embedding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: trimmed,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (aiResponse.ok) {
        const aiResult = await aiResponse.json();
        
        // Use semantic search with embeddings
        const { data, error } = await supabase.rpc('product_search', {
          query_embedding: aiResult.embedding,
          query_text: trimmed,
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
      console.log('⚠️ AI search failed, falling back to text search:', aiError);
    }

    // Fallback to traditional text search
    const { data, error } = await supabase.rpc('product_suggestion', {
      input: trimmed,
      max_results: limit,
    });

    if (error) {
      throw error;
    }

    return (data as SearchSuggestion[] | null) ?? [];
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
};

const searchProductsWithDetails = async (
  query: string,
  limit: number = 40,
): Promise<Product[]> => {
  const trimmed = query.trim();
  console.log('🔍 [searchProductsWithDetails] Query:', trimmed);
  
  if (!trimmed) {
    console.log('❌ [searchProductsWithDetails] Empty query, returning []');
    return [];
  }

  try {
    console.log('🤖 [searchProductsWithDetails] Generating embedding for search...');
    
    // Try to generate embedding for the search query with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    try {
      const aiResponse = await fetch(`${process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3005'}/api/product-ai/generate-embedding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: trimmed,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('📡 [searchProductsWithDetails] AI Response status:', aiResponse.status);

      if (aiResponse.ok) {
        const aiResult = await aiResponse.json();
        console.log('✅ [searchProductsWithDetails] Embedding generated, dimension:', aiResult.stats?.embedding_dimension);
        
        // Use semantic search with embeddings
        const { data, error } = await supabase.rpc('product_search_with_relationships', {
          query_embedding: aiResult.embedding,
          query_text: trimmed,
          limit_count: limit
        });

        console.log('📊 [searchProductsWithDetails] RPC Response - Error:', error, 'Data count:', data?.length || 0);

        if (error) {
          console.error('❌ [searchProductsWithDetails] RPC Error:', JSON.stringify(error));
          // Fallback to text search
          console.log('⚠️ [searchProductsWithDetails] Falling back to text search...');
        } else if (data && data.length > 0) {
          console.log('✨ [searchProductsWithDetails] Products found via semantic search with relationships:', data.length);
          // Return the semantic search results (now includes all relationships)
          return data;
        } else {
          console.log('⚠️ [searchProductsWithDetails] No products from semantic search, trying text search...');
        }
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.log('⚠️ [searchProductsWithDetails] AI service unavailable, using fallback text search:', fetchError);
    }

    // Fallback to traditional text search
    console.log('🔄 [searchProductsWithDetails] Using traditional text search...');
    
    const baseSelect = `*,
      category:categories(name, slug),
      seller:user_profiles(full_name, username, avatar_url),
      images:product_images(*),
      attribute_relationships:product_attribute_relationships(*,attribute:product_attributes(*),term:product_attribute_terms(*))
    `;

    const soldSinceIso = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

    const activeQuery = supabase
      .from('products')
      .select(baseSelect)
      .eq('status', 'active')
      .or(
        `title.ilike.%${trimmed}%,ar_title.ilike.%${trimmed}%,description.ilike.%${trimmed}%,ar_description.ilike.%${trimmed}%`,
      )
      .order('created_at', { ascending: false })
      .range(0, Math.max(limit - 1, 0));

    const soldQuery = supabase
      .from('products')
      .select(baseSelect)
      .eq('status', 'sold')
      .gte('updated_at', soldSinceIso)
      .or(
        `title.ilike.%${trimmed}%,ar_title.ilike.%${trimmed}%,description.ilike.%${trimmed}%,ar_description.ilike.%${trimmed}%`,
      )
      .order('updated_at', { ascending: false })
      .range(0, Math.max(limit - 1, 0));

    const [{ data: activeData, error: activeError }, { data: soldData, error: soldError }] = await Promise.all([
      activeQuery,
      soldQuery,
    ]);

    console.log('📊 [searchProductsWithDetails] Text search - Active:', activeData?.length || 0, 'Sold:', soldData?.length || 0);

    if (activeError || soldError) {
      console.error('❌ [searchProductsWithDetails] Text search error:', activeError || soldError);
      return (activeData as Product[] | null) ?? [];
    }

    const combined = [
      ...(((activeData as Product[] | null) ?? [])),
      ...(((soldData as Product[] | null) ?? [])),
    ];

    const uniqueById = new Map<string, Product>();
    combined.forEach((product) => {
      uniqueById.set(product.id, product);
    });

    const ordered = Array.from(uniqueById.values()).sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return timeB - timeA;
    });

    console.log('✅ [searchProductsWithDetails] Returning', ordered.slice(0, limit).length, 'products');
    return ordered.slice(0, limit);
  } catch (error) {
    console.error('❌ [searchProductsWithDetails] Exception:', error);
    return [];
  }
};

// Get search term suggestions (not products)
const getSearchSuggestions = async (query: string, limit: number = 8): Promise<SearchSuggestion[]> => {
  const trimmed = query.trim();
  const deviceLanguage = getDeviceLanguage();
  console.log('🔍 [getSearchSuggestions] Query:', trimmed, 'Language:', deviceLanguage);
  
  if (!trimmed) {
    console.log('❌ [getSearchSuggestions] Empty query, returning []');
    return [];
  }

  try {
    console.log('🤖 [getSearchSuggestions] Generating embedding...');
    
    // Try to generate embedding for the search query with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    try {
      const aiResponse = await fetch(`${process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3005'}/api/product-ai/generate-embedding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: trimmed,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('📡 [getSearchSuggestions] AI Response status:', aiResponse.status);

      if (aiResponse.ok) {
        const aiResult = await aiResponse.json();
        console.log('✅ [getSearchSuggestions] Embedding generated, dimension:', aiResult.stats?.embedding_dimension);
        
        // Get grouped suggestions (search terms, not products)
        console.log('🔎 [getSearchSuggestions] Calling get_search_suggestions RPC...');
        const { data, error } = await supabase.rpc('get_search_suggestions', {
          query_embedding: aiResult.embedding,
          query_text: trimmed,
          limit_count: limit
        });

        console.log('📊 [getSearchSuggestions] RPC Response - Error:', error, 'Data count:', data?.length || 0);

        if (error) {
          console.error('❌ [getSearchSuggestions] RPC Error:', JSON.stringify(error));
          // Fall through to fallback
        } else if (data && data.length > 0) {
          console.log('✨ [getSearchSuggestions] Suggestions found:', data.map((d: any) => d.suggestion_title));
          return data.map((item: any) => ({
            id: item.suggestion_id,
            title: item.suggestion_title,
            ar_title: item.suggestion_ar_title,
            category_name: item.category_name,
            category_slug: item.category_slug,
          }));
        } else {
          console.log('⚠️ [getSearchSuggestions] No suggestions returned from RPC');
        }
      } else {
        console.error('❌ [getSearchSuggestions] AI Response not OK:', await aiResponse.text());
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.log('⚠️ [getSearchSuggestions] AI service unavailable, using fallback:', fetchError);
    }
  } catch (aiError) {
    console.error('❌ [getSearchSuggestions] Exception:', aiError);
  }

  // Fallback: Use simple text-based product search
  console.log('🔄 [getSearchSuggestions] Using fallback text search...');
  try {
    const { data, error } = await supabase.rpc('product_suggestion', {
      input: trimmed,
      max_results: limit,
    });

    if (error) {
      console.error('❌ [getSearchSuggestions] Fallback error:', error);
      return [];
    }

    if (data && data.length > 0) {
      console.log('✅ [getSearchSuggestions] Fallback returned', data.length, 'suggestions');
      return data as SearchSuggestion[];
    }
  } catch (fallbackError) {
    console.error('❌ [getSearchSuggestions] Fallback exception:', fallbackError);
  }

  console.log('🔚 [getSearchSuggestions] Returning empty array');
  return [];
};

const SearchService = {
  searchProducts,
  searchProductsWithDetails,
  getSearchSuggestions,
};

export default SearchService;
