import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { UserDashboardLayout } from '@/components/UserDashboard/Layout';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Product, Order } from '@/types/database';
import { OrderService } from '@/services/OrderService';
import { 
  Package, 
  ShoppingCart, 
  Clock, 
  Truck, 
  CheckCircle,
  MessageSquare,
  Eye,
  Star,
  AlertCircle,
  User,
  MoreVertical
} from 'lucide-react';
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
import { Textarea } from '@/components/shadcn/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { getProductTitle, getLocalizedDescription } from '@/utils/DisplayAtteibuteSupportedLanguage';

interface ProductWithOrder extends Product {
  order: Order;
  primary_image?: string;
}

export default function BuyingPage() {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const navigate = useNavigate();
  
  const [products, setProducts] = useState<ProductWithOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [review, setReview] = useState('');
  const [rating, setRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMyPurchases();
    }
  }, [user]);

  const fetchMyPurchases = async () => {
    setLoading(true);
    try {
      // Fetch orders where user is the buyer
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          product:products(
            *,
            product_images(image_url, is_primary),
            seller:users!products_seller_id_fkey(*)
          ),
          seller:users!orders_seller_id_fkey(*),
          delivery:order_deliveries(*)
        `)
        .eq('buyer_id', user?.id)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        toast.error('Failed to load purchases');
        return;
      }

      // Transform data to include product with order
      const transformedProducts = (ordersData || []).map(order => ({
        ...order.product,
        order: order,
        primary_image: order.product?.product_images?.find((img: any) => img.is_primary)?.image_url || 
                      order.product?.product_images?.[0]?.image_url
      }));

      setProducts(transformedProducts);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load purchases');
    } finally {
      setLoading(false);
    }
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

  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  const getAvailableActions = (product: ProductWithOrder) => {
    const actions = [];

    // View product
    actions.push({
      label: 'View Product',
      icon: <Eye className="h-4 w-4" />,
      onClick: () => navigate(`/product/${product.id}`)
    });

    // Chat with seller
    actions.push({
      label: 'Chat with Seller',
      icon: <MessageSquare className="h-4 w-4" />,
      onClick: () => navigate(`/dashboard/chats/${product.order.id}`)
    });

    // Status-specific actions
    switch (product.order.status) {
      case 'pending_payment':
        actions.push({
          label: 'Submit Payment Proof',
          icon: <AlertCircle className="h-4 w-4" />,
          onClick: () => navigate(`/dashboard/chats/${product.order.id}`)
        });
        break;
      
      case 'payment_submitted':
        actions.push({
          label: 'Edit Payment Proof',
          icon: <AlertCircle className="h-4 w-4" />,
          onClick: () => navigate(`/dashboard/chats/${product.order.id}`)
        });
        break;
      
      case 'admin_approved':
        actions.push({
          label: 'Track Order',
          icon: <Truck className="h-4 w-4" />,
          onClick: () => navigate(`/dashboard/chats/${product.order.id}`)
        });
        break;
      
      case 'shipped':
        actions.push({
          label: 'Track Delivery',
          icon: <Truck className="h-4 w-4" />,
          onClick: () => navigate(`/dashboard/chats/${product.order.id}`)
        });
        break;
      
      case 'delivered':
        actions.push({
          label: 'Confirm Receipt',
          icon: <CheckCircle className="h-4 w-4" />,
          onClick: () => {
            setSelectedOrder(product.order);
            setReceiptDialogOpen(true);
          }
        });
        break;
      
      case 'completed':
        actions.push({
          label: 'Leave Review',
          icon: <Star className="h-4 w-4" />,
          onClick: () => {
            setSelectedOrder(product.order);
            setReceiptDialogOpen(true);
          }
        });
        break;
    }

    return actions;
  };

  const handleMarkAsReceived = async () => {
    if (!selectedOrder) return;

    setSubmittingReview(true);
    try {
      // Update order status to completed
      await OrderService.updateOrderStatus(
        selectedOrder.id, 
        'completed', 
        user!.id, 
        'Item received by buyer'
      );

      toast.success('Order marked as received');
      setReceiptDialogOpen(false);
      setSelectedOrder(null);
      setReview('');
      setRating(5);
      await fetchMyPurchases(); // Refresh data
    } catch (error) {
      console.error('Error marking as received:', error);
      toast.error('Failed to mark as received');
    } finally {
      setSubmittingReview(false);
    }
  };

  const getNextSteps = (order: Order) => {
    switch (order.status) {
      case 'pending_payment':
        return {
          title: 'Payment Required',
          description: 'Please submit payment proof to complete your purchase',
          action: 'Submit Payment Proof',
          icon: <AlertCircle className="h-4 w-4" />
        };
      case 'payment_submitted':
        return {
          title: 'Payment Submitted',
          description: 'Your payment is being reviewed by our team',
          action: 'Wait for Approval',
          icon: <Clock className="h-4 w-4" />
        };
      case 'admin_approved':
        return {
          title: 'Payment Approved',
          description: 'Seller will dispatch your item soon',
          action: 'Wait for Dispatch',
          icon: <Truck className="h-4 w-4" />
        };
      case 'shipped':
        return {
          title: 'Item Dispatched',
          description: 'Your item is on its way to you',
          action: 'Track Delivery',
          icon: <Truck className="h-4 w-4" />
        };
      case 'delivered':
        return {
          title: 'Item Delivered',
          description: 'Please confirm receipt and leave a review',
          action: 'Confirm Receipt',
          icon: <CheckCircle className="h-4 w-4" />
        };
      case 'completed':
        return {
          title: 'Order Completed',
          description: 'Thank you for your purchase!',
          action: 'Leave Review',
          icon: <Star className="h-4 w-4" />
        };
      default:
        return {
          title: 'Processing',
          description: 'Your order is being processed',
          action: 'Wait',
          icon: <Clock className="h-4 w-4" />
        };
    }
  };

  if (!user) {
    return (
      <UserDashboardLayout>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">Please log in to view your purchases.</p>
          <Button onClick={() => navigate('/login')}>Log In</Button>
        </div>
      </UserDashboardLayout>
    );
  }
  
  return (
    <UserDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">My Purchases</h1>
          <p className="text-muted-foreground">Track your orders and manage your purchases</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Purchases</p>
                  <p className="text-2xl font-bold">{products.length}</p>
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
                    {products.filter(p => p.order.status === 'pending_payment').length}
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
                  <p className="text-sm font-medium text-muted-foreground">In Transit</p>
                  <p className="text-2xl font-bold">
                    {products.filter(p => p.order.status === 'shipped').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">
                    {products.filter(p => p.order.status === 'completed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No purchases yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start shopping to see your purchase history here
                </p>
                <Button onClick={() => navigate('/')}>
                  Start Shopping
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Next Steps</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => {
                      const nextSteps = getNextSteps(product.order);
                      return (
                        <TableRow key={product.order.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              {product.primary_image && (
                                <img
                                  src={product.primary_image}
                                  alt={getProductTitle(product)}
                                  className="h-12 w-12 rounded-md object-cover"
                                />
                              )}
                              <div>
                                <div className="font-medium">{getProductTitle(product)}</div>
                                <div className="text-sm text-muted-foreground">
                                  {getLocalizedDescription(product).substring(0, 50)}...
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                                <User className="h-4 w-4" />
                              </div>
                              <span className="text-sm">
                                {product.order.seller?.username || product.order.seller?.full_name || 'Unknown'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {formatPrice(product.order.unit_price, product.order.currency)}
                            </div>
                          </TableCell>
                          <TableCell>{getOrderStatusBadge(product.order.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {nextSteps.icon}
                              <div>
                                <div className="text-sm font-medium">{nextSteps.title}</div>
                                <div className="text-xs text-muted-foreground">{nextSteps.description}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(product.order.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
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
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Receipt Confirmation Dialog */}
      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Receipt</DialogTitle>
            <DialogDescription>
              Please confirm that you have received your item and leave a review.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="review">Review (Optional)</Label>
              <Textarea
                id="review"
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Share your experience with this purchase..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="rating">Rating</Label>
              <div className="flex items-center space-x-2 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Button
                    key={star}
                    variant="ghost"
                    size="sm"
                    onClick={() => setRating(star)}
                    className={rating >= star ? 'text-yellow-400' : 'text-gray-300'}
                  >
                    <Star className="h-5 w-5" />
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkAsReceived} disabled={submittingReview}>
              {submittingReview ? 'Processing...' : 'Confirm Receipt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UserDashboardLayout>
  );
}