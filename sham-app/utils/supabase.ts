import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../config/supabase';

// Import platform-specific sqlite storage for native
// Metro will automatically use .native.ts for iOS/Android and .web.ts for web
if (Platform.OS !== 'web') {
  require('./sqlite-storage');
}

const supabaseUrl = SUPABASE_CONFIG.url;
const supabaseAnonKey = SUPABASE_CONFIG.anonKey;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'your_supabase_url_here') {
  throw new Error('Missing Supabase environment variables. Please configure your Supabase credentials in config/supabase.ts');
}

// Build auth config conditionally
// On native: expo-sqlite/localStorage/install sets up localStorage globally via the require above
// On web: Uses browser's native localStorage
const authConfig: any = {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: Platform.OS === 'web',
  storage: localStorage, // Use localStorage (polyfilled by expo-sqlite on native, native on web)
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: authConfig,
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
