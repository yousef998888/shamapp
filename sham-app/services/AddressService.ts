import { supabase } from '@/utils/supabase';
import type { UserAddress, CreateAddressData } from '@/types/database';

const fetchUserAddresses = async (): Promise<UserAddress[]> => {
  const { data, error } = await supabase
    .from('user_addresses')
    .select('*')
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
};

const createAddress = async (addressData: CreateAddressData): Promise<UserAddress> => {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated to create addresses');
  }

  const { data, error } = await supabase
    .from('user_addresses')
    .insert([{ ...addressData, user_id: user.id }])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const updateAddress = async (id: string, addressData: Partial<CreateAddressData>): Promise<UserAddress> => {
  const { data, error } = await supabase
    .from('user_addresses')
    .update(addressData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const deleteAddress = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('user_addresses')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    throw error;
  }
};

const setDefaultAddress = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('user_addresses')
    .update({ is_default: true })
    .eq('id', id);

  if (error) {
    throw error;
  }
};

const AddressService = {
  fetchUserAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};

export default AddressService;
