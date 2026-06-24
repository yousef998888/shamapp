import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ProductCard } from '../components/Products/ProductCard';
import { Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product } from '@/types/database';
import { Category } from '@/types/database';
import CategoryService from '../services/CategoryService';
import { Popover, PopoverTrigger, PopoverContent } from '../components/shadcn/popover';
import { Button } from '../components/shadcn/button';
import { Badge } from '../components/shadcn/badge';
import { X } from 'lucide-react';
import { getCategoryName, getLocalizedDescription, getAttributeName, getAttributeTermName } from '@/utils/DisplayAtteibuteSupportedLanguage';
import { useDebounce } from '../hooks/useDebounce';

export function CategoryPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');
  const [allCategories, setAllCategories] = useState<{ id: string; parent_id: string | null }[]>([]);
  const [attributes, setAttributes] = useState<any[]>([]); // attributes with terms
  const [selectedFilters, setSelectedFilters] = useState<Record<string, Set<string>>>({}); // attrId -> Set<termId>
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });

  // Debounced filter values to reduce excessive API calls
  const debouncedSelectedFilters = useDebounce(selectedFilters, 800);
  const debouncedLocationFilter = useDebounce(locationFilter, 800);
  const debouncedPriceFilter = useDebounce(priceFilter, 800);

  useEffect(() => {
    if (slug) {
      fetchCategoryAndProducts();
    }
  }, [slug, sortBy, debouncedSelectedFilters, debouncedLocationFilter, debouncedPriceFilter]);

  const fetchCategoryAndProducts = async () => {
    setLoading(true);
    try {
      // Fetch category
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .single();

      if (categoryError) {
        console.error('Error fetching category:', categoryError);
        return;
      }

      setCategory(categoryData);

      // Fetch all categories to find descendants
      const { data: allCats, error: allCatError } = await supabase
        .from('categories')
        .select('id, parent_id');
      if (allCatError) {
        console.error('Error fetching all categories:', allCatError);
        return;
      }
      setAllCategories(allCats || []);

      // Find all descendant category ids (including self)
      function getDescendantIds(catId: string, cats: { id: string; parent_id: string | null }[]): string[] {
        const children = cats.filter(c => c.parent_id === catId);
        return [catId, ...children.flatMap(child => getDescendantIds(child.id, cats))];
      }
      const categoryIds = getDescendantIds(categoryData.id, allCats || []);

      // Fetch attributes and terms for filters
      const attrs = await CategoryService.fetchAttributesAndTermsForCategories(categoryIds);
      setAttributes(attrs);

      // Fetch products in all descendant categories
      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          seller:user_profiles(*),
          images:product_images(*),
          attribute_relationships:product_attribute_relationships(*,attribute:product_attributes(*),term:product_attribute_terms(*))
        `)
        .in('category_id', categoryIds)
        .eq('status', 'active');

      // Apply sorting (date listed)
      switch (sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'price_low':
          query = query.order('price', { ascending: true });
          break;
        case 'price_high':
          query = query.order('price', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data: productsData, error: productsError } = await query;

      if (productsError) {
        console.error('Error fetching products:', productsError);
        return;
      }

      let filteredProducts = productsData || [];
      // Location filter
      if (debouncedLocationFilter) {
        filteredProducts = filteredProducts.filter((product: any) => product.location === debouncedLocationFilter);
      }
      // Price filter
      if (debouncedPriceFilter.min !== null) {
        filteredProducts = filteredProducts.filter((product: any) => product.price >= debouncedPriceFilter.min!);
      }
      if (debouncedPriceFilter.max !== null) {
        filteredProducts = filteredProducts.filter((product: any) => product.price <= debouncedPriceFilter.max!);
      }
      // Attribute filters
      const filterTermIds = Object.values(debouncedSelectedFilters).flatMap(set => Array.from(set));
      if (filterTermIds.length > 0) {
        filteredProducts = filteredProducts.filter((product: any) => {
          const productTermIds = (product.attribute_relationships || []).map((rel: any) => rel.term_id);
          return filterTermIds.every(termId => productTermIds.includes(termId));
        });
      }
      setProducts(filteredProducts);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm animate-pulse">
              <div className="aspect-square bg-gray-200 rounded-t-lg"></div>
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900">{t('errors.pageNotFound')}</h1>
        <p className="text-gray-600 mt-2">{t('errors.somethingWentWrong')}</p>
      </div>
    );
  }

  // For location filter dropdown, get unique locations from products
  const uniqueLocations = Array.from(new Set(products.map(p => p.location).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{getCategoryName(category)}</h1>
          <p className="text-gray-600 mt-1">{getLocalizedDescription(category)}</p>
          <p className="text-sm text-gray-500 mt-2">
            {products.length} {products.length === 1 ? t('search.results').slice(0, -1) : t('search.results')} {t('search.results')}
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="newest">{t('category.sortOptions.newest')}</option>
              <option value="oldest">{t('category.sortOptions.oldest')}</option>
              <option value="price_low">{t('category.sortOptions.priceLow')}</option>
              <option value="price_high">{t('category.sortOptions.priceHigh')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-nowrap gap-2 overflow-x-auto pb-2 mb-4">
        {/* Category filter pill (remove resets to current category) */}
        <Badge variant="outline" className="flex items-center gap-1 cursor-pointer" onClick={() => { setSelectedFilters({}); setLocationFilter(null); setPriceFilter({ min: null, max: null }); }}>
          Category <X className="w-3 h-3 ml-1 cursor-pointer" />
        </Badge>
        {/* Location filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="rounded-full">Location</Button>
          </PopoverTrigger>
          <PopoverContent>
            <div className="flex flex-col gap-1">
              {uniqueLocations.map(loc => (
                <label key={loc || ''} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={locationFilter === loc}
                    onChange={() => setLocationFilter(loc ?? null)}
                  />
                  <span>{loc}</span>
                </label>
              ))}
              {locationFilter && (
                <Button variant="ghost" size="sm" onClick={() => setLocationFilter(null)}>Clear</Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
        {/* Price filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="rounded-full">Price</Button>
          </PopoverTrigger>
          <PopoverContent>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span>Min</span>
                <input
                  type="number"
                  className="border rounded px-2 py-1 w-20"
                  value={priceFilter.min ?? ''}
                  onChange={e => setPriceFilter(p => ({ ...p, min: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="0"
                />
                <span>Max</span>
                <input
                  type="number"
                  className="border rounded px-2 py-1 w-20"
                  value={priceFilter.max ?? ''}
                  onChange={e => setPriceFilter(p => ({ ...p, max: e.target.value ? Number(e.target.value) : null }))}
                  placeholder=""
                />
              </div>
              {(priceFilter.min !== null || priceFilter.max !== null) && (
                <Button variant="ghost" size="sm" onClick={() => setPriceFilter({ min: null, max: null })}>Clear</Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
        {/* Date listed filter (sort) */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="rounded-full">Date listed</Button>
          </PopoverTrigger>
          <PopoverContent>
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={sortBy === 'newest'} onChange={() => setSortBy('newest')} /> Newest
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={sortBy === 'oldest'} onChange={() => setSortBy('oldest')} /> Oldest
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={sortBy === 'price_low'} onChange={() => setSortBy('price_low')} /> Price Low
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={sortBy === 'price_high'} onChange={() => setSortBy('price_high')} /> Price High
              </label>
            </div>
          </PopoverContent>
        </Popover>
        {/* Attribute filters as dropdowns */}
        {attributes.map(attr => (
          <Popover key={attr.id}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="rounded-full min-w-[100px] flex items-center justify-between">
                {getAttributeName(attr)}
                <span className="ml-2">▼</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-56">
              <div className="p-2">
                {attr.terms.map((term: any) => (
                  <label key={term.id} className="flex items-center gap-2 cursor-pointer py-1 px-2 rounded hover:bg-accent">
                    <input
                      type="checkbox"
                      checked={!!selectedFilters[attr.id]?.has(term.id)}
                      onChange={e => {
                        setSelectedFilters(prev => {
                          const set = new Set(prev[attr.id] || []);
                          if (e.target.checked) set.add(term.id); else set.delete(term.id);
                          return { ...prev, [attr.id]: set };
                        });
                      }}
                    />
                    <span>{getAttributeTermName(term)}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        ))}
      </div>
      {/* Selected Filters as Pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(selectedFilters).flatMap(([attrId, termSet]) =>
          Array.from(termSet).map(termId => {
            const attr = attributes.find(a => a.id === attrId);
            const term = attr?.terms.find((t: any) => t.id === termId);
            if (!attr || !term) return null;
            return (
              <Badge key={attrId + '-' + termId} variant="secondary" className="flex items-center gap-1">
                {getAttributeName(attr)}: {getAttributeTermName(term)}
                <button
                  className="ml-1"
                  onClick={() => {
                    setSelectedFilters(prev => {
                      const set = new Set(prev[attrId] || []);
                      set.delete(termId);
                      return { ...prev, [attrId]: set };
                    });
                  }}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })
        )}
      </div>

      {/* Products Grid */}
      {products.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('search.noResults')}</h2>
          <p className="text-gray-600">{t('search.tryDifferentKeywords')}</p>
        </div>
      )}
    </div>
  );
}