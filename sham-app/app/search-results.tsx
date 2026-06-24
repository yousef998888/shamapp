import React from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, router } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SearchBar } from '@/components/search/SearchBar';
import SearchService from '@/services/SearchService';
import CategoryService from '@/services/CategoryService';
import type { Product } from '@/types/database';
import { useUserBehaviorTracking } from '@/hooks/useRecommendations';
import { useTranslation } from '@/hooks/useTranslation';
import { usePageTranslation } from '@/hooks/useTranslation';

const formatCurrency = (value?: number, currency?: string) => {
  if (value == null) {
    return '—';
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(value);
  } catch (error) {
    return `$${value.toFixed(2)}`;
  }
};

const extractPrimaryImage = (product: Product) => {
  const primary = product.images?.find((img) => img.is_primary);
  return primary?.image_url || product.images?.[0]?.image_url || null;
};

const useNormalizedQueryParam = (paramsQuery: unknown): string => {
  if (Array.isArray(paramsQuery)) {
    return paramsQuery[0] ?? '';
  }
  if (typeof paramsQuery === 'string') {
    return paramsQuery;
  }
  return '';
};

type SortOption = 'popularity' | 'newest' | 'price_low' | 'price_high';
type FilterState = {
  priceMin?: number;
  priceMax?: number;
  conditions: string[];
  categories: string[];
  tags: string[];
  attributes: Record<string, string[]>; // attribute_id -> term_ids
};

export default function SearchResultsScreen() {
  const insets = useSafeAreaInsets();
  const { language, isRTL } = useTranslation();
  const { t } = usePageTranslation('searchResultsPage');
  
  // Debug log
  React.useEffect(() => {
    const I18nManager = require('react-native').I18nManager;
    console.log('🌐 Search Results - Language:', language, 'isRTL:', isRTL, 'I18nManager.isRTL:', I18nManager.isRTL);
  }, [language, isRTL]);
  const params = useLocalSearchParams<{
    q?: string | string[];
    categoryId?: string | string[];
    categoryName?: string | string[];
  }>();
  const initialParamQuery = useNormalizedQueryParam(params.q);
  const categoryIdParam = useNormalizedQueryParam(params.categoryId);
  const categoryNameParam = useNormalizedQueryParam(params.categoryName);
  const isCategoryMode = Boolean(categoryIdParam);
  const { trackSearch, trackProductView } = useUserBehaviorTracking();

  const [query, setQuery] = React.useState(initialParamQuery);
  const [debouncedQuery, setDebouncedQuery] = React.useState(initialParamQuery.trim());
  const [results, setResults] = React.useState<Product[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [categoryResultCount, setCategoryResultCount] = React.useState<number | null>(null);
  
  // Sort & Filter state
  const [sortBy, setSortBy] = React.useState<SortOption>('popularity');
  const [filters, setFilters] = React.useState<FilterState>({
    priceMin: undefined,
    priceMax: undefined,
    conditions: [],
    categories: [],
    tags: [],
    attributes: {},
  });
  const [showSortModal, setShowSortModal] = React.useState(false);
  const [showFilterModal, setShowFilterModal] = React.useState(false);
  const [showAttributeModal, setShowAttributeModal] = React.useState<{attr: any, open: boolean} | null>(null);
  const [attributes, setAttributes] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (initialParamQuery !== query) {
      setQuery(initialParamQuery);
      setDebouncedQuery(initialParamQuery.trim());
    }
  }, [initialParamQuery]);

  React.useEffect(() => {
    setFilters({
      priceMin: undefined,
      priceMax: undefined,
      conditions: [],
      categories: [],
      tags: [],
      attributes: {},
    });
  }, [isCategoryMode, categoryIdParam, initialParamQuery]);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 350);

    return () => clearTimeout(handler);
  }, [query]);

  React.useEffect(() => {
    if (isCategoryMode) {
      return;
    }

    console.log('🔎 [SearchResults] Debounced query:', debouncedQuery);
    
    if (!debouncedQuery) {
      console.log('⚠️ [SearchResults] Empty query, clearing results');
      setResults([]);
      setError(null);
      setIsLoading(false);
      setCategoryResultCount(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setCategoryResultCount(null);

    SearchService.searchProductsWithDetails(debouncedQuery, 40)
      .then(async (data) => {
        if (!cancelled) {
          // Track the search query
          trackSearch(debouncedQuery, data.length);
          
          setResults(data);
          setError(null);

          // Fetch attributes for all categories in results
          const categoryIds = Array.from(new Set(data.map(p => p.category_id).filter(Boolean)));
          console.log('🏷️ [SearchResults] Category IDs:', categoryIds);
          if (categoryIds.length > 0) {
            try {
              const attrs = await CategoryService.fetchAttributesAndTermsForCategories(categoryIds);
              console.log('✅ [SearchResults] Attributes loaded:', attrs.length, 'attributes');
              console.log('📋 [SearchResults] Attribute details:', attrs.map(a => ({ name: a.name, terms: a.terms?.length || 0 })));
              setAttributes(attrs);
              
              // Filter attributes and terms to only show ones that exist in current results
              const filteredAttrs = attrs.map(attr => {
                // Get all term IDs that exist in current results
                const existingTermIds = new Set();
                data.forEach(product => {
                  if (product.attribute_relationships && Array.isArray(product.attribute_relationships)) {
                    product.attribute_relationships.forEach((rel: any) => {
                      // Handle both object and string formats
                      const termId = typeof rel === 'object' ? rel.term_id : rel;
                      if (termId && attr.terms?.some((term: any) => term.id === termId)) {
                        existingTermIds.add(termId);
                      }
                    });
                  }
                });
                

                
                // Filter terms to only include those that exist in results
                const availableTerms = attr.terms?.filter((term: any) => 
                  existingTermIds.has(term.id)
                ) || [];
                
                return {
                  ...attr,
                  terms: availableTerms
                };
              }).filter(attr => attr.terms.length > 0); // Only show attributes that have available terms
              

              setAttributes(filteredAttrs);
            } catch (attrError) {
              console.error('❌ [SearchResults] Error fetching attributes:', attrError);
            }
          } else {
            console.log('⚠️ [SearchResults] No category IDs found in results');
          }
        }
      })
      .catch((err) => {
        console.error('❌ [SearchResults] Error:', err);
        if (!cancelled) {
          setError(t?.unableToLoadResults || 'Unable to load results right now.');
          setResults([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, isCategoryMode]);

  React.useEffect(() => {
    if (!isCategoryMode || !categoryIdParam) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setAttributes([]);
    setResults([]);

    CategoryService.fetchProductsForCategory(categoryIdParam, {
      limit: 40,
      includeChildren: true,
    })
      .then(async ({ products: categoryProducts, count }) => {
        if (cancelled) {
          return;
        }
        const normalized = (categoryProducts as Product[]) ?? [];
        setResults(normalized);
        setCategoryResultCount(count ?? normalized.length);
        setError(null);

        const categoryIds = Array.from(new Set(normalized.map((p) => p.category_id).filter(Boolean)));
        if (categoryIds.length > 0) {
          try {
            const attrs = await CategoryService.fetchAttributesAndTermsForCategories(categoryIds);
            const filteredAttrs = attrs
              .map((attr: any) => {
                const existingTermIds = new Set<string>();
                normalized.forEach((product) => {
                  if (product.attribute_relationships && Array.isArray(product.attribute_relationships)) {
                    product.attribute_relationships.forEach((rel: any) => {
                      const termId = typeof rel === 'object' ? rel.term_id : rel;
                      if (termId && attr.terms?.some((term: any) => term.id === termId)) {
                        existingTermIds.add(termId);
                      }
                    });
                  }
                });

                const availableTerms = attr.terms?.filter((term: any) => existingTermIds.has(term.id)) || [];

                return {
                  ...attr,
                  terms: availableTerms,
                };
              })
              .filter((attr: any) => attr.terms.length > 0);

            setAttributes(filteredAttrs);
          } catch (attrError) {
            console.error('❌ [SearchResults] Error fetching category attributes:', attrError);
          }
        }
      })
      .catch((err) => {
        console.error('❌ [SearchResults] Category results error:', err);
        if (!cancelled) {
          setError(t?.unableToLoadCategoryResults || 'Unable to load category results right now.');
          setResults([]);
          setCategoryResultCount(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isCategoryMode, categoryIdParam]);

  React.useEffect(() => {
    if (!isCategoryMode) {
      setCategoryResultCount(null);
    }
  }, [isCategoryMode]);

  const handleSubmit = React.useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    router.setParams({ q: trimmed });
    setDebouncedQuery(trimmed);
  }, [query]);

  const handleSuggestionNav = React.useCallback(() => {
    router.push('/search');
  }, []);

  const handleBack = React.useCallback(() => {
    router.back();
  }, []);

  // Compute filtered and sorted results
  const filteredAndSortedResults = React.useMemo(() => {
    let filtered = [...results];

    // Apply filters
    if (filters.priceMin !== undefined) {
      filtered = filtered.filter(p => p.price >= filters.priceMin!);
    }
    if (filters.priceMax !== undefined) {
      filtered = filtered.filter(p => p.price <= filters.priceMax!);
    }
    if (filters.conditions.length > 0) {
      filtered = filtered.filter(p => filters.conditions.includes(p.condition));
    }
    if (filters.categories.length > 0) {
      filtered = filtered.filter(p => p.category && filters.categories.includes(p.category.name));
    }
    if (filters.tags.length > 0) {
      filtered = filtered.filter(p => 
        p.tags && filters.tags.some(tag => p.tags!.includes(tag))
      );
    }
    
    // Apply attribute filters
    const selectedTermIds = Object.values(filters.attributes).flat();
    if (selectedTermIds.length > 0) {
      filtered = filtered.filter(p => {
        const productTermIds = (p.attribute_relationships || []).map((rel: any) => rel.term_id);
        return selectedTermIds.every(termId => productTermIds.includes(termId));
      });
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'price_low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'popularity':
      default:
        // Keep original order (already sorted by relevance from search)
        break;
    }

    return filtered;
  }, [results, filters, sortBy]);

  // Helper to get localized content
  const getLocalizedTitle = (title?: string, arTitle?: string) => {
    if (language === 'ar' && arTitle) return arTitle;
    return title || '';
  };

  const getSortLabel = (option: SortOption) => {
    const labels = {
      popularity: language === 'ar' ? 'الأكثر شعبية' : 'Popularity',
      newest: language === 'ar' ? 'الأحدث' : 'Newest',
      price_low: language === 'ar' ? 'السعر: من الأقل' : 'Price: Low to High',
      price_high: language === 'ar' ? 'السعر: من الأعلى' : 'Price: High to Low',
    };
    return labels[option];
  };

  const getFilterCount = () => {
    let count = 0;
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) count++;
    if (filters.conditions.length > 0) count++;
    if (filters.categories.length > 0) count++;
    if (filters.tags.length > 0) count++;
    if (Object.values(filters.attributes).some(terms => terms.length > 0)) count++;
    return count;
  };

  const clearAllFilters = () => {
    setFilters({
      priceMin: undefined,
      priceMax: undefined,
      conditions: [],
      categories: [],
      tags: [],
      attributes: {},
    });
  };

  const resultsCountLabel = React.useMemo(() => {
    if (isCategoryMode) {
      const total = categoryResultCount ?? filteredAndSortedResults.length;
      const noun = total === 1 ? (t?.item || 'item') : (t?.items || 'items');
      const labelName = categoryNameParam || t?.thisCategory || 'this category';

      if (filteredAndSortedResults.length === total) {
        return `${total} ${noun} ${t?.in || 'in'} ${labelName}`;
      }

      return `${filteredAndSortedResults.length} ${t?.of || 'of'} ${total} ${noun} ${t?.in || 'in'} ${labelName}`;
    }

    if (debouncedQuery) {
      const noun = filteredAndSortedResults.length === 1 ? (t?.result || 'result') : (t?.results || 'results');
      return `${filteredAndSortedResults.length} ${noun} ${t?.found || 'found'}`;
    }

    return t?.startTyping || 'Start typing to search products';
  }, [
    isCategoryMode,
    categoryResultCount,
    filteredAndSortedResults.length,
    categoryNameParam,
    debouncedQuery,
    t,
  ]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerAction} onPress={handleBack} activeOpacity={0.85}>
            <MaterialCommunityIcons name="arrow-left" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <SearchBar
            onPress={handleSuggestionNav}
            value={isCategoryMode ? categoryNameParam || '' : query}
            onChangeText={setQuery}
            placeholder={t?.searchPlaceholder || (language === 'ar' ? 'ابحث عن أي شيء...' : 'Search for anything...')}
            sharedTransitionTag="globalSearchBar"
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            containerStyle={styles.searchBarContainer}
            showFilterButton={false}
            editable={false}

          />
        </View>
        {/* <TouchableOpacity style={styles.headerLink} activeOpacity={0.85} onPress={handleSuggestionNav}>
          <MaterialCommunityIcons name="arrow-left" size={18} color="#FFFFFF" />
          <Text style={styles.headerLinkText}>Refine search</Text>
        </TouchableOpacity> */}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>
            {isCategoryMode
              ? `${t?.resultsIn || 'Results in'} "${categoryNameParam || t?.selectedCategory || 'Selected category'}"`
              : debouncedQuery || query
              ? `${t?.resultsFor || 'Results for'} "${debouncedQuery || query}"`
              : t?.latestSearchResults || 'Latest search results'}
          </Text>
          <Text style={styles.summarySubtitle}>{resultsCountLabel}</Text>
          {/* Debug info */}
          {__DEV__ && (
            <Text style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
              Debug: {attributes.length} attributes, {results.length} results, base count:{' '}
              {categoryResultCount ?? 'n/a'}
            </Text>
          )}
        </View>

        {/* Sort & Filter Bar */}
        {results.length > 0 && (
          <View style={styles.filterBar}>
            <TouchableOpacity 
              style={styles.filterButton}
              onPress={() => setShowSortModal(true)}
            >
              <MaterialCommunityIcons name="sort" size={16} color="#6B7280" />
              <Text style={styles.filterButtonText}>
                {(t?.sortLabel || (language === 'ar' ? 'ترتيب' : 'Sort'))}: {getSortLabel(sortBy)}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={16} color="#6B7280" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.filterButton}
              onPress={() => setShowFilterModal(true)}
            >
              <MaterialCommunityIcons name="filter-variant" size={16} color="#6B7280" />
              <Text style={styles.filterButtonText}>
                {t?.filter || (language === 'ar' ? 'تصفية' : 'Filter')}
              </Text>
              {getFilterCount() > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{getFilterCount()}</Text>
                </View>
              )}
              <MaterialCommunityIcons name="chevron-down" size={16} color="#6B7280" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.viewButton}>
              <MaterialCommunityIcons name="view-list" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>
        )}

        {/* Attribute Pills */}
        {attributes.length > 0 && (
          <View style={styles.attributePillsContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.attributePills}
            >
              {attributes.map((attr) => {
                const selectedTerms = filters.attributes[attr.id] || [];
                const hasSelection = selectedTerms.length > 0;
                
                return (
                  <TouchableOpacity
                    key={attr.id}
                    style={[
                      styles.attributePill,
                      hasSelection && styles.attributePillSelected
                    ]}
                    onPress={() => setShowAttributeModal({ attr, open: true })}
                  >
                    <Text style={[
                      styles.attributePillText,
                      hasSelection && styles.attributePillTextSelected
                    ]}>
                      {attr.name}
                      {hasSelection && ` (${selectedTerms.length})`}
                    </Text>
                    <MaterialCommunityIcons 
                      name="chevron-down" 
                      size={14} 
                      color={hasSelection ? "#61d5b6" : "#6B7280"} 
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {isLoading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="small" color="#61d5b6" />
            <Text style={styles.stateLabel}>
              {t?.searchingProducts || (language === 'ar' ? 'جاري البحث عن المنتجات...' : 'Searching products…')}
            </Text>
          </View>
        ) : error ? (
          <View style={styles.stateContainer}>
            <Text style={styles.stateLabel}>{error}</Text>
          </View>
        ) : results.length === 0 ? (
          <View style={styles.stateContainer}>
            <Text style={styles.stateLabel}>
              {t?.noProductsYet || (language === 'ar' ? 'لا توجد منتجات بعد. جرب كلمة أخرى.' : 'No products yet. Try another keyword.')}
            </Text>
          </View>
        ) : (
          <View style={styles.resultsList}>
            {filteredAndSortedResults.map((product) => {
              const imageUrl = extractPrimaryImage(product);
              return (
                <TouchableOpacity
                  key={product.id}
                  style={styles.resultCard}
                  activeOpacity={0.9}
                  onPress={() => {
                    // Track product view
                    trackProductView(product.id, {
                      categoryId: product.category_id,
                      price: product.price,
                      searchQuery: query
                    });
                    router.push(`/product/${product.id}?query=${encodeURIComponent(query)}`);
                  }}
                >
                  <View style={styles.resultImageWrapper}>
                    {imageUrl ? (
                      <Image source={{ uri: imageUrl }} style={styles.resultImage} />
                    ) : (
                      <View style={styles.resultPlaceholder}>
                        <MaterialCommunityIcons name="image-off-outline" size={30} color="#9CA3AF" />
                      </View>
                    )}
                  </View>
                  <View style={styles.resultDetails}>
                    <Text style={styles.resultTitle} numberOfLines={2}>
                      {getLocalizedTitle(product.title, product.ar_title)}
                    </Text>
                    {product.category?.name ? (
                      <Text style={styles.resultMeta}>
                        {getLocalizedTitle(product.category.name, product.category.ar_name)}
                      </Text>
                    ) : null}
                    {product.location ? (
                      <View style={styles.resultLocationRow}>
                        <MaterialCommunityIcons name="map-marker" size={16} color="#61d5b6" />
                        <Text style={styles.resultLocationText} numberOfLines={1}>
                          {product.location}
                        </Text>
                      </View>
                    ) : null}
                    <View style={styles.resultPriceRow}>
                      <Text style={styles.resultPrice}>{formatCurrency(product.price, product.currency)}</Text>
                      {product.starting_price && product.starting_price > product.price ? (
                        <Text style={styles.resultPriceOriginal}>
                          {formatCurrency(product.starting_price, product.currency)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSortModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {t?.sortBy || (language === 'ar' ? 'ترتيب حسب' : 'Sort By')}
            </Text>
            <TouchableOpacity onPress={() => setShowSortModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {(['popularity', 'newest', 'price_low', 'price_high'] as SortOption[]).map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.sortOption}
                onPress={() => {
                  setSortBy(option);
                  setShowSortModal(false);
                }}
              >
                <Text style={styles.sortOptionText}>{getSortLabel(option)}</Text>
                {sortBy === option && (
                  <MaterialCommunityIcons name="check" size={20} color="#61d5b6" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={clearAllFilters}>
              <Text style={styles.clearAllText}>
                {t?.clearAll || (language === 'ar' ? 'مسح الكل' : 'Clear All')}
              </Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {t?.filter || (language === 'ar' ? 'تصفية' : 'Filter')}
            </Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {/* Price Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>{t?.priceRange || 'Price Range'}</Text>
              <View style={styles.priceInputs}>
                <View style={styles.priceInput}>
                  <Text style={styles.priceLabel}>{t?.min || 'Min'}</Text>
                  <Text style={styles.priceValue}>
                    {filters.priceMin ? `$${filters.priceMin}` : (t?.any || 'Any')}
                  </Text>
                </View>
                <View style={styles.priceInput}>
                  <Text style={styles.priceLabel}>{t?.max || 'Max'}</Text>
                  <Text style={styles.priceValue}>
                    {filters.priceMax ? `$${filters.priceMax}` : (t?.any || 'Any')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Condition */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>{t?.condition || 'Condition'}</Text>
              {['new', 'used', 'refurbished'].map((condition) => (
                <TouchableOpacity
                  key={condition}
                  style={styles.filterOption}
                  onPress={() => {
                    setFilters(prev => ({
                      ...prev,
                      conditions: prev.conditions.includes(condition)
                        ? prev.conditions.filter(c => c !== condition)
                        : [...prev.conditions, condition]
                    }));
                  }}
                >
                  <Text style={styles.filterOptionText}>
                    {condition === 'new' ? (t?.condNew || 'New') : condition === 'used' ? (t?.condUsed || 'Used') : (t?.condRefurbished || 'Refurbished')}
                  </Text>
                  {filters.conditions.includes(condition) && (
                    <MaterialCommunityIcons name="check" size={20} color="#61d5b6" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Tags */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>{t?.tags || 'Tags'}</Text>
              <View style={styles.tagChips}>
                {Array.from(new Set(results.flatMap(p => p.tags || []))).slice(0, 10).map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tagChip,
                      filters.tags.includes(tag) && styles.tagChipSelected
                    ]}
                    onPress={() => {
                      setFilters(prev => ({
                        ...prev,
                        tags: prev.tags.includes(tag)
                          ? prev.tags.filter(t => t !== tag)
                          : [...prev.tags, tag]
                      }));
                    }}
                  >
                    <Text style={[
                      styles.tagChipText,
                      filters.tags.includes(tag) && styles.tagChipTextSelected
                    ]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.applyButtonText}>
              {t?.apply || (language === 'ar' ? 'تطبيق' : 'Apply')}
              </Text>
              <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Individual Attribute Modal */}
      <Modal
        visible={showAttributeModal?.open || false}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAttributeModal(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {showAttributeModal?.attr?.name || 'Attribute'}
            </Text>
            <TouchableOpacity onPress={() => setShowAttributeModal(null)}>
              <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {showAttributeModal?.attr?.terms?.map((term: any) => {
              const isSelected = filters.attributes[showAttributeModal.attr.id]?.includes(term.id) || false;
              
              return (
                <TouchableOpacity
                  key={term.id}
                  style={styles.attributeTermRow}
                  onPress={() => {
                    setFilters(prev => ({
                      ...prev,
                      attributes: {
                        ...prev.attributes,
                        [showAttributeModal.attr.id]: prev.attributes[showAttributeModal.attr.id]?.includes(term.id)
                          ? (prev.attributes[showAttributeModal.attr.id] || []).filter((id: string) => id !== term.id)
                          : [...(prev.attributes[showAttributeModal.attr.id] || []), term.id]
                      }
                    }));
                  }}
                >
                  <View style={styles.attributeTermRowContent}>
                    <Text style={styles.attributeTermRowText}>{term.name}</Text>
                    {isSelected && (
                      <MaterialCommunityIcons name="check" size={20} color="#61d5b6" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowAttributeModal(null)}
            >
            <Text style={styles.applyButtonText}>{t?.done || 'Done'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

export const options = {
  headerShown: false,
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  header: {
    backgroundColor: '#61d5b6',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchBarContainer: {
    flex: 1,
  },
  headerAction: {
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  headerActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  headerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerLinkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  summarySubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  stateContainer: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 40,
  },
  stateLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  resultsList: {
    gap: 16,
  },
  resultCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  resultImageWrapper: {
    width: 96,
    height: 96,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultImage: {
    width: '100%',
    height: '100%',
  },
  resultPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultDetails: {
    flex: 1,
    gap: 6,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  resultMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
  resultLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resultLocationText: {
    fontSize: 12,
    color: '#61d5b6',
    flexShrink: 1,
  },
  resultPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  resultPrice: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  resultPriceOriginal: {
    fontSize: 13,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  // Filter Bar
  filterBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  filterBadge: {
    backgroundColor: '#61d5b6',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  viewButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  clearAllText: {
    fontSize: 16,
    color: '#61d5b6',
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#61d5b6',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  applyButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Sort Options
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  // Filter Sections
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  filterOptionText: {
    fontSize: 15,
    color: '#374151',
  },
  // Price Range
  priceInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  priceInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  // Tags
  tagChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tagChipSelected: {
    backgroundColor: '#EDE9FE',
    borderColor: '#61d5b6',
  },
  tagChipText: {
    fontSize: 14,
    color: '#6B7280',
  },
  tagChipTextSelected: {
    color: '#61d5b6',
    fontWeight: '500',
  },
  // Attribute Terms
  attributeTerms: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attributeTerm: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  attributeTermSelected: {
    backgroundColor: '#EDE9FE',
    borderColor: '#61d5b6',
  },
  attributeTermText: {
    fontSize: 14,
    color: '#6B7280',
  },
  attributeTermTextSelected: {
    color: '#61d5b6',
    fontWeight: '500',
  },
  // Attribute Pills
  attributePillsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  attributePills: {
    paddingRight: 16,
  },
  attributePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
    gap: 6,
  },
  attributePillSelected: {
    backgroundColor: '#EDE9FE',
    borderColor: '#61d5b6',
  },
  attributePillText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  attributePillTextSelected: {
    color: '#61d5b6',
  },
  // Individual Attribute Modal
  attributeTermRow: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  attributeTermRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attributeTermRowText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
});
