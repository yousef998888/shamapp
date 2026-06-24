import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY 
// Use anon key for auth operations (service_role doesn't work for user auth)
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY 

// Single client with service role for admin operations (bypasses RLS)
// This client is used for data operations and always uses service_role
// Auth is disabled since we use service_role (no user session needed)
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    }
  },
  // Ensure we always use service_role for data operations
  global: {
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`
    }
  }
});

// Separate client for auth operations (sign in, etc.)
// Uses anon key for user authentication (service_role doesn't work for user auth)
// This allows auth to work while data queries use service_role
// Use a different storage key to avoid conflicts with the service_role client
export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true, // Auth needs to persist session
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.admin' // Different storage key to avoid conflicts
  }
});

// Database types
export interface Category {
  id: string;
  name: string;
  ar_name?: string;
  slug: string;
  description?: string;
  ar_description?: string;
  icon?: string;
  parent_id?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Relations
  parent?: Category;
  children?: Category[];
  _count?: {
    children: number;
    products: number;
  };
}

export interface CreateCategoryData {
  name: string;
  ar_name?: string;
  slug: string;
  description?: string;
  ar_description?: string;
  icon?: string;
  parent_id?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {
  id: string;
}

// City interface
export interface City {
  id: string;
  name: string;
  name_ar?: string;
  country: string;
  country_code: string;
  state_province?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCityData {
  name: string;
  name_ar?: string;
  country: string;
  country_code: string;
  state_province?: string;
  latitude?: number;
  longitude?: number;
  is_active?: boolean;
  display_order?: number;
}

export interface UpdateCityData extends Partial<CreateCityData> {
  id: string;
}

// PickupLocation interface
export interface PickupLocation {
  id: string;
  city_id: string;
  name: string;
  name_ar?: string;
  address: string;
  address_ar?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  latitude: number;
  longitude: number;
  type: string;
  pickup_fee: number;
  estimated_days: number;
  operating_hours?: {
    [key: string]: string;
  };
  special_instructions?: string;
  special_instructions_ar?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  // Relations
  city?: City;
}

export interface CreatePickupLocationData {
  city_id: string;
  name: string;
  name_ar?: string;
  address: string;
  address_ar?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  latitude: number;
  longitude: number;
  type: string;
  pickup_fee?: number;
  estimated_days?: number;
  operating_hours?: {
    [key: string]: string;
  };
  special_instructions?: string;
  special_instructions_ar?: string;
  is_active?: boolean;
  display_order?: number;
}

export interface UpdatePickupLocationData extends Partial<CreatePickupLocationData> {
  id: string;
}

// Product Tag interface
export interface ProductTag {
  id: string;
  name: string;
  ar_name?: string;
  slug: string;
  description?: string;
  ar_description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Product Attribute interface
export interface ProductAttribute {
  id: string;
  name: string;
  ar_name?: string;
  slug: string;
  description?: string;
  ar_description?: string;
  is_active: boolean;
  enable_archives: boolean;
  sort_order: 'name' | 'name_numeric' | 'term_id' | 'custom';
  created_at: string;
  updated_at: string;
}

// Product Attribute Term interface
export interface ProductAttributeTerm {
  id: string;
  attribute_id: string;
  name: string;
  ar_name?: string;
  slug: string;
  description?: string;
  ar_description?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Product Variant interfaces
export interface ProductOptionGroup {
  id: string;
  product_id: string;
  name: string;
  source: 'custom' | 'category_attribute';
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
  option_value?: ProductOptionValue & { option_group?: ProductOptionGroup };
} 

export interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  role: 'super_admin' | 'admin';
  display_name?: string | null;
  invited_by?: string | null;
  invite_accepted_at?: string | null;
  last_sign_in_at?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
