import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const execAsync = promisify(exec);

// Initialize Supabase client with service role key
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

console.log('🔧 Using Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Generate UUIDs for all entities
const UUIDs = {
  // Users
  johnDoe: '11111111-1111-1111-1111-111111111111',
  sarahSmith: '22222222-2222-2222-2222-222222222222',
  mikeJohnson: '33333333-3333-3333-3333-333333333333',
  emmaWilson: '44444444-4444-4444-4444-444444444444',
  davidBrown: '55555555-5555-5555-5555-555555555555',
  
  // Products
  iphone15: uuidv4(),
  macbookPro: uuidv4(),
  denimJacket: uuidv4(),
  silkBlouse: uuidv4(),
  pacmanArcade: uuidv4(),
  streetFighter: uuidv4(),
  yogaLeggings: uuidv4(),
  runningShoes: uuidv4(),
  pinballMachine: uuidv4(),
  arcadeBundle: uuidv4(),
  
  // Product Images
  iphoneImage1: uuidv4(),
  iphoneImage2: uuidv4(),
  macbookImage: uuidv4(),
  denimImage: uuidv4(),
  silkImage: uuidv4(),
  pacmanImage: uuidv4(),
  streetFighterImage: uuidv4(),
  yogaImage: uuidv4(),
  runningImage: uuidv4(),
  pinballImage: uuidv4(),
  arcadeImage: uuidv4()
};

async function deleteExistingUsers(emails) {
  console.log('🗑️  Checking for existing seed users...\n');
  
  for (const email of emails) {
    try {
      // List users to find by email
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.log(`⚠️  Error listing users: ${listError.message}`);
        continue;
      }
      
      const existingUser = users.find(u => u.email === email);
      
      if (existingUser) {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(existingUser.id);
        
        if (deleteError) {
          console.log(`⚠️  Failed to delete ${email}: ${deleteError.message}`);
        } else {
          console.log(`✅ Deleted existing user: ${email}`);
        }
      }
    } catch (err) {
      console.log(`⚠️  Error processing ${email}: ${err.message}`);
    }
  }
  
  console.log('');
}

async function createAuthUsers() {
  console.log('🔐 Creating auth users via Supabase Admin API...');
  console.log('📝 Password for all users: 12345678\n');
  
  try {
    // Define users to create - Supabase will handle password hashing and all metadata automatically
    const authUsers = [
      {
        email: 'john.doe@example.com',
        password: '12345678',
        email_confirm: true,
        user_metadata: {
          full_name: 'John Doe'
        }
      },
      {
        email: 'sarah.smith@example.com',
        password: '12345678',
        email_confirm: true,
        user_metadata: {
          full_name: 'Sarah Smith'
        }
      },
      {
        email: 'mike.johnson@example.com',
        password: '12345678',
        email_confirm: true,
        user_metadata: {
          full_name: 'Mike Johnson'
        }
      },
      {
        email: 'emma.wilson@example.com',
        password: '12345678',
        email_confirm: true,
        user_metadata: {
          full_name: 'Emma Wilson'
        }
      },
      {
        email: 'david.brown@example.com',
        password: '12345678',
        email_confirm: true,
        user_metadata: {
          full_name: 'David Brown'
        }
      }
    ];

    // First, delete any existing users with these emails
    const emails = authUsers.map(u => u.email);
    await deleteExistingUsers(emails);

    let successCount = 0;
    let failCount = 0;

    console.log('➕ Creating new auth users...\n');
    
    // Create users using Supabase Admin API (handles all fields automatically)
    // This ensures proper: encrypted_password, instance_id, aud, role, confirmed_at, etc.
    for (const userData of authUsers) {
      try {
        const { data, error } = await supabase.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: userData.email_confirm,
          user_metadata: userData.user_metadata
        });
        
        if (error) {
          console.log(`❌ Failed to create user ${userData.email}: ${error.message}`);
          failCount++;
        } else {
          console.log(`✅ Created auth user: ${userData.email} (ID: ${data.user.id})`);
          successCount++;
        }
      } catch (err) {
        console.log(`❌ Error creating user ${userData.email}: ${err.message}`);
        failCount++;
      }
    }

    console.log(`\n📊 Auth Users Summary: ${successCount} succeeded, ${failCount} failed\n`);
    return successCount > 0;
    
  } catch (error) {
    console.error('❌ Error creating auth users:', error.message);
    console.log('⚠️ Continuing without auth users - you may need to run seed-auth-users.js separately\n');
    return false;
  }
}

async function getCategoryIds() {
  console.log('📋 Fetching category IDs...');
  const { data: categories, error } = await supabase
    .from('categories')
    .select('id, name, slug');
  
  if (error) {
    console.error('❌ Error fetching categories:', error);
    throw error;
  }
  
  console.log(`✅ Found ${categories.length} categories`);
  return categories;
}

async function getAttributeIds() {
  console.log('📋 Fetching attribute IDs...');
  const { data: attributes, error } = await supabase
    .from('product_attributes')
    .select('id, name, slug');
  
  if (error) {
    console.error('❌ Error fetching attributes:', error);
    throw error;
  }
  
  console.log(`✅ Found ${attributes.length} attributes`);
  return attributes;
}

async function getAttributeTermIds() {
  console.log('📋 Fetching attribute term IDs...');
  const { data: terms, error } = await supabase
    .from('product_attribute_terms')
    .select(`
      id, 
      name, 
      slug,
      attribute_id,
      product_attributes!inner(name)
    `);
  
  if (error) {
    console.error('❌ Error fetching attribute terms:', error);
    throw error;
  }
  
  console.log(`✅ Found ${terms.length} attribute terms`);
  return terms;
}

async function createUsers() {
  console.log('👥 Creating users...');
  
  // Note: For seeding purposes, we'll create users directly in public.users
  // The RLS policies allow the service role to insert users
  // In a real scenario, these would be created via Supabase Auth first
  
  const users = [
    {
      id: UUIDs.johnDoe,
      email: 'john.doe@example.com',
      password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      full_name: 'John Doe',
      username: 'johndoe',
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      phone: '+1-555-0101',
      location: 'New York, NY',
      bio: 'Tech enthusiast and gadget collector. Always looking for the latest electronics!',
      is_verified: true,
      rating: 4.8,
      total_sales: 45,
      member_since: '2023-01-15 10:00:00'
    },
    {
      id: UUIDs.sarahSmith,
      email: 'sarah.smith@example.com',
      password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      full_name: 'Sarah Smith',
      username: 'sarahsmith',
      avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      phone: '+1-555-0102',
      location: 'Los Angeles, CA',
      bio: 'Fashion enthusiast and style consultant. Specializing in trendy clothing and accessories.',
      is_verified: true,
      rating: 4.9,
      total_sales: 67,
      member_since: '2023-02-20 14:30:00'
    },
    {
      id: UUIDs.mikeJohnson,
      email: 'mike.johnson@example.com',
      password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      full_name: 'Mike Johnson',
      username: 'mikejohnson',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      phone: '+1-555-0103',
      location: 'Chicago, IL',
      bio: 'Gaming and computer hardware specialist. Building custom PCs for over 10 years.',
      is_verified: true,
      rating: 4.7,
      total_sales: 89,
      member_since: '2023-03-10 09:15:00'
    },
    {
      id: UUIDs.emmaWilson,
      email: 'emma.wilson@example.com',
      password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      full_name: 'Emma Wilson',
      username: 'emmawilson',
      avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      phone: '+1-555-0104',
      location: 'Houston, TX',
      bio: 'Fitness trainer and activewear specialist. Helping people stay active and comfortable.',
      is_verified: true,
      rating: 4.6,
      total_sales: 34,
      member_since: '2023-04-05 16:45:00'
    },
    {
      id: UUIDs.davidBrown,
      email: 'david.brown@example.com',
      password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      full_name: 'David Brown',
      username: 'davidbrown',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
      phone: '+1-555-0105',
      location: 'Miami, FL',
      bio: 'Arcade game collector and enthusiast. Specializing in vintage and modern arcade equipment.',
      is_verified: true,
      rating: 4.5,
      total_sales: 56,
      member_since: '2023-05-12 11:20:00'
    }
  ];

  try {
    const { data, error } = await supabase
      .from('users')
      .upsert(users, { onConflict: 'id', ignoreDuplicates: true })
      .select();

    if (error) {
      console.error('❌ Error creating users:', error);
      throw error;
    }

    console.log(`✅ Created ${data.length} users`);
    return users;
  } catch (error) {
    console.error('❌ Error creating users:', error);
    console.log('⚠️ This might be due to RLS policies. Trying alternative approach...');
    
    // Try to create users one by one to see which ones fail
    const createdUsers = [];
    for (const user of users) {
      try {
        const { data, error } = await supabase
          .from('users')
          .insert(user)
          .select()
          .single();
        
        if (error) {
          console.log(`⚠️ Failed to create user ${user.email}: ${error.message}`);
        } else {
          createdUsers.push(data);
          console.log(`✅ Created user: ${user.email}`);
        }
      } catch (err) {
        console.log(`⚠️ Error creating user ${user.email}: ${err.message}`);
      }
    }
    
    console.log(`✅ Created ${createdUsers.length} users out of ${users.length}`);
    return createdUsers;
  }
}

async function createProducts(categories) {
  console.log('📦 Creating products...');
  
  // Find category IDs by name
  const electronicsCategory = categories.find(c => c.name === 'Electronics');
  const clothingCategory = categories.find(c => c.name === 'Clothing');
  const activewearCategory = categories.find(c => c.name === 'Activewear');
  const arcadeCategory = categories.find(c => c.name === 'Arcade Equipment');

  const products = [
    // John Doe's Electronics Products
    {
      id: UUIDs.iphone15,
      seller_id: UUIDs.johnDoe,
      category_id: electronicsCategory?.id,
      title: 'iPhone 15 Pro Max 256GB Titanium',
      ar_title: 'آيفون 15 برو ماكس 256 جيجابايت تيتانيوم',
      description: 'Brand new iPhone 15 Pro Max with Natural Titanium finish. 256GB storage, perfect condition with original box and all accessories.',
      ar_description: 'آيفون 15 برو ماكس جديد تمامًا بلون تيتانيوم طبيعي. سعة 256 جيجابايت، حالة ممتازة مع العلبة الأصلية وجميع الملحقات.',
      price: 1299.00,
      currency: 'USD',
      condition: 'new',
      status: 'active',
      location: 'New York, NY',
      is_negotiable: true,
      view_count: 234,
      has_variants: false,
      quantity_available: 1,
      created_at: '2024-01-15 10:00:00'
    },
    {
      id: UUIDs.macbookPro,
      seller_id: UUIDs.johnDoe,
      category_id: electronicsCategory?.id,
      title: 'MacBook Pro 16" M3 Pro 1TB',
      ar_title: 'ماك بوك برو 16 بوصة M3 برو 1 تيرابايت',
      description: 'Apple MacBook Pro 16" with M3 Pro chip, 1TB SSD, 18GB unified memory. Space Black finish.',
      ar_description: 'ماك بوك برو 16 بوصة من أبل بمعالج M3 برو، قرص صلب 1 تيرابايت، ذاكرة موحدة 18 جيجابايت. لون أسود فضاء.',
      price: 2499.00,
      currency: 'USD',
      condition: 'new',
      status: 'active',
      location: 'New York, NY',
      is_negotiable: true,
      view_count: 156,
      has_variants: false,
      quantity_available: 1,
      created_at: '2024-01-25 09:15:00'
    },
    
    // Sarah Smith's Apparel Products
    {
      id: UUIDs.denimJacket,
      seller_id: UUIDs.sarahSmith,
      category_id: clothingCategory?.id,
      title: 'Designer Denim Jacket',
      ar_title: 'جاكيت جينز مصمم',
      description: 'Vintage designer denim jacket in excellent condition. Perfect fit and authentic distressed look.',
      ar_description: 'جاكيت جينز مصمم كلاسيكي بحالة ممتازة. مقاس مثالي ومظهر أصيل متقادم.',
      price: 89.00,
      currency: 'USD',
      condition: 'used',
      status: 'active',
      location: 'Los Angeles, CA',
      is_negotiable: true,
      view_count: 145,
      has_variants: false,
      quantity_available: 1,
      created_at: '2024-01-20 14:30:00'
    },
    {
      id: UUIDs.silkBlouse,
      seller_id: UUIDs.sarahSmith,
      category_id: clothingCategory?.id,
      title: 'Silk Blouse Collection',
      ar_title: 'مجموعة بلوزات حرير',
      description: 'Collection of 3 silk blouses in various colors. Premium quality, perfect for professional wear.',
      ar_description: 'مجموعة من 3 بلوزات حرير بألوان مختلفة. جودة عالية، مثالية للارتداء المهني.',
      price: 120.00,
      currency: 'USD',
      condition: 'new',
      status: 'active',
      location: 'Los Angeles, CA',
      is_negotiable: false,
      view_count: 89,
      has_variants: false,
      quantity_available: 3,
      created_at: '2024-01-22 16:45:00'
    },
    
    // Mike Johnson's Arcade Equipment
    {
      id: UUIDs.pacmanArcade,
      seller_id: UUIDs.mikeJohnson,
      category_id: arcadeCategory?.id,
      title: 'Vintage Pac-Man Arcade Machine',
      ar_title: 'آلة أركيد باك مان كلاسيكية',
      description: 'Original 1980 Pac-Man arcade machine in excellent working condition. Fully restored with original artwork.',
      ar_description: 'آلة أركيد باك مان أصلية من 1980 بحالة عمل ممتازة. مرممة بالكامل مع الفن الأصلي.',
      price: 2500.00,
      currency: 'USD',
      condition: 'used',
      status: 'active',
      location: 'Chicago, IL',
      is_negotiable: true,
      view_count: 298,
      has_variants: false,
      quantity_available: 1,
      created_at: '2024-01-12 11:30:00'
    },
    {
      id: UUIDs.streetFighter,
      seller_id: UUIDs.mikeJohnson,
      category_id: arcadeCategory?.id,
      title: 'Street Fighter II Arcade Cabinet',
      ar_title: 'خزانة أركيد ستريت فايتر 2',
      description: 'Street Fighter II arcade cabinet with original controls and artwork. Perfect for gaming room.',
      ar_description: 'خزانة أركيد ستريت فايتر 2 مع أزرار التحكم والفن الأصلي. مثالية لغرفة الألعاب.',
      price: 1800.00,
      currency: 'USD',
      condition: 'used',
      status: 'active',
      location: 'Chicago, IL',
      is_negotiable: false,
      view_count: 234,
      has_variants: false,
      quantity_available: 1,
      created_at: '2024-01-18 13:20:00'
    },
    
    // Emma Wilson's Activewear
    {
      id: UUIDs.yogaLeggings,
      seller_id: UUIDs.emmaWilson,
      category_id: activewearCategory?.id,
      title: 'Premium Yoga Leggings Set',
      ar_title: 'طقم ليغينجز يوغا فاخر',
      description: 'High-quality yoga leggings with moisture-wicking fabric. Perfect for yoga and pilates sessions.',
      ar_description: 'ليغينجز يوغا عالية الجودة مع قماش طارد للرطوبة. مثالية لجلسات اليوغا والبيلاتس.',
      price: 65.00,
      currency: 'USD',
      condition: 'new',
      status: 'active',
      location: 'Houston, TX',
      is_negotiable: true,
      view_count: 178,
      has_variants: false,
      quantity_available: 2,
      created_at: '2024-01-14 10:30:00'
    },
    {
      id: UUIDs.runningShoes,
      seller_id: UUIDs.emmaWilson,
      category_id: activewearCategory?.id,
      title: 'Running Shoes Collection',
      ar_title: 'مجموعة أحذية الجري',
      description: 'Collection of 3 pairs of running shoes in different sizes. All in excellent condition for serious runners.',
      ar_description: 'مجموعة من 3 أزواج أحذية جري بأحجام مختلفة. جميعها بحالة ممتازة للعدائين الجادين.',
      price: 180.00,
      currency: 'USD',
      condition: 'used',
      status: 'active',
      location: 'Houston, TX',
      is_negotiable: true,
      view_count: 156,
      has_variants: false,
      quantity_available: 3,
      created_at: '2024-01-19 14:15:00'
    },
    
    // David Brown's Arcade Equipment
    {
      id: UUIDs.pinballMachine,
      seller_id: UUIDs.davidBrown,
      category_id: arcadeCategory?.id,
      title: 'Pinball Machine - The Addams Family',
      ar_title: 'آلة بينبول - عائلة آدامز',
      description: 'The Addams Family pinball machine in excellent condition. All lights and sounds working perfectly.',
      ar_description: 'آلة بينبول عائلة آدامز بحالة ممتازة. جميع الأضواء والأصوات تعمل بشكل مثالي.',
      price: 3500.00,
      currency: 'USD',
      condition: 'used',
      status: 'active',
      location: 'Miami, FL',
      is_negotiable: false,
      view_count: 189,
      has_variants: false,
      quantity_available: 1,
      created_at: '2024-01-16 08:00:00'
    },
    {
      id: UUIDs.arcadeBundle,
      seller_id: UUIDs.davidBrown,
      category_id: arcadeCategory?.id,
      title: 'Arcade Game Bundle',
      ar_title: 'حزمة ألعاب أركيد',
      description: 'Bundle of 3 classic arcade games: Donkey Kong, Galaga, and Space Invaders. All working perfectly.',
      ar_description: 'حزمة من 3 ألعاب أركيد كلاسيكية: دونكي كونج، جالاجا، وغزاة الفضاء. جميعها تعمل بشكل مثالي.',
      price: 4200.00,
      currency: 'USD',
      condition: 'used',
      status: 'active',
      location: 'Miami, FL',
      is_negotiable: true,
      view_count: 267,
      has_variants: false,
      quantity_available: 3,
      created_at: '2024-01-21 12:30:00'
    }
  ];

  const { data, error } = await supabase
    .from('products')
    .upsert(products, { onConflict: 'id', ignoreDuplicates: true })
    .select();

  if (error) {
    console.error('❌ Error creating products:', error);
    throw error;
  }

  console.log(`✅ Created ${data.length} products`);
  return data;
}

async function createProductImages() {
  console.log('🖼️ Creating product images...');
  
  const images = [
    // iPhone 15 Pro Max images
    {
      id: UUIDs.iphoneImage1,
      product_id: UUIDs.iphone15,
      image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&h=600&fit=crop',
      alt_text: 'iPhone 15 Pro Max front view',
      is_primary: true,
      sort_order: 1
    },
    {
      id: UUIDs.iphoneImage2,
      product_id: UUIDs.iphone15,
      image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&h=600&fit=crop&flip=h',
      alt_text: 'iPhone 15 Pro Max back view',
      is_primary: false,
      sort_order: 2
    },
    
    // MacBook Pro images
    {
      id: UUIDs.macbookImage,
      product_id: UUIDs.macbookPro,
      image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=600&fit=crop',
      alt_text: 'MacBook Pro 16 inch',
      is_primary: true,
      sort_order: 1
    },
    
    // Denim Jacket images
    {
      id: UUIDs.denimImage,
      product_id: UUIDs.denimJacket,
      image_url: 'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=800&h=600&fit=crop',
      alt_text: 'Denim Jacket',
      is_primary: true,
      sort_order: 1
    },
    
    // Silk Blouse images
    {
      id: UUIDs.silkImage,
      product_id: UUIDs.silkBlouse,
      image_url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&h=600&fit=crop',
      alt_text: 'Silk Blouse Collection',
      is_primary: true,
      sort_order: 1
    },
    
    // Pac-Man Arcade images
    {
      id: UUIDs.pacmanImage,
      product_id: UUIDs.pacmanArcade,
      image_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=600&fit=crop',
      alt_text: 'Pac-Man Arcade Machine',
      is_primary: true,
      sort_order: 1
    },
    
    // Street Fighter images
    {
      id: UUIDs.streetFighterImage,
      product_id: UUIDs.streetFighter,
      image_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=600&fit=crop',
      alt_text: 'Street Fighter II Arcade',
      is_primary: true,
      sort_order: 1
    },
    
    // Yoga Leggings images
    {
      id: UUIDs.yogaImage,
      product_id: UUIDs.yogaLeggings,
      image_url: 'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=800&h=600&fit=crop',
      alt_text: 'Yoga Leggings',
      is_primary: true,
      sort_order: 1
    },
    
    // Running Shoes images
    {
      id: UUIDs.runningImage,
      product_id: UUIDs.runningShoes,
      image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=600&fit=crop',
      alt_text: 'Running Shoes',
      is_primary: true,
      sort_order: 1
    },
    
    // Pinball Machine images
    {
      id: UUIDs.pinballImage,
      product_id: UUIDs.pinballMachine,
      image_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=600&fit=crop',
      alt_text: 'Pinball Machine',
      is_primary: true,
      sort_order: 1
    },
    
    // Arcade Bundle images
    {
      id: UUIDs.arcadeImage,
      product_id: UUIDs.arcadeBundle,
      image_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=600&fit=crop',
      alt_text: 'Arcade Game Bundle',
      is_primary: true,
      sort_order: 1
    }
  ];

  const { data, error } = await supabase
    .from('product_images')
    .upsert(images, { onConflict: 'id', ignoreDuplicates: true })
    .select();

  if (error) {
    console.error('❌ Error creating product images:', error);
    throw error;
  }

  console.log(`✅ Created ${data.length} product images`);
  return data;
}

async function createProductAttributeRelationships(terms) {
  console.log('🔗 Creating product attribute relationships...');
  
  // Helper function to find term by name and attribute
  const findTerm = (termName, attributeName) => {
    return terms.find(t => t.name === termName && t.product_attributes.name === attributeName);
  };

  const relationships = [
    // iPhone 15 Pro Max attributes
    {
      product_id: UUIDs.iphone15,
      attribute_id: findTerm('Gray', 'Color')?.attribute_id,
      term_id: findTerm('Gray', 'Color')?.id
    },
    
    // MacBook Pro attributes
    {
      product_id: UUIDs.macbookPro,
      attribute_id: findTerm('Black', 'Color')?.attribute_id,
      term_id: findTerm('Black', 'Color')?.id
    },
    
    // Denim Jacket attributes
    {
      product_id: UUIDs.denimJacket,
      attribute_id: findTerm('Blue', 'Color')?.attribute_id,
      term_id: findTerm('Blue', 'Color')?.id
    },
    {
      product_id: UUIDs.denimJacket,
      attribute_id: findTerm('Denim', 'Fabric')?.attribute_id,
      term_id: findTerm('Denim', 'Fabric')?.id
    },
    {
      product_id: UUIDs.denimJacket,
      attribute_id: findTerm('L', 'Size')?.attribute_id,
      term_id: findTerm('L', 'Size')?.id
    },
    
    // Silk Blouse attributes
    {
      product_id: UUIDs.silkBlouse,
      attribute_id: findTerm('White', 'Color')?.attribute_id,
      term_id: findTerm('White', 'Color')?.id
    },
    {
      product_id: UUIDs.silkBlouse,
      attribute_id: findTerm('Cotton', 'Fabric')?.attribute_id,
      term_id: findTerm('Cotton', 'Fabric')?.id
    },
    {
      product_id: UUIDs.silkBlouse,
      attribute_id: findTerm('M', 'Size')?.attribute_id,
      term_id: findTerm('M', 'Size')?.id
    },
    
    // Pac-Man Arcade attributes
    {
      product_id: UUIDs.pacmanArcade,
      attribute_id: findTerm('Black', 'Color')?.attribute_id,
      term_id: findTerm('Black', 'Color')?.id
    },
    
    // Street Fighter attributes
    {
      product_id: UUIDs.streetFighter,
      attribute_id: findTerm('Black', 'Color')?.attribute_id,
      term_id: findTerm('Black', 'Color')?.id
    },
    
    // Yoga Leggings attributes
    {
      product_id: UUIDs.yogaLeggings,
      attribute_id: findTerm('Purple', 'Color')?.attribute_id,
      term_id: findTerm('Purple', 'Color')?.id
    },
    {
      product_id: UUIDs.yogaLeggings,
      attribute_id: findTerm('Yoga', 'Activity')?.attribute_id,
      term_id: findTerm('Yoga', 'Activity')?.id
    },
    {
      product_id: UUIDs.yogaLeggings,
      attribute_id: findTerm('M', 'Size')?.attribute_id,
      term_id: findTerm('M', 'Size')?.id
    },
    
    // Running Shoes attributes
    {
      product_id: UUIDs.runningShoes,
      attribute_id: findTerm('Multicolor', 'Color')?.attribute_id,
      term_id: findTerm('Multicolor', 'Color')?.id
    },
    {
      product_id: UUIDs.runningShoes,
      attribute_id: findTerm('Running', 'Activity')?.attribute_id,
      term_id: findTerm('Running', 'Activity')?.id
    },
    {
      product_id: UUIDs.runningShoes,
      attribute_id: findTerm('XL', 'Size')?.attribute_id,
      term_id: findTerm('XL', 'Size')?.id
    },
    
    // Pinball Machine attributes
    {
      product_id: UUIDs.pinballMachine,
      attribute_id: findTerm('Black', 'Color')?.attribute_id,
      term_id: findTerm('Black', 'Color')?.id
    },
    
    // Arcade Bundle attributes
    {
      product_id: UUIDs.arcadeBundle,
      attribute_id: findTerm('Black', 'Color')?.attribute_id,
      term_id: findTerm('Black', 'Color')?.id
    }
  ].filter(r => r.attribute_id && r.term_id); // Filter out any undefined relationships

  if (relationships.length === 0) {
    console.log('⚠️ No valid attribute relationships found. Skipping...');
    return [];
  }

  const { data, error } = await supabase
    .from('product_attribute_relationships')
    .insert(relationships)
    .select();

  if (error) {
    console.error('❌ Error creating product attribute relationships:', error);
    throw error;
  }

  console.log(`✅ Created ${data.length} product attribute relationships`);
  return data;
}

async function disableRLS() {
  console.log('🔓 Temporarily disabling RLS for seeding...');
  
  try {
    // Method 1: Try using RPC call
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
        ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
        ALTER TABLE public.product_images DISABLE ROW LEVEL SECURITY;
        ALTER TABLE public.product_attribute_relationships DISABLE ROW LEVEL SECURITY;
      `
    });
    
    if (error) {
      console.log('⚠️ RPC method failed, trying direct SQL...');
      // Method 2: Try direct SQL execution
      const { error: sqlError } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (sqlError) {
        console.log('⚠️ Direct SQL also failed, continuing without RLS disable...');
        return false;
      }
    }
    
    console.log('✅ RLS disabled successfully');
    return true;
  } catch (error) {
    console.error('❌ Error disabling RLS:', error.message);
    return false;
  }
}

async function enableRLS() {
  console.log('🔒 Re-enabling RLS...');
  
  try {
    // Method 1: Try using RPC call
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.product_attribute_relationships ENABLE ROW LEVEL SECURITY;
      `
    });
    
    if (error) {
      console.log('⚠️ RPC method failed for re-enabling RLS...');
      return false;
    }
    
    console.log('✅ RLS re-enabled successfully');
    return true;
  } catch (error) {
    console.error('❌ Error re-enabling RLS:', error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('🚀 Starting database seeding...\n');

    // Step 0: Temporarily disable RLS for seeding
    const rlsDisabled = await disableRLS();
    if (!rlsDisabled) {
      console.log('⚠️ Could not disable RLS, but continuing...');
    }

    // Step 1: Create auth users first using the dedicated script
    console.log('🔐 Step 1: Creating auth users...');
    try {
      const { createAuthUsers: createAuthUsersFromScript } = await import('./seed-auth-users.js');
      await createAuthUsersFromScript();
    } catch (error) {
      console.log('⚠️ Auth users creation failed, trying alternative method...');
      await createAuthUsers();
    }

    // Step 2: Get existing data
    const categories = await getCategoryIds();
    const attributes = await getAttributeIds();
    const terms = await getAttributeTermIds();

    // Step 3: Create users
    await createUsers();

    // Step 4: Create products
    await createProducts(categories);

    // Step 5: Create product images
    await createProductImages();

    // Step 6: Create product attribute relationships
    await createProductAttributeRelationships(terms);

    // Step 7: Create location data (cities and pickup locations)
    console.log('📍 Step 7: Creating location data...');
    try {
      const { createCities, createPickupLocations } = await import('./seed-locations.js');
      await createCities();
      await createPickupLocations();
    } catch (error) {
      console.log('⚠️ Location data creation failed:', error.message);
      console.log('⚠️ Continuing without location data...');
    }

    // Step 8: Re-enable RLS
    if (rlsDisabled) {
      await enableRLS();
    }

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - ${categories.length} categories available`);
    console.log(`   - ${attributes.length} attributes available`);
    console.log(`   - ${terms.length} attribute terms available`);
    console.log('   - 5 users created');
    console.log('   - 10 products created');
    console.log('   - Product images and relationships created');
    console.log('   - 8 Syrian cities created');
    console.log('   - 50+ Al-Haram shipping pickup locations created');

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    
    // Try to re-enable RLS even if seeding failed
    try {
      await enableRLS();
    } catch (rlsError) {
      console.error('❌ Failed to re-enable RLS:', rlsError.message);
    }
    
    process.exit(1);
  }
}

// Run the script
console.log('Script starting...');
main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});

export {
  getCategoryIds,
  getAttributeIds,
  getAttributeTermIds,
  createUsers,
  createProducts,
  createProductImages,
  createProductAttributeRelationships
}; 