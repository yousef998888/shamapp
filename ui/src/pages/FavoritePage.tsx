import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { 
  Heart, 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Trash2, 
  Eye,
  MapPin,
  Clock,
  Star,
  ShoppingCart,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { ProductCard } from '../components/Products/ProductCard';
import { Product } from '../types/database';
import { Button } from '../components/shadcn/button';
import { Input } from '../components/shadcn/input';
import { Badge } from '../components/shadcn/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/shadcn/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/shadcn/select';
import { Alert, AlertDescription } from '../components/shadcn/alert';
import { Skeleton } from '../components/shadcn/skeleton';
import { useFavorites } from '../hooks/useFavorites';
import { useAuthContext } from '../contexts/AuthContext';

export function FavoritePage() {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const { 
    favoriteProducts: favorites, 
    isFavoritesLoading: loading, 
    removeFromFavorites,
    favoritesCount,
    isRemovingFromFavorites
  } = useFavorites();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const filteredFavorites = favorites.filter(product =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedFavorites = [...filteredFavorites].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'priceLow':
        return a.price - b.price;
      case 'priceHigh':
        return b.price - a.price;
      case 'name':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  const handleRemoveFromFavorites = (productId: string) => {
    removeFromFavorites(productId);
  };

  const handleBulkRemove = () => {
    selectedItems.forEach(productId => {
      removeFromFavorites(productId);
    });
    setSelectedItems([]);
  };

  const handleSelectAll = () => {
    if (selectedItems.length === sortedFavorites.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(sortedFavorites.map(product => product.id));
    }
  };

  const handleSelectItem = (productId: string) => {
    setSelectedItems(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Show login prompt if user is not authenticated
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
          <Heart className="h-12 w-12 text-blue-500" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('auth.loginRequired', 'Please log in to view your favorites')}
          </h2>
          <p className="text-gray-600 max-w-md">
            {t('favorites.loginDescription', 'Sign in to your account to save and manage your favorite products.')}
          </p>
        </div>
        <div className="flex gap-4">
          <Button asChild>
            <Link to="/login">
              {t('auth.login.title', 'Login')}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/signup">
              {t('auth.register.title', 'Sign Up')}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="space-y-4">
              <Skeleton className="h-48 w-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-6 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
          <Heart className="h-12 w-12 text-blue-500" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('favorites.empty.title', 'Your favorites list is empty')}
          </h2>
          <p className="text-gray-600 max-w-md">
            {t('favorites.empty.description', 'Start adding products to your favorites to keep track of items you love.')}
          </p>
        </div>
        <div className="flex gap-4">
          <Button asChild>
            <Link to="/">
              {t('favorites.empty.browseProducts', 'Browse Products')}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/categories">
              {t('favorites.empty.exploreCategories', 'Explore Categories')}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Heart   className="h-8 w-8 text-blue-500" />
            {t('favorites.title', 'My Favorites')}
          </h1>
          <p className="text-gray-600">
            {t('favorites.subtitle', 'Manage your saved products and keep track of items you love')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {favoritesCount} {t('favorites.items', 'items')}
          </Badge>
          {selectedItems.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkRemove}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {t('favorites.removeSelected', 'Remove Selected')}
            </Button>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('favorites.searchPlaceholder', 'Search your favorites...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={t('favorites.sortBy', 'Sort by')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t('favorites.sort.newest', 'Newest First')}</SelectItem>
                  <SelectItem value="oldest">{t('favorites.sort.oldest', 'Oldest First')}</SelectItem>
                  <SelectItem value="priceLow">{t('favorites.sort.priceLow', 'Price: Low to High')}</SelectItem>
                  <SelectItem value="priceHigh">{t('favorites.sort.priceHigh', 'Price: High to Low')}</SelectItem>
                  <SelectItem value="name">{t('favorites.sort.name', 'Name A-Z')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Results */}
      {filteredFavorites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('favorites.noResults.title', 'No favorites found')}
            </h3>
            <p className="text-gray-600 text-center max-w-md">
              {t('favorites.noResults.description', 'Try adjusting your search terms or browse more products to add to your favorites.')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Bulk Actions */}
          {selectedItems.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {selectedItems.length} {t('favorites.selected', 'items selected')}
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleSelectAll}
                  className="ml-2 p-0 h-auto"
                >
                  {selectedItems.length === sortedFavorites.length 
                    ? t('favorites.deselectAll', 'Deselect All')
                    : t('favorites.selectAll', 'Select All')
                  }
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Products Grid/List */}
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            : "space-y-4"
          }>
            {sortedFavorites.map((product) => (
              <div key={product.id} className="relative">
                {viewMode === 'list' ? (
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <div className="relative">
                          {/* <input
                            type="checkbox"
                            checked={selectedItems.includes(product.id)}
                            onChange={() => handleSelectItem(product.id)}
                            className="absolute top-2 left-2 z-10"
                          /> */}
                          <div className="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden">
                            {product.images?.[0] && (
                              <img
                                src={product.images[0].image_url}
                                alt={product.images[0].alt_text || product.title}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                                <Link to={`/product/${product.id}`}>
                                  {product.title}
                                </Link>
                              </h3>
                              <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                                {product.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveFromFavorites(product.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              {product.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  <span>{product.location}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{new Date(product.created_at).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Eye className="h-4 w-4" />
                                <span>{product.view_count} views</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold text-gray-900">
                                ${product.price}
                              </div>
                              {product.is_negotiable && (
                                <Badge variant="secondary" className="text-xs">
                                  {t('product.negotiable', 'Negotiable')}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="relative">
                    {/* <input
                      type="checkbox"
                      checked={selectedItems.includes(product.id)}
                      onChange={() => handleSelectItem(product.id)}
                      className="absolute top-2 left-2 z-10"
                    /> */}
                    <ProductCard product={product} />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFromFavorites(product.id)}
                      className="absolute top-2 start-2 z-10 bg-white/80 hover:bg-white"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Button variant="outline" asChild>
                    <Link to="/">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {t('favorites.continueShopping', 'Continue Shopping')}
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/categories">
                      {t('favorites.browseCategories', 'Browse Categories')}
                    </Link>
                  </Button>
                </div>
                <div className="text-sm text-gray-600">
                  {t('favorites.totalItems', '{{count}} items in favorites', { count: favoritesCount })}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
