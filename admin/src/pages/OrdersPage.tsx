import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Search, 
  MoreHorizontal, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  Truck,
  Package,
  AlertCircle,
  User,
  ShoppingCart,
  DollarSign,
  Percent
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { supabase, ProductVariant } from '@/lib/supabase';
import { sendPaymentApprovedNotification, sendPaymentRejectedNotification, sendProductSoldNotification, sendOrderDeliveredNotification } from '@/lib/notifications';

interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  product_variant_id?: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  shipping_fee: number;
  grand_total: number;
  currency: string;
  status: 'pending_payment' | 'payment_submitted' | 'admin_approved' | 'shipped' | 'delivered' | 'completed' | 'cancelled';
  payment_method: string;
  payment_id?: string;
  // Commission fields
  selling_fee_percentage?: number;
  selling_fee_amount?: number;
  seller_payout_amount?: number;
  created_at: string;
  updated_at: string;
  product?: {
    id: string;
    title: string;
    has_variants?: boolean;
    images?: Array<{ image_url: string; alt_text?: string }>;
  };
  variant?: ProductVariant & {
    option_values?: Array<{
      option_value: {
        id: string;
        name: string;
        option_group: {
          id: string;
          name: string;
        };
      };
    }>;
  };
  buyer?: {
    id: string;
    username: string;
    full_name: string;
    email: string;
  };
  seller?: {
    id: string;
    username: string;
    full_name: string;
    email: string;
  };
  pickup_address?: any;
  shipping_address?: any;
  delivery?: {
    id: string;
    delivery_type: string;
    tracking_number?: string;
    delivery_status: string;
    estimated_delivery_date?: string;
    actual_delivery_date?: string;
    delivery_address?: any;
    pickup_location_data?: any;
    pickup_address_id?: string;
    delivery_note_url?: string;
    pickup_address?: any;
    shipping_address?: any;
  };
  payment?: {
    payment_id: string;
    amount: number;
    currency: string;
    created_at: string;
  };
  messages?: Array<{
    id: string;
    message: string;
    created_at: string;
  }>;
}

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [deliveredDialogOpen, setDeliveredDialogOpen] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          product:products(
            id,
            title,
            has_variants,
            images:product_images(image_url, alt_text)
          ),
          variant:product_variants(
            id,
            sku,
            is_active,
            quantity_available,
            quantity_reserved,
            price_override,
            option_values:product_variant_values(
              option_value:product_option_values(
                id,
                name,
                option_group:product_option_groups(
                  id,
                  name
                )
              )
            )
          ),
          buyer:users!orders_buyer_id_fkey(
            id,
            username,
            full_name,
            email
          ),
          seller:users!orders_seller_id_fkey(
            id,
            username,
            full_name,
            email
          ),
          delivery:order_deliveries(
            *,
            delivery_method:delivery_methods(*),
            shipping_address:user_addresses(*),
            pickup_address:user_pickup_addresses(
              *,
              pickup_location:pickup_locations(
                *,
                city:cities(*)
              )
            )
          ),
          payment:order_payments(*),
          messages:order_messages(*),
          shipping_address:user_addresses(*),
          pickup_address:user_pickup_addresses(
            *,
            pickup_location:pickup_locations(
              *,
              city:cities(*)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        toast.error('Failed to load orders');
        return;
      }

      const normalised = (data || []).map((order: any) => {
        const deliveryRecord = Array.isArray(order.delivery) ? order.delivery[0] : order.delivery;
        const pickupAddress = order.pickup_address ?? deliveryRecord?.pickup_address ?? null;
        const shippingAddress = order.shipping_address ?? deliveryRecord?.shipping_address ?? null;
        
        // Handle variant - it might be null, an array, or a single object
        const variant = order.variant 
          ? (Array.isArray(order.variant) ? order.variant[0] : order.variant)
          : null;

        const delivery =
          deliveryRecord
            ? {
                ...deliveryRecord,
                pickup_address: pickupAddress ?? deliveryRecord?.pickup_address ?? null,
                pickup_location_data:
                  deliveryRecord?.pickup_location_data ??
                  pickupAddress?.pickup_location ??
                  null,
              }
            : null;

        return {
          ...order,
          variant,
          delivery,
          pickup_address: pickupAddress,
          shipping_address: shippingAddress,
        };
      });

      setOrders(normalised);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return <Badge variant="destructive" className="text-xs">Waiting Payment</Badge>;
      case 'payment_submitted':
        return <Badge variant="secondary" className="text-xs">Payment Submitted</Badge>;
      case 'admin_approved':
        return <Badge variant="default" className="text-xs">Approved</Badge>;
      case 'shipped':
        return <Badge variant="default" className="text-xs">Shipped</Badge>;
      case 'delivered':
        return <Badge variant="default" className="text-xs bg-green-600">Delivered</Badge>;
      case 'completed':
        return <Badge variant="default" className="text-xs bg-gray-600">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="text-xs">Cancelled</Badge>;
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAvailableActions = (order: Order) => {
    const actions = [];

    // View order details
    actions.push({
      label: 'View Details',
      icon: <Eye className="h-4 w-4" />,
      onClick: () => setSelectedOrder(order)
    });

    // Approve payment (if payment submitted)
    if (order.status === 'payment_submitted') {
      actions.push({
        label: 'Approve Payment',
        icon: <CheckCircle className="h-4 w-4" />,
        onClick: () => {
          setSelectedOrder(order);
          setApprovalDialogOpen(true);
        }
      });
    }

    // Reject payment (if payment submitted)
    if (order.status === 'payment_submitted') {
      actions.push({
        label: 'Reject Payment',
        icon: <XCircle className="h-4 w-4" />,
        onClick: () => {
          setSelectedOrder(order);
          setRejectionDialogOpen(true);
        }
      });
    }

    // Mark as Delivered (if shipped)
    if (order.status === 'shipped') {
      actions.push({
        label: 'Mark as Delivered',
        icon: <Package className="h-4 w-4" />,
        onClick: () => {
          setSelectedOrder(order);
          setDeliveredDialogOpen(true);
        }
      });
    }

    return actions;
  };

  const handleApprovePayment = async () => {
    if (!selectedOrder) return;

    setProcessing(true);
    try {
      // Update order status to admin_approved
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'admin_approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id);

      if (error) {
        throw error;
      }

      // Add status history
      await supabase
        .from('order_statuses')
        .insert({
          order_id: selectedOrder.id,
          status: 'admin_approved',
          notes: approvalNote || 'Payment approved by admin',
          created_at: new Date().toISOString()
        });

      // Send notification to buyer
      await sendPaymentApprovedNotification(
        supabase,
        selectedOrder.buyer_id,
        selectedOrder.id
      );

      // Send product sold notification to seller
      if (selectedOrder.product?.title) {
        await sendProductSoldNotification(
          supabase,
          selectedOrder.seller_id,
          selectedOrder.id,
          selectedOrder.product.title
        );
      }

      toast.success('Payment approved successfully');
      setApprovalDialogOpen(false);
      setSelectedOrder(null);
      setApprovalNote('');
      await fetchOrders(); // Refresh data
    } catch (error) {
      console.error('Error approving payment:', error);
      toast.error('Failed to approve payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!selectedOrder) return;

    setProcessing(true);
    try {
      // Update order status to pending_payment
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'pending_payment',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id);

      if (error) {
        throw error;
      }

      // Add status history
      await supabase
        .from('order_statuses')
        .insert({
          order_id: selectedOrder.id,
          status: 'pending_payment',
          notes: rejectionReason || 'Payment rejected by admin',
          created_at: new Date().toISOString()
        });

      // Send notification to buyer
      await sendPaymentRejectedNotification(
        supabase,
        selectedOrder.buyer_id,
        selectedOrder.id,
        rejectionReason || undefined
      );

      toast.success('Payment rejected');
      setRejectionDialogOpen(false);
      setSelectedOrder(null);
      setRejectionReason('');
      await fetchOrders(); // Refresh data
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast.error('Failed to reject payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkAsDelivered = async () => {
    if (!selectedOrder) return;

    setProcessing(true);
    try {
      // Update order status to delivered
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          status: 'delivered',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id);

      if (orderError) {
        throw orderError;
      }

      // Update delivery status and actual delivery date
      if (selectedOrder.delivery) {
        const { error: deliveryError } = await supabase
          .from('order_deliveries')
          .update({
            delivery_status: 'delivered',
            actual_delivery_date: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          })
          .eq('order_id', selectedOrder.id);

        if (deliveryError) {
          console.error('Error updating delivery status:', deliveryError);
          // Don't throw, order status update was successful
        }
      }

      // Add status history
      await supabase
        .from('order_statuses')
        .insert({
          order_id: selectedOrder.id,
          status: 'delivered',
          notes: 'Order delivered - arrived at collection point',
          created_at: new Date().toISOString()
        });

      // Send notification to buyer
      await sendOrderDeliveredNotification(
        supabase,
        selectedOrder.buyer_id,
        selectedOrder.id,
        selectedOrder.delivery?.delivery_type as 'home_delivery' | 'pickup_point' | 'seller_collection' | undefined
      );

      toast.success('Order marked as delivered');
      setDeliveredDialogOpen(false);
      setSelectedOrder(null);
      await fetchOrders(); // Refresh data
    } catch (error) {
      console.error('Error marking as delivered:', error);
      toast.error('Failed to mark as delivered');
    } finally {
      setProcessing(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.product?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.buyer?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.buyer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.seller?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.seller?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.payment_id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStats = () => {
    const total = orders.length;
    const pendingPayment = orders.filter(o => o.status === 'pending_payment').length;
    const paymentSubmitted = orders.filter(o => o.status === 'payment_submitted').length;
    const approved = orders.filter(o => o.status === 'admin_approved').length;
    const shipped = orders.filter(o => o.status === 'shipped').length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const completed = orders.filter(o => o.status === 'completed').length;

    return { total, pendingPayment, paymentSubmitted, approved, shipped, delivered, completed };
  };

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Orders Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage all orders, approve payments, and track order status
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Payment</p>
                <p className="text-2xl font-bold">{stats.pendingPayment}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Payment Submitted</p>
                <p className="text-2xl font-bold">{stats.paymentSubmitted}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders, buyers, sellers, or payment IDs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending_payment">Pending Payment</SelectItem>
                <SelectItem value="payment_submitted">Payment Submitted</SelectItem>
                <SelectItem value="admin_approved">Approved</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No orders found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria' 
                  : 'No orders have been placed yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Payout</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="font-mono text-sm">
                          {order.id.slice(0, 8)}...
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          {order.product?.images?.[0] && (
                            <img
                              src={order.product.images[0].image_url}
                              alt={order.product.images[0].alt_text || order.product?.title}
                              className="h-10 w-10 rounded-md object-cover"
                            />
                          )}
                          <div>
                            <div className="font-medium text-sm">
                              {order.product?.title || 'Product'}
                            </div>
                            {order.variant && order.variant.option_values && order.variant.option_values.length > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {order.variant.option_values
                                  .map((vv: any) => {
                                    const optionValue = vv.option_value;
                                    const groupName = optionValue?.option_group?.name || '';
                                    const valueName = optionValue?.name || '';
                                    return groupName && valueName ? `${groupName}: ${valueName}` : valueName;
                                  })
                                  .filter(Boolean)
                                  .join(', ')}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              Qty: {order.quantity}
                              {order.variant?.sku && ` • SKU: ${order.variant.sku}`}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
                            <User className="h-3 w-3" />
                          </div>
                          <span className="text-sm">
                            {order.buyer?.username || order.buyer?.full_name || 'Unknown'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
                            <User className="h-3 w-3" />
                          </div>
                          <span className="text-sm">
                            {order.seller?.username || order.seller?.full_name || 'Unknown'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatPrice(order.grand_total, order.currency)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatPrice(order.unit_price, order.currency)} each
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.selling_fee_percentage !== undefined && order.selling_fee_percentage > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Percent className="h-3 w-3" />
                              <span>{order.selling_fee_percentage}%</span>
                            </div>
                            {order.selling_fee_amount !== undefined && (
                              <div className="text-xs font-medium text-red-600">
                                -{formatPrice(order.selling_fee_amount, order.currency)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.seller_payout_amount !== undefined ? (
                          <div className="font-medium text-green-600">
                            {formatPrice(order.seller_payout_amount, order.currency)}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        <div className="font-mono text-xs">
                          {order.payment_id ? order.payment_id.slice(0, 12) + '...' : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(order.created_at)}
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
                            {getAvailableActions(order).map((action, index) => (
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

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Detailed information about this order
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Order Information</h4>
                  <p className="text-sm text-muted-foreground">ID: {selectedOrder.id}</p>
                  <p className="text-sm text-muted-foreground">Status: {selectedOrder.status}</p>
                  <p className="text-sm text-muted-foreground">Created: {formatDate(selectedOrder.created_at)}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Payment Information</h4>
                  <p className="text-sm text-muted-foreground">Method: {selectedOrder.payment_method}</p>
                  <p className="text-sm text-muted-foreground">Payment ID: {selectedOrder.payment_id || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">Total: {formatPrice(selectedOrder.grand_total, selectedOrder.currency)}</p>
                </div>
              </div>

              {/* Commission & Payout Information */}
              {selectedOrder.selling_fee_percentage !== undefined && selectedOrder.selling_fee_percentage > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Commission & Payout
                  </h4>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Sale Amount:</span>
                        <span className="text-sm font-medium">{formatPrice(selectedOrder.total_amount, selectedOrder.currency)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          Commission ({selectedOrder.selling_fee_percentage}%):
                        </span>
                        <span className="text-sm font-medium text-red-600">
                          -{formatPrice(selectedOrder.selling_fee_amount || 0, selectedOrder.currency)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold">Seller Payout:</span>
                        <span className="text-sm font-bold text-green-600">
                          {formatPrice(selectedOrder.seller_payout_amount || 0, selectedOrder.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <h4 className="font-semibold">Product</h4>
                <p className="text-sm">{selectedOrder.product?.title}</p>
                {selectedOrder.variant && selectedOrder.variant.option_values && selectedOrder.variant.option_values.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Variant Options:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedOrder.variant.option_values.map((vv: any, index: number) => {
                        const optionValue = vv.option_value;
                        const groupName = optionValue?.option_group?.name || '';
                        const valueName = optionValue?.name || '';
                        if (!groupName || !valueName) return null;
                        return (
                          <Badge key={index} variant="outline" className="text-xs">
                            <span className="font-medium">{groupName}:</span> {valueName}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
                {selectedOrder.variant?.sku && (
                  <p className="text-xs text-muted-foreground mt-1">SKU: {selectedOrder.variant.sku}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">Quantity: {selectedOrder.quantity}</p>
                {selectedOrder.variant && (
                  <div className="mt-2 p-2 bg-muted rounded-md text-xs space-y-1">
                    <p className="text-muted-foreground">Variant Stock:</p>
                    <p>Available: {selectedOrder.variant.quantity_available}</p>
                    <p>Reserved: {selectedOrder.variant.quantity_reserved}</p>
                    {selectedOrder.variant.price_override && (
                      <p>Price Override: {formatPrice(selectedOrder.variant.price_override, selectedOrder.currency)}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Buyer</h4>
                  <p className="text-sm">{selectedOrder.buyer?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.buyer?.email}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Seller</h4>
                  <p className="text-sm">{selectedOrder.seller?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.seller?.email}</p>
                </div>
              </div>

              {selectedOrder.delivery && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Delivery Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-muted-foreground">Type</p>
                        <p className="font-medium capitalize">
                          {selectedOrder.delivery.delivery_type?.replace('_', ' ')}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <p className="font-medium capitalize">
                          {selectedOrder.delivery.delivery_status || 'N/A'}
                        </p>
                      </div>
                    </div>
                    
                    {selectedOrder.status === 'shipped' && selectedOrder.delivery.tracking_number && (
                      <div className="mt-3 p-3 bg-muted rounded-md">
                        <p className="text-muted-foreground text-xs mb-1">Tracking Number</p>
                        <p className="font-mono font-semibold text-base">
                          {selectedOrder.delivery.tracking_number}
                        </p>
                        {selectedOrder.delivery.estimated_delivery_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Estimated Delivery: {new Date(selectedOrder.delivery.estimated_delivery_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {selectedOrder.delivery.delivery_address && (
                      <div className="mt-2">
                        <p className="text-muted-foreground text-xs mb-1">Delivery Address</p>
                        <p className="text-sm">
                          {selectedOrder.delivery.delivery_address.street}, {selectedOrder.delivery.delivery_address.city}
                        </p>
                      </div>
                    )}

                    {selectedOrder.delivery.delivery_note_url && (
                      <div className="mt-4 space-y-2">
                        <p className="text-muted-foreground text-xs">Shipping Receipt</p>
                        <div className="flex items-center gap-3">
                          <img
                            src={selectedOrder.delivery.delivery_note_url}
                            alt="Shipping receipt"
                            className="w-32 h-32 object-cover rounded-md border"
                          />
                          <Button asChild variant="secondary" size="sm">
                            <a href={selectedOrder.delivery.delivery_note_url} target="_blank" rel="noopener noreferrer">
                              View full receipt
                            </a>
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {selectedOrder.delivery.pickup_location_data && (
                      <div className="mt-2">
                        <p className="text-muted-foreground text-xs mb-1">Pickup Location</p>
                        <p className="text-sm font-medium">{selectedOrder.delivery.pickup_location_data.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedOrder.delivery.pickup_location_data.address}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Payment Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Payment</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this payment? This will allow the seller to proceed with shipping.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Approval Notes (Optional)</label>
              <Input
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder="Add any notes about this approval..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprovePayment} disabled={processing}>
              {processing ? 'Processing...' : 'Approve Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Payment Dialog */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this payment? The buyer will need to submit new payment proof.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Rejection Reason (Required)</label>
              <Input
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason for rejection..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectionDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectPayment} 
              disabled={processing || !rejectionReason.trim()}
            >
              {processing ? 'Processing...' : 'Reject Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Delivered Dialog */}
      <Dialog open={deliveredDialogOpen} onOpenChange={setDeliveredDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Delivered</DialogTitle>
            <DialogDescription>
              Mark this order as delivered? This indicates the item has arrived at the collection point and is ready for pickup.
            </DialogDescription>
          </DialogHeader>
          {selectedOrder?.delivery?.tracking_number && (
            <div className="space-y-2 p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">Tracking Information</p>
              <p className="text-sm text-muted-foreground">
                Tracking Number: <span className="font-mono font-semibold">{selectedOrder.delivery.tracking_number}</span>
              </p>
              {selectedOrder.delivery.delivery_type === 'pickup_point' && selectedOrder.delivery.pickup_location_data && (
                <p className="text-sm text-muted-foreground">
                  Pickup Location: {selectedOrder.delivery.pickup_location_data.name}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliveredDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkAsDelivered} disabled={processing}>
              {processing ? 'Processing...' : 'Mark as Delivered'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 
