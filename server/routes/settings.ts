import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize Supabase client with service_role key (bypasses RLS)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

if (!supabase) {
  console.error('⚠️ [Settings Route] SUPABASE_SERVICE_ROLE_KEY not found - settings endpoint will not work');
}

// Simple in-memory cache for settings (settings don't change often)
const settingsCache = new Map<string, { value: number; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedSetting(key: string): number | null {
  const cached = settingsCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }
  return null;
}

function setCachedSetting(key: string, value: number): void {
  settingsCache.set(key, { value, timestamp: Date.now() });
}

// Get selling fee percentage (public endpoint, no auth required)
// Uses caching to reduce database load
router.get('/selling-fee-percentage', async (req: Request, res: Response) => {
  try {
    if (!supabase) {
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Supabase service role key not configured'
      });
    }

    // Check cache first
    const cacheKey = 'selling_fee_percentage';
    const cached = getCachedSetting(cacheKey);
    if (cached !== null) {
      return res.json({ percentage: cached });
    }

    // Fetch from database
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'selling_fee_percentage')
      .single();

    if (error) {
      console.error('[Settings Route] Error fetching selling fee percentage:', error);
      if (error.code === 'PGRST116') {
        // Not found - return 0 as default and cache it
        setCachedSetting(cacheKey, 0);
        return res.json({ percentage: 0 });
      }
      return res.status(500).json({
        error: 'Database error',
        message: error.message
      });
    }

    const percentage = data?.value ? parseFloat(data.value) : 0;
    const finalPercentage = isNaN(percentage) ? 0 : percentage;
    
    // Cache the result
    setCachedSetting(cacheKey, finalPercentage);
    
    return res.json({ percentage: finalPercentage });
  } catch (error: any) {
    console.error('[Settings Route] Exception fetching selling fee percentage:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Failed to fetch selling fee percentage'
    });
  }
});

export default router;

