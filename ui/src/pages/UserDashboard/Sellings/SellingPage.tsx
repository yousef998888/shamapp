import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { UserDashboardLayout } from '@/components/UserDashboard/Layout';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Badge } from '@/components/shadcn/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/shadcn/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/shadcn/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/shadcn/dialog';
import { 
  Plus, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  Package, 
  Calendar,
  AlertCircle,
  MessageSquare,
  Truck,
  CheckCircle,
  Clock,
  ShoppingCart,
  Pause,
  CheckCircle2
} from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Product, Order } from '@/types/database';
import { OrderService } from '@/services/OrderService';
import ProductService from '@/services/ProductService';
import { createOrder, CreateOrderRequest } from '@/services/DeliveryService';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { getLocalizedDescription, getProductTitle } from '@/utils/DisplayAtteibuteSupportedLanguage';
import { useCityEstimation } from '@/hooks/useCityEstimation';
import { getCities } from '@/services/DeliveryService';
import { useQuery } from '@tanstack/react-query';

interface ProductWithStats extends Product {
  view_count: number;
  favorite_count?: number;
  primary_image?: string;
  orders?: Order[];
  active_order?: Order;
}

export default function SellingPage() {
  const { t } = useTranslation();
  const { user, profile } = useAuthContext();
  const navigate = useNavigate();
  const { city: estimatedCity, isLoading: isCityLoading, error: cityError } = useCityEstimation();
  
  // Fetch cities for destination city mapping
  const { data: citiesResponse } = useQuery({
    queryKey: ['shipping-cities'],
    queryFn: getCities,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // English city names mapping (copied from useCityEstimation hook)
  const CITY_NAME_MAPPING: Record<string, string> = {
    'Damascus': 'دمشق',
    'Aleppo': 'حلب',
    'Homs': 'حمص',
    'Hama': 'حماة',
    'Latakia': 'اللاذقية',
    'Tartus': 'طرطوس',
    'Deir ez-Zor': 'دير الزور',
    'Al-Hasakah': 'الحسكة',
    'Idlib': 'إدلب',
    'Daraa': 'درعا',
    'Raqqa': 'الرقة',
    'Quneitra': 'القنيطرة',
    'As-Suwayda': 'السويداء',
  };
  const [products, setProducts] = useState<ProductWithStats[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [dispatchDialogOpen, setDispatchDialogOpen] = useState<boolean>(false);
  const [orderToDispatch, setOrderToDispatch] = useState<Order | null>(null);
  const [creatingShippingOrder, setCreatingShippingOrder] = useState<boolean>(false);
  const [dispatching, setDispatching] = useState<boolean>(false);
  const [markSoldDialogOpen, setMarkSoldDialogOpen] = useState<boolean>(false);
  const [pauseDialogOpen, setPauseDialogOpen] = useState<boolean>(false);
  const [productToUpdate, setProductToUpdate] = useState<Product | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

  useEffect(() => {
    if (!user) return;
    fetchMyProducts();
  }, [user]);

  const fetchMyProducts = async () => {
    setLoading(true);
    try {
      // Fetch products with their orders
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          product_images(image_url, is_primary)
        `)
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error fetching products:', productsError);
        toast.error(t('selling.errors.loadFailed'));
        return;
      }

      // Fetch orders for these products
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          product:products(*),
          buyer:users!orders_buyer_id_fkey(*),
          delivery:order_deliveries(*)
        `)
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        toast.error(t('selling.errors.loadFailed'));
        return;
      }

      // Combine products with their orders
      const transformedProducts = (productsData || []).map(product => {
        const productOrders = (ordersData || []).filter(order => order.product_id === product.id);
        const activeOrder = productOrders.find(order => 
          ['pending_payment', 'payment_submitted', 'admin_approved', 'shipped'].includes(order.status)
        );

        return {
          ...product,
          primary_image: product.product_images?.find((img: any) => img.is_primary)?.image_url || 
                         product.product_images?.[0]?.image_url,
          orders: productOrders,
          active_order: activeOrder
        };
      });

      setProducts(transformedProducts);
    } catch (error) {
      console.error('Error:', error);
      toast.error(t('selling.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id);

      if (error) {
        throw error;
      }

      toast.success(t('selling.success.deleted'));
      setDeleteDialogOpen(false);
      setProductToDelete(null);
      fetchMyProducts(); // Refresh the list
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error(error.message || t('selling.errors.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  // Helper function to find city ID by name
  const findCityIdByName = (cityName: string): string | null => {
    if (!citiesResponse?.data) return null;
    
    // Try exact match first
    const exactMatch = citiesResponse.data.find(city => 
      city.name.toLowerCase() === cityName.toLowerCase()
    );
    if (exactMatch) return exactMatch.id.toString();
    
    // Try partial match
    const partialMatch = citiesResponse.data.find(city => 
      city.name.toLowerCase().includes(cityName.toLowerCase()) ||
      cityName.toLowerCase().includes(city.name.toLowerCase())
    );
    if (partialMatch) return partialMatch.id.toString();
    
    // Try English name mapping
    const englishName = Object.keys(CITY_NAME_MAPPING).find(
      key => CITY_NAME_MAPPING[key].toLowerCase() === cityName.toLowerCase()
    );
    if (englishName) {
      const mappedCity = citiesResponse.data.find(city => 
        city.name === CITY_NAME_MAPPING[englishName]
      );
      if (mappedCity) return mappedCity.id.toString();
    }
    
    return null;
  };

  // Helper function to create shipping order data
  const createShippingOrderData = (order: Order): CreateOrderRequest | null => {
    try {
      // Check if we have all required data
      if (!order.buyer || !order.product || !order.delivery) {
        console.error('Missing required order data for shipping API');
        return null;
      }

      // Use estimated city for source (seller location)
      let sourceCityId: string;
      if (!estimatedCity) {
        console.error('No estimated city available for shipping order');
        // Fallback to Damascus (code 14) if city estimation fails
        console.warn('Using fallback city: Damascus (code 14)');
        sourceCityId = '14';
      } else {
        sourceCityId = estimatedCity.id.toString();
      }

      console.log('sourceCityId', sourceCityId);

      // Determine destination city from delivery address
      let destinationCityId: string;
      if (order.delivery?.delivery_address?.city) {
        const cityId = findCityIdByName(order.delivery.delivery_address.city);
        if (cityId) {
          destinationCityId = cityId;
          console.log('Destination city found:', order.delivery.delivery_address.city, 'ID:', cityId);
        } else {
          console.warn('Destination city not found in API, using fallback: Aleppo (ID: 15)');
          destinationCityId = '15'; // Aleppo fallback
        }
      } else {
        console.warn('No delivery address city found, using fallback: Aleppo (ID: 15)');
        destinationCityId = '15'; // Aleppo fallback
      }

      console.log('destinationCityId', destinationCityId);

      // Get pickup date (tomorrow by default)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const pickupDate = tomorrow.toISOString().split('T')[0];

      return {
        source: sourceCityId,
        destination: destinationCityId,
        sender_name: profile?.full_name || profile?.username || user?.email || 'Seller',
        sender_phone: profile?.phone || '+963123456789', // Should be from seller profile
        sender_address: profile?.location || 'Seller Address', // Should be from seller profile
        receiver_name: order.buyer.full_name || order.buyer.username || 'Buyer',
        receiver_phone: order.buyer.phone || '+963987654321', // Should be from buyer profile
        receiver_address: order.delivery.delivery_address ? 
          `${order.delivery.delivery_address.street}, ${order.delivery.delivery_address.city}` : 
          'Buyer Address',
        products_count: order.quantity,
        weight_class: 'M', // Should be determined based on product weight/size
        pickup_date: pickupDate,
        products: [{
          name: order.product.title || 'Product',
          price: order.unit_price,
          quantity: order.quantity
        }]
      };
    } catch (error) {
      console.error('Error creating shipping order data:', error);
      return null;
    }
  };

  const handleMarkAsDispatched = async () => {
    if (!orderToDispatch) {
      toast.error('No order selected');
      return;
    }

    // Check if this is for pickup delivery (no shipping API needed)
    if (orderToDispatch.delivery?.delivery_type === 'pickup_point' || orderToDispatch.delivery?.delivery_type === 'seller_collection') {
      toast.error('This action is unavailable for pickup or in-person collection orders. Use "Mark as Sold" instead.');
      return;
    }

    setDispatching(true);
    setCreatingShippingOrder(true);
    
    try {
      const shippingOrderData = createShippingOrderData(orderToDispatch);
      
      if (!shippingOrderData) {
        throw new Error('Failed to prepare shipping order data');
      }

      toast('Creating shipping order...', { duration: 2000 });
      
      // Create order with shipping API
      const shippingResponse = await createOrder(shippingOrderData);

      console.log('shippingResponse', shippingResponse);
      
      if (!shippingResponse.success || !shippingResponse.data.order_code) {
        throw new Error(shippingResponse.message || 'Failed to create shipping order');
      }

      const externalTrackingNumber = shippingResponse.data.order_code;
      toast.success(`Shipping order created: ${externalTrackingNumber}`);
      
      // Update order_code in orders table
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({ 
          order_code: externalTrackingNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderToDispatch.id);

      if (orderUpdateError) {
        console.error('Error updating order code:', orderUpdateError);
        toast.error('Failed to update order code in database');
      }

      // Update tracking_number in order_deliveries table
      const { error: deliveryUpdateError } = await supabase
        .from('order_deliveries')
        .update({ 
          tracking_number: externalTrackingNumber,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', orderToDispatch.id);

      if (deliveryUpdateError) {
        console.error('Error updating delivery tracking number:', deliveryUpdateError);
        toast.error('Failed to update tracking number in database');
      }

      if (!orderUpdateError && !deliveryUpdateError) {
        toast.success('Order code successfully saved to database');
      }

      setCreatingShippingOrder(false);
      
      // Update internal order status to shipped
      await OrderService.updateOrderStatus(
        orderToDispatch.id, 
        'shipped', 
        user!.id, 
        'Item dispatched by seller',
        { 
          tracking_number: externalTrackingNumber,
          shipping_api_response: 'Created via shipping API'
        }
      );

      // // Update delivery status
      await OrderService.updateDeliveryStatus(
        orderToDispatch.id,
        'shipped',
        {
          trackingNumber: externalTrackingNumber,
        },
      );

      toast.success('Order marked as dispatched');
      setDispatchDialogOpen(false);
      setOrderToDispatch(null);
      await fetchMyProducts(); // Refresh data
    } catch (error: any) {
      console.error('Error marking as dispatched:', error);
      toast.error(error.message || 'Failed to mark as dispatched');
      setCreatingShippingOrder(false);
    } finally {
      setDispatching(false);
    }
  };

  const handleMarkAsSold = async (order: Order) => {
    try {
      // Update order status to completed
      await OrderService.updateOrderStatus(
        order.id, 
        'completed', 
        user!.id, 
        'Item collected by buyer'
      );

      toast.success('Order marked as sold');
      await fetchMyProducts(); // Refresh data
    } catch (error) {
      console.error('Error marking as sold:', error);
      toast.error('Failed to mark as sold');
    }
  };

  const handleMarkProductAsSold = async () => {
    if (!productToUpdate) return;
    
    setUpdatingStatus(true);
    try {
      await ProductService.updateProductStatus(productToUpdate.id, 'sold');
      toast.success('Product marked as sold');
      setMarkSoldDialogOpen(false);
      setProductToUpdate(null);
      await fetchMyProducts(); // Refresh data
    } catch (error: any) {
      console.error('Error marking product as sold:', error);
      toast.error(error.message || 'Failed to mark product as sold');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePauseProduct = async () => {
    if (!productToUpdate) return;
    
    setUpdatingStatus(true);
    try {
      await ProductService.updateProductStatus(productToUpdate.id, 'draft');
      toast.success('Product paused and moved to draft');
      setPauseDialogOpen(false);
      setProductToUpdate(null);
      await fetchMyProducts(); // Refresh data
    } catch (error: any) {
      console.error('Error pausing product:', error);
      toast.error(error.message || 'Failed to pause product');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default' as const, label: t('selling.status.active') },
      sold: { variant: 'secondary' as const, label: t('selling.status.sold') },
      inactive: { variant: 'destructive' as const, label: t('selling.status.inactive') },
      draft: { variant: 'outline' as const, label: t('selling.status.draft') },
      pending: { variant: 'outline' as const, label: t('selling.status.pending') }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return <Badge variant="destructive" className="text-xs">Waiting Payment</Badge>;
      case 'payment_submitted':
        return <Badge variant="secondary" className="text-xs">Payment Submitted</Badge>;
      case 'admin_approved':
        return <Badge variant="default" className="text-xs">Ready to Dispatch</Badge>;
      case 'shipped':
        return <Badge variant="default" className="text-xs">Dispatched</Badge>;
      case 'delivered':
        return <Badge variant="default" className="text-xs bg-green-600">Delivered</Badge>;
      case 'completed':
        return <Badge variant="default" className="text-xs bg-gray-600">Completed</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const getProductStatusBadge = (product: ProductWithStats) => {
    if (!product.active_order) {
      return getStatusBadge(product.status);
    }
    return getOrderStatusBadge(product.active_order.status);
  };

  const getConditionBadge = (condition: string) => {
    const conditionConfig = {
      new: { variant: 'default' as const, label: t('selling.condition.new') },
      used: { variant: 'secondary' as const, label: t('selling.condition.used') },
      refurbished: { variant: 'outline' as const, label: t('selling.condition.refurbished') }
    };
    
    const config = conditionConfig[condition as keyof typeof conditionConfig] || conditionConfig.used;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  const getAvailableActions = (product: ProductWithStats) => {
    const actions = [];

    // View product
    actions.push({
      label: 'View',
      icon: <Eye className="h-4 w-4" />,
      onClick: () => navigate(`/product/${product.id}`)
    });

    // Edit product
    actions.push({
      label: 'Edit',
      icon: <Edit className="h-4 w-4" />,
      onClick: () => navigate(`/dashboard/selling/edit/${product.id}`)
    });

    // Status-specific actions
    if (product.active_order) {
      // Chat with buyer (always available if there's an order)
      actions.push({
        label: 'Chat with Buyer',
        icon: <MessageSquare className="h-4 w-4" />,
        onClick: () => navigate(`/dashboard/chats/${product.active_order!.id}`)
      });

      // Status-specific actions
      switch (product.active_order.status) {
        case 'pending_payment':
          actions.push({
            label: 'Wait for Payment',
            icon: <Clock className="h-4 w-4" />,
            onClick: () => navigate(`/dashboard/chats/${product.active_order!.id}`)
          });
          break;
        
        case 'payment_submitted':
          actions.push({
            label: 'Review Payment',
            icon: <AlertCircle className="h-4 w-4" />,
            onClick: () => navigate(`/dashboard/chats/${product.active_order!.id}`)
          });
          break;
        
        case 'admin_approved':
          if (product.active_order.delivery?.delivery_type === 'pickup_point') {
            actions.push({
              label: 'Mark as Sold (Collection point)',
              icon: <CheckCircle className="h-4 w-4" />,
              onClick: () => {
                if (product.active_order) {
                  handleMarkAsSold(product.active_order);
                }
              }
            });
          } else if (product.active_order.delivery?.delivery_type === 'seller_collection') {
            actions.push({
              label: 'Arrange Collection',
              icon: <CheckCircle className="h-4 w-4" />,
              onClick: () => navigate(`/dashboard/chats/${product.active_order!.id}`)
            });
          } else {
            actions.push({
              label: 'Mark as Dispatched',
              icon: <Truck className="h-4 w-4" />,
              onClick: () => {
                if (product.active_order) {
                  setOrderToDispatch(product.active_order);
                  setDispatchDialogOpen(true);
                }
              }
            });
          }
          break;
        
        case 'shipped':
          actions.push({
            label: 'Track Delivery',
            icon: <Truck className="h-4 w-4" />,
            onClick: () => navigate(`/dashboard/chats/${product.active_order!.id}`)
          });
          break;
        
        case 'delivered':
          actions.push({
            label: 'Wait for Confirmation',
            icon: <CheckCircle className="h-4 w-4" />,
            onClick: () => navigate(`/dashboard/chats/${product.active_order!.id}`)
          });
          break;
        
        case 'completed':
          actions.push({
            label: 'Order Completed',
            icon: <CheckCircle className="h-4 w-4" />,
            onClick: () => navigate(`/dashboard/chats/${product.active_order!.id}`)
          });
          break;
      }
    }

    // Status management actions (only if no active orders)
    if (!product.active_order) {
      // Mark as sold action (only for active products)
      if (product.status === 'active') {
        actions.push({
          label: 'Mark as Sold',
          icon: <CheckCircle2 className="h-4 w-4" />,
          onClick: () => {
            setProductToUpdate(product);
            setMarkSoldDialogOpen(true);
          }
        });
      }

      // Pause action (only for active products)
      if (product.status === 'active') {
        actions.push({
          label: 'Pause Listing',
          icon: <Pause className="h-4 w-4" />,
          onClick: () => {
            setProductToUpdate(product);
            setPauseDialogOpen(true);
          }
        });
      }

      // Reactivate action (only for draft products)
      if (product.status === 'draft') {
        actions.push({
          label: 'Reactivate',
          icon: <CheckCircle className="h-4 w-4" />,
          onClick: async () => {
            try {
              await ProductService.updateProductStatus(product.id, 'active');
              toast.success('Product reactivated');
              await fetchMyProducts();
            } catch (error: any) {
              toast.error(error.message || 'Failed to reactivate product');
            }
          }
        });
      }

      // Delete product
      actions.push({
        label: 'Delete',
        icon: <Trash2 className="h-4 w-4" />,
        onClick: () => {
          setProductToDelete(product);
          setDeleteDialogOpen(true);
        }
      });
    }

    return actions;
  };

  if (!user) {
    return (
      <UserDashboardLayout>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">{t('auth.required')}</h2>
          <p className="text-muted-foreground mb-4">{t('auth.loginRequired')}</p>
          <Button onClick={() => navigate('/login')}>{t('auth.logIn')}</Button>
        </div>
      </UserDashboardLayout>
    );
  }

  return (
    <UserDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('selling.title')}</h1>
            <p className="text-muted-foreground">{t('selling.subtitle')}</p>
          </div>
          <Button onClick={() => navigate('/dashboard/selling/create')} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t('selling.createListing')}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Listings</p>
                  <p className="text-2xl font-bold">{products.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Orders</p>
                  <p className="text-2xl font-bold">
                    {products.filter(p => p.active_order).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Payment</p>
                  <p className="text-2xl font-bold">
                    {products.filter(p => p.active_order?.status === 'pending_payment').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ready to Dispatch</p>
                  <p className="text-2xl font-bold">
                    {products.filter(p => p.active_order?.status === 'admin_approved').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t('selling.products.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('selling.products.noListings')}</h3>
                <p className="text-muted-foreground mb-4">
                  {t('selling.products.noListingsSubtitle')}
                </p>
                <Button onClick={() => navigate('/dashboard/selling/create')}>
                  {t('selling.products.createFirstListing')}
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('selling.products.table.product')}</TableHead>
                      <TableHead>{t('selling.products.table.price')}</TableHead>
                      <TableHead>{t('selling.products.table.status')}</TableHead>
                      <TableHead>{t('selling.products.table.condition')}</TableHead>
                      <TableHead>{t('selling.products.table.views')}</TableHead>
                      <TableHead>{t('selling.products.table.created')}</TableHead>
                      <TableHead className="text-right">{t('selling.products.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            {product.primary_image && (
                              <img
                                src={product.primary_image}
                                alt={product.title}
                                className="h-12 w-12 rounded-md object-cover"
                              />
                            )}
                            <div>
                              <div className="font-medium"> {getProductTitle(product)}</div>
                              <div className="text-sm text-muted-foreground">
                                {getLocalizedDescription(product).substring(0, 50)}...
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {formatPrice(product.price, product.currency)}
                          </div>
                          {product.is_negotiable && (
                            <div className="text-xs text-muted-foreground">Negotiable</div>
                          )}
                        </TableCell>
                        <TableCell>{getProductStatusBadge(product)}</TableCell>
                        <TableCell>{getConditionBadge(product.condition)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                            <span>{product.view_count || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {new Date(product.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {getAvailableActions(product).map((action, index) => (
                                <DropdownMenuItem key={index} onClick={action.onClick}>
                                  {action.icon}
                                  <span className="ml-2">{action.label}</span>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('selling.deleteDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('selling.deleteDialog.description', { title: productToDelete?.title })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteProduct}
              disabled={deleting}
            >
              {deleting ? t('selling.deleteDialog.deleting') : t('selling.deleteDialog.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispatch Dialog */}
      <Dialog open={dispatchDialogOpen} onOpenChange={setDispatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Dispatched</DialogTitle>
            <DialogDescription>
              A shipping order will be automatically created via the shipping API and the order will be marked as dispatched.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              A shipping order will be automatically created via the shipping API.
            </div>
            
                        {/* City Estimation Status */}
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm font-medium text-gray-800 mb-2">Shipping Route:</div>
                <div className="flex items-center space-x-2 text-sm">
                  {estimatedCity ? (
                    <span className="text-green-600 font-medium">{estimatedCity.name}</span>
                  ) : (
                    <span className="text-orange-600">Damascus (Default)</span>
                  )}
                  <span className="text-gray-400">→</span>
                  {orderToDispatch?.delivery?.delivery_address?.city ? (
                    <span className="text-blue-600 font-medium">{orderToDispatch.delivery.delivery_address.city}</span>
                  ) : (
                    <span className="text-orange-600">Aleppo (Default)</span>
                  )}
                </div>
              </div>
              
              {/* Source City (Seller Location) */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Source Location (Your Location):</div>
                {isCityLoading ? (
                  <div className="flex items-center space-x-2 text-sm text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Detecting your location...</span>
                  </div>
                ) : cityError ? (
                  <div className="text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    Location detection failed. Using default city (Damascus).
                  </div>
                ) : estimatedCity ? (
                  <div className="text-sm text-green-600">
                    <CheckCircle className="h-4 w-4 inline mr-1" />
                    <span className="font-medium">{estimatedCity.name}</span> (ID: {estimatedCity.id})
                  </div>
                ) : (
                  <div className="text-sm text-yellow-600">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Location not available. Using default city (Damascus).
                  </div>
                )}
              </div>
              
              {/* Destination City (Buyer Location) */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Destination Location:</div>
                {orderToDispatch?.delivery?.delivery_address?.city ? (
                  <div className="text-sm text-blue-600">
                    <Truck className="h-4 w-4 inline mr-1" />
                    <span className="font-medium">{orderToDispatch.delivery.delivery_address.city}</span>
                    {citiesResponse?.data && (
                      <span className="text-xs text-gray-500 ml-2">
                        (ID: {findCityIdByName(orderToDispatch.delivery.delivery_address.city) || 'Not found'})
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-orange-600">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    No delivery address found. Using default city (Aleppo).
                  </div>
                )}
              </div>
            </div>
            
            {creatingShippingOrder && (
              <div className="flex items-center space-x-2 text-sm text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Creating shipping order...</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDispatchDialogOpen(false)} disabled={dispatching}>
              Cancel
            </Button>
            <Button onClick={handleMarkAsDispatched} disabled={dispatching || isCityLoading}>
              {dispatching ? (creatingShippingOrder ? 'Creating Order...' : 'Processing...') : 'Mark as Dispatched'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Sold Confirmation Dialog */}
      <Dialog open={markSoldDialogOpen} onOpenChange={setMarkSoldDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Sold</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this product as sold? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {productToUpdate && (
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-gray-500" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{getProductTitle(productToUpdate)}</h4>
                  <p className="text-sm text-gray-500">
                    {formatPrice(productToUpdate.price, productToUpdate.currency)}
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkSoldDialogOpen(false)} disabled={updatingStatus}>
              Cancel
            </Button>
            <Button onClick={handleMarkProductAsSold} disabled={updatingStatus}>
              {updatingStatus ? 'Marking as Sold...' : 'Mark as Sold'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pause Product Confirmation Dialog */}
      <Dialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause Listing</DialogTitle>
            <DialogDescription>
              Are you sure you want to pause this listing? The product will be moved to draft and won't be visible to buyers.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {productToUpdate && (
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-gray-500" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{getProductTitle(productToUpdate)}</h4>
                  <p className="text-sm text-gray-500">
                    {formatPrice(productToUpdate.price, productToUpdate.currency)}
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPauseDialogOpen(false)} disabled={updatingStatus}>
              Cancel
            </Button>
            <Button onClick={handlePauseProduct} disabled={updatingStatus}>
              {updatingStatus ? 'Pausing...' : 'Pause Listing'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UserDashboardLayout>
  );
}
