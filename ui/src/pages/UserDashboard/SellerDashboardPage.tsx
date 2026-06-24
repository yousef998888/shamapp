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
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { 
  Plus, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  Package, 
  DollarSign, 
  Calendar,
  TrendingUp,
  AlertCircle,
  MessageSquare,
  Truck,
  CheckCircle,
  Clock,
  ShoppingCart
} from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Product, Order } from '@/types/database';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { getLocalizedDescription, getProductTitle } from '@/utils/DisplayAtteibuteSupportedLanguage';
import { OrderService } from '@/services/OrderService';

interface ProductWithOrders extends Product {
  view_count: number;
  favorite_count?: number;
  primary_image?: string;
  orders?: Order[];
  active_order?: Order;
}

export default function SellerDashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductWithOrders[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [dispatchDialogOpen, setDispatchDialogOpen] = useState<boolean>(false);
  const [orderToDispatch, setOrderToDispatch] = useState<Order | null>(null);
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const [dispatching, setDispatching] = useState<boolean>(false);

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
          product_images!inner(image_url, is_primary)
        `)
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error fetching products:', error);
        toast.error(t('selling.errors.loadFailed'));
        return;
      }

      // Fetch orders for these products
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
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

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return <Badge variant="destructive" className="text-xs">{t('seller.status.pendingPayment')}</Badge>;
      case 'payment_submitted':
        return <Badge variant="secondary" className="text-xs">{t('seller.status.paymentSubmitted')}</Badge>;
      case 'admin_approved':
        return <Badge variant="default" className="text-xs">{t('seller.status.readyToDispatch')}</Badge>;
      case 'shipped':
        return <Badge variant="default" className="text-xs">{t('seller.status.dispatched')}</Badge>;
      case 'delivered':
        return <Badge variant="default" className="text-xs bg-green-600">{t('seller.status.delivered')}</Badge>;
      case 'completed':
        return <Badge variant="default" className="text-xs bg-gray-600">{t('seller.status.completed')}</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const getProductStatusBadge = (product: ProductWithOrders) => {
    if (!product.active_order) {
      return <Badge variant="outline" className="text-xs">{t('seller.status.available')}</Badge>;
    }
    return getOrderStatusBadge(product.active_order.status);
  };

  const getAvailableActions = (product: ProductWithOrders) => {
    const actions = [];

    // View product
    actions.push({
      label: t('seller.actions.view'),
      icon: <Eye className="h-4 w-4" />,
      onClick: () => navigate(`/product/${product.id}`)
    });

    // Edit product
    actions.push({
      label: t('seller.actions.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: () => navigate(`/dashboard/sellings/edit/${product.id}`)
    });

    // Chat with buyer (if there's an active order)
    if (product.active_order) {
      actions.push({
        label: t('seller.actions.chat'),
        icon: <MessageSquare className="h-4 w-4" />,
        onClick: () => navigate(`/chats/${product.active_order.id}`)
      });
    }

    // Mark as dispatched (if payment is approved)
    if (product.active_order?.status === 'admin_approved' && product.active_order.delivery?.delivery_type !== 'seller_collection') {
      actions.push({
        label: t('seller.actions.markDispatched'),
        icon: <Truck className="h-4 w-4" />,
        onClick: () => {
          setOrderToDispatch(product.active_order);
          setDispatchDialogOpen(true);
        }
      });
    }

    // Mark as sold (for collection orders)
    if (product.active_order?.status === 'admin_approved' && 
        (product.active_order.delivery?.delivery_type === 'pickup_point' || product.active_order.delivery?.delivery_type === 'seller_collection')) {
      actions.push({
        label: t('seller.actions.markSold'),
        icon: <CheckCircle className="h-4 w-4" />,
        onClick: () => handleMarkAsSold(product.active_order!)
      });
    }

    // Delete product (only if no active orders)
    if (!product.active_order) {
      actions.push({
        label: t('seller.actions.delete'),
        icon: <Trash2 className="h-4 w-4" />,
        onClick: () => {
          setProductToDelete(product);
          setDeleteDialogOpen(true);
        }
      });
    }

    return actions;
  };

  const handleMarkAsDispatched = async () => {
    if (!orderToDispatch || !trackingNumber.trim()) {
      toast.error(t('seller.errors.trackingRequired'));
      return;
    }

    setDispatching(true);
    try {
      // Update order status to shipped
      await OrderService.updateOrderStatus(
        orderToDispatch.id, 
        'shipped', 
        user!.id, 
        'Item dispatched by seller',
        { tracking_number: trackingNumber }
      );

      // Update delivery status
      await OrderService.updateDeliveryStatus(
        orderToDispatch.id,
        'shipped',
        {
          trackingNumber,
        },
      );

      toast.success(t('seller.success.dispatched'));
      setDispatchDialogOpen(false);
      setOrderToDispatch(null);
      setTrackingNumber('');
      await fetchMyProducts(); // Refresh data
    } catch (error) {
      console.error('Error marking as dispatched:', error);
      toast.error(t('seller.errors.dispatchFailed'));
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

      toast.success(t('seller.success.sold'));
      await fetchMyProducts(); // Refresh data
    } catch (error) {
      console.error('Error marking as sold:', error);
      toast.error(t('seller.errors.soldFailed'));
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
      await fetchMyProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error(t('selling.errors.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <UserDashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{t('seller.dashboard.title')}</h1>
            <Button onClick={() => navigate('/dashboard/sellings/create')}>
              <Plus className="h-4 w-4 mr-2" />
              {t('seller.actions.addProduct')}
            </Button>
          </div>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </UserDashboardLayout>
    );
  }

  return (
    <UserDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('seller.dashboard.title')}</h1>
          <Button onClick={() => navigate('/dashboard/sellings/create')}>
            <Plus className="h-4 w-4 mr-2" />
            {t('seller.actions.addProduct')}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('seller.stats.totalProducts')}</p>
                  <p className="text-2xl font-bold">{products.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('seller.stats.activeOrders')}</p>
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
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('seller.stats.pendingPayment')}</p>
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
                <Truck className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('seller.stats.readyToDispatch')}</p>
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
            <CardTitle>{t('seller.products.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('seller.products.product')}</TableHead>
                  <TableHead>{t('seller.products.price')}</TableHead>
                  <TableHead>{t('seller.products.status')}</TableHead>
                  <TableHead>{t('seller.products.views')}</TableHead>
                  <TableHead>{t('seller.products.created')}</TableHead>
                  <TableHead className="text-right">{t('seller.products.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {product.primary_image ? (
                            <img
                              src={product.primary_image}
                              alt={getProductTitle(product)}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Package className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{getProductTitle(product)}</p>
                          <p className="text-sm text-gray-500">{product.location}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{formatPrice(product.price, product.currency)}</p>
                    </TableCell>
                    <TableCell>
                      {getProductStatusBadge(product)}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{product.view_count}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{formatDate(product.created_at)}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
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
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('selling.delete.title')}</DialogTitle>
            <DialogDescription>
              {t('selling.delete.description')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteProduct} disabled={deleting}>
              {deleting ? t('common.deleting') : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispatch Dialog */}
      <Dialog open={dispatchDialogOpen} onOpenChange={setDispatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('seller.dispatch.title')}</DialogTitle>
            <DialogDescription>
              {t('seller.dispatch.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tracking">{t('seller.dispatch.trackingNumber')}</Label>
              <Input
                id="tracking"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder={t('seller.dispatch.trackingPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDispatchDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleMarkAsDispatched} disabled={dispatching || !trackingNumber.trim()}>
              {dispatching ? t('common.processing') : t('seller.dispatch.markDispatched')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UserDashboardLayout>
  );
} 
