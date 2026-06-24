import { supabase } from '@/utils/supabase';

class SystemSettingsService {
  /**
   * Get a system setting by key
   */
  static async getSetting(key: string): Promise<string | null> {
    try {
      console.log(`[SystemSettingsService] Fetching setting: ${key}`);
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', key)
        .single();

      if (error) {
        console.error(`[SystemSettingsService] Error fetching setting "${key}":`, {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        if (error.code === 'PGRST116') {
          // Not found
          console.log(`[SystemSettingsService] Setting "${key}" not found`);
          return null;
        }
        throw error;
      }

      console.log(`[SystemSettingsService] Setting "${key}" fetched successfully:`, data?.value);
      return data?.value || null;
    } catch (error) {
      console.error(`[SystemSettingsService] Exception fetching setting "${key}":`, error);
      return null;
    }
  }

  /**
   * Get selling fee percentage
   * Tries server endpoint first (bypasses RLS), falls back to direct DB query
   */
  static async getSellingFeePercentage(): Promise<number> {
    try {
      // Try server endpoint first (bypasses RLS)
      const serverUrl = process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:6666';
      const endpointUrl = `${serverUrl}/api/settings/selling-fee-percentage`;
      
      console.log(`[SystemSettingsService] Attempting to fetch from server endpoint: ${endpointUrl}`);
      console.log(`[SystemSettingsService] Server URL from env: ${process.env.EXPO_PUBLIC_SERVER_URL || 'NOT SET (using default)'}`);
      
      try {
        const response = await fetch(endpointUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log(`[SystemSettingsService] Server response status: ${response.status} ${response.statusText}`);

        if (response.ok) {
          const data = await response.json();
          const percentage = data?.percentage ?? 0;
          console.log(`[SystemSettingsService] ✅ Successfully fetched from server endpoint: ${percentage}%`);
          return percentage;
        } else {
          const errorText = await response.text().catch(() => 'Unable to read error response');
          console.warn(`[SystemSettingsService] ⚠️ Server endpoint returned ${response.status}, response:`, errorText);
          console.warn(`[SystemSettingsService] Falling back to direct DB query...`);
        }
      } catch (serverError: any) {
        console.error('[SystemSettingsService] ❌ Server endpoint failed:', {
          message: serverError?.message,
          name: serverError?.name,
          stack: serverError?.stack,
          url: endpointUrl
        });
        console.warn('[SystemSettingsService] Falling back to direct DB query...');
      }

      // Fallback to direct DB query
      const value = await this.getSetting('selling_fee_percentage');
      console.log(`[SystemSettingsService] Raw value for selling_fee_percentage:`, value);
      if (!value) {
        console.warn('[SystemSettingsService] No value found for selling_fee_percentage, defaulting to 0');
        return 0; // Default to 0%
      }
      const parsed = parseFloat(value);
      console.log(`[SystemSettingsService] Parsed selling_fee_percentage:`, parsed);
      if (isNaN(parsed)) {
        console.warn(`[SystemSettingsService] Failed to parse "${value}" as number, defaulting to 0`);
        return 0;
      }
      return parsed;
    } catch (error) {
      console.error('[SystemSettingsService] Error fetching selling fee percentage:', error);
      return 0; // Default to 0% on error
    }
  }
}

export default SystemSettingsService;

