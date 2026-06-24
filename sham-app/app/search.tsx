import React from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SearchBar } from '@/components/search/SearchBar';
import SearchService, { SearchSuggestion } from '@/services/SearchService';
import CategoryService from '@/services/CategoryService';
import { useUserBehaviorTracking } from '@/hooks/useRecommendations';
import { getLocalizedTitle, isArabicLanguage } from '@/utils/languageDetection';
import type { Category } from '@/types/database';
import { usePageTranslation } from '@/hooks/useTranslation';

type SearchItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  isNew?: boolean;
};

const STORAGE_KEY = '@sham_app_recent_searches';
const MAX_RECENT_SEARCHES = 8;

// Icon mapping - map category names to local assets
const ICON_MAP: Record<string, any> = {
  Electronics: require('@/assets/images/electronics.png'),
  Furniture: require('@/assets/images/furniture.png'),
  'Health & Beauty': require('@/assets/images/health.png'),
  Health: require('@/assets/images/health.png'),
  Beauty: require('@/assets/images/health.png'),
  'Home Fragrances': require('@/assets/images/perfume.png'),
  'Home & Garden': require('@/assets/images/home.png'),
  'Apparel & Accessories': require('@/assets/images/appreal.png'),
  mens: require('@/assets/images/mens.png'),
  womens: require('@/assets/images/women.png'),
};

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { trackSearch } = useUserBehaviorTracking();
  const { t } = usePageTranslation('searchPage');
  const [query, setQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [recentSearches, setRecentSearches] = React.useState<SearchItem[]>([]);
  const [results, setResults] = React.useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [isLoadingRecentSearches, setIsLoadingRecentSearches] = React.useState(true);

  // Fetch categories from database
  const { data: allCategories = [], isLoading: isLoadingCategories } = useQuery<Category[], Error>({
    queryKey: ['categories'],
    queryFn: CategoryService.fetchCategories,
  });

  // Get top-level categories with images
  const popularCategories = React.useMemo(() => {
    const topLevel = allCategories
      .filter((cat) => !cat.parent_id)
      .slice(0, 10); // Get top 10 categories
    
    return topLevel.map((category) => ({
      ...category,
      iconSource: ICON_MAP[category.name] || null,
    }));
  }, [allCategories]);

  // Load recent searches from storage on mount
  React.useEffect(() => {
    const loadRecentSearches = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as SearchItem[];
          setRecentSearches(parsed);
        }
      } catch (error) {
        console.error('Error loading recent searches:', error);
      } finally {
        setIsLoadingRecentSearches(false);
      }
    };

    loadRecentSearches();
  }, []);

  // Save recent searches to storage whenever they change
  React.useEffect(() => {
    if (isLoadingRecentSearches) return; // Don't save on initial load
    
    const saveRecentSearches = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(recentSearches));
      } catch (error) {
        console.error('Error saving recent searches:', error);
      }
    };

    saveRecentSearches();
  }, [recentSearches, isLoadingRecentSearches]);

  // Debounce the query before hitting the network
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 400);

    return () => clearTimeout(handler);
  }, [query]);

  // Fetch results when the debounced query changes
  React.useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    SearchService.getSearchSuggestions(debouncedQuery, 20)
      .then((data) => {
        if (!cancelled) {
          // Track the search query
          trackSearch(debouncedQuery, data.length);
          setResults(data);
          setSearchError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Search error', error);
          setResults([]);
          setSearchError(t?.unableToLoadResults || 'Unable to load results right now.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsSearching(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const addRecentSearch = React.useCallback((title: string, subtitle?: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.title.toLowerCase() !== trimmed.toLowerCase());
      return [
        {
          id: `recent-${Date.now()}`,
          title: trimmed,
          subtitle: subtitle || 'Recent search',
          icon: 'history' as keyof typeof MaterialCommunityIcons.glyphMap,
        },
        ...filtered,
      ].slice(0, MAX_RECENT_SEARCHES);
    });
  }, []);

  const clearRecentSearches = React.useCallback(async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing recent searches:', error);
    }
  }, []);

  const handleBack = React.useCallback(() => {
    router.back();
  }, []);

  const navigateToResults = React.useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    // Track the search navigation
    trackSearch(trimmed, 0); // 0 because we don't know result count yet
    router.push({ pathname: '/search-results', params: { q: trimmed } });
  }, [trackSearch]);

  const handleRecentSelect = React.useCallback((item: SearchItem) => {
    setQuery(item.title);
    addRecentSearch(item.title, item.subtitle);
    navigateToResults(item.title);
  }, [addRecentSearch, navigateToResults]);

  const handleCategorySelect = React.useCallback((category: Category) => {
    const categoryName = category.name;
    setQuery(categoryName);
    addRecentSearch(categoryName, t?.category || 'Category');
    // Navigate to category page
    router.push(`/category/${category.slug}`);
  }, [addRecentSearch, t]);

  const handleResultSelect = React.useCallback((suggestion: SearchSuggestion) => {
    addRecentSearch(suggestion.title, suggestion.category_name || t?.suggestion || 'Suggestion');
    navigateToResults(suggestion.title);
  }, [addRecentSearch, navigateToResults, t]);

  const handleSubmit = React.useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    addRecentSearch(query, t?.manualSearch || 'Manual search');
    navigateToResults(trimmed);
  }, [addRecentSearch, navigateToResults, query, t]);

  const showSuggestions = debouncedQuery.length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}> 
        <View style={styles.headerSearchWrapper}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            autoFocus
            showFilterButton={false}
            placeholder={t?.searchPlaceholder || (isArabicLanguage() ? 'ابحث عن أي شيء...' : 'Search for anything...')}
            containerStyle={styles.headerSearchBar}
            sharedTransitionTag="globalSearchBar"
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity style={styles.headerIconButton} onPress={handleBack} activeOpacity={0.85}>
          <Text style={styles.cancelText}>{t?.cancel || (isArabicLanguage() ? 'إلغاء' : 'Cancel')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {showSuggestions ? (
          <View style={styles.resultsCard}>
            {isSearching ? (
              <View style={styles.resultsState}>
                <ActivityIndicator color="#61d5b6" />
                <Text style={styles.stateText}>{t?.searching || (isArabicLanguage() ? 'جاري البحث...' : 'Searching...')}</Text>
              </View>
            ) : searchError ? (
              <View style={styles.resultsState}>
                <Text style={styles.stateText}>{searchError}</Text>
              </View>
            ) : results.length === 0 ? (
              <View style={styles.resultsState}>
                <Text style={styles.stateText}>{t?.noMatchesYet || (isArabicLanguage() ? 'لا توجد نتائج بعد. جرب مصطلح آخر.' : 'No matches yet. Try another term.')}</Text>
              </View>
            ) : (
              results.map((result) => (
                <TouchableOpacity
                  key={result.id}
                  style={styles.resultRow}
                  activeOpacity={0.85}
                  onPress={() => handleResultSelect(result)}
                >
                  <View style={styles.resultIconBubble}>
                    <MaterialCommunityIcons name="magnify" size={18} color="#475467" />
                  </View>
                  <View style={styles.resultTextBlock}>
                    <Text style={styles.resultTitle}>
                      {getLocalizedTitle(result.title, result.ar_title)}
                    </Text>
                    {result.category_name ? (
                      <Text style={styles.resultSubtitle}>{result.category_name}</Text>
                    ) : null}
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#CBD5F0" />
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
          <>
            {recentSearches.length > 0 && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t?.recentSearches || (isArabicLanguage() ? 'البحث الأخير' : 'Recent searches')}</Text>
                <TouchableOpacity onPress={clearRecentSearches} activeOpacity={0.7}>
                  <Text style={styles.clearButton}>
                    {t?.clear || (isArabicLanguage() ? 'مسح' : 'Clear')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {recentSearches.length > 0 && (
              <View style={styles.listCard}>
                {recentSearches.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.listRow, index === recentSearches.length - 1 && styles.listRowLast]}
                  activeOpacity={0.85}
                  onPress={() => handleRecentSelect(item)}
                >
                  <View style={styles.rowLeft}>
                    <View style={styles.iconBubble}>
                      <MaterialCommunityIcons name={item.icon} size={20} color="#475467" />
                    </View>
                    <View>
                      <Text style={styles.rowTitle}>{item.title}</Text>
                      <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
                    </View>
                  </View>
                  <View style={styles.rowRight}>
                    {item.isNew ? <View style={styles.newDot} /> : null}
                    <MaterialCommunityIcons name="magnify" size={20} color="#61d5b6" />
                  </View>
                </TouchableOpacity>
              ))}
              </View>
            )}

            <Text style={[styles.sectionTitle, recentSearches.length > 0 && styles.sectionSpacing]}>
              {t?.popularCategories || (isArabicLanguage() ? 'الفئات الشائعة' : 'Popular categories')}
            </Text>
            {isLoadingCategories ? (
              <View style={styles.categoriesLoadingContainer}>
                <ActivityIndicator color="#61d5b6" />
                <Text style={styles.loadingText}>{t?.loading || (isArabicLanguage() ? 'جاري التحميل...' : 'Loading...')}</Text>
              </View>
            ) : (
              <View style={styles.listCard}>
                {popularCategories.map((category, index) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[styles.listRow, index === popularCategories.length - 1 && styles.listRowLast]}
                    activeOpacity={0.85}
                    onPress={() => handleCategorySelect(category)}
                  >
                    <View style={styles.rowLeft}>
                      <View style={[styles.iconBubble, styles.iconBubbleSoft]}>
                        {category.iconSource ? (
                          <Image source={category.iconSource} style={styles.categoryIconImage} resizeMode="contain" />
                        ) : (
                          <MaterialCommunityIcons name="package" size={20} color="#61d5b6" />
                        )}
                      </View>
                      <View>
                        <Text style={styles.rowTitle}>{category.name}</Text>
                        <Text style={styles.rowSubtitle}>{t?.browse || (isArabicLanguage() ? 'تصفح' : 'Browse')}</Text>
                      </View>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#CBD5F0" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FCFE',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#61d5b6',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  headerIconButton: {
    minWidth: 60,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  cancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  headerSearchWrapper: {
    flex: 1,
    marginRight: 12,
  },
  headerSearchBar: {
    shadowOpacity: 0.12,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8FCFE',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  clearButton: {
    fontSize: 14,
    fontWeight: '500',
    color: '#61d5b6',
  },
  sectionSpacing: {
    marginTop: 12,
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  listRowLast: {
    borderBottomWidth: 0,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBubbleSoft: {
    backgroundColor: '#F4F3FF',
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  newDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#61d5b6',
  },
  resultsCard: {
    // backgroundColor: '#FFFFFF',
    // borderRadius: 24,
    // borderWidth: 1,
    // borderColor: '#E2E8F0',
    // padding: 4,
    // overflow: 'hidden',
    gap: 4,
  },
  resultsState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  stateText: {
    color: '#6B7280',
    fontSize: 14,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  resultIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTextBlock: {
    flex: 1,
    gap: 4,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  resultSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  categoriesLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  categoryIconImage: {
    width: 28,
    height: 28,
  },
});
