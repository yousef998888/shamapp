import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useDirection } from '../hooks/useDirection';
import { 
  Heart, 
  Share2, 
  MapPin, 
  Clock, 
  User, 
  Shield, 
  ChevronLeft, 
  ChevronRight,
  Star
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product } from '@/types/database';
import { OrderService } from '../services/OrderService';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Badge } from '@/components/shadcn/badge';
// import { Separator } from '@/components/shadcn/separator';
import { Skeleton } from '@/components/shadcn/skeleton';
import { formatAttributeValuePair, getCategoryName, getProductTitle, getLocalizedDescription } from '../utils/DisplayAtteibuteSupportedLanguage';

export function ProductPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isRTL } = useDirection();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isOrdering, setIsOrdering] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProduct();
      incrementViewCount();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          seller:users!products_seller_id_fkey(*),
          images:product_images(*),
          attribute_relationships:product_attribute_relationships(
            attribute:product_attributes(*),
            term:product_attribute_terms(*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        return;
      }

      setProduct(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const incrementViewCount = async () => {
    if (!id) return;
    // Note: increment_view_count function doesn't exist in the database
    // We'll need to implement this functionality later
    console.log('View count increment not implemented yet');
  };

  const handlePurchase = async () => {
    if (!user) {
      toast.error(t('auth.login.title'));
      navigate('/login');
      return;
    }

    if (!product) return;

    if (user.id === product.seller_id) {
      toast.error(t('errors.somethingWentWrong'));
      return;
    }

    setIsOrdering(true);
    try {
      // Get delivery methods to find the default one
      const deliveryMethods = await OrderService.getDeliveryMethods();
      const defaultDeliveryMethod = deliveryMethods.find((method: any) => method.name === 'pickup_point');
      
      if (!defaultDeliveryMethod) {
        toast.error('No delivery method available');
        return;
      }

      // Create order using the new OrderService
      const order = await OrderService.createOrder({
        buyer_id: user.id,
        seller_id: product.seller_id,
        product_id: product.id,
        quantity: 1,
        unit_price: product.price,
        total_amount: product.price,
        shipping_fee: defaultDeliveryMethod.base_price,
        grand_total: product.price + defaultDeliveryMethod.base_price,
        currency: product.currency,
        delivery_method_id: defaultDeliveryMethod.id,
        delivery_type: 'pickup_point',
      });

      if (order) {
        toast.success('Order created successfully!');
        navigate(`/dashboard/chats/${order.id}`);
      } else {
        toast.error('Failed to create order');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(t('errors.somethingWentWrong'));
    } finally {
      setIsOrdering(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const nextImage = () => {
    if (product?.images && product.images.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === product.images!.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (product?.images && product.images.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? product.images!.length - 1 : prev - 1
      );
    }
  };

  if (loading) {
    return (
      <div className={`max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 ${
        isRTL ? 'rtl' : 'ltr'
      }`}>
        <div className="space-y-4">
          <Skeleton className="aspect-square rounded-lg" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="w-20 h-20 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-12 w-1/3" />
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto text-center py-12">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">{t('errors.pageNotFound')}</h1>
            <p className="text-muted-foreground">{t('errors.somethingWentWrong')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentImage = product.images?.[currentImageIndex];

  return (
    <div className={`max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 ${
      isRTL ? 'rtl' : 'ltr'
    }`}>
      {/* Images */}
      <div className="space-y-4">
        <Card className="aspect-square overflow-hidden relative">
          <CardContent className="p-0 h-full">
            {currentImage ? (
              <img
                src={currentImage.image_url}
                alt={currentImage.alt_text || product.title}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                {t('product.noImageAvailable')}
              </div>
            )}

            {product.images && product.images.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={isRTL ? nextImage : prevImage}
                  className={`absolute top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white shadow-md ${
                    isRTL ? 'right-4' : 'left-4'
                  }`}
                >
                  {isRTL ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={isRTL ? prevImage : nextImage}
                  className={`absolute top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white shadow-md ${
                    isRTL ? 'left-4' : 'right-4'
                  }`}
                >
                  {isRTL ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </Button>
              </>
            )}

            {product.condition === 'new' && (
              <Badge className={`absolute top-4 bg-green-600 hover:bg-green-700 ${
                isRTL ? 'right-4' : 'left-4'
              }`}>
                {t('product.conditions.new')}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Thumbnails */}
        {product.images && product.images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {product.images.map((image, index) => (
              <Button
                key={image.id}
                variant="outline"
                size="icon"
                onClick={() => setCurrentImageIndex(index)}
                className={` w-24 h-24 p-1 overflow-hidden ${
                  index === currentImageIndex ? 'border-2 border-primary' : ''
                }`}
              >
                <img
                  src={image.image_url}
                  alt={image.alt_text || `${product.title} ${index + 1}`}
                  className="w-full rounded-sm h-full object-cover"
                />
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{getProductTitle(product)}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center">
              <Clock className="h-4 w-4 ms-1" />
              {t('product.listed')} {formatDate(product.created_at)}
            </span>
            <span>{product.view_count} {t('product.views')}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-3xl font-bold text-foreground">
              {formatPrice(product.price, product.currency)}
            </span>
            {product.is_negotiable && (
              <Badge variant="secondary" className="ml-2">
                {t('product.negotiable')}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon">
              <Heart className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Purchase Button */}
        {product.status === 'active' && (
          <div className="space-y-3">
            <Button
              onClick={() => navigate(`/checkout/${product.id}`)}
              disabled={user?.id === product.seller_id}
              className="w-full"
              size="lg"
            >
              {user?.id === product.seller_id ? t('product.yourListing') : 'Buy Now'}
            </Button>
            
            <Button
              onClick={() => navigate(`/checkout/${product.id}`)}
              disabled={user?.id === product.seller_id}
              variant="outline"
              className="w-full"
              size="lg"
            >
              {user?.id === product.seller_id ? t('product.yourListing') : t('product.contactSeller')}
            </Button>
          </div>
        )}

        {/* Product Info */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">{t('product.condition')}</span>
                <p className="font-medium capitalize">{product.condition}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">{t('category.allCategories')}</span>
                <p className="font-medium">{getCategoryName(product.category)}</p>
              </div>
              {product.location && (
                <div className="col-span-2">
                  <span className="text-sm text-muted-foreground flex items-center">
                    <MapPin className="h-4 w-4 ms-1" />
                    {t('product.location')}
                  </span>
                  <p className="font-medium">{product.location}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Additional Attributes */}
        {product.attribute_relationships && product.attribute_relationships.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('product.productDetails')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2">
                {product.attribute_relationships.map((rel) => (
                  <div key={rel.id} className="flex justify-between">
                    <span className="text-muted-foreground">
                      {formatAttributeValuePair(rel.attribute, rel.term)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('product.description')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{getLocalizedDescription(product)}</p>
          </CardContent>
        </Card>

        {/* Seller Info */}
        {product.seller && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{t('product.sellerInfo')}</CardTitle>
                {product.seller.is_verified && (
                  <Badge variant="secondary" className="flex items-center">
                    <Shield className="h-4 w-4 ms-1" />
                    {t('product.verified')}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {product.seller.full_name || product.seller.username || t('common.anonymous')}
                  </p>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Star className="h-4 w-4 ms-1 text-yellow-400" />
                    <span>{product.seller.rating.toFixed(1)} {t('product.rating')}</span>
                    <span className="mx-2">•</span>
                    <span>{product.seller.total_sales} {t('product.sales')}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('product.memberSince')} {formatDate(product.seller.member_since)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}