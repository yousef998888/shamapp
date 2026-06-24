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
import { useQuery } from '@tanstack/react-query';
import { SearchBar } from '@/components/search/SearchBar';
import CategoryService, { CategoryDetail, CategoryBreadcrumb } from '@/services/CategoryService';
import type { ProductWithRelations } from '@/services/ProductService';
import UserBehaviorService from '@/services/UserBehaviorService';
import { usePageTranslation } from '@/hooks/useTranslation';

type SortOption = 'popularity' | 'newest' | 'price_low' | 'price_high';

type FilterState = {
  priceMin?: number;
  priceMax?: number;
  conditions: string[];
  categories: string[];
  tags: string[];
  attributes: Record<string, string[]>;
};

const formatCurrency = (value?: number, currency?: string) => {
  if (value == null) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
};

const buildBreadcrumbLabel = (breadcrumb: CategoryBreadcrumb, index: number) => {
  if (index === 0) {
    return breadcrumb.name;
  }
  return breadcrumb.name;
};

export default function CategoryBrowseScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const { t } = usePageTranslation('categoryPage');

  const {
    data: categoryDetail,
    isLoading: isCategoryLoading,
    error: categoryError,
  } = useQuery<CategoryDetail | null>({
    queryKey: ['category-detail', slug],
    queryFn: () => CategoryService.fetchCategoryDetail(slug ?? ''),
    enabled: !!slug,
  });

  const {
    data: categoryProducts,
    isLoading: isProductLoading,
  } = useQuery({
    queryKey: ['category-products', categoryDetail?.id],
    queryFn: () =>
      CategoryService.fetchProductsForCategory(categoryDetail!.id, {
        limit: 40,
        includeChildren: true,
      }),
    enabled: !!categoryDetail?.id,
  });

  const [sortBy, setSortBy] = React.useState<SortOption>('popularity');
  const [filters, setFilters] = React.useState<FilterState>({
    conditions: [],
    categories: [],
    tags: [],
    attributes: {},
  });
  const [showSortModal, setShowSortModal] = React.useState(false);
  const [showFilterModal, setShowFilterModal] = React.useState(false);
  const [showAttributeModal, setShowAttributeModal] = React.useState<{ attr: any; open: boolean } | null>(null);
  const [attributes, setAttributes] = React.useState<any[]>([]);

  const products = React.useMemo(
    () => (categoryProducts?.products ?? []) as ProductWithRelations[],
    [categoryProducts],
  );

  React.useEffect(() => {
    if (!categoryDetail) {
      setAttributes((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    if (!categoryDetail.id) {
      return;
    }

    if (!products.length && categoryDetail.children.length === 0) {
      setAttributes((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    const categoryIds = new Set<string>([categoryDetail.id]);
    categoryDetail.children.forEach((child) => categoryIds.add(child.id));
    products.forEach((product) => {
      if (product.category_id) {
        categoryIds.add(product.category_id);
      }
    });

    if (categoryIds.size === 0) {
      setAttributes((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    let cancelled = false;

    CategoryService.fetchAttributesAndTermsForCategories(Array.from(categoryIds))
      .then((attrs) => {
        if (cancelled) {
          return;
        }

        const filteredAttrs = attrs
          .map((attr: any) => {
            const termIdsInProducts = new Set<string>();
            products.forEach((product) => {
              (product.attribute_relationships || []).forEach((rel: any) => {
                const termId = typeof rel === 'object' ? rel.term_id : rel;
                if (termId) {
                  termIdsInProducts.add(termId);
                }
              });
            });

            const availableTerms =
              attr.terms?.filter((term: any) => termIdsInProducts.has(term.id)) || [];

            return {
              ...attr,
              terms: availableTerms,
            };
          })
          .filter((attr: any) => attr.terms.length > 0);

        setAttributes(filteredAttrs);
      })
      .catch((err) => {
        console.warn('[CategoryBrowse] Failed to load attributes', err);
        if (!cancelled) {
          setAttributes((prev) => (prev.length === 0 ? prev : []));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [categoryDetail, products]);

  const filteredAndSortedProducts = React.useMemo(() => {
    let filtered = [...products];

    if (filters.priceMin !== undefined) {
      filtered = filtered.filter((p) => p.price >= filters.priceMin!);
    }
    if (filters.priceMax !== undefined) {
      filtered = filtered.filter((p) => p.price <= filters.priceMax!);
    }
    if (filters.conditions.length > 0) {
      filtered = filtered.filter((p) => filters.conditions.includes(p.condition));
    }
    if (filters.categories.length > 0) {
      filtered = filtered.filter(
        (p) => p.category && filters.categories.includes(p.category.name),
      );
    }
    if (filters.tags.length > 0) {
      filtered = filtered.filter(
        (p) => p.tags && filters.tags.some((tag) => p.tags!.includes(tag)),
      );
    }

    const selectedTermIds = Object.values(filters.attributes).flat();
    if (selectedTermIds.length > 0) {
      filtered = filtered.filter((p) => {
        const productTermIds = (p.attribute_relationships || []).map((rel: any) => rel.term_id);
        return selectedTermIds.every((termId) => productTermIds.includes(termId));
      });
    }

    switch (sortBy) {
      case 'newest':
        filtered.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        break;
      case 'price_low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'popularity':
      default:
        filtered.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
        break;
    }

    return filtered;
  }, [products, filters, sortBy]);

  const getSortLabel = (option: SortOption) => {
    switch (option) {
      case 'popularity':
        return t.popularity || 'Popularity';
      case 'newest':
        return t.newest || 'Newest';
      case 'price_low':
        return t.priceLowToHigh || 'Price: Low to High';
      case 'price_high':
        return t.priceHighToLow || 'Price: High to Low';
    }
  };

  const getFilterCount = () => {
    let count = 0;
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) count++;
    if (filters.conditions.length > 0) count++;
    if (filters.categories.length > 0) count++;
    if (filters.tags.length > 0) count++;
    if (Object.values(filters.attributes).some((terms) => terms.length > 0)) count++;
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

  const handleProductPress = (product: ProductWithRelations) => {
    UserBehaviorService.trackProductView(product.id, {
      categoryId: product.category_id,
      price: product.price,
    });

    router.push(`/product/${product.id}`);
  };

  const handleSeeAllPress = () => {
    if (!categoryDetail) return;
    router.push({
      pathname: '/search-results',
      params: {
        categoryId: categoryDetail.id,
        categoryName: categoryDetail.name,
      },
    });
  };

  if (isCategoryLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#61d5b6" />
      </SafeAreaView>
    );
  }

  if (categoryError || !categoryDetail) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <MaterialCommunityIcons name="folder-off-outline" size={48} color="#9CA3AF" />
        <Text style={styles.errorTitle}>{t.categoryNotFound || 'Category not found'}</Text>
        <Text style={styles.errorMessage}>
          {t.categoryNotFoundMessage || "We couldn't find the category you were looking for."}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>{t.goBack || 'Go Back'}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const breadcrumbs = categoryDetail.breadcrumbs;
  const hasProducts = filteredAndSortedProducts.length > 0;
  const hasChildren = categoryDetail.children.length > 0;
  const filterCount = getFilterCount();
  const activeAttribute = showAttributeModal?.attr;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerIconButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerSearch}>
          <SearchBar
            value=""
            placeholder={t.searchProducts || 'Search products'}
            editable={false}
            onPress={() => router.push('/search')}
            showFilterButton={false}
            containerStyle={styles.headerSearchBar}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.breadcrumbContainer, { paddingTop: insets.top }]}>
          {breadcrumbs.map((breadcrumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <View key={breadcrumb.id} style={styles.breadcrumbItem}>
                <TouchableOpacity
                  disabled={isLast}
                  onPress={() => {
                    if (!isLast) {
                      router.replace(`/category/${breadcrumb.slug}`);
                    }
                  }}
                >
                  <Text style={[styles.breadcrumbText, isLast && styles.breadcrumbTextActive]}>
                    {buildBreadcrumbLabel(breadcrumb, index)}
                  </Text>
                </TouchableOpacity>
                {!isLast && (
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={16}
                    color="#9CA3AF"
                    style={styles.breadcrumbSeparator}
                  />
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.categoryTitle}>{categoryDetail.name}</Text>
          {categoryDetail.description ? (
            <Text style={styles.categorySubtitle}>{categoryDetail.description}</Text>
          ) : null}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              {t.allResults || 'All Results'} ({filteredAndSortedProducts.length.toLocaleString()})
            </Text>
            <Text style={styles.sectionSubtitle}>
              {t.showing || 'Showing'} {filteredAndSortedProducts.length} {t.of || 'of'} {(categoryProducts?.count ?? products.length).toLocaleString()} {t.items || 'items'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleSeeAllPress}>
            <Text style={styles.sectionAction}>{t.seeAll || 'See All'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.controlRow}>
          <TouchableOpacity
            style={styles.controlChip}
            onPress={() => setShowSortModal(true)}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="sort-variant" size={18} color="#475467" />
            <Text style={styles.controlChipText}>{(t.sort || 'Sort')}: {getSortLabel(sortBy)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlChip}
            onPress={() => setShowFilterModal(true)}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="tune-variant" size={18} color="#475467" />
            <Text style={styles.controlChipText}>
              {filterCount > 0 ? `${t.filter || 'Filter'} (${filterCount})` : (t.filter || 'Filter')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlChipIconOnly} activeOpacity={0.85}>
            <MaterialCommunityIcons name="view-grid-outline" size={18} color="#475467" />
          </TouchableOpacity>
        </View>

        <View style={styles.productGrid}>
          {isProductLoading && (
            <View style={styles.loadingProducts}>
              <ActivityIndicator size="small" color="#61d5b6" />
              <Text style={styles.loadingProductsText}>{t.loadingProducts || 'Loading products...'}</Text>
            </View>
          )}

          {!isProductLoading && !hasProducts && (
            <View style={styles.emptyProducts}>
              <MaterialCommunityIcons name="package-variant" size={32} color="#9CA3AF" />
              <Text style={styles.emptyProductsTitle}>{t.noProductsYet || 'No products yet'}</Text>
              <Text style={styles.emptyProductsMessage}>
                {t.noProductsMessage || "This category doesn't have any products yet. Check back soon!"}
              </Text>
            </View>
          )}

          {!isProductLoading &&
            hasProducts &&
            filteredAndSortedProducts.map((product) => {
              const primaryImage =
                product.images?.find((img) => img.is_primary) || product.images?.[0];

              return (
                <TouchableOpacity
                  key={product.id}
                  style={styles.productCard}
                  activeOpacity={0.9}
                  onPress={() => handleProductPress(product)}
                >
                  <View style={styles.productImageWrapper}>
                    {primaryImage ? (
                      <Image
                        source={{ uri: primaryImage.image_url }}
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.productImagePlaceholder}>
                        <MaterialCommunityIcons
                          name="image-off-outline"
                          size={28}
                          color="#9CA3AF"
                        />
                      </View>
                    )}
                    {/* <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>50% off</Text>
                    </View> */}
                    <TouchableOpacity style={styles.favoriteButton}>
                      <MaterialCommunityIcons name="heart-outline" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.productContent}>
                    <Text style={styles.productTitle} numberOfLines={2}>
                      {product.title}
                    </Text>
                    <View style={styles.productPriceRow}>
                      <Text style={styles.productPrice}>
                        {formatCurrency(product.price, product.currency)}
                      </Text>
                    </View>
                    {/* <Text style={styles.productMeta}>{t.onlyLeft || 'Only 2 left in stock'}</Text> */}
                    <TouchableOpacity style={styles.productAction}>
                      <Text style={styles.productActionText}>{t.viewProduct || 'View product'}</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              {t.categoriesIn || 'Categories in'} {categoryDetail.name}
            </Text>
          </View>
        </View>

        <View style={styles.subcategorySection}>
          {hasChildren && categoryDetail.children.length > 0 ? (
            <View style={styles.subcategoryList}>
              {categoryDetail.children.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.subcategoryItem}
                  onPress={() => router.push(`/category/${category.slug}`)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.subcategoryText}>{category.name}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#6B7280" />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.emptySubcategoriesText}>
              {t.noSubcategories || "No subcategories yet."}
            </Text>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showSortModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSortModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t.sortBy || 'Sort By'}</Text>
            <TouchableOpacity onPress={() => setShowSortModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {(['popularity', 'newest', 'price_low', 'price_high'] as SortOption[]).map(
              (option) => (
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
              ),
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showFilterModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={clearAllFilters}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Filter</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Price Range</Text>
              <View style={styles.priceInputs}>
                <View style={styles.priceInput}>
                  <Text style={styles.priceLabel}>Min</Text>
                  <Text style={styles.priceValue}>
                    {filters.priceMin ? `$${filters.priceMin}` : 'Any'}
                  </Text>
                </View>
                <View style={styles.priceInput}>
                  <Text style={styles.priceLabel}>Max</Text>
                  <Text style={styles.priceValue}>
                    {filters.priceMax ? `$${filters.priceMax}` : 'Any'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Condition</Text>
              {['new', 'used', 'refurbished'].map((condition) => (
                <TouchableOpacity
                  key={condition}
                  style={styles.filterOption}
                  onPress={() => {
                    setFilters((prev) => ({
                      ...prev,
                      conditions: prev.conditions.includes(condition)
                        ? prev.conditions.filter((c) => c !== condition)
                        : [...prev.conditions, condition],
                    }));
                  }}
                >
                  <Text style={styles.filterOptionText}>
                    {condition.charAt(0).toUpperCase() + condition.slice(1)}
                  </Text>
                  {filters.conditions.includes(condition) && (
                    <MaterialCommunityIcons name="check" size={20} color="#61d5b6" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {categoryDetail.children.length > 0 && (
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Subcategories</Text>
                {categoryDetail.children.map((child) => (
                  <TouchableOpacity
                    key={child.id}
                    style={styles.filterOption}
                    onPress={() => {
                      setFilters((prev) => ({
                        ...prev,
                        categories: prev.categories.includes(child.name)
                          ? prev.categories.filter((name) => name !== child.name)
                          : [...prev.categories, child.name],
                      }));
                    }}
                  >
                    <Text style={styles.filterOptionText}>{child.name}</Text>
                    {filters.categories.includes(child.name) && (
                      <MaterialCommunityIcons name="check" size={20} color="#61d5b6" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Tags</Text>
              <View style={styles.tagChips}>
                {Array.from(new Set(products.flatMap((p) => p.tags || [])))
                  .slice(0, 12)
                  .map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.tagChip,
                        filters.tags.includes(tag) && styles.tagChipSelected,
                      ]}
                      onPress={() => {
                        setFilters((prev) => ({
                          ...prev,
                          tags: prev.tags.includes(tag)
                            ? prev.tags.filter((t) => t !== tag)
                            : [...prev.tags, tag],
                        }));
                      }}
                    >
                      <Text
                        style={[
                          styles.tagChipText,
                          filters.tags.includes(tag) && styles.tagChipTextSelected,
                        ]}
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </View>

            {attributes.length > 0 && (
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Attributes</Text>
                {attributes.map((attr: any) => {
                  const selectedTerms = filters.attributes[attr.id] || [];
                  return (
                    <TouchableOpacity
                      key={attr.id}
                      style={styles.filterOption}
                      onPress={() =>
                        setShowAttributeModal({
                          attr,
                          open: true,
                        })
                      }
                    >
                      <View>
                        <Text style={styles.filterOptionText}>{attr.name}</Text>
                        {selectedTerms.length > 0 && (
                          <Text style={styles.filterOptionSubtext}>
                            {selectedTerms.length} selected
                          </Text>
                        )}
                      </View>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={20}
                        color="#9CA3AF"
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
              <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showAttributeModal?.open || false}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAttributeModal(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {activeAttribute?.name || 'Attribute'}
            </Text>
            <TouchableOpacity onPress={() => setShowAttributeModal(null)}>
              <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {activeAttribute?.terms?.map((term: any) => {
              const attrId = activeAttribute?.id;
              if (!attrId) {
                return null;
              }
              const isSelected = filters.attributes[attrId]?.includes(term.id) || false;

              return (
                <TouchableOpacity
                  key={term.id}
                  style={styles.attributeTermRow}
                  onPress={() => {
                    setFilters((prev) => {
                      const existing = prev.attributes[attrId] || [];
                      const updated = existing.includes(term.id)
                        ? existing.filter((id: string) => id !== term.id)
                        : [...existing, term.id];
                      return {
                        ...prev,
                        attributes: {
                          ...prev.attributes,
                          [attrId]: updated,
                        },
                      };
                    });
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
              <Text style={styles.applyButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F4F7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  errorMessage: {
    marginTop: 8,
    textAlign: 'center',
    color: '#6B7280',
  },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#61d5b6',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#61d5b6',
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSearch: {
    flex: 1,
  },
  headerSearchBar: {
    shadowOpacity: 0.12,
  },
  breadcrumbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 4,
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbText: {
    fontSize: 13,
    color: '#6B7280',
  },
  breadcrumbTextActive: {
    color: '#111827',
    fontWeight: '600',
  },
  breadcrumbSeparator: {
    marginHorizontal: 4,
  },
  titleContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  categoryTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  categorySubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#61d5b6',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  controlChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  controlChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475467',
  },
  controlChipIconOnly: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  productImageWrapper: {
    position: 'relative',
    width: '100%',
    height: 150,
    backgroundColor: '#F8FAFC',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#F43F5E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#1F2937aa',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  productMeta: {
    fontSize: 12,
    color: '#EF4444',
  },
  productAction: {
    marginTop: 4,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#F0FDFA',
  },
  productActionText: {
    color: '#61d5b6',
    fontSize: 13,
    fontWeight: '600',
  },
  loadingProducts: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingProductsText: {
    marginTop: 8,
    color: '#6B7280',
  },
  emptyProducts: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyProductsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  emptyProductsMessage: {
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  subcategorySection: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  subcategoryList: {
    gap: 0,
  },
  subcategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  subcategoryText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  emptySubcategoriesText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#61d5b6',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterSection: {
    marginTop: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
  },
  priceInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  priceInput: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    padding: 12,
  },
  priceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  filterOptionText: {
    fontSize: 15,
    color: '#111827',
  },
  filterOptionSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  tagChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#F0FDFA',
  },
  tagChipSelected: {
    backgroundColor: '#61d5b6',
  },
  tagChipText: {
    fontSize: 13,
    color: '#61d5b6',
    fontWeight: '500',
  },
  tagChipTextSelected: {
    color: '#FFFFFF',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: '#61d5b6',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  sortOptionText: {
    fontSize: 15,
    color: '#111827',
  },
  attributeTermRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  attributeTermRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attributeTermRowText: {
    fontSize: 15,
    color: '#111827',
  },
});
