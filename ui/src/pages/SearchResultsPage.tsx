import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Search,
  Filter,
  Grid,
  List,
  Heart,
  MapPin,
  Clock,
  X,
} from "lucide-react";
import { Product, Category } from "@/types/database";
import SearchService, { SearchFilters } from "@/services/SearchService";
import { supabase } from "@/lib/supabase";
import { ProductCard } from "@/components/Products/ProductCard";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Badge } from "@/components/shadcn/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";
import { Card, CardContent } from "@/components/shadcn/card";
import { Separator } from "@/components/shadcn/separator";
import { Skeleton } from "@/components/shadcn/skeleton";
import { getCategoryName } from "@/utils/DisplayAtteibuteSupportedLanguage";

export function SearchResultsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);

  const query = searchParams.get("q") || "";

  // Initialize filters from URL params
  useEffect(() => {
    const newFilters: SearchFilters = {};
    const category = searchParams.get("category");
    const condition = searchParams.get("condition");
    const priceMin = searchParams.get("priceMin");
    const priceMax = searchParams.get("priceMax");
    const location = searchParams.get("location");
    const sortBy = searchParams.get("sortBy");

    if (category && category !== "all") newFilters.category = category;
    if (condition && condition !== "all") newFilters.condition = condition;
    if (priceMin) newFilters.priceMin = Number(priceMin);
    if (priceMax) newFilters.priceMax = Number(priceMax);
    if (location) newFilters.location = location;
    if (sortBy) newFilters.sortBy = sortBy;

    setFilters(newFilters);
  }, [searchParams]);

  // Fetch categories for filter
  useEffect(() => {
    const fetchCategories = async () => {
              const { data, error } = await supabase
          .from("categories")
          .select("*")
          .eq("is_active", true)
          .order("sort_order");

      if (!error && data) {
        setCategories(data);
      }
    };

    fetchCategories();
  }, []);

  // Search products
  useEffect(() => {
    const searchProducts = async () => {
      if (!query.trim()) {
        setProducts([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        console.log('Searching for:', query, 'with filters:', filters);
        
        // First try a debug search to see what's in the database
        const debugResults = await SearchService.debugSearch(query);
        console.log('Debug search results:', debugResults);
        
        const { products: searchResults, totalCount: count } =
          await SearchService.searchProductsWithPgroonga(query, filters, 50);
        
        console.log('Search results:', searchResults, 'count:', count);
        
        setProducts(searchResults);
        setTotalCount(count);
      } catch (error) {
        console.error("Search error:", error);
        setProducts([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    };

    searchProducts();
  }, [query, filters]);

  const handleFilterChange = (
    key: keyof SearchFilters,
    value: string | number | undefined
  ) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    // Update URL params
    const newSearchParams = new URLSearchParams(searchParams);
    if (value !== undefined && value !== "" && value !== "all") {
      newSearchParams.set(key, value.toString());
    } else {
      newSearchParams.delete(key);
    }
    setSearchParams(newSearchParams);
  };

  const clearFilters = () => {
    setFilters({});
    const newSearchParams = new URLSearchParams();
    newSearchParams.set("q", query);
    setSearchParams(newSearchParams);
  };

  const handleCategoryClick = (categoryId: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("category", categoryId);
    setSearchParams(newSearchParams);
  };

  const clearCategoryFilter = () => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete("category");
    setSearchParams(newSearchParams);
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== undefined && value !== ""
  );

  // Group categories into columns for display with children
  const groupCategoriesIntoColumns = (categories: Category[], columns: number = 3) => {
    const parentCategories = categories.filter(cat => !cat.parent_id);
    const itemsPerColumn = Math.ceil(parentCategories.length / columns);
    const columnGroups: { parent: Category; children: Category[] }[][] = [];
    
    for (let i = 0; i < columns; i++) {
      const startIndex = i * itemsPerColumn;
      const endIndex = startIndex + itemsPerColumn;
      const columnParents = parentCategories.slice(startIndex, endIndex);
      
      const columnWithChildren = columnParents.map(parent => ({
        parent,
        children: categories.filter(cat => cat.parent_id === parent.id)
      }));
      
      columnGroups.push(columnWithChildren);
    }
    
    return columnGroups;
  };

  const categoryColumns = groupCategoriesIntoColumns(categories);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Search Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t("search.resultsFor")} "{query}"
            </h1>
            <p className="text-gray-600 mt-1">
              {loading
                ? t("search.loading")
                : `${totalCount} ${t("search.results")}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              {t("search.filters")}
            </Button>

            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-e-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-s-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Category Links - Column Layout */}
      {categories.length > 0 && (
        <div className="mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 text-lg">
                  {t("search.browseByCategory")}
                </h3>
                {filters.category && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearCategoryFilter}
                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <X className="h-3 w-3" />
                    {t("search.clearCategory")}
                  </Button>
                )}
              </div>
              
              {/* All Categories Button */}
              <div className="mb-4">
                <button
                  onClick={clearCategoryFilter}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    !filters.category
                      ? "bg-blue-100 text-blue-800 border border-blue-200"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                  }`}
                >
                  {t("search.allCategories")}
                </button>
              </div>

                             {/* Categories in Columns */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {categoryColumns.map((columnCategories, columnIndex) => (
                   <div key={columnIndex} className="space-y-3">
                     {columnCategories.map((categoryGroup) => (
                       <div key={categoryGroup.parent.id} className="space-y-1">
                         {/* Parent Category */}
                         <button
                           onClick={() => handleCategoryClick(categoryGroup.parent.id)}
                           className={`block w-full text-left px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
                             filters.category === categoryGroup.parent.id
                               ? "bg-blue-50 text-blue-700 border border-blue-200"
                               : "text-gray-900 hover:bg-gray-50 hover:text-gray-900"
                           }`}
                         >
                           {getCategoryName(categoryGroup.parent)}
                         </button>
                         
                         {/* Child Categories */}
                         {categoryGroup.children.length > 0 && (
                           <div className="ml-4 space-y-1">
                             {categoryGroup.children.map((childCategory) => (
                               <button
                                 key={childCategory.id}
                                 onClick={() => handleCategoryClick(childCategory.id)}
                                 className={`block w-full text-left px-2 py-1 rounded text-xs font-medium transition-colors ${
                                   filters.category === childCategory.id
                                     ? "bg-blue-50 text-blue-600 border border-blue-200"
                                     : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                                 }`}
                               >
                                 {getCategoryName(childCategory)}
                               </button>
                             ))}
                           </div>
                         )}
                       </div>
                     ))}
                   </div>
                 ))}
               </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mb-6">
        {/* Filters bar */}
        {showFilters && (
          <div className="">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4">
                  {t("search.filters")}
                </h3>

                <div className="flex  gap-4">
                  {/* Category Filter */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      {t("search.category")}
                    </label>
                    <Select
                      value={filters.category || "all"}
                      onValueChange={(value) =>
                        handleFilterChange(
                          "category",
                          value === "all" ? undefined : value
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("search.allCategories")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          {t("search.allCategories")}
                        </SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {getCategoryName(category)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Condition Filter */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      {t("search.condition")}
                    </label>
                    <Select
                      value={filters.condition || "all"}
                      onValueChange={(value) =>
                        handleFilterChange(
                          "condition",
                          value === "all" ? undefined : value
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("search.allConditions")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          {t("search.allConditions")}
                        </SelectItem>
                        <SelectItem value="new">
                          {t("product.conditions.new")}
                        </SelectItem>
                        <SelectItem value="used">
                          {t("product.conditions.used")}
                        </SelectItem>
                        <SelectItem value="refurbished">
                          {t("product.conditions.refurbished")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Price Range */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      {t("search.priceRange")}
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder={t("search.min")}
                        value={filters.priceMin || ""}
                        onChange={(e) =>
                          handleFilterChange(
                            "priceMin",
                            e.target.value ? Number(e.target.value) : undefined
                          )
                        }
                        className="text-sm"
                      />
                      <Input
                        type="number"
                        placeholder={t("search.max")}
                        value={filters.priceMax || ""}
                        onChange={(e) =>
                          handleFilterChange(
                            "priceMax",
                            e.target.value ? Number(e.target.value) : undefined
                          )
                        }
                        className="text-sm"
                      />
                    </div>
                  </div>
                  {/* Location */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      {t("search.location")}
                    </label>
                    <Input
                      placeholder={t("search.enterLocation")}
                      value={filters.location || ""}
                      onChange={(e) =>
                        handleFilterChange(
                          "location",
                          e.target.value || undefined
                        )
                      }
                      className="text-sm"
                    />
                  </div>
                  {/* Sort By */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      {t("search.sortBy")}
                    </label>
                    <Select
                      value={filters.sortBy || "newest"}
                      onValueChange={(value) =>
                        handleFilterChange("sortBy", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">
                          {t("search.newest")}
                        </SelectItem>
                        <SelectItem value="oldest">
                          {t("search.oldest")}
                        </SelectItem>
                        <SelectItem value="price_low">
                          {t("search.priceLowToHigh")}
                        </SelectItem>
                        <SelectItem value="price_high">
                          {t("search.priceHighToLow")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <div className="flex gap-6">
        {/* Results */}
        <div className="flex-1">
          {loading ? (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  : "space-y-4"
              }
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg shadow-sm overflow-hidden"
                >
                  <Skeleton className="aspect-square w-full" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-6 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  : "space-y-4"
              }
            >
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t("search.noResultsFound")}
              </h3>
              <p className="text-gray-600 mb-4">
                {t("search.tryDifferentKeywords")}
              </p>
              <Button onClick={() => navigate("/")}>
                {t("search.browseAll")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
