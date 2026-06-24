import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, MapPin, Clock } from 'lucide-react';
import { Product } from '@/types/database';
import { useIsFavorite } from '@/hooks/useFavorites';
import { useFavorites } from '@/hooks/useFavorites';
import { getAttributeName, getAttributeTermName, getProductTitle } from '@/utils/DisplayAtteibuteSupportedLanguage';
interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { t } = useTranslation();
  const { isFavorited } = useIsFavorite(product.id);
  const { toggleFavorite, isAddingToFavorites, isRemovingFromFavorites } = useFavorites();
  
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const primaryImage = product.images?.find(img => img.is_primary) || product.images?.[0];
  const isSold = product.status === 'sold';

  return (
    <div className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden group ${isSold ? 'opacity-60' : ''}`}>
      <Link to={`/product/${product.id}`}>
        <div className="aspect-square bg-gray-200 relative overflow-hidden">
          {primaryImage ? (
            <img
              src={primaryImage.image_url}
              alt={primaryImage.alt_text || product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              {t('search.noResults')}
            </div>
          )}
          
          <button 
            className="absolute bottom-3 end-3 p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(product.id, isFavorited);
            }}
            disabled={isAddingToFavorites || isRemovingFromFavorites}
          >
            <Heart 
              className={`h-4 w-4 transition-colors ${
                isFavorited 
                  ? 'text-red-500 fill-red-500' 
                  : 'text-gray-600 hover:text-red-500'
              }`} 
            />
          </button>

          {!isSold && product.condition === 'new' && (
            <span className="absolute top-3 end-3 bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
              {t('product.conditions.new')}
            </span>
          )}

          {isSold && (
            <span className="absolute top-3 end-3 bg-gray-800/80 text-white px-2 py-1 rounded text-xs font-medium">
              {t('selling.status.sold')}
            </span>
          )}
        </div>
      </Link>

      <div className="p-4">
        <Link to={`/product/${product.id}`}>
          <h3 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2 mb-2">
            {getProductTitle(product)}
          </h3>
        </Link>

        {/* Product Attributes */}
        {product.attribute_relationships && product.attribute_relationships.length > 0 && (
          <div className="mb-2 text-sm text-gray-700">
            {Object.entries(
              product.attribute_relationships.reduce((acc, rel) => {
                if (rel.attribute && rel.term) {
                  const attributeName = getAttributeName(rel.attribute);
                  if (!acc[attributeName]) acc[attributeName] = [];
                  acc[attributeName].push(getAttributeTermName(rel.term));
                }
                return acc;
              }, {} as Record<string, string[]>)
            ).map(([attrName, termNames]) => (
              <div key={attrName} className="flex flex-row flex-wrap gap-1">
                <span className="font-medium me-1">{attrName}:</span>
                <span>{termNames.join(', ')}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <span className="text-xl font-bold text-gray-900">
            {formatPrice(product.price, product.currency)}
          </span>
          {product.is_negotiable && (
            <span className="text-sm text-blue-600 font-medium">{t('product.price')}</span>
          )}
        </div>

        <div className="flex items-center text-sm text-gray-500 mb-2">
          {product.location && (
            <div className="flex items-center me-4">
              <MapPin className="h-4 w-4 me-1" />
              <span>{product.location}</span>
            </div>
          )}
          <div className="flex items-center">
            <Clock className="h-4 w-4 me-1" />
            <span>{formatDate(product.created_at)}</span>
          </div>
        </div>

        {product.seller && (
          <div className="flex items-center  text-sm text-gray-600">
            <div className="w-6 h-6 bg-gray-300 rounded-full me-2"></div>
            <span>{product.seller.full_name || product.seller.username || t('common.anonymous')}</span>
          </div>
        )}
      </div>
    </div>
  );
}