import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    FlatList,
    Image,
    Alert,
    Modal,
    ActivityIndicator,
    Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuthContext } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import ProductService from '@/services/ProductService';
import OrderService from '@/services/OrderService';
import type { Order } from '@/types/database';
import { usePageTranslation } from '@/hooks/useTranslation';

interface Product {
    id: string;
    seller_id: string;
    category_id: string;
    title: string;
    ar_title?: string;
    description: string;
    ar_description?: string;
    price: number;
    currency: string;
    condition: 'new' | 'used' | 'refurbished';
    status: 'active' | 'sold' | 'inactive' | 'draft';
    location?: string;
    latitude?: number | null;
    longitude?: number | null;
    is_negotiable: boolean;
    delivery_option?: 'both' | 'postage' | 'collection';
    view_count: number;
    is_auction: boolean;
    starting_price?: number;
    bid_end_date?: string;
    created_at: string;
    updated_at: string;
    // Relations
    category?: any;
    images?: ProductImage[];
    option_groups?: Array<{
        id: string;
        name: string;
        values?: Array<{
            id: string;
            name: string;
        }>;
    }>;
}

interface ProductImage {
    id: string;
    product_id: string;
    image_url: string;
    alt_text?: string;
    sort_order: number;
    is_primary: boolean;
    created_at: string;
}

type SellerTabKey = 'orders' | 'sold' | 'listings' | 'draft';

export default function SellingPage() {
    const { user, isAuthenticated, loading: authLoading } = useAuthContext();
    const colorScheme = useColorScheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { t } = usePageTranslation('sellingPage');
    const [activeTab, setActiveTab] = useState<SellerTabKey>('listings');

    // Show loading state while checking authentication
    if (authLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#61d5b6" />
                    <Text style={{ marginTop: 12, color: '#6B7280' }}>{t.loading || 'Loading...'}</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Show login prompt if not authenticated
    if (!isAuthenticated) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
                    <IconSymbol name="square.stack.3d.up.fill" size={80} color="#61d5b6" />
                    <Text style={{ fontSize: 24, fontWeight: '700', color: '#1F2937', textAlign: 'center', marginTop: 24, marginBottom: 12 }}>
                        {t.signInToViewListings || 'Sign in to view your listings'}
                    </Text>
                    <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 32, lineHeight: 24 }}>
                        {t.sellingDescription || 'Manage your products, orders, and sales'}
                    </Text>
                    <TouchableOpacity
                        style={{ width: '100%', paddingVertical: 16, backgroundColor: '#61d5b6', borderRadius: 12, alignItems: 'center', marginBottom: 12, shadowColor: '#61d5b6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }}
                        onPress={() => router.push('/auth/login')}
                    >
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>{t.signIn || 'Sign In'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{ width: '100%', paddingVertical: 16, backgroundColor: '#FFFFFF', borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: '#61d5b6' }}
                        onPress={() => router.push('/auth/signup')}
                    >
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#61d5b6' }}>{t.createAccount || 'Create Account'}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }
    const [products, setProducts] = useState<Product[]>([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [productsError, setProductsError] = useState<string | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(true);
    const [ordersError, setOrdersError] = useState<string | null>(null);
    const [shipModalVisible, setShipModalVisible] = useState(false);
    const [orderToShip, setOrderToShip] = useState<Order | null>(null);
    const [invoiceIdInput, setInvoiceIdInput] = useState('');
    const [receiptImageUri, setReceiptImageUri] = useState<string | null>(null);
    const [receiptUploadInProgress, setReceiptUploadInProgress] = useState(false);
    const [shippingSubmitting, setShippingSubmitting] = useState(false);
    const [shippingError, setShippingError] = useState<string | null>(null);

    useEffect(() => {
        if (user?.id) {
            fetchUserProducts();
            fetchSellerOrders();
        }
    }, [user?.id]);

    const fetchUserProducts = async () => {
        if (!user?.id) return;

        setProductsLoading(true);
        setProductsError(null);

        try {
            const userProducts = await ProductService.fetchUserProducts(user.id);
            setProducts(userProducts || []);
        } catch (err) {
            console.error('Error fetching user products:', err);
            setProductsError(err instanceof Error ? err.message : 'Failed to fetch products');
        } finally {
            setProductsLoading(false);
        }
    };

    const fetchSellerOrders = async () => {
        if (!user?.id) return;

        setOrdersLoading(true);
        setOrdersError(null);

        try {
            const sellerOrders = await OrderService.getOrders(user.id, 'seller');
            setOrders(sellerOrders || []);
        } catch (err) {
            console.error('Error fetching seller orders:', err);
            setOrdersError(err instanceof Error ? err.message : 'Failed to fetch orders');
        } finally {
            setOrdersLoading(false);
        }
    };

    // Listings: show all active and inactive products (even if they have orders)
    // Products with orders should still appear if they have available stock
    // Inactive products are shown because they're being processed by AI on the server
    const listingProducts = useMemo(() => {
        return products.filter(
            product => product.status === 'active' || product.status === 'inactive'
        );
    }, [products]);
    
    const draftProducts = useMemo(() => products.filter(product => product.status === 'draft'), [products]);
    const soldProducts = useMemo(() => products.filter(product => product.status === 'sold'), [products]);
    
    // Orders: all orders from pending_payment through shipped (active orders)
    const activeOrders = useMemo(
        () => orders.filter(order => 
            ['pending_payment', 'payment_submitted', 'admin_approved', 'shipped'].includes(order.status)
        ),
        [orders],
    );
    
    // Keep completedOrders for reference (delivered, completed)
    const completedOrders = useMemo(
        () => orders.filter(order => ['delivered', 'completed'].includes(order.status)),
        [orders],
    );

    const currentData = useMemo(() => {
        switch (activeTab) {
            case 'listings':
                return listingProducts;
            case 'orders':
                return activeOrders;
            case 'sold':
                return soldProducts;
            case 'draft':
                return draftProducts;
            default:
                return [];
        }
    }, [activeTab, listingProducts, activeOrders, soldProducts, draftProducts]);

    const currentLoading = activeTab === 'orders' ? ordersLoading : productsLoading;
    const currentErrorMessage = activeTab === 'orders' ? ordersError : productsError;

    const emptyState = useMemo(() => {
        if (currentErrorMessage) {
            return {
                title: t.unableToLoadData || 'Unable to load data',
                subtitle: currentErrorMessage,
                showRetry: true,
            };
        }

        switch (activeTab) {
            case 'listings':
                return {
                    title: t.noActiveListings || 'No active listings yet',
                    subtitle: t.createListingToStart || 'Create a listing to start selling your items.',
                    showRetry: false,
                };
            case 'orders':
                return {
                    title: 'No active orders',
                    subtitle: 'Orders from payment pending through shipped will appear here.',
                    showRetry: false,
                };
            case 'sold':
                return {
                    title: 'No sold items yet',
                    subtitle: 'Items you mark as sold will appear here.',
                    showRetry: false,
                };
            case 'draft':
                return {
                    title: t.noDraftListings || 'No draft listings',
                    subtitle: t.draftListingsDescription || 'Draft listings will appear here until they are published.',
                    showRetry: false,
                };
            default:
                return {
                    title: t.nothingHere || 'Nothing here yet',
                    subtitle: '',
                    showRetry: false,
                };
        }
    }, [activeTab, currentErrorMessage, t]);

    const handleRefresh = () => {
        if (activeTab === 'orders') {
            fetchSellerOrders();
        } else {
            fetchUserProducts();
        }
    };

    const renderTabButton = (tab: SellerTabKey, label: string) => (
        <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
        >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    const handleCreateListing = () => {
        router.push('/create-listing');
    };

    const handleProductOptions = (productId: string) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const options: any[] = [
            { text: 'View Details', onPress: () => router.push(`/product/${productId}`) },
        ];

        // Add status-specific actions
        if (product.status === 'active') {
            options.push(
                { text: 'Mark as Sold', onPress: () => handleMarkAsSold(productId) },
                { text: 'Pause Listing', onPress: () => handlePauseProduct(productId) }
            );
        } else if (product.status === 'draft') {
            options.push(
                { text: 'Reactivate', onPress: () => handleReactivateProduct(productId) }
            );
        }

        options.push(
            { text: 'Delete', style: 'destructive', onPress: () => handleDeleteProduct(productId) },
            { text: 'Cancel', style: 'cancel' }
        );

        Alert.alert('Product Options', 'What would you like to do?', options);
    };

    const handleDeleteProduct = (productId: string) => {
        Alert.alert(
            t.deleteProduct || 'Delete Product',
            t.deleteConfirmation || 'Are you sure you want to delete this product?',
            [
                { text: t.cancel || 'Cancel', style: 'cancel' },
                {
                    text: t.delete || 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        if (!user?.id) return;

                        try {
                            await ProductService.deleteProduct(productId, user.id);
                            setProducts(products.filter(p => p.id !== productId));
                        } catch (err) {
                            console.error('Error deleting product:', err);
                            Alert.alert(t.error || 'Error', t.deleteProductError || 'Failed to delete product. Please try again.');
                        }
                    }
                },
            ]
        );
    };

    const handleMarkAsSold = (productId: string) => {
        Alert.alert(
            'Mark as Sold',
            'Are you sure you want to mark this product as sold? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Mark as Sold',
                    onPress: async () => {
                        try {
                            await ProductService.updateProductStatus(productId, 'sold');
                            setProducts(products.map(p => 
                                p.id === productId ? { ...p, status: 'sold' } : p
                            ));
                            Alert.alert('Success', 'Product marked as sold');
                        } catch (err) {
                            console.error('Error marking product as sold:', err);
                            Alert.alert('Error', 'Failed to mark product as sold. Please try again.');
                        }
                    }
                },
            ]
        );
    };

    const handlePauseProduct = (productId: string) => {
        Alert.alert(
            'Pause Listing',
            'Are you sure you want to pause this listing? The product will be moved to draft and won\'t be visible to buyers.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Pause Listing',
                    onPress: async () => {
                        try {
                            await ProductService.updateProductStatus(productId, 'draft');
                            setProducts(products.map(p => 
                                p.id === productId ? { ...p, status: 'draft' } : p
                            ));
                            Alert.alert('Success', 'Product paused and moved to draft');
                        } catch (err) {
                            console.error('Error pausing product:', err);
                            Alert.alert('Error', 'Failed to pause product. Please try again.');
                        }
                    }
                },
            ]
        );
    };

    const handleReactivateProduct = (productId: string) => {
        Alert.alert(
            'Reactivate Product',
            'Are you sure you want to reactivate this product? It will become visible to buyers again.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reactivate',
                    onPress: async () => {
                        try {
                            await ProductService.updateProductStatus(productId, 'active');
                            setProducts(products.map(p => 
                                p.id === productId ? { ...p, status: 'active' } : p
                            ));
                            Alert.alert('Success', 'Product reactivated');
                        } catch (err) {
                            console.error('Error reactivating product:', err);
                            Alert.alert('Error', 'Failed to reactivate product. Please try again.');
                        }
                    }
                },
            ]
        );
    };

    const getPrimaryImage = (product: Product) => {
        const images = (product as any)?.images || (product as any)?.product_images || product.images;
        if (images && images.length > 0) {
            const primaryImage = images.find((img: any) => img.is_primary);
            return primaryImage?.image_url || images[0]?.image_url;
        }
        return 'https://via.placeholder.com/100x100';
    };

    const formatPrice = (amount?: number | null, currency?: string) => {
        if (amount == null) {
            return '—';
        }
        const symbol = currency === 'SYP' ? 'SYP' : '$';
        return `${symbol}${Number(amount).toFixed(2)}`;
    };

    const buildAddressLines = (order?: Order | null) => {
        if (!order) {
            return [];
        }

        const lines: string[] = [];

        const toText = (value: any): string | undefined => {
            if (value === null || value === undefined) {
                return undefined;
            }
            if (typeof value === 'string') {
                return value;
            }
            if (typeof value === 'number') {
                return String(value);
            }
            if (typeof value === 'object') {
                if ('name' in value && typeof (value as any).name === 'string') {
                    return (value as any).name;
                }
                if ('title' in value && typeof (value as any).title === 'string') {
                    return (value as any).title;
                }
                if ('label' in value && typeof (value as any).label === 'string') {
                    return (value as any).label;
                }
                if ('value' in value && typeof (value as any).value === 'string') {
                    return (value as any).value;
                }
                if ('code' in value && typeof (value as any).code === 'string') {
                    return (value as any).code;
                }
            }
            return undefined;
        };

        const addLine = (value?: string | null) => {
            const text = toText(value);
            if (!text) {
                return;
            }
            const trimmed = text.trim();
            if (trimmed.length > 0 && !lines.includes(trimmed)) {
                lines.push(trimmed);
            }
        };

        const addAddress = (
            rawAddress?: any,
            {
                includeTitle = true,
                includeContact = true,
            }: { includeTitle?: boolean; includeContact?: boolean } = {},
        ) => {
            if (!rawAddress) {
                return;
            }

            let address = rawAddress;

            if (typeof address === 'string') {
                const trimmed = address.trim();
                if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                    try {
                        address = JSON.parse(trimmed);
                    } catch {
                        addLine(address);
                        return;
                    }
                } else {
                    addLine(address);
                    return;
                }
            }

            if (typeof address !== 'object' || Array.isArray(address)) {
                addLine(String(address));
                return;
            }

            if (includeTitle) {
                addLine(
                    address.title ??
                        address.recipient_name ??
                        address.name ??
                        address.contact_name,
                );
            }

            addLine(
                address.address_line_1 ??
                    address.line1 ??
                    address.address ??
                    address.street,
            );
            addLine(
                address.address_line_2 ??
                    address.line2 ??
                    address.street2 ??
                    address.unit,
            );

            const city = toText(address.city ?? address.city_name);
            const state = toText(address.state_province ?? address.state ?? address.region);
            const postal = toText(address.postal_code ?? address.postcode ?? address.zip);
            const cityStatePostal = [city, state, postal].filter(Boolean).join(', ');
            if (cityStatePostal.length > 0) {
                addLine(cityStatePostal);
            }

            addLine(
                address.country ??
                    address.country_name ??
                    (address.city && toText(address.city.country)),
            );

            if (includeContact) {
                addLine(address.contact_phone ?? address.phone ?? address.mobile);
            }
        };

        const delivery = order.delivery ?? undefined;
        const deliveryType =
            delivery?.delivery_type ??
            order.delivery_type ??
            (order.pickup_address_id ? 'pickup_point' : undefined);

        if (deliveryType === 'pickup_point') {
            const pickupAddressRecord: any =
                delivery?.pickup_address ??
                order.pickup_address;

            const pickupLocation =
                delivery?.pickup_location_data ??
                pickupAddressRecord?.pickup_location;

            addLine(
                pickupLocation?.name ??
                pickupLocation?.title ??
                pickupAddressRecord?.title ??
                pickupAddressRecord?.name,
            );

            addAddress(pickupLocation, { includeTitle: false, includeContact: false });
            addAddress(pickupAddressRecord, { includeTitle: false, includeContact: false });

            addLine(
                pickupLocation?.contact_phone ??
                pickupLocation?.phone ??
                pickupAddressRecord?.contact_phone ??
                pickupAddressRecord?.phone,
            );
            addLine(pickupLocation?.instructions ?? pickupAddressRecord?.instructions);

            if (lines.length === 0 && delivery?.pickup_address_id) {
                addLine('Pickup reference: ' + delivery.pickup_address_id.slice(0, 8));
            }
        } else if (deliveryType === 'home_delivery') {
            const shippingAddress: any =
                delivery?.shipping_address ??
                order.shipping_address ??
                delivery?.delivery_address;

            addAddress(shippingAddress);
        } else if (deliveryType === 'seller_collection') {
            addLine('Arrange collection directly with the buyer');
        }

        if (deliveryType !== 'pickup_point') {
            addLine(delivery?.contact_phone ?? order.contact_phone);
        }

        if (order.special_instructions) {
            addLine(order.special_instructions);
        }

        return lines;
    };

    const getShippingSummary = (order: Order) => {
        const lines = buildAddressLines(order);
        if (lines.length === 0) {
            const deliveryType = order.delivery?.delivery_type ?? order.delivery_type;
            if (deliveryType === 'pickup_point') {
                return 'Delivery address pending';
            }
            if (deliveryType === 'seller_collection') {
                return 'Collection to be arranged';
            }
            return 'Delivery address pending';
        }
        return lines[0];
    };

    const getBuyerContactLines = (order: Order) => {
        const lines: string[] = [];
        const buyer: any = order.buyer;
        if (buyer?.full_name || buyer?.username) {
            lines.push(buyer.full_name || buyer.username);
        }
        if (buyer?.phone) {
            lines.push(`${t.phone || 'Phone'}: ${buyer.phone}`);
        }
        if (buyer?.email) {
            lines.push(`${t.email || 'Email'}: ${buyer.email}`);
        }
        const deliveryPhone = order.delivery?.contact_phone || order.contact_phone;
        if (deliveryPhone && deliveryPhone !== buyer?.phone) {
            lines.push(`${t.alternatePhone || 'Alternate phone'}: ${deliveryPhone}`);
        }
        return lines;
    };

    const ORDER_STATUS_META: Record<Order['status'], { label: string; background: string; color: string }> = {
        pending_payment: { label: 'Payment pending', background: '#FEF3C7', color: '#B45309' },
        awaiting_collection: { label: 'Awaiting collection', background: '#E0F2FE', color: '#0369A1' },
        payment_submitted: { label: 'Payment submitted', background: '#E0E7FF', color: '#4338CA' },
        admin_approved: { label: 'Payment approved', background: '#DCFCE7', color: '#15803D' },
        shipped: { label: 'Shipped', background: '#DBEAFE', color: '#1D4ED8' },
        delivered: { label: 'Delivered', background: '#E0F2FE', color: '#0369A1' },
        completed: { label: 'Completed', background: '#ECFDF5', color: '#047857' },
        cancelled: { label: 'Cancelled', background: '#FEE2E2', color: '#B91C1C' },
    };

    const getStatusMeta = (status: Order['status']) => ORDER_STATUS_META[status] ?? ORDER_STATUS_META.pending_payment;

    const openShipModal = (order: Order) => {
        setOrderToShip(order);
        setInvoiceIdInput(order.delivery?.invoice_id || '');
        const existingReceipt = order.delivery?.delivery_note_url || null;
        setReceiptImageUri(existingReceipt);
        setReceiptUploadInProgress(false);
        setShippingError(null);
        setShipModalVisible(true);
    };

    const closeShipModal = () => {
        setShipModalVisible(false);
        setOrderToShip(null);
        setInvoiceIdInput('');
        setReceiptImageUri(null);
        setReceiptUploadInProgress(false);
        setShippingError(null);
    };

    const selectedDeliveryType = orderToShip?.delivery?.delivery_type ?? orderToShip?.delivery_type;
    const isCourierDropoff = selectedDeliveryType === 'pickup_point';
    const isSellerCollection = selectedDeliveryType === 'seller_collection';
    const shippingLinesForModal = orderToShip ? buildAddressLines(orderToShip) : [];
    const buyerContactLinesForModal = orderToShip ? getBuyerContactLines(orderToShip) : [];
    const canShipSelectedOrder = orderToShip?.status === 'admin_approved';
    const modalInstructionText = isSellerCollection
        ? t.sellerCollectionInstructions || 'Coordinate directly with the buyer to hand over the item in person. Share agreed time and place in the chat.'
        : isCourierDropoff
        ? 'Take the parcel to the delivery address below. Include the invoice ID on the label and keep a copy of the shipping receipt.'
        : 'Ship the parcel to the buyer using the delivery address below. Include the invoice ID on the parcel label and keep the shipping receipt for your records.';

    const pickReceiptImage = async (source: 'camera' | 'library') => {
        try {
            const permissionResult =
                source === 'camera'
                    ? await ImagePicker.requestCameraPermissionsAsync()
                    : await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permissionResult.granted) {
                Alert.alert(
                    'Permission required',
                    source === 'camera'
                        ? 'Camera permission is needed to capture the shipping receipt.'
                        : 'Photo library permission is needed to select the shipping receipt.'
                );
                return;
            }

            const result =
                source === 'camera'
                    ? await ImagePicker.launchCameraAsync({
                          mediaTypes: ImagePicker.MediaTypeOptions.Images,
                          allowsEditing: true,
                          quality: 0.85,
                      })
                    : await ImagePicker.launchImageLibraryAsync({
                          mediaTypes: ImagePicker.MediaTypeOptions.Images,
                          allowsEditing: false,
                          quality: 0.85,
                      });

            if (!result.canceled && result.assets && result.assets[0]?.uri) {
                setReceiptImageUri(result.assets[0].uri);
                setShippingError(null);
            }
        } catch (err) {
            console.error('Error selecting receipt image:', err);
            Alert.alert('Error', 'Unable to select the receipt image. Please try again.');
        }
    };

    const handleRemoveReceiptImage = () => {
        setReceiptImageUri(null);
        setShippingError(null);
    };

    const handleMarkAsShipped = async () => {
        if (!orderToShip || !user?.id) {
            return;
        }

        if (!invoiceIdInput.trim()) {
            setShippingError(t.invoiceIdRequired || 'Invoice ID is required');
            return;
        }

        if (!receiptImageUri) {
            setShippingError('A shipping receipt image is required.');
            return;
        }

        if (orderToShip.status !== 'admin_approved') {
            setShippingError(t.paymentMustBeApproved || 'Payment must be approved before shipping.');
            return;
        }

        setShippingSubmitting(true);
        setShippingError(null);

        try {
            const invoiceId = invoiceIdInput.trim();
            let shipmentReceiptUrl = receiptImageUri;

            const isRemoteReceipt =
                shipmentReceiptUrl.startsWith('http://') ||
                shipmentReceiptUrl.startsWith('https://');
            if (!isRemoteReceipt) {
                setReceiptUploadInProgress(true);
                const uploadedUrl = await OrderService.uploadShipmentReceipt(orderToShip.id, shipmentReceiptUrl);
                if (!uploadedUrl) {
                    throw new Error('Failed to upload shipping receipt. Please try again.');
                }
                shipmentReceiptUrl = uploadedUrl;
            }

            const deliveryUpdated = await OrderService.updateDeliveryStatus(orderToShip.id, 'shipped', {
                invoiceId,
                shipmentReceiptUrl,
            });

            if (!deliveryUpdated) {
                throw new Error('Failed to update delivery details');
            }

            const statusUpdated = await OrderService.updateOrderStatus(
                orderToShip.id,
                'shipped',
                user.id,
                'Seller marked order as shipped',
                {
                    invoiceId,
                    shipmentReceiptUrl,
                },
            );

            if (!statusUpdated) {
                throw new Error('Failed to update order status');
            }

            try {
                await ProductService.updateProductStatus(orderToShip.product_id, 'sold');
            } catch (productErr) {
                console.warn('Unable to update product status:', productErr);
            }

            Alert.alert(t.success || 'Success', t.orderMarkedAsShipped || 'Order marked as shipped');
            closeShipModal();
            await fetchSellerOrders();
            await fetchUserProducts();
        } catch (err) {
            console.error('Error marking order as shipped:', err);
            setShippingError(err instanceof Error ? err.message : t.failedToMarkAsShipped || 'Failed to mark as shipped');
        } finally {
            setReceiptUploadInProgress(false);
            setShippingSubmitting(false);
        }
    };

    const renderProductItem = ({ item }: { item: Product }) => {
        const getStatusBadge = () => {
            if (item.status === 'sold') {
                return (
                    <View style={[styles.statusBadge, { backgroundColor: '#ECFDF5' }]}>
                        <Text style={[styles.statusBadgeText, { color: '#047857' }]}>Sold</Text>
                    </View>
                );
            } else if (item.status === 'draft') {
                return (
                    <View style={[styles.statusBadge, { backgroundColor: '#FEF3C7' }]}>
                        <Text style={[styles.statusBadgeText, { color: '#B45309' }]}>Draft</Text>
                    </View>
                );
            } else if (item.status === 'inactive') {
                return (
                    <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2' }]}>
                        <Text style={[styles.statusBadgeText, { color: '#B91C1C' }]}>
                            {t.inactive || 'Inactive'}
                        </Text>
                    </View>
                );
            }
            return null;
        };

        return (
            <View style={styles.productCard}>
                <Image source={{ uri: getPrimaryImage(item) }} style={styles.productImage} />
                <View style={styles.productInfo}>
                    <View style={styles.productHeaderRow}>
                        <Text style={styles.productTitle} numberOfLines={2}>
                            {item.title}
                        </Text>
                        {getStatusBadge()}
                    </View>
                    <Text style={styles.productPrice}>{formatPrice(item.price, item.currency)}</Text>
                    <Text style={styles.deliveryText}>
                        {item.delivery_option === 'both' ? 'Free Delivery' :
                            item.delivery_option === 'postage' ? 'Postage Only' :
                                item.delivery_option === 'collection' ? 'Collection Only' : 'Free Delivery'}
                    </Text>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <IconSymbol name="eye" size={14} color="#666" />
                            <Text style={styles.statText}>{item.view_count}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <IconSymbol name="heart.fill" size={14} color="#EF4444" />
                            <Text style={styles.statText}>0</Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.optionsButton}
                    onPress={() => handleProductOptions(item.id)}
                >
                    <IconSymbol name="ellipsis" size={16} color="#666" />
                </TouchableOpacity>
            </View>
        );
    };

    const renderOrderItem = ({ item }: { item: Order }) => {
        const product = item.product as Product | undefined;
        const productImage = product ? getPrimaryImage(product) : 'https://via.placeholder.com/100x100';
        const statusMeta = getStatusMeta(item.status);
        const productPrice = formatPrice(item.total_amount ?? product?.price ?? null, product?.currency ?? item.currency);
        const shippingSummary = getShippingSummary(item);
        const buyerPhone = item.delivery?.contact_phone || (item.buyer as any)?.phone;
        const canShip = item.status === 'admin_approved';
        const deliveryType = item.delivery?.delivery_type;
        const deliveryLabel = deliveryType === 'seller_collection'
            ? 'Arrange with buyer: '
            : 'Delivery address: ';

        // Build variant description if variant exists
        let variantDescription: string | null = null;
        if (item.product_variant_id && (item as any).variant && product?.option_groups) {
            const variant = (item as any).variant;
            const parts: string[] = [];
            
            variant.option_values?.forEach((vv: any) => {
                const optionValue = vv.option_value;
                if (!optionValue) return;
                
                const optionGroup = product.option_groups?.find((group: any) => 
                    group.values?.some((v: any) => v.id === optionValue.id)
                );
                
                if (optionGroup) {
                    parts.push(`${optionGroup.name}: ${optionValue.name}`);
                }
            });
            
            if (parts.length > 0) {
                variantDescription = parts.join(', ');
            }
        }

        return (
            <View style={styles.orderCard}>
                <Image source={{ uri: productImage }} style={styles.orderImage} />
                <View style={styles.orderInfo}>
                    <View style={styles.orderHeaderRow}>
                        <Text style={styles.orderTitle} numberOfLines={2}>
                            {product?.title || 'Product'}
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusMeta.background }]}>
                            <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>
                                {statusMeta.label}
                            </Text>
                        </View>
                    </View>
                    {variantDescription && (
                        <Text style={styles.variantInfo}>{variantDescription}</Text>
                    )}
                    <Text style={styles.orderPrice}>{productPrice}</Text>
                    
                    {/* Commission Breakdown */}
                    {item.selling_fee_percentage !== undefined && item.selling_fee_percentage > 0 && (
                        <View style={styles.commissionContainer}>
                            <View style={styles.commissionRow}>
                                <Text style={styles.commissionLabel}>Commission ({item.selling_fee_percentage}%):</Text>
                                <Text style={styles.commissionValue}>
                                    -{formatPrice(item.selling_fee_amount || 0, item.currency)}
                                </Text>
                            </View>
                            {item.seller_payout_amount !== undefined && (
                                <View style={styles.commissionRowTotal}>
                                    <Text style={styles.commissionLabelTotal}>Your Payout:</Text>
                                    <Text style={styles.commissionValueTotal}>
                                        {formatPrice(item.seller_payout_amount, item.currency)}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}
                    
                    <Text style={styles.orderMeta}>Buyer: {item.buyer?.full_name || item.buyer?.username || 'Buyer'}</Text>
                    <Text style={styles.orderMetaSmall}>Order #{item.id.slice(0, 8)}</Text>
                    <Text style={styles.orderMetaSmall}>
                        {deliveryLabel}
                        {shippingSummary}
                    </Text>
                    {buyerPhone ? (
                        <Text style={styles.orderMetaSmall}>Contact: {buyerPhone}</Text>
                    ) : null}
                    {item.delivery?.invoice_id ? (
                        <Text style={styles.orderMetaSmall}>Invoice ID: {item.delivery.invoice_id}</Text>
                    ) : null}
                    {item.delivery?.delivery_note_url ? (
                        <TouchableOpacity
                            onPress={() =>
                                Linking.openURL(item.delivery?.delivery_note_url as string).catch(() =>
                                    Alert.alert('Unable to open receipt', 'Please try again later.'),
                                )
                            }
                        >
                            <Text style={styles.orderMetaLink}>View shipping receipt</Text>
                        </TouchableOpacity>
                    ) : null}

                    {deliveryType === 'seller_collection' ? (
                        <Text style={styles.orderHint}>Coordinate the handover via chat with the buyer.</Text>
                    ) : (
                        <>
                            <TouchableOpacity style={styles.orderLink} onPress={() => openShipModal(item)}>
                                <Text style={styles.orderLinkText}>View shipping details</Text>
                            </TouchableOpacity>

                            {canShip ? (
                                <TouchableOpacity
                                    style={styles.orderActionButton}
                                    onPress={() => openShipModal(item)}
                                >
                                    <Text style={styles.orderActionText}>{t.shipItem || 'Ship item'}</Text>
                                </TouchableOpacity>
                            ) : (
                                <Text style={styles.orderHint}>
                                    {item.status === 'pending_payment'
                                        ? t.waitForPayment || 'Wait for payment before shipping.'
                                        : item.status === 'payment_submitted'
                                            ? t.paymentUnderReview || 'Payment is under review.'
                                            : item.status === 'shipped'
                                                ? t.parcelAlreadyShipped || 'Parcel already marked as shipped.'
                                                : t.noActionRequired || 'No action required.'}
                                </Text>
                            )}
                        </>
                    )}
                </View>
            </View>
        );
    };

    const renderCurrentItem = ({ item }: { item: any }) => {
        if (activeTab === 'orders') {
            return renderOrderItem({ item });
        }
        return renderProductItem({ item });
    };

    const keyExtractor = (item: any) =>
        (activeTab === 'orders' ? (item as Order).id : (item as Product).id);

    if (productsLoading && ordersLoading) {
        return (
            <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
                <StatusBar style="light" />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t.selling || 'Selling'}</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>{t.loadingProducts || 'Loading products...'}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <StatusBar style="light" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t.selling || 'Selling'}</Text>
            </View>

            <View style={styles.container}>
                {/* Status Tabs */}
                <View style={styles.tabsContainer}>
                    {renderTabButton('listings', t.listings || 'Listings')}
                    {renderTabButton('orders', t.orders || 'Orders')}
                    {renderTabButton('sold', t.sold || 'Sold')}
                    {renderTabButton('draft', t.drafts || 'Drafts')}
                </View>

                {/* Products / Orders List */}
                <FlatList
                    data={currentData}
                    renderItem={renderCurrentItem}
                    keyExtractor={keyExtractor}
                    style={styles.productsList}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.productsListContent}
                    refreshing={currentLoading}
                    onRefresh={handleRefresh}
                    ListEmptyComponent={
                        currentLoading ? null : (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>{emptyState.title}</Text>
                                {emptyState.subtitle ? (
                                    <Text style={styles.emptySubtext}>{emptyState.subtitle}</Text>
                                ) : null}
                                {emptyState.showRetry ? (
                                    <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                                        <Text style={styles.retryButtonText}>{t.retry || 'Retry'}</Text>
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        )
                    }
                />

                {/* Floating Add Button */}
                {(activeTab === 'listings' || activeTab === 'draft') && (
                    <TouchableOpacity style={styles.floatingAddButton} onPress={handleCreateListing}>
                        <IconSymbol name="plus" size={20} color="#fff" />
                        <Text style={styles.floatingButtonText}>{t.addProduct || 'Add Product'}</Text>
                    </TouchableOpacity>
                )}

                {/* Bottom spacing for floating tab bar */}
                <View style={styles.bottomSpacing} />

                <Modal
                    visible={shipModalVisible}
                    animationType="slide"
                    presentationStyle="pageSheet"
                    onRequestClose={closeShipModal}
                >
                    <SafeAreaView style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={closeShipModal} style={styles.modalCloseButton}>
                                <IconSymbol name="xmark" size={18} color="#111827" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>Prepare shipment</Text>
                            <View style={styles.modalHeaderSpacer} />
                        </View>

                        <ScrollView
                            contentContainerStyle={styles.modalContent}
                            bounces={false}
                            showsVerticalScrollIndicator={false}
                        >
                            <Text style={styles.modalDescription}>
                                Review the shipping details, enter the invoice ID, and upload the receipt you receive when you hand the parcel over.
                            </Text>

                            {orderToShip && (
                                <>
                                    <View style={styles.modalSection}>
                                        <Text style={styles.modalSectionTitle}>{t.order || 'Order'}</Text>
                                        <Text style={styles.modalInfoText}>#{orderToShip.id.slice(0, 8)}</Text>
                                        <Text style={styles.modalInfoText}>
                                            {orderToShip.product?.title || 'Product'}
                                        </Text>
                                        {orderToShip.product_variant_id && (orderToShip as any).variant && orderToShip.product?.option_groups && (() => {
                                            const variant = (orderToShip as any).variant;
                                            const variantParts: string[] = [];
                                            
                                            variant.option_values?.forEach((vv: any) => {
                                                const optionValue = vv.option_value;
                                                if (!optionValue) return;
                                                
                                                const optionGroup = orderToShip.product?.option_groups?.find((group: any) => 
                                                    group.values?.some((v: any) => v.id === optionValue.id)
                                                );
                                                
                                                if (optionGroup) {
                                                    variantParts.push(`${optionGroup.name}: ${optionValue.name}`);
                                                }
                                            });
                                            
                                            if (variantParts.length === 0) return null;
                                            
                                            return (
                                                <Text style={styles.modalVariantText}>
                                                    {variantParts.join(' • ')}
                                                </Text>
                                            );
                                        })()}
                                    </View>

                                    <View style={styles.modalSection}>
                                        <Text style={styles.modalSectionTitle}>Buyer</Text>
                                        {buyerContactLinesForModal.length > 0 ? (
                                            buyerContactLinesForModal.map(line => (
                                                <Text key={line} style={styles.modalInfoText}>
                                                    {line}
                                                </Text>
                                            ))
                                        ) : (
                                            <Text style={styles.modalInfoText}>No buyer contact details available.</Text>
                                        )}
                                    </View>

                                    <View style={styles.modalSection}>
                                        <Text style={styles.modalSectionTitle}>
                                            {isSellerCollection
                                                ? 'Collection details'
                                                : 'Delivery address'}
                                        </Text>
                                        {shippingLinesForModal.length > 0 ? (
                                            shippingLinesForModal.map(line => (
                                                <Text key={line} style={styles.modalInfoText}>
                                                    {line}
                                                </Text>
                                            ))
                                        ) : (
                                            <Text style={styles.modalInfoText}>No delivery address available.</Text>
                                        )}
                                    </View>

                                    <View style={styles.modalSection}>
                                        <Text style={styles.modalSectionTitle}>{t.instructions || 'Instructions'}</Text>
                                        <Text style={styles.modalInfoText}>{modalInstructionText}</Text>
                                    </View>
                                </>
                            )}

                            <View style={styles.modalFieldGroup}>
                                <Text style={styles.modalLabel}>Invoice ID *</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={invoiceIdInput}
                                    onChangeText={setInvoiceIdInput}
                                    placeholder="INV-123456"
                                    autoCapitalize="characters"
                                />
                            </View>

                            <View style={styles.modalSection}>
                                <Text style={styles.modalSectionTitle}>Shipping receipt</Text>
                                <Text style={styles.modalUploadHint}>
                                    Upload a clear photo of the receipt issued when you handed the parcel over.
                                </Text>
                                {receiptImageUri ? (
                                    <View style={styles.receiptPreviewWrapper}>
                                        <Image source={{ uri: receiptImageUri }} style={styles.receiptPreviewImage} />
                                        <View style={styles.receiptPreviewActions}>
                                            <TouchableOpacity
                                                style={styles.receiptActionButton}
                                                onPress={() => {
                                                    if (receiptImageUri.startsWith('http')) {
                                                        Linking.openURL(receiptImageUri).catch(() =>
                                                            Alert.alert('Unable to open receipt', 'Please try again later.'),
                                                        );
                                                    } else {
                                                        pickReceiptImage('library');
                                                    }
                                                }}
                                            >
                                                <Text style={styles.receiptActionButtonText}>
                                                    {receiptImageUri.startsWith('http') ? 'Open receipt' : 'Replace'}
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.receiptActionButton, styles.receiptRemoveButton]}
                                                onPress={handleRemoveReceiptImage}
                                            >
                                                <Text style={[styles.receiptActionButtonText, styles.receiptRemoveButtonText]}>
                                                    Remove
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.receiptPlaceholder}>
                                        <MaterialCommunityIcons name="file-upload-outline" size={28} color="#64748B" />
                                        <Text style={styles.receiptPlaceholderText}>
                                            No receipt uploaded yet
                                        </Text>
                                    </View>
                                )}

                                <View style={styles.receiptActionsRow}>
                                    <TouchableOpacity
                                        style={styles.receiptPickerButton}
                                        onPress={() => pickReceiptImage('camera')}
                                    >
                                        <MaterialCommunityIcons name="camera-outline" size={18} color="#111827" />
                                        <Text style={styles.receiptPickerButtonText}>Take photo</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.receiptPickerButton}
                                        onPress={() => pickReceiptImage('library')}
                                    >
                                        <MaterialCommunityIcons name="image-multiple-outline" size={18} color="#111827" />
                                        <Text style={styles.receiptPickerButtonText}>Choose photo</Text>
                                    </TouchableOpacity>
                                </View>

                                {receiptUploadInProgress ? (
                                    <View style={styles.receiptUploadingRow}>
                                        <ActivityIndicator size="small" color="#2563EB" />
                                        <Text style={styles.receiptUploadingText}>Uploading receipt...</Text>
                                    </View>
                                ) : null}
                            </View>

                            {shippingError ? <Text style={styles.modalError}>{shippingError}</Text> : null}
                            {!canShipSelectedOrder ? (
                                <Text style={styles.modalHint}>
                                    {t.shippingWillBeEnabled || 'Shipping will be enabled once the buyer payment is approved.'}
                                </Text>
                            ) : null}
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonOutline]}
                                onPress={closeShipModal}
                                disabled={shippingSubmitting}
                            >
                                <Text style={[styles.modalButtonText, styles.modalButtonOutlineText]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modalButton,
                                    (!canShipSelectedOrder || shippingSubmitting) && styles.modalButtonDisabled,
                                ]}
                                onPress={handleMarkAsShipped}
                                disabled={shippingSubmitting || !canShipSelectedOrder}
                            >
                                <Text
                                    style={[
                                        styles.modalButtonText,
                                        (!canShipSelectedOrder || shippingSubmitting) && styles.modalButtonDisabledText,
                                    ]}
                                >
                                    {shippingSubmitting ? 'Saving...' : 'Ship item'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </Modal>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    backButton: {
        width: 40,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        color: '#000',
        fontSize: 18,
        fontWeight: '600',
    },
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginTop: 20,
        marginBottom: 20,
        backgroundColor: '#F3F4F6',
        borderRadius: 25,
        padding: 4,
        gap: 0,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    activeTab: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#000',
        fontWeight: '600',
    },
    productsList: {
        flex: 1,
    },
    productsListContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    productCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 16,
        marginBottom: 12,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    productImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
    },
    productInfo: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'space-between',
    },
    productHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    variantInfo: {
        fontSize: 12,
        color: '#64748B',
        fontStyle: 'italic',
        marginTop: 2,
        marginBottom: 4,
    },
    modalVariantText: {
        fontSize: 13,
        color: '#64748B',
        fontStyle: 'italic',
        marginTop: 4,
    },
    productTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        lineHeight: 20,
        marginRight: 8,
    },
    productPrice: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 2,
    },
    deliveryText: {
        fontSize: 12,
        color: '#666',
        marginBottom: 8,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 16,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: 12,
        color: '#666',
    },
    orderCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 16,
        marginBottom: 12,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    orderImage: {
        width: 72,
        height: 72,
        borderRadius: 10,
        backgroundColor: '#F3F4F6',
    },
    orderInfo: {
        flex: 1,
        marginLeft: 14,
    },
    orderHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    orderTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginRight: 12,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    orderPrice: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1D4ED8',
        marginBottom: 6,
    },
    commissionContainer: {
        marginTop: 8,
        marginBottom: 8,
        padding: 12,
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    commissionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    commissionRowTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 6,
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    commissionLabel: {
        fontSize: 13,
        color: '#64748B',
    },
    commissionLabelTotal: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A',
    },
    commissionValue: {
        fontSize: 13,
        fontWeight: '500',
        color: '#DC2626',
    },
    commissionValueTotal: {
        fontSize: 14,
        fontWeight: '700',
        color: '#047857',
    },
    orderMeta: {
        fontSize: 13,
        color: '#4B5563',
        marginBottom: 2,
    },
    orderMetaSmall: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 2,
    },
    orderMetaLink: {
        fontSize: 12,
        color: '#2563EB',
        fontWeight: '600',
        marginTop: 4,
        textDecorationLine: 'underline',
    },
    orderActionButton: {
        marginTop: 12,
        backgroundColor: '#4F46E5',
        borderRadius: 22,
        paddingVertical: 10,
        alignItems: 'center',
    },
    orderActionText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    orderHint: {
        marginTop: 10,
        fontSize: 12,
        color: '#6B7280',
    },
    orderLink: {
        marginTop: 10,
    },
    orderLinkText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4F46E5',
        textDecorationLine: 'underline',
    },
    optionsButton: {
        padding: 8,
        alignSelf: 'flex-start',
    },
    floatingAddButton: {
        position: 'absolute',
        marginHorizontal: 20,
        bottom: 50,
        transform: [{ translateX: 0 }],
        width: '90%',
        height: 48,
        borderRadius: 24,
        backgroundColor: '#61d5b6',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    floatingButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    bottomSpacing: {
        height: 20,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#EF4444',
        textAlign: 'center',
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#61d5b6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalCloseButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalHeaderSpacer: {
        width: 32,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
    },
    modalContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 24,
    },
    modalDescription: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 16,
    },
    modalSection: {
        marginBottom: 16,
    },
    modalSectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    modalInfoText: {
        fontSize: 13,
        color: '#374151',
        marginBottom: 2,
    },
    modalUploadHint: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 12,
    },
    receiptPreviewWrapper: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
        backgroundColor: '#F8FAFC',
    },
    receiptPreviewImage: {
        width: '100%',
        height: 160,
        backgroundColor: '#CBD5F5',
    },
    receiptPreviewActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#EFF6FF',
        gap: 12,
    },
    receiptActionButton: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: '#E0F2FE',
        alignItems: 'center',
        justifyContent: 'center',
    },
    receiptActionButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1D4ED8',
    },
    receiptRemoveButton: {
        backgroundColor: '#FEE2E2',
    },
    receiptRemoveButtonText: {
        color: '#B91C1C',
    },
    receiptPlaceholder: {
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#CBD5F5',
        borderRadius: 12,
        paddingVertical: 24,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 12,
        backgroundColor: '#F8FAFC',
    },
    receiptPlaceholderText: {
        fontSize: 12,
        color: '#64748B',
    },
    receiptActionsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 8,
    },
    receiptPickerButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#E2E8F0',
    },
    receiptPickerButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#111827',
    },
    receiptUploadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    receiptUploadingText: {
        fontSize: 12,
        color: '#1D4ED8',
    },
    modalFieldGroup: {
        marginBottom: 16,
    },
    modalLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#111827',
        backgroundColor: '#F9FAFB',
    },
    modalInputMultiline: {
        height: 80,
        textAlignVertical: 'top',
    },
    modalError: {
        color: '#B91C1C',
        fontSize: 13,
        marginBottom: 12,
    },
    modalHint: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 12,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        backgroundColor: '#4F46E5',
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 16,
        alignItems: 'center',
    },
    modalButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    modalButtonOutline: {
        backgroundColor: '#EEF2FF',
    },
    modalButtonOutlineText: {
        color: '#312E81',
    },
    modalButtonDisabled: {
        backgroundColor: '#CBD5F5',
    },
    modalButtonDisabledText: {
        color: '#FFFFFF',
        opacity: 0.6,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
    },
});

export const options = {
    headerShown: false,
};