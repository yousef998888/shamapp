// Database types
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parent_id?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
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
  tags?: string[];
  ar_tags?: string[];
  created_at: string;
  updated_at: string;
  has_variants: boolean;
  quantity_available?: number | null;
  // Relations
  category?: Category;
  seller?: UserProfile;
  images?: ProductImage[];
  attribute_relationships?: ProductAttributeRelationship[];
  option_groups?: ProductOptionGroup[];
  variants?: ProductVariant[];
}

export type OptionSource = 'custom' | 'category_attribute';

export interface ProductOptionGroup {
  id: string;
  product_id: string;
  name: string;
  source: OptionSource;
  category_attribute_id?: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  values?: ProductOptionValue[];
}

export interface ProductOptionValue {
  id: string;
  option_group_id: string;
  name: string;
  attribute_term_id?: string | null;
  is_custom: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku?: string | null;
  is_active: boolean;
  quantity_available: number;
  quantity_reserved: number;
  price_override?: number | null;
  created_at: string;
  updated_at: string;
  option_values?: ProductVariantValue[];
}

export interface ProductVariantValue {
  variant_id: string;
  option_value_id: string;
  option_value?: ProductOptionValue & { option_group_id: string };
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text?: string;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface ProductAttribute {
  id: string;
  name: string;
  slug: string;
  description?: string;
  ar_name?: string;
  ar_description?: string;
  sort_order: string;
  is_active: boolean;
  enable_archives: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductAttributeTerm {
  id: string;
  attribute_id: string;
  name: string;
  slug: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  ar_name?: string;
  ar_description?: string;
}

export interface ProductAttributeRelationship {
  id: string;
  product_id: string;
  attribute_id: string;
  term_id: string;
  created_at: string;
  attribute?: ProductAttribute;
  term?: ProductAttributeTerm;
}

export interface Order {
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
  status: 'pending_payment' | 'awaiting_collection' | 'payment_submitted' | 'admin_approved' | 'shipped' | 'delivered' | 'completed' | 'cancelled';
  payment_method: string;
  payment_id?: string;
  is_conversation_only?: boolean;
  // New delivery fields
  delivery_method_id?: string;
  delivery_type?: 'home_delivery' | 'pickup_point' | 'seller_collection';
  shipping_address_id?: string;
  pickup_address_id?: string;
  contact_phone?: string;
  special_instructions?: string;
  delivery_fee?: number;
  estimated_delivery_date?: string;
  // Commission fields
  selling_fee_percentage?: number;
  selling_fee_amount?: number;
  seller_payout_amount?: number;
  created_at: string;
  updated_at: string;
  // Relations
  product?: Product;
  buyer?: UserProfile;
  seller?: UserProfile;
  delivery?: OrderDelivery | null;
  payment?: OrderPayment;
  messages?: OrderMessage[];
  statuses?: OrderStatus[];
  // Address relations
  shipping_address?: UserAddress | null;
  pickup_address?: UserAddress | null;
  delivery_method?: DeliveryMethod;
}

export interface DeliveryMethod {
  id: string;
  name: string;
  display_name: string;
  base_price: number;
  estimated_days: number;
  is_active: boolean;
  created_at: string;
}

export interface OrderDelivery {
  id: string;
  order_id: string;
  delivery_method_id: string;
  delivery_type: 'home_delivery' | 'pickup_point' | 'seller_collection';
  delivery_address?: {
    street: string;
    state: string;
    city: string;
    postal_code: string;
    country: string;
  };
  pickup_location_data?: {
    id: string;
    name: string;
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    type: 'locker' | 'store' | 'post_office' | 'shop';
    provider: string;
    price: number;
    delivery_time: string;
  };
  // New fields
  shipping_address_id?: string;
  pickup_address_id?: string;
  contact_phone?: string;
  delivery_fee?: number;
  tracking_number?: string;
  invoice_id?: string;
  delivery_note_url?: string;
  estimated_delivery_date?: string;
  actual_delivery_date?: string;
  delivery_status: 'pending' | 'shipped' | 'delivered';
  created_at: string;
  updated_at: string;
  // Relations
  delivery_method?: DeliveryMethod;
  shipping_address?: UserAddress | null;
  pickup_address?: UserAddress | null;
}

export interface OrderPayment {
  id: string;
  order_id: string;
  payment_method: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderMessage {
  id: string;
  order_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  message_type: 'text' | 'system' | 'payment_status' | 'shipping_update';
  is_read: boolean;
  created_at: string;
  // Relations
  sender?: UserProfile;
  receiver?: UserProfile;
}

export interface OrderStatus {
  id: string;
  order_id: string;
  status: 'pending_payment' | 'awaiting_collection' | 'payment_submitted' | 'admin_approved' | 'shipped' | 'delivered' | 'completed' | 'cancelled';
  changed_by: string;
  reason?: string;
  metadata?: any;
  created_at: string;
  // Relations
  changed_by_user?: UserProfile;
}

export interface UserProfile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  background_image_url?: string;
  phone?: string;
  location?: string;
  bio?: string;
  is_verified: boolean;
  rating: number;
  total_sales: number;
  member_since: string;
  updated_at: string;
}

export type UserVerificationStatus = 'pending' | 'approved' | 'rejected';

export interface UserVerificationRequest {
  id: string;
  user_id: string;
  document_path: string;
  status: UserVerificationStatus;
  review_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

export interface UserAddress {
  id: string;
  user_id: string;
  title: string;
  title_ar?: string;
  address_line_1: string;
  address_line_1_ar?: string;
  address_line_2?: string;
  address_line_2_ar?: string;
  city: string;
  city_ar?: string;
  state_province?: string;
  postal_code?: string;
  country: string;
  country_ar?: string;
  latitude: number;
  longitude: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // For pickup addresses
  pickup_location_id?: string;
  pickup_location?: PickupLocation;
}

// Type guard to check if UserAddress is a pickup address
export function isPickupAddress(address: UserAddress): address is UserAddress & { pickup_location_id: string } {
  return 'pickup_location_id' in address && address.pickup_location_id !== undefined;
}

export interface CreateAddressData {
  title: string;
  title_ar?: string;
  address_line_1: string;
  address_line_1_ar?: string;
  address_line_2?: string;
  address_line_2_ar?: string;
  city: string;
  city_ar?: string;
  state_province?: string;
  postal_code?: string;
  country: string;
  country_ar?: string;
  latitude: number;
  longitude: number;
  is_default?: boolean;
}

export interface UserPickupAddress {
  id: string;
  user_id: string;
  pickup_location_id: string;
  title: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  pickup_location?: PickupLocation;
}

export interface CreatePickupAddressData {
  pickup_location_id: string;
  title: string;
  is_default?: boolean;
}

export interface PickupLocation {
  id: string;
  city_id: string;
  name: string;
  name_ar?: string;
  address: string;
  address_ar?: string;
  latitude: number;
  longitude: number;
  phone?: string;
  type?: string;
  pickup_fee?: number;
  estimated_days?: number;
  special_instructions?: string;
  special_instructions_ar?: string;
  is_active: boolean;
  display_order?: number;
  created_at: string;
  updated_at: string;
  // Relations
  city?: City;
}

export interface City {
  id: string;
  name: string;
  name_ar?: string;
  country: string;
  country_ar?: string;
  country_code?: string;
  latitude: number;
  longitude: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Address management types for location picker
