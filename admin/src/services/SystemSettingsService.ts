import { supabase } from '@/lib/supabase';

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export class SystemSettingsService {
  /**
   * Get a system setting by key
   */
  static async getSetting(key: string): Promise<SystemSetting | null> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', key)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching system setting:', error);
      throw error;
    }
  }

  /**
   * Get selling fee percentage
   */
  static async getSellingFeePercentage(): Promise<number> {
    try {
      const setting = await this.getSetting('selling_fee_percentage');
      if (!setting) {
        return 0; // Default to 0%
      }
      return parseFloat(setting.value) || 0;
    } catch (error) {
      console.error('Error fetching selling fee percentage:', error);
      return 0; // Default to 0% on error
    }
  }

  /**
   * Update a system setting
   */
  static async updateSetting(
    key: string,
    value: string,
    description?: string,
    updatedBy?: string
  ): Promise<SystemSetting> {
    try {
      // Try to update existing setting
      const { data: existing } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', key)
        .single();

      if (existing) {
        const { data, error } = await supabase
          .from('system_settings')
          .update({
            value,
            description,
            updated_by: updatedBy,
            updated_at: new Date().toISOString(),
          })
          .eq('key', key)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new setting if it doesn't exist
        const { data, error } = await supabase
          .from('system_settings')
          .insert({
            key,
            value,
            description,
            updated_by: updatedBy,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error updating system setting:', error);
      throw error;
    }
  }

  /**
   * Update selling fee percentage
   */
  static async updateSellingFeePercentage(
    percentage: number,
    updatedBy?: string
  ): Promise<SystemSetting> {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Selling fee percentage must be between 0 and 100');
    }

    return this.updateSetting(
      'selling_fee_percentage',
      percentage.toString(),
      'Percentage fee charged to sellers on each sale (0-100)',
      updatedBy
    );
  }

  /**
   * Get all system settings
   */
  static async getAllSettings(): Promise<SystemSetting[]> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('key', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching all system settings:', error);
      throw error;
    }
  }
}

