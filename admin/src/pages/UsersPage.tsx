import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ColumnDef,
  SortingState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { Search, Loader2, ShieldCheck, Store, ShoppingBag, MessageSquare, Package, ArrowRightCircle, DollarSign, Percent } from 'lucide-react';
import { toast } from 'sonner';

import { supabase, ProductVariant } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ProductStatus = 'active' | 'inactive' | 'sold' | 'removed';
type OrderStatus =
  | 'pending_payment'
  | 'payment_submitted'
  | 'admin_approved'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'awaiting_collection';

interface UserRow {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  is_verified: boolean | null;
  member_since: string | null;
  created_at: string;
  rating: number | null;
  pending_verification?: {
    id: string;
    created_at: string;
  } | null;
  stats: {
    activeListings: number;
    soldListings: number;
    ordersAsBuyer: number;
    ordersAsSeller: number;
  };
}

interface ProductListing {
  id: string;
  title: string;
  status: ProductStatus;
  price: number;
  currency: string;
  created_at: string;
  updated_at: string;
  condition: string | null;
  description: string | null;
  location: string | null;
  is_negotiable: boolean | null;
  tags: string[] | null;
  images?: Array<{
    image_url: string | null;
    alt_text?: string | null;
  }> | null;
}

interface OrderMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
}

interface OrderRelation {
  id: string;
  status: OrderStatus;
  buyer_id: string;
  seller_id: string;
  quantity: number;
  total_amount: number;
  grand_total: number | null;
  shipping_fee: number | null;
  currency: string;
  payment_method: string | null;
  // Commission fields
  selling_fee_percentage?: number | null;
  selling_fee_amount?: number | null;
  seller_payout_amount?: number | null;
  created_at: string;
  updated_at: string;
  buyer?: {
    id: string;
    username: string | null;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  seller?: {
    id: string;
    username: string | null;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  product?: {
    id: string;
    title: string;
    status: ProductStatus;
    price: number;
    currency: string;
    has_variants?: boolean;
  } | null;
  product_variant_id?: string | null;
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
  } | null;
  delivery?: Array<{
    id: string;
    delivery_type: string | null;
    delivery_status: string | null;
    tracking_number: string | null;
    estimated_delivery_date: string | null;
    actual_delivery_date: string | null;
  }> | null;
  messages?: OrderMessage[] | null;
  statuses?: Array<{
    id: string;
    status: OrderStatus;
    reason: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
    changed_by: string;
  }> | null;
  relist_requested?: boolean;
  relist_reason?: string | null;
  relist_requested_at?: string | null;
  relist_resolved_at?: string | null;
  relist_resolved_by?: string | null;
}

type VerificationStatus = 'pending' | 'approved' | 'rejected';

interface UserVerificationRequest {
  id: string;
  user_id: string;
  document_path: string;
  status: VerificationStatus;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface UserDetails extends UserRow {
  avatar_url: string | null;
  bio: string | null;
  background_image_url: string | null;
  total_sales: number | null;
  listings: ProductListing[];
  ordersAsSeller: OrderRelation[];
  ordersAsBuyer: OrderRelation[];
  verificationRequests: UserVerificationRequest[];
}

interface Conversation {
  id: string;
  order: OrderRelation;
  counterpart: {
    id: string;
    displayName: string;
    email: string | null;
  } | null;
  messages: OrderMessage[];
}

export function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'member_since', desc: true },
  ]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState<UserDetails | null>(null);
  const [listingSearch, setListingSearch] = useState<string>('');
  const [listingSorting, setListingSorting] = useState<SortingState>([]);
  const [selectedListing, setSelectedListing] = useState<ProductListing | null>(null);
  const [sellerOrderSearch, setSellerOrderSearch] = useState<string>('');
  const [buyerOrderSearch, setBuyerOrderSearch] = useState<string>('');
  const [sellerOrderSorting, setSellerOrderSorting] = useState<SortingState>([]);
  const [buyerOrderSorting, setBuyerOrderSorting] = useState<SortingState>([]);
  const [selectedOrder, setSelectedOrder] = useState<{ order: OrderRelation; role: 'seller' | 'buyer' } | null>(null);
  const [orderActionLoading, setOrderActionLoading] = useState<'cancel' | 'relist' | 'remove' | null>(null);
  const [selectedVerification, setSelectedVerification] = useState<UserVerificationRequest | null>(null);
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [verificationPreviewUrl, setVerificationPreviewUrl] = useState<string | null>(null);
  const [verificationActionLoading, setVerificationActionLoading] = useState<'approve' | 'reject' | null>(null);
  const [verificationNotes, setVerificationNotes] = useState<string>('');
  const [userListFilter, setUserListFilter] = useState<'all' | 'pending'>('all');

  useEffect(() => {
    fetchUserOverview();
  }, []);

  const fetchUserOverview = async () => {
    setLoading(true);
    try {
      const { data: userRows, error: usersError } = await supabase
        .from('users')
        .select(
          'id, username, full_name, email, phone, location, is_verified, member_since, created_at, rating',
        )
        .order('created_at', { ascending: false });

      if (usersError) {
        throw usersError;
      }

      if (!userRows || userRows.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const userIds = userRows.map((user) => user.id);

      // Fetch all pending verification requests first (not filtered by userIds to ensure we don't miss any)
      const { data: allPendingRequests, error: pendingError } = await supabase
        .from('user_verification_requests')
        .select('id, user_id, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      const [
        { data: products, error: productsError },
        { data: buyerOrders, error: buyerError },
        { data: sellerOrders, error: sellerError },
      ] =
        await Promise.all([
          supabase
            .from('products')
            .select('id, seller_id, status')
            .in('seller_id', userIds),
          supabase
            .from('orders')
            .select('id, buyer_id')
            .in('buyer_id', userIds),
          supabase
            .from('orders')
            .select('id, seller_id')
            .in('seller_id', userIds),
        ]);

      if (productsError) {
        throw productsError;
      }
      if (buyerError) {
        throw buyerError;
      }
      if (sellerError) {
        throw sellerError;
      }
      if (pendingError) {
        throw pendingError;
      }

      const productStats = new Map<
        string,
        { activeListings: number; soldListings: number }
      >();
      products?.forEach((product) => {
        const stats = productStats.get(product.seller_id) ?? {
          activeListings: 0,
          soldListings: 0,
        };
        if (product.status === 'sold') {
          stats.soldListings += 1;
        } else if (product.status === 'active') {
          stats.activeListings += 1;
        }
        productStats.set(product.seller_id, stats);
      });

      const buyerCounts = new Map<string, number>();
      buyerOrders?.forEach((order) => {
        buyerCounts.set(order.buyer_id, (buyerCounts.get(order.buyer_id) ?? 0) + 1);
      });

      const sellerCounts = new Map<string, number>();
      sellerOrders?.forEach((order) => {
        sellerCounts.set(order.seller_id, (sellerCounts.get(order.seller_id) ?? 0) + 1);
      });

      // Filter pending requests to only include those for users in our list
      // and build a map with the latest pending request per user
      const pendingMap = new Map<string, { id: string; created_at: string }>();
      const userIdSet = new Set(userIds);
      allPendingRequests?.forEach((request) => {
        // Only include requests for users in our current user list
        if (userIdSet.has(request.user_id)) {
          // If user already has a pending request, keep the one with the latest created_at
          const existing = pendingMap.get(request.user_id);
          if (!existing || new Date(request.created_at) > new Date(existing.created_at)) {
            pendingMap.set(request.user_id, {
              id: request.id,
              created_at: request.created_at,
            });
          }
        }
      });

      const formattedUsers: UserRow[] = userRows.map((user) => ({
        ...user,
        pending_verification: pendingMap.get(user.id) ?? null,
        stats: {
          activeListings: productStats.get(user.id)?.activeListings ?? 0,
          soldListings: productStats.get(user.id)?.soldListings ?? 0,
          ordersAsBuyer: buyerCounts.get(user.id) ?? 0,
          ordersAsSeller: sellerCounts.get(user.id) ?? 0,
        },
      }));

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users overview:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = useCallback(
    async (userId: string) => {
    setDetailLoading(true);
    try {
      const [
        { data: userRecord, error: userError },
        { data: listings, error: listingsError },
        { data: sellerOrders, error: sellerError },
        { data: buyerOrders, error: buyerError },
        { data: verificationRequests, error: verificationError },
      ] =
        await Promise.all([
          supabase
            .from('users')
            .select(
              'id, username, full_name, email, phone, location, bio, avatar_url, background_image_url, is_verified, member_since, created_at, rating, total_sales',
            )
            .eq('id', userId)
            .single(),
          supabase
            .from('products')
            .select(
              `
              id,
              title,
              status,
              price,
              currency,
              created_at,
              updated_at,
              condition,
              description,
              location,
              is_negotiable,
              tags,
              images:product_images(image_url, alt_text)
            `,
            )
            .eq('seller_id', userId)
            .order('created_at', { ascending: false }),
          supabase
            .from('orders')
            .select(
              `
              id,
              status,
              buyer_id,
              seller_id,
              product_id,
              product_variant_id,
              quantity,
              total_amount,
              grand_total,
              shipping_fee,
              currency,
              payment_method,
              selling_fee_percentage,
              selling_fee_amount,
              seller_payout_amount,
              created_at,
              updated_at,
              buyer:users!orders_buyer_id_fkey(id, username, full_name, email, avatar_url),
              seller:users!orders_seller_id_fkey(id, username, full_name, email, avatar_url),
              product:products(id, title, status, price, currency, has_variants),
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
              delivery:order_deliveries(id, delivery_type, delivery_status, tracking_number, estimated_delivery_date, actual_delivery_date),
              messages:order_messages(id, sender_id, receiver_id, message, created_at),
              statuses:order_statuses(id, status, reason, metadata, created_at, changed_by),
              relist_requested,
              relist_reason,
              relist_requested_at,
              relist_resolved_at,
              relist_resolved_by
            `,
            )
            .eq('seller_id', userId)
            .order('created_at', { ascending: false }),
          supabase
            .from('orders')
            .select(
              `
              id,
              status,
              buyer_id,
              seller_id,
              product_id,
              product_variant_id,
              quantity,
              total_amount,
              grand_total,
              shipping_fee,
              currency,
              payment_method,
              selling_fee_percentage,
              selling_fee_amount,
              seller_payout_amount,
              created_at,
              updated_at,
              buyer:users!orders_buyer_id_fkey(id, username, full_name, email, avatar_url),
              seller:users!orders_seller_id_fkey(id, username, full_name, email, avatar_url),
              product:products(id, title, status, price, currency, has_variants),
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
              delivery:order_deliveries(id, delivery_type, delivery_status, tracking_number, estimated_delivery_date, actual_delivery_date),
              messages:order_messages(id, sender_id, receiver_id, message, created_at),
              statuses:order_statuses(id, status, reason, metadata, created_at, changed_by),
              relist_requested,
              relist_reason,
              relist_requested_at,
              relist_resolved_at,
              relist_resolved_by
            `,
            )
            .eq('buyer_id', userId)
            .order('created_at', { ascending: false }),
          supabase
            .from('user_verification_requests')
            .select('id, user_id, document_path, status, review_notes, reviewed_by, reviewed_at, created_at, updated_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false }),
        ]);

      if (userError) {
        throw userError;
      }
      if (listingsError) {
        throw listingsError;
      }
      if (sellerError) {
        throw sellerError;
      }
      if (buyerError) {
        throw buyerError;
      }
      if (verificationError) {
        console.error('Error fetching verification requests:', verificationError);
        console.error('Verification error details:', JSON.stringify(verificationError, null, 2));
        // Don't throw - continue with empty array so user details can still be shown
      }

      // Log what we got from the original query
      console.log('Original verificationRequests query result:', {
        data: verificationRequests,
        isArray: Array.isArray(verificationRequests),
        length: verificationRequests?.length,
        error: verificationError
      });

      if (!userRecord) {
        throw new Error('User not found');
      }

      const baseOverview = users.find((row) => row.id === userId);

      // Normalize variant data for orders (variant might be null, array, or single object)
      const normalizeOrders = (orders: any[]) => {
        return (orders || []).map((order: any) => {
          const variant = order.variant 
            ? (Array.isArray(order.variant) ? order.variant[0] : order.variant)
            : null;
          return { ...order, variant };
        });
      };

      // Ensure verificationRequests is always an array
      const normalizedVerificationRequests = (verificationRequests as UserVerificationRequest[] | null) ?? [];
      
      // If original query failed but debug query works, use debug query result
      if (normalizedVerificationRequests.length === 0 && !verificationError) {
        console.warn('Original query returned empty but no error. This might be an RLS issue.');
      }
      
      // Debug logging and fallback: if original query failed, try again
      let finalVerificationRequests = normalizedVerificationRequests;
      if (normalizedVerificationRequests.length === 0) {
        console.log(`No verification requests found for user ${userId}. Checking if requests exist...`);
        // Try a direct query to see if requests exist for this user
        const { data: debugRequests, error: debugError } = await supabase
          .from('user_verification_requests')
          .select('id, user_id, document_path, status, review_notes, reviewed_by, reviewed_at, created_at, updated_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (debugError) {
          console.error('Debug query error:', debugError);
        } else {
          console.log(`Debug query found ${debugRequests?.length ?? 0} verification requests for user ${userId}`);
          if (debugRequests && debugRequests.length > 0) {
            console.log('Found requests:', debugRequests);
            // Use the debug query result if original query failed
            finalVerificationRequests = debugRequests as UserVerificationRequest[];
          }
        }
        
        // Also check if ANY verification requests exist at all
        const { data: allRequests, error: allError } = await supabase
          .from('user_verification_requests')
          .select('id, user_id, status, created_at')
          .limit(10);
        if (allError) {
          console.error('Error checking all requests:', allError);
          console.error('This is likely an RLS policy issue. The service_role policy may not exist.');
        } else {
          console.log(`Total verification requests in database: ${allRequests?.length ?? 0}`);
          if (allRequests && allRequests.length > 0) {
            console.log('Sample requests:', allRequests);
          } else {
            console.warn('⚠️ No verification requests found. This suggests RLS is blocking service_role access.');
            console.warn('⚠️ You need to run this SQL to add the service_role policy:');
            console.warn(`
CREATE POLICY "Service role can manage all verification requests"
ON "public"."user_verification_requests"
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
            `);
          }
        }
      }

      const details: UserDetails = {
        ...userRecord,
        stats:
          baseOverview?.stats ?? {
            activeListings: 0,
            soldListings: 0,
            ordersAsBuyer: 0,
            ordersAsSeller: 0,
          },
        rating: userRecord.rating ?? null,
        listings: listings ?? [],
        ordersAsSeller: normalizeOrders(sellerOrders ?? []),
        ordersAsBuyer: normalizeOrders(buyerOrders ?? []),
        verificationRequests: finalVerificationRequests,
      };

      setSelectedUserDetails(details);
      return details;
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('Failed to load user details');
      setSelectedUserDetails(null);
      return null;
    } finally {
      setDetailLoading(false);
    }
    },
    [users],
  );

  useEffect(() => {
    setListingSearch('');
    setListingSorting([]);
    setSelectedListing(null);
    setSellerOrderSearch('');
    setBuyerOrderSearch('');
    setSellerOrderSorting([]);
    setBuyerOrderSorting([]);
    setSelectedOrder(null);
    setSelectedVerification(null);
    setVerificationPreviewUrl(null);
    setVerificationDialogOpen(false);
    setVerificationNotes('');
    setVerificationActionLoading(null);
  }, [selectedUserDetails?.id]);

  const pendingCount = useMemo(
    () => users.filter((entry) => !!entry.pending_verification).length,
    [users],
  );

  const filteredUsers = useMemo(() => {
    const base =
      userListFilter === 'pending'
        ? users.filter((user) => !!user.pending_verification)
        : users;

    if (!searchQuery) {
      return base;
    }
    const query = searchQuery.toLowerCase();
    return base.filter((user) => {
      const values = [
        user.username,
        user.full_name,
        user.email,
        user.phone,
        user.location,
      ]
        .filter(Boolean)
        .map((value) => value!.toLowerCase());

      if (values.some((value) => value.includes(query))) {
        return true;
      }

      const statsMatch = [
        user.stats.activeListings.toString(),
        user.stats.soldListings.toString(),
        user.stats.ordersAsBuyer.toString(),
        user.stats.ordersAsSeller.toString(),
      ].some((value) => value.includes(query));

      return statsMatch;
    });
  }, [users, searchQuery, userListFilter]);

  const userListings = selectedUserDetails?.listings ?? [];

  const filteredListings = useMemo(() => {
    if (!listingSearch) {
      return userListings;
    }
    const q = listingSearch.toLowerCase();
    return userListings.filter((listing) => {
      const pool = [
        listing.title,
        listing.status,
        listing.description ?? '',
        listing.location ?? '',
        ...(listing.tags ?? []),
      ]
        .filter(Boolean)
        .map((value) => value.toLowerCase());
      return pool.some((value) => value.includes(q));
    });
  }, [userListings, listingSearch]);

  const sellerOrders = selectedUserDetails?.ordersAsSeller ?? [];
  const buyerOrders = selectedUserDetails?.ordersAsBuyer ?? [];

  const pendingVerification = useMemo(
    () => selectedUserDetails?.verificationRequests?.find((request) => request.status === 'pending') ?? null,
    [selectedUserDetails?.verificationRequests],
  );

  const lastVerification = useMemo(
    () => selectedUserDetails?.verificationRequests?.[0] ?? null,
    [selectedUserDetails?.verificationRequests],
  );

  const formatCurrency = (amount?: number | null, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(Number(amount ?? 0));
  };

  const normaliseStatus = (status: string) => status.replace(/_/g, ' ');

  const makeOrderFilter = (role: 'seller' | 'buyer', query: string) => {
    const q = query.toLowerCase();
    return (order: OrderRelation) => {
      const counterpart = role === 'seller' ? order.buyer : order.seller;
      const values = [
        order.id,
        order.product?.title ?? '',
        counterpart?.full_name ?? '',
        counterpart?.username ?? '',
        counterpart?.email ?? '',
        order.status,
        order.payment_method ?? '',
        (order.delivery && order.delivery[0]?.delivery_status) ?? '',
      ]
        .filter(Boolean)
        .map((value) => value.toLowerCase());
      return values.some((value) => value.includes(q));
    };
  };

  const filteredSellerOrders = useMemo(() => {
    if (!sellerOrderSearch) {
      return sellerOrders;
    }
    return sellerOrders.filter(makeOrderFilter('seller', sellerOrderSearch));
  }, [sellerOrders, sellerOrderSearch]);

  const filteredBuyerOrders = useMemo(() => {
    if (!buyerOrderSearch) {
      return buyerOrders;
    }
    return buyerOrders.filter(makeOrderFilter('buyer', buyerOrderSearch));
  }, [buyerOrders, buyerOrderSearch]);

  const columns = useMemo<ColumnDef<UserRow>[]>(
    () => [
      {
        accessorKey: 'full_name',
        header: 'User',
        cell: ({ row }) => {
          const user = row.original;
          const initials =
            (user.full_name || user.username || 'NA')
              .split(' ')
              .map((part) => part.charAt(0))
              .join('')
              .slice(0, 2)
              .toUpperCase() || 'NA';
          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={undefined} alt={user.full_name ?? user.username ?? 'User'} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium text-sm">
                  {user.full_name ?? user.username ?? 'Unnamed user'}
                </span>
                {user.email && (
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'location',
        header: 'Location',
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {row.original.location ?? '—'}
          </div>
        ),
      },
      {
        accessorKey: 'stats.activeListings',
        header: 'Active Listings',
        cell: ({ row }) => (
          <div className="text-sm font-medium">{row.original.stats.activeListings}</div>
        ),
      },
      {
        accessorKey: 'stats.soldListings',
        header: 'Sold',
        cell: ({ row }) => (
          <div className="text-sm font-medium text-emerald-600">
            {row.original.stats.soldListings}
          </div>
        ),
      },
      {
        accessorKey: 'stats.ordersAsSeller',
        header: 'Seller Orders',
        cell: ({ row }) => (
          <div className="text-sm font-medium">{row.original.stats.ordersAsSeller}</div>
        ),
      },
      {
        accessorKey: 'stats.ordersAsBuyer',
        header: 'Buyer Orders',
        cell: ({ row }) => (
          <div className="text-sm font-medium">{row.original.stats.ordersAsBuyer}</div>
        ),
      },
      {
        accessorKey: 'member_since',
        header: 'Member Since',
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {row.original.member_since
              ? format(new Date(row.original.member_since), 'dd MMM yyyy')
              : '—'}
          </div>
        ),
      },
      {
        accessorKey: 'is_verified',
        header: 'Status',
        cell: ({ row }) => {
          const user = row.original;
          if (user.is_verified) {
            return (
              <Badge variant="outline" className="gap-1 text-green-600 border-green-200">
                <ShieldCheck className="h-3 w-3" />
                Verified
              </Badge>
            );
          }
          if (user.pending_verification) {
            return (
              <Badge variant="outline" className="border-amber-200 text-amber-600">
                Pending review
              </Badge>
            );
          }
          return <Badge variant="outline">Unverified</Badge>;
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredUsers,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const listingColumns = useMemo<ColumnDef<ProductListing>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Listing',
        cell: ({ row }) => {
          const listing = row.original;
          return (
            <div className="space-y-1">
              <p className="font-medium">{listing.title}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="capitalize">
                  {listing.status}
                </Badge>
                {listing.location && <span>{listing.location}</span>}
                {listing.is_negotiable && <span>Negotiable</span>}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'price',
        header: 'Price',
        cell: ({ row }) => {
          const listing = row.original;
          return (
            <span className="font-medium">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: listing.currency ?? 'USD',
              }).format(Number(listing.price ?? 0))}
            </span>
          );
        },
      },
      {
        accessorKey: 'updated_at',
        header: 'Last Updated',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {format(new Date(row.original.updated_at), 'dd MMM yyyy')}
          </span>
        ),
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {format(new Date(row.original.created_at), 'dd MMM yyyy')}
          </span>
        ),
      },
    ],
    [],
  );

  const listingsTable = useReactTable({
    data: filteredListings,
    columns: listingColumns,
    state: { sorting: listingSorting },
    onSortingChange: setListingSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const buildOrderColumns = (role: 'seller' | 'buyer'): ColumnDef<OrderRelation>[] => [
    {
      accessorKey: 'id',
      header: 'Order ID',
      cell: ({ row }) => (
        <span className="font-mono text-xs uppercase">
          {row.original.id.slice(0, 8)}
        </span>
      ),
    },
    {
      accessorKey: role === 'seller' ? 'buyer' : 'seller',
      header: role === 'seller' ? 'Buyer' : 'Seller',
      cell: ({ row }) => {
        const counterpart = role === 'seller' ? row.original.buyer : row.original.seller;
        return (
          <div className="space-y-1 text-sm">
            <span className="font-medium">
              {counterpart?.full_name ?? counterpart?.username ?? 'Unknown'}
            </span>
            {counterpart?.email && (
              <span className="text-xs text-muted-foreground">{counterpart.email}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'product.title',
      header: 'Product',
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="space-y-1 text-sm">
            <p className="font-medium">{order.product?.title ?? 'N/A'}</p>
            {order.variant && order.variant.option_values && order.variant.option_values.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {order.variant.option_values
                  .map((vv: any) => {
                    const optionValue = vv.option_value;
                    const groupName = optionValue?.option_group?.name || '';
                    const valueName = optionValue?.name || '';
                    return groupName && valueName ? `${groupName}: ${valueName}` : valueName;
                  })
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Qty {order.quantity}
              {order.variant?.sku && ` • SKU: ${order.variant.sku}`}
            </p>
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {normaliseStatus(row.original.status)}
        </Badge>
      ),
    },
    {
      accessorKey: 'grand_total',
      header: 'Total',
      cell: ({ row }) => (
        <span className="font-medium">
          {formatCurrency(
            row.original.grand_total ?? row.original.total_amount,
            row.original.currency,
          )}
        </span>
      ),
    },
    {
      id: 'commission',
      header: 'Commission',
      cell: ({ row }) => {
        const order = row.original;
        if (order.selling_fee_percentage && order.selling_fee_percentage > 0) {
          return (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                {order.selling_fee_percentage}%
              </div>
              {order.selling_fee_amount !== undefined && order.selling_fee_amount !== null && (
                <div className="text-xs font-medium text-red-600">
                  -{formatCurrency(order.selling_fee_amount, order.currency)}
                </div>
              )}
            </div>
          );
        }
        return <span className="text-xs text-muted-foreground">—</span>;
      },
    },
    {
      id: 'payout',
      header: 'Payout',
      cell: ({ row }) => {
        const order = row.original;
        if (order.seller_payout_amount !== undefined && order.seller_payout_amount !== null) {
          return (
            <span className="font-medium text-green-600">
              {formatCurrency(order.seller_payout_amount, order.currency)}
            </span>
          );
        }
        return <span className="text-xs text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.original.created_at), 'dd MMM yyyy')}
        </span>
      ),
    },
    {
      accessorKey: 'updated_at',
      header: 'Updated',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.original.updated_at), 'dd MMM yyyy')}
        </span>
      ),
    },
  ];

  const sellerOrderColumns = useMemo(() => buildOrderColumns('seller'), []);
  const buyerOrderColumns = useMemo(() => buildOrderColumns('buyer'), []);

  const sellerOrdersTable = useReactTable({
    data: filteredSellerOrders,
    columns: sellerOrderColumns,
    state: { sorting: sellerOrderSorting },
    onSortingChange: setSellerOrderSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const buyerOrdersTable = useReactTable({
    data: filteredBuyerOrders,
    columns: buyerOrderColumns,
    state: { sorting: buyerOrderSorting },
    onSortingChange: setBuyerOrderSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const renderSortableHeader = (column: any) => {
    const sorted = column.getIsSorted() as string | false;
    const label =
      typeof column.columnDef.header === 'function'
        ? column.columnDef.header(column.getContext())
        : column.columnDef.header;
    return (
      <div className="flex items-center gap-1">
        {label}
        {sorted === 'asc' ? '↑' : sorted === 'desc' ? '↓' : null}
      </div>
    );
  };

  const orderTimelineEvents = useMemo(() => {
    if (!selectedOrder) {
      return [];
    }

    const timeline = new Map<
      string,
      {
        id: string;
        status: OrderStatus;
        created_at: string;
        reason: string | null;
      }
    >();

    (selectedOrder.order.statuses ?? []).forEach((entry) => {
      timeline.set(entry.id, {
        id: entry.id,
        status: entry.status,
        created_at: entry.created_at,
        reason: entry.reason ?? null,
      });
    });

    const currentKey = `current-${selectedOrder.order.status}-${selectedOrder.order.updated_at}`;
    const hasCurrent = Array.from(timeline.values()).some(
      (event) =>
        event.status === selectedOrder.order.status &&
        new Date(event.created_at).getTime() === new Date(selectedOrder.order.updated_at).getTime(),
    );

    if (!hasCurrent) {
      timeline.set(currentKey, {
        id: currentKey,
        status: selectedOrder.order.status,
        created_at: selectedOrder.order.updated_at,
        reason: null,
      });
    }

    return Array.from(timeline.values()).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }, [selectedOrder]);

  const isOrderActionInFlight = orderActionLoading !== null;
  const canCancelSelectedOrder =
    !!selectedOrder && selectedOrder.order.status !== 'cancelled' && !isOrderActionInFlight;
  const canRelistSelectedProduct =
    !!selectedOrder &&
    selectedOrder.order.status === 'cancelled' &&
    !!selectedOrder.order.product &&
    selectedOrder.order.product.status !== 'active' &&
    !isOrderActionInFlight;
  const canRemoveSelectedProduct =
    !!selectedOrder &&
    selectedOrder.order.status === 'cancelled' &&
    !!selectedOrder.order.product &&
    selectedOrder.order.product.status !== 'removed' &&
    !isOrderActionInFlight;

  const refreshOrderData = useCallback(
    async (orderId: string, role: 'seller' | 'buyer') => {
      if (!selectedUserId) {
        return;
      }
      const updatedDetails = await fetchUserDetails(selectedUserId);
      if (updatedDetails) {
        const refreshedOrder =
          role === 'seller'
            ? updatedDetails.ordersAsSeller.find((entry) => entry.id === orderId)
            : updatedDetails.ordersAsBuyer.find((entry) => entry.id === orderId);
        if (refreshedOrder) {
          setSelectedOrder({ order: refreshedOrder, role });
        } else {
          setSelectedOrder(null);
        }
      }
    },
    [fetchUserDetails, selectedUserId],
  );

  const handleOpenVerificationRequest = useCallback(
    async (request: UserVerificationRequest) => {
      setSelectedVerification(request);
      setVerificationDialogOpen(true);
      setVerificationNotes(request.review_notes ?? '');
      setVerificationPreviewUrl(null);

      try {
        const { data, error } = await supabase.storage
          .from('verification-documents')
          .createSignedUrl(request.document_path, 60 * 30);

        if (error) {
          throw error;
        }

        setVerificationPreviewUrl(data?.signedUrl ?? null);
      } catch (error) {
        console.error('Failed to load verification document:', error);
        toast.error('Unable to load verification document.');
      }
    },
    [],
  );

  const handleVerificationDecision = useCallback(
    async (status: VerificationStatus) => {
      if (!selectedVerification) {
        return;
      }

      setVerificationActionLoading(status === 'approved' ? 'approve' : 'reject');
      try {
        const timestamp = new Date().toISOString();
        const trimmedNotes = verificationNotes.trim();

        const { error: updateError } = await supabase
          .from('user_verification_requests')
          .update({
            status,
            review_notes: trimmedNotes.length > 0 ? trimmedNotes : null,
            reviewed_at: timestamp,
            reviewed_by: null,
          })
          .eq('id', selectedVerification.id);

        if (updateError) {
          throw updateError;
        }

        const { error: userUpdateError } = await supabase
          .from('users')
          .update({
            is_verified: status === 'approved',
            updated_at: timestamp,
          })
          .eq('id', selectedVerification.user_id);

        if (userUpdateError) {
          throw userUpdateError;
        }

        toast.success(
          status === 'approved'
            ? 'User verification approved.'
            : 'Verification request rejected.'
        );

        setVerificationDialogOpen(false);
        setSelectedVerification(null);
        setVerificationPreviewUrl(null);
        setVerificationNotes('');

        await fetchUserDetails(selectedVerification.user_id);
        fetchUserOverview();
      } catch (error) {
        console.error('Error updating verification status:', error);
        toast.error('Failed to update verification status.');
      } finally {
        setVerificationActionLoading(null);
      }
    },
    [fetchUserDetails, fetchUserOverview, selectedVerification, verificationNotes],
  );

  const handleCancelSelectedOrder = async () => {
    if (!selectedOrder || !selectedUserId) {
      return;
    }
    if (selectedOrder.order.status === 'cancelled') {
      toast.error('Order is already cancelled.');
      return;
    }
    setOrderActionLoading('cancel');
    try {
      const timestamp = new Date().toISOString();
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          updated_at: timestamp,
          relist_requested: false,
          relist_resolved_at: timestamp,
        })
        .eq('id', selectedOrder.order.id);

      if (error) {
        throw error;
      }

      toast.success('Order cancelled');
      await refreshOrderData(selectedOrder.order.id, selectedOrder.role);
    } catch (error) {
      console.error('Failed to cancel order:', error);
      toast.error('Failed to cancel order');
    } finally {
      setOrderActionLoading(null);
    }
  };

  const handleRelistProduct = async () => {
    if (!selectedOrder || !selectedOrder.order.product) {
      toast.error('Product information unavailable.');
      return;
    }
    if (selectedOrder.order.status !== 'cancelled') {
      toast.error('Cancel the order before relisting the product.');
      return;
    }
    setOrderActionLoading('relist');
    try {
      const timestamp = new Date().toISOString();
      const { error } = await supabase
        .from('products')
        .update({
          status: 'active',
          updated_at: timestamp,
        })
        .eq('id', selectedOrder.order.product.id);

      if (error) {
        throw error;
      }

      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          relist_requested: false,
          relist_resolved_at: timestamp,
        })
        .eq('id', selectedOrder.order.id);

      if (orderUpdateError) {
        throw orderUpdateError;
      }

      toast.success('Product relisted');
      await refreshOrderData(selectedOrder.order.id, selectedOrder.role);
    } catch (error) {
      console.error('Failed to relist product:', error);
      toast.error('Failed to relist product');
    } finally {
      setOrderActionLoading(null);
    }
  };

  const handleRemoveProduct = async () => {
    if (!selectedOrder || !selectedOrder.order.product) {
      toast.error('Product information unavailable.');
      return;
    }
    if (selectedOrder.order.status !== 'cancelled') {
      toast.error('Cancel the order before removing the product.');
      return;
    }
    setOrderActionLoading('remove');
    try {
      const timestamp = new Date().toISOString();
      const { error } = await supabase
        .from('products')
        .update({
          status: 'removed',
          updated_at: timestamp,
        })
        .eq('id', selectedOrder.order.product.id);

      if (error) {
        throw error;
      }

      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          relist_requested: false,
          relist_resolved_at: timestamp,
        })
        .eq('id', selectedOrder.order.id);

      if (orderUpdateError) {
        throw orderUpdateError;
      }

      toast.success('Product marked as removed');
      await refreshOrderData(selectedOrder.order.id, selectedOrder.role);
    } catch (error) {
      console.error('Failed to remove product:', error);
      toast.error('Failed to remove product');
    } finally {
      setOrderActionLoading(null);
    }
  };

  const conversations: Conversation[] = useMemo(() => {
    if (!selectedUserDetails) {
      return [];
    }

    const orders = [
      ...(selectedUserDetails.ordersAsSeller ?? []),
      ...(selectedUserDetails.ordersAsBuyer ?? []),
    ];

    const conversationList: Conversation[] = [];

    orders.forEach((order) => {
      if (!order.messages || order.messages.length === 0) {
        return;
      }

      const counterpart =
        order.buyer_id === selectedUserDetails.id ? order.seller : order.buyer;

      const displayName =
        counterpart?.full_name ??
        counterpart?.username ??
        (counterpart?.email ? `User (${counterpart.email})` : 'Unknown user');

      const sortedMessages = [...order.messages].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );

      conversationList.push({
        id: order.id,
        order,
        counterpart: counterpart
          ? {
              id: counterpart.id,
              displayName,
              email: counterpart.email ?? null,
            }
          : null,
        messages: sortedMessages,
      });
    });

    return conversationList.sort((a, b) => {
      const lastA =
        a.messages[a.messages.length - 1]?.created_at ?? a.order.updated_at;
      const lastB =
        b.messages[b.messages.length - 1]?.created_at ?? b.order.updated_at;
      return new Date(lastB).getTime() - new Date(lastA).getTime();
    });
  }, [selectedUserDetails]);

  const handleRowClick = (userId: string) => {
    setSelectedUserId(userId);
    setSelectedUserDetails(null);
    fetchUserDetails(userId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Support</h1>
          <p className="text-muted-foreground">
            Search and review users, their listings, orders, and conversations.
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <CardTitle className="text-xl">
                {userListFilter === 'pending' ? 'Pending Verification' : 'All Users'}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={fetchUserOverview} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
              </Button>
            </div>
            <Tabs
              value={userListFilter}
              onValueChange={(value) => setUserListFilter(value as 'all' | 'pending')}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid w-full grid-cols-2 sm:w-auto">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  Pending
                  {pendingCount > 0 && (
                    <span className="inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-amber-100 px-2 text-xs font-medium text-amber-700">
                      {pendingCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, location..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[540px]">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="whitespace-nowrap">
                          {header.isPlaceholder
                            ? null
                            : header.column.columnDef.header instanceof Function
                            ? header.column.columnDef.header(header.getContext())
                            : header.column.columnDef.header}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, index) => (
                      <TableRow key={`skeleton-${index}`}>
                        <TableCell colSpan={columns.length}>
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex flex-col gap-2 w-full">
                              <Skeleton className="h-4 w-48" />
                              <Skeleton className="h-4 w-32" />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="text-center py-10">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <span>No users found.</span>
                          <span className="text-sm">
                            Try adjusting your search or refresh the data.
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleRowClick(row.original.id)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {cell.column.columnDef.cell
                              ? cell.column.columnDef.cell(cell.getContext())
                              : cell.renderValue()}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Sheet
        open={!!selectedUserId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedUserId(null);
            setSelectedUserDetails(null);
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>User Overview</SheetTitle>
          </SheetHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !selectedUserDetails ? (
            <div className="py-8 text-center text-muted-foreground">
              Select a user from the table to view details.
            </div>
          ) : (
            <div className="space-y-6 py-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage
                        src={selectedUserDetails.avatar_url ?? undefined}
                        alt={selectedUserDetails.full_name ?? selectedUserDetails.username ?? 'User'}
                      />
                      <AvatarFallback>
                        {(selectedUserDetails.full_name ?? selectedUserDetails.username ?? 'NA')
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold">
                          {selectedUserDetails.full_name ??
                            selectedUserDetails.username ??
                            'Unnamed user'}
                        </h2>
                        {selectedUserDetails.is_verified && (
                          <Badge variant="outline" className="gap-1 text-green-600 border-green-200">
                            <ShieldCheck className="h-3 w-3" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {selectedUserDetails.email && <p>{selectedUserDetails.email}</p>}
                        {selectedUserDetails.phone && <p>{selectedUserDetails.phone}</p>}
                        {selectedUserDetails.location && <p>{selectedUserDetails.location}</p>}
                      </div>
                      {selectedUserDetails.member_since && (
                        <p className="text-xs text-muted-foreground">
                          Member since{' '}
                          {format(new Date(selectedUserDetails.member_since), 'dd MMM yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                  {selectedUserDetails.bio && (
                    <p className="mt-4 text-sm text-muted-foreground border-t pt-4">
                      {selectedUserDetails.bio}
                    </p>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Active Listings</p>
                        <p className="text-2xl font-semibold">
                          {selectedUserDetails.stats.activeListings}
                        </p>
                      </div>
                      <Store className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Sold Items</p>
                        <p className="text-2xl font-semibold text-emerald-600">
                          {selectedUserDetails.stats.soldListings}
                        </p>
                      </div>
                      <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Seller Orders</p>
                        <p className="text-2xl font-semibold">
                          {selectedUserDetails.stats.ordersAsSeller}
                        </p>
                      </div>
                      <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Buyer Orders</p>
                        <p className="text-2xl font-semibold">
                          {selectedUserDetails.stats.ordersAsBuyer}
                        </p>
                      </div>
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">Identity verification</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Review government ID submissions and control the account verification status.
                    </p>
                  </div>
                  <div>
                    {selectedUserDetails.is_verified ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        Verified
                      </Badge>
                    ) : pendingVerification ? (
                      <Badge variant="outline" className="border-amber-200 text-amber-600">
                        Pending review
                      </Badge>
                    ) : lastVerification ? (
                      <Badge variant="outline" className={lastVerification.status === 'rejected' ? 'border-rose-200 text-rose-600' : 'border-muted text-muted-foreground'}>
                        {lastVerification.status === 'approved' ? 'Approved' : 'Rejected'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Not submitted
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingVerification ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Submitted on {format(new Date(pendingVerification.created_at), 'dd MMM yyyy, HH:mm')}. Awaiting admin review.
                      </p>
                      <Button onClick={() => handleOpenVerificationRequest(pendingVerification)}>Review submission</Button>
                    </div>
                  ) : lastVerification ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Last submission on {format(new Date(lastVerification.created_at), 'dd MMM yyyy, HH:mm')} • {lastVerification.status === 'approved' ? 'Approved' : 'Rejected'}
                      </p>
                      {lastVerification.review_notes && (
                        <div className="rounded-md border border-muted bg-muted/40 p-3 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Admin notes: </span>
                          {lastVerification.review_notes}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-3">
                        <Button variant="outline" onClick={() => handleOpenVerificationRequest(lastVerification)}>
                          View submission
                        </Button>
                        {!selectedUserDetails.is_verified && (
                          <span className="text-xs text-muted-foreground">
                            Awaiting a new upload from the user.
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No verification submissions recorded yet.</p>
                  )}
                </CardContent>
              </Card>

              <Tabs defaultValue="listings">
                <TabsList>
                  <TabsTrigger value="listings">Listings</TabsTrigger>
                  <TabsTrigger value="seller-orders">Seller Orders</TabsTrigger>
                  <TabsTrigger value="buyer-orders">Buyer Orders</TabsTrigger>
                  <TabsTrigger value="conversations">Conversations</TabsTrigger>
                </TabsList>
                <TabsContent value="listings" className="space-y-4">
                  <Card>
                    <CardHeader className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <CardTitle className="text-lg">Listings</CardTitle>
                        <div className="relative w-full sm:w-72">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Search listings..."
                            value={listingSearch}
                            onChange={(event) => setListingSearch(event.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {userListings.length === 0 ? (
                        <div className="py-10 text-center text-muted-foreground">
                          This user has no listings yet.
                        </div>
                      ) : filteredListings.length === 0 ? (
                        <div className="py-10 text-center text-muted-foreground">
                          No listings match your search.
                        </div>
                      ) : (
                        <ScrollArea className="h-[400px]">
                          <Table>
                            <TableHeader>
                              {listingsTable.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                  {headerGroup.headers.map((header) => (
                                    <TableHead
                                      key={header.id}
                                      className="cursor-pointer select-none whitespace-nowrap"
                                      onClick={header.column.getToggleSortingHandler()}
                                    >
                                      {!header.isPlaceholder && renderSortableHeader(header.column)}
                                    </TableHead>
                                  ))}
                                </TableRow>
                              ))}
                            </TableHeader>
                            <TableBody>
                              {listingsTable.getRowModel().rows.map((row) => (
                                <TableRow
                                  key={row.id}
                                  className="cursor-pointer hover:bg-muted/60 transition-colors"
                                  onClick={() => setSelectedListing(row.original)}
                                >
                                  {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id}>
                                      {cell.column.columnDef.cell
                                        ? cell.column.columnDef.cell(cell.getContext())
                                        : cell.renderValue()}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="seller-orders" className="space-y-4">
                  <Card>
                    <CardHeader className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <CardTitle className="text-lg">Seller Orders</CardTitle>
                        <div className="relative w-full sm:w-72">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Search seller orders..."
                            value={sellerOrderSearch}
                            onChange={(event) => setSellerOrderSearch(event.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {sellerOrders.length === 0 ? (
                        <div className="py-10 text-center text-muted-foreground">
                          No orders as a seller yet.
                        </div>
                      ) : filteredSellerOrders.length === 0 ? (
                        <div className="py-10 text-center text-muted-foreground">
                          No seller orders match your search.
                        </div>
                      ) : (
                        <ScrollArea className="h-[400px]">
                          <Table>
                            <TableHeader>
                              {sellerOrdersTable.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                  {headerGroup.headers.map((header) => (
                                    <TableHead
                                      key={header.id}
                                      className="cursor-pointer select-none whitespace-nowrap"
                                      onClick={header.column.getToggleSortingHandler()}
                                    >
                                      {!header.isPlaceholder && renderSortableHeader(header.column)}
                                    </TableHead>
                                  ))}
                                </TableRow>
                              ))}
                            </TableHeader>
                            <TableBody>
                              {sellerOrdersTable.getRowModel().rows.map((row) => (
                                <TableRow
                                  key={row.id}
                                  className="cursor-pointer hover:bg-muted/60 transition-colors"
                                  onClick={() => setSelectedOrder({ order: row.original, role: 'seller' })}
                                >
                                  {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id}>
                                      {cell.column.columnDef.cell
                                        ? cell.column.columnDef.cell(cell.getContext())
                                        : cell.renderValue()}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="buyer-orders" className="space-y-4">
                  <Card>
                    <CardHeader className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <CardTitle className="text-lg">Buyer Orders</CardTitle>
                        <div className="relative w-full sm:w-72">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Search buyer orders..."
                            value={buyerOrderSearch}
                            onChange={(event) => setBuyerOrderSearch(event.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {buyerOrders.length === 0 ? (
                        <div className="py-10 text-center text-muted-foreground">
                          No purchases recorded yet.
                        </div>
                      ) : filteredBuyerOrders.length === 0 ? (
                        <div className="py-10 text-center text-muted-foreground">
                          No buyer orders match your search.
                        </div>
                      ) : (
                        <ScrollArea className="h-[400px]">
                          <Table>
                            <TableHeader>
                              {buyerOrdersTable.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                  {headerGroup.headers.map((header) => (
                                    <TableHead
                                      key={header.id}
                                      className="cursor-pointer select-none whitespace-nowrap"
                                      onClick={header.column.getToggleSortingHandler()}
                                    >
                                      {!header.isPlaceholder && renderSortableHeader(header.column)}
                                    </TableHead>
                                  ))}
                                </TableRow>
                              ))}
                            </TableHeader>
                            <TableBody>
                              {buyerOrdersTable.getRowModel().rows.map((row) => (
                                <TableRow
                                  key={row.id}
                                  className="cursor-pointer hover:bg-muted/60 transition-colors"
                                  onClick={() => setSelectedOrder({ order: row.original, role: 'buyer' })}
                                >
                                  {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id}>
                                      {cell.column.columnDef.cell
                                        ? cell.column.columnDef.cell(cell.getContext())
                                        : cell.renderValue()}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="conversations" className="space-y-4">
                  {conversations.length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-center text-muted-foreground">
                        No conversations recorded yet.
                      </CardContent>
                    </Card>
                  ) : (
                    conversations.map((conversation) => (
                      <Card key={conversation.id}>
                        <CardContent className="p-6 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold">Order #{conversation.id}</p>
                              {conversation.counterpart && (
                                <p className="text-sm text-muted-foreground">
                                  With {conversation.counterpart.displayName}
                                  {conversation.counterpart.email
                                    ? ` • ${conversation.counterpart.email}`
                                    : ''}
                                </p>
                              )}
                            </div>
                            <MessageSquare className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="space-y-2">
                            {conversation.messages.map((message) => {
                              const isUserMessage = message.sender_id === selectedUserDetails.id;
                              return (
                                <div
                                  key={message.id}
                                  className="rounded-md border p-3 text-sm"
                                >
                                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mb-1">
                                    <span>{isUserMessage ? 'User' : 'Counterpart'}</span>
                                    <span>
                                      {format(new Date(message.created_at), 'dd MMM yyyy, HH:mm')}
                                    </span>
                                  </div>
                                  <p>{message.message}</p>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>
              </Tabs>

              <Dialog open={!!selectedListing} onOpenChange={(open) => !open && setSelectedListing(null)}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    {selectedListing ? (
                      <>
                        <DialogTitle>{selectedListing.title}</DialogTitle>
                        <DialogDescription>
                          Listed on {format(new Date(selectedListing.created_at), 'dd MMM yyyy')}
                        </DialogDescription>
                      </>
                    ) : (
                      <>
                        <DialogTitle>Product Listing</DialogTitle>
                        <DialogDescription>Loading listing details...</DialogDescription>
                      </>
                    )}
                  </DialogHeader>
                  {selectedListing && (
                    <>
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge variant="outline" className="capitalize">
                            {selectedListing.status}
                          </Badge>
                          <span className="font-semibold">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: selectedListing.currency ?? 'USD',
                            }).format(Number(selectedListing.price ?? 0))}
                          </span>
                          {selectedListing.condition && (
                            <Badge variant="secondary" className="capitalize">
                              {selectedListing.condition}
                            </Badge>
                          )}
                          {selectedListing.is_negotiable && (
                            <Badge variant="outline">Negotiable</Badge>
                          )}
                        </div>
                        <div className="grid gap-2 text-sm text-muted-foreground">
                          {selectedListing.location && <p>Location: {selectedListing.location}</p>}
                          <p>
                            Last updated:{' '}
                            {format(new Date(selectedListing.updated_at), 'dd MMM yyyy')}
                          </p>
                          {selectedListing.tags && selectedListing.tags.length > 0 && (
                            <p>Tags: {selectedListing.tags.join(', ')}</p>
                          )}
                        </div>
                        {selectedListing.description && (
                          <Card>
                            <CardContent className="p-4 space-y-2">
                              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                Description
                              </h4>
                              <p className="text-sm leading-relaxed text-foreground">
                                {selectedListing.description}
                              </p>
                            </CardContent>
                          </Card>
                        )}
                        {selectedListing.images && selectedListing.images.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-muted-foreground">Images</h4>
                            <div className="flex gap-2 overflow-x-auto pb-2">
                              {selectedListing.images.map((image, index) => (
                                <div
                                  key={`${selectedListing.id}-modal-image-${index}`}
                                  className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border bg-muted"
                                >
                                  {image.image_url ? (
                                    <img
                                      src={image.image_url}
                                      alt={image.alt_text ?? selectedListing.title}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                                      No Image
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </DialogContent>
              </Dialog>

              <Dialog
                open={verificationDialogOpen}
                onOpenChange={(open) => {
                  setVerificationDialogOpen(open);
                  if (!open) {
                    setSelectedVerification(null);
                    setVerificationPreviewUrl(null);
                    setVerificationNotes('');
                    setVerificationActionLoading(null);
                  }
                }}
              >
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    {selectedVerification ? (
                      <>
                        <DialogTitle>Verification request</DialogTitle>
                        <DialogDescription>
                          Submitted on{' '}
                          {format(new Date(selectedVerification.created_at), 'dd MMM yyyy, HH:mm')}
                        </DialogDescription>
                      </>
                    ) : (
                      <>
                        <DialogTitle>Verification request</DialogTitle>
                        <DialogDescription>Loading verification details...</DialogDescription>
                      </>
                    )}
                  </DialogHeader>
                  {selectedVerification ? (
                    <>

                      <div className="space-y-5">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Document preview</p>
                          <div className="flex h-64 w-full items-center justify-center overflow-hidden rounded-lg border bg-muted/30">
                            {verificationPreviewUrl ? (
                              <img
                                src={verificationPreviewUrl}
                                alt="Verification document"
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        <div className="grid gap-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Status</span>
                            <Badge variant="outline" className="capitalize">
                              {selectedVerification.status}
                            </Badge>
                          </div>
                          {selectedVerification.reviewed_at && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Last reviewed</span>
                              <span>{format(new Date(selectedVerification.reviewed_at), 'dd MMM yyyy, HH:mm')}</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="verification-notes" className="text-sm font-medium text-muted-foreground">
                            Admin notes
                          </label>
                          <Textarea
                            id="verification-notes"
                            value={verificationNotes}
                            onChange={(event) => setVerificationNotes(event.target.value)}
                            placeholder="Add context for your decision (optional)."
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                          <Button
                            variant="outline"
                            onClick={() => setVerificationDialogOpen(false)}
                            disabled={verificationActionLoading !== null}
                          >
                            Close
                          </Button>
                          <div className="flex gap-2">
                            <Button
                              variant="destructive"
                              onClick={() => handleVerificationDecision('rejected')}
                              disabled={verificationActionLoading !== null}
                            >
                              {verificationActionLoading === 'reject' ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Rejecting
                                </>
                              ) : (
                                'Reject'
                              )}
                            </Button>
                            <Button
                              onClick={() => handleVerificationDecision('approved')}
                              disabled={verificationActionLoading !== null}
                            >
                              {verificationActionLoading === 'approve' ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Approving
                                </>
                              ) : (
                                'Approve'
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-10 text-center text-muted-foreground">
                      No verification request selected.
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            {selectedOrder ? (
              <>
                <DialogTitle>Order {selectedOrder.order.id.slice(0, 8).toUpperCase()}</DialogTitle>
                <DialogDescription>
                  Placed on {format(new Date(selectedOrder.order.created_at), 'dd MMM yyyy, HH:mm')}
                </DialogDescription>
              </>
            ) : (
              <>
                <DialogTitle>Order Details</DialogTitle>
                <DialogDescription>Loading order details...</DialogDescription>
              </>
            )}
          </DialogHeader>
          {selectedOrder && (
            <>

              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleCancelSelectedOrder}
                    disabled={!canCancelSelectedOrder}
                  >
                    {orderActionLoading === 'cancel' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Cancel Order'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRelistProduct}
                    disabled={!canRelistSelectedProduct}
                  >
                    {orderActionLoading === 'relist' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Relist Product'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRemoveProduct}
                    disabled={!canRemoveSelectedProduct}
                  >
                    {orderActionLoading === 'remove' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Mark Removed'
                    )}
                  </Button>
                </div>

                {selectedOrder.order.relist_requested && (
                  <Card className="border-amber-300 bg-amber-50">
                    <CardContent className="p-4 space-y-2">
                      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                        Relist Requested by Seller
                      </Badge>
                      {selectedOrder.order.relist_requested_at && (
                        <p className="text-xs text-muted-foreground">
                          Requested on{' '}
                          {format(
                            new Date(selectedOrder.order.relist_requested_at),
                            'dd MMM yyyy, HH:mm',
                          )}
                        </p>
                      )}
                      {selectedOrder.order.relist_reason && (
                        <p className="text-sm text-muted-foreground">
                          Reason: {selectedOrder.order.relist_reason}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardContent className="p-4 space-y-1">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase">
                        Overview
                      </h4>
                      <p>
                        Status:{' '}
                        <Badge variant="outline" className="capitalize">
                          {normaliseStatus(selectedOrder.order.status)}
                        </Badge>
                      </p>
                      <p>
                        Total:{' '}
                        {formatCurrency(
                          selectedOrder.order.grand_total ?? selectedOrder.order.total_amount,
                          selectedOrder.order.currency,
                        )}
                      </p>
                      <p>Quantity: {selectedOrder.order.quantity}</p>
                      {selectedOrder.order.payment_method && (
                        <p>Payment: {selectedOrder.order.payment_method}</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Commission & Payout Information */}
                  {selectedOrder.order.selling_fee_percentage !== undefined && selectedOrder.order.selling_fee_percentage !== null && selectedOrder.order.selling_fee_percentage > 0 && (
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <h4 className="text-sm font-semibold uppercase text-muted-foreground">
                            Commission & Payout
                          </h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Sale Amount:</span>
                              <span className="text-sm font-medium">
                                {formatCurrency(selectedOrder.order.total_amount, selectedOrder.order.currency)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Percent className="h-3 w-3" />
                                Commission ({selectedOrder.order.selling_fee_percentage}%):
                              </span>
                              <span className="text-sm font-medium text-red-600">
                                -{formatCurrency(selectedOrder.order.selling_fee_amount || 0, selectedOrder.order.currency)}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-semibold">Seller Payout:</span>
                              <span className="text-sm font-bold text-green-600">
                                {formatCurrency(selectedOrder.order.seller_payout_amount || 0, selectedOrder.order.currency)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardContent className="p-4 space-y-1">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase">
                        Counterpart
                      </h4>
                      {(() => {
                        const counterpart =
                          selectedOrder.role === 'seller'
                            ? selectedOrder.order.buyer
                            : selectedOrder.order.seller;
                        if (!counterpart) {
                          return <p className="text-sm text-muted-foreground">Not available</p>;
                        }
                        return (
                          <div className="space-y-1">
                            <p className="font-medium">
                              {counterpart.full_name ?? counterpart.username ?? 'Unknown'}
                            </p>
                            {counterpart.email && (
                              <p className="text-sm text-muted-foreground">{counterpart.email}</p>
                            )}
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </div>

                {selectedOrder.order.product && (
                  <Card>
                    <CardContent className="p-4 space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase">
                        Product
                      </h4>
                      <p className="font-medium">{selectedOrder.order.product.title}</p>
                      {selectedOrder.order.variant && selectedOrder.order.variant.option_values && selectedOrder.order.variant.option_values.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Variant Options:</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedOrder.order.variant.option_values.map((vv: any, index: number) => {
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
                      {selectedOrder.order.variant?.sku && (
                        <p className="text-xs text-muted-foreground">SKU: {selectedOrder.order.variant.sku}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Price: {formatCurrency(
                          selectedOrder.order.product.price,
                          selectedOrder.order.product.currency ?? selectedOrder.order.currency,
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Quantity: {selectedOrder.order.quantity}
                      </p>
                      {selectedOrder.order.variant && (
                        <div className="mt-2 p-2 bg-muted rounded-md text-xs space-y-1">
                          <p className="text-muted-foreground font-medium">Variant Stock:</p>
                          <p>Available: {selectedOrder.order.variant.quantity_available}</p>
                          <p>Reserved: {selectedOrder.order.variant.quantity_reserved}</p>
                          {selectedOrder.order.variant.price_override && (
                            <p>Price Override: {formatCurrency(selectedOrder.order.variant.price_override, selectedOrder.order.currency)}</p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <ArrowRightCircle className="h-4 w-4 text-muted-foreground" />
                      <h4 className="text-sm font-semibold uppercase text-muted-foreground">
                        Status Timeline
                      </h4>
                    </div>
                    <div className="space-y-3">
                      {orderTimelineEvents.map((event) => (
                        <div key={event.id} className="rounded-md border p-3 text-sm space-y-1">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="capitalize">
                              {normaliseStatus(event.status)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(event.created_at), 'dd MMM yyyy, HH:mm')}
                            </span>
                          </div>
                          {event.reason && (
                            <p className="text-xs text-muted-foreground">{event.reason}</p>
                          )}
                        </div>
                      ))}
                      {orderTimelineEvents.length === 0 && (
                        <p className="text-sm text-muted-foreground">No timeline events recorded.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {selectedOrder.order.delivery && selectedOrder.order.delivery.length > 0 && (
                  <Card>
                    <CardContent className="p-4 space-y-1">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase">
                        Delivery
                      </h4>
                      <p>Status: {selectedOrder.order.delivery[0].delivery_status ?? 'Unknown'}</p>
                      {selectedOrder.order.delivery[0].tracking_number && (
                        <p>Tracking: {selectedOrder.order.delivery[0].tracking_number}</p>
                      )}
                      {selectedOrder.order.delivery[0].estimated_delivery_date && (
                        <p>
                          ETA:{' '}
                          {format(
                            new Date(selectedOrder.order.delivery[0].estimated_delivery_date),
                            'dd MMM yyyy',
                          )}
                        </p>
                      )}
                      {selectedOrder.order.delivery[0].actual_delivery_date && (
                        <p>
                          Delivered:{' '}
                          {format(
                            new Date(selectedOrder.order.delivery[0].actual_delivery_date),
                            'dd MMM yyyy',
                          )}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {selectedOrder.order.messages && selectedOrder.order.messages.length > 0 && (
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase">
                        Messages
                      </h4>
                      <div className="space-y-2">
                        {selectedOrder.order.messages
                          .slice()
                          .sort(
                            (a, b) =>
                              new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
                          )
                          .map((message) => (
                            <div key={message.id} className="rounded-md border p-3 text-sm">
                              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                <span>
                                  {message.sender_id === selectedUserDetails?.id
                                    ? 'User'
                                    : 'Counterpart'}
                                </span>
                                <span>
                                  {format(new Date(message.created_at), 'dd MMM yyyy, HH:mm')}
                                </span>
                              </div>
                              <p>{message.message}</p>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
