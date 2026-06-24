#!/usr/bin/env node

/**
 * Standalone script to seed location data
 * Run with: node seed-locations.js
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL');
  console.error('   VITE_SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease check your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createDeliveryMethods() {
  console.log('🚚 Creating delivery methods...');
  
  const deliveryMethods = [
    {
      id: 'edfca8e6-384f-4f2b-8193-9b1d9d6a8b56',
      name: 'pickup_point',
      display_name: 'Pickup Point',
      base_price: '0.00',
      estimated_days: 1,
      is_active: true,
      created_at: '2025-10-12 12:35:30.04348+00'
    }
  ];

  const { data, error } = await supabase
    .from('delivery_methods')
    .upsert(deliveryMethods, { onConflict: 'id', ignoreDuplicates: false })
    .select();

  if (error) {
    console.error('❌ Error creating delivery methods:', error);
    throw error;
  }

  console.log(`✅ Created ${data.length} delivery methods`);
}

async function main() {
  try {
    console.log('🚀 Starting location data seeding...\n');
    
    // Import and run the location seeder
    const { createCities, createPickupLocations } = await import('./seed-locations.js');
    
    // Clear existing data first
    console.log('🗑️ Clearing existing location data...');
    const { error: locationsError } = await supabase
      .from('pickup_locations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (locationsError) {
      console.log('⚠️ Error clearing pickup locations:', locationsError.message);
    }

    const { error: citiesError } = await supabase
      .from('cities')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (citiesError) {
      console.log('⚠️ Error clearing cities:', citiesError.message);
    }

    // Create delivery methods
    await createDeliveryMethods();

    // Create new data
    await createCities();
    await createPickupLocations();

    console.log('\n🎉 Location data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   - 1 delivery method created (Pickup Point)');
    console.log('   - 8 Syrian cities created');
    console.log('   - 50+ Al-Haram shipping pickup locations created');
    console.log('   - All locations are real addresses from Al-Haram Shipping Company');

  } catch (error) {
    console.error('\n❌ Location seeding failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
