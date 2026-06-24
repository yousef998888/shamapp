import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const INPUT_FILE = 'processed-dummy-products.json';
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Mapping of taxonomy category names to actual database category names
const CATEGORY_NAME_MAPPING = {
  "Sunglasses": "Sunglasses",
  "Skin Care": "Skin Care", 
  "Furniture": "Furniture",
  "Shoes": "Shoes",
  "Clothing Tops": "Clothing Tops",
  "Dresses": "Dresses",
  "Laptops": "Laptops",
  "Watches": "Watches",
  "Home Fragrances": "Home Fragrances",
  "Mobile & Smart Phone Accessories": "Mobile & Smart Phone Accessories"
};

// Batch size for database operations
const BATCH_SIZE = 10;

// Get category IDs from database
async function getCategoryIds() {
  console.log('📋 Fetching category IDs from database...');
  
  const { data: categories, error } = await supabase
    .from('categories')
    .select('id, name, slug');
  
  if (error) {
    console.error('❌ Error fetching categories:', error);
    throw error;
  }
  
  console.log(`✅ Found ${categories.length} categories in database`);
  
  // Create mapping from category name to ID
  const categoryMap = new Map();
  categories.forEach(cat => {
    categoryMap.set(cat.name, cat.id);
  });
  
  return categoryMap;
}

// Get user IDs from database
async function getUserIds() {
  console.log('👥 Fetching user IDs from database...');
  
  const { data: users, error } = await supabase
    .from('users')
    .select('id, full_name, email');
  
  if (error) {
    console.error('❌ Error fetching users:', error);
    throw error;
  }
  
  console.log(`✅ Found ${users.length} users in database`);
  
  // Create mapping from user name to ID
  const userMap = new Map();
  users.forEach(user => {
    userMap.set(user.full_name, user.id);
  });
  
  return userMap;
}

// Check if products already exist
async function checkExistingProducts(productIds) {
  console.log('🔍 Checking for existing products...');
  
  const { data: existing, error } = await supabase
    .from('products')
    .select('id')
    .in('id', productIds);
  
  if (error) {
    console.error('❌ Error checking existing products:', error);
    throw error;
  }
  
  const existingIds = new Set(existing.map(p => p.id));
  console.log(`📊 Found ${existingIds.size} existing products out of ${productIds.length}`);
  
  return existingIds;
}

// Import products using upsert (like seed-database.js)
async function importProducts(products, categoryMap, userMap) {
  console.log('📦 Importing products to database...');
  
  // Prepare all products for database
  console.log('🔄 Preparing products for database...');
  const dbProducts = products.map((product, index) => {
    // Get the category name from the processed data
    const categoryName = product.category_name || 'Unknown';
    
    // Look up the real category ID from the database by name
    const realCategoryId = categoryMap.get(categoryName);
    
    if (!realCategoryId) {
      console.warn(`⚠️ Category not found in database: ${categoryName} for product ${product.title}`);
    }
    
    // Use the seller_id from the processed data
    const sellerId = product.seller_id;
    
    if (!sellerId) {
      console.warn(`⚠️ No seller_id for product ${product.title}`);
    }
    
    console.log(`   ${index + 1}/${products.length}: ${product.title} -> Category: ${categoryName} (${realCategoryId ? '✅' : '❌'})`);
    
    return {
      id: product.id,
      seller_id: sellerId,
      category_id: realCategoryId, // Use the real category ID from database lookup
      title: product.title,
      ar_title: product.ar_title,
      description: product.description,
      ar_description: product.ar_description,
      price: product.price,
      currency: product.currency,
      condition: product.condition,
      status: product.status,
      location: product.location,
      is_negotiable: product.is_negotiable,
      view_count: product.view_count || 0,
      is_auction: product.is_auction || false,
      starting_price: product.starting_price,
      bid_end_date: product.bid_end_date,
      latitude: product.latitude,
      longitude: product.longitude,
      delivery_option: product.delivery_option,
      tags: product.tags,
      ar_tags: product.ar_tags || [], // Include Arabic tags
      embedding: product.embedding,
      has_variants: product.has_variants || false,
      quantity_available: product.quantity_available ?? (product.has_variants ? null : Math.floor(Math.random() * 10) + 1), // Random quantity 1-10 if not specified and no variants
      created_at: product.created_at,
      updated_at: product.updated_at
    };
  }).filter(p => p.category_id && p.seller_id); // Only include products with valid category and seller IDs
  
  console.log(`\n📊 Prepared ${dbProducts.length} valid products out of ${products.length} total`);
  
  if (dbProducts.length === 0) {
    console.log('❌ No valid products to import');
    return { imported: 0, skipped: products.length - dbProducts.length, errors: 0 };
  }
  
  // Import using upsert (like seed-database.js)
  console.log('💾 Inserting products into database...');
  try {
    const { data, error } = await supabase
      .from('products')
      .upsert(dbProducts, { onConflict: 'id', ignoreDuplicates: false })
      .select('id, title');
    
    if (error) {
      console.error('❌ Error inserting products:', error);
      throw error;
    }
    
    console.log(`✅ Successfully imported ${data.length} products`);
    
    // Log some examples
    if (data.length > 0) {
      console.log('\n📋 Sample imported products:');
      data.slice(0, 5).forEach(product => {
        console.log(`   - ${product.title} (ID: ${product.id})`);
      });
      if (data.length > 5) {
        console.log(`   ... and ${data.length - 5} more`);
      }
    }
    
    return { 
      imported: data.length, 
      skipped: products.length - dbProducts.length, 
      errors: 0 
    };
    
  } catch (error) {
    console.error('❌ Exception during product import:', error);
    console.error('Error details:', error.message);
    throw error;
  }
}

// Load original dummy products data to get images
async function loadOriginalDummyProducts() {
  console.log('📖 Loading original dummy products for images...');
  
  try {
    const fileData = await fs.readFile('../scripts/dummy-products-by-taxonomy.json', 'utf-8');
    const dummyProducts = JSON.parse(fileData);
    console.log(`✅ Loaded original dummy products with ${Object.keys(dummyProducts).length} categories`);
    return dummyProducts;
  } catch (error) {
    console.error('❌ Error loading original dummy products:', error);
    throw error;
  }
}

// Find original product data by title
function findOriginalProduct(processedProduct, originalProducts) {
  const categoryName = processedProduct.category_name;
  const categoryProducts = originalProducts[categoryName] || [];
  
  // Try to find exact title match first
  let originalProduct = categoryProducts.find(p => p.title === processedProduct.title);
  
  // If no exact match, try partial match
  if (!originalProduct) {
    originalProduct = categoryProducts.find(p => 
      p.title.toLowerCase().includes(processedProduct.title.toLowerCase()) ||
      processedProduct.title.toLowerCase().includes(p.title.toLowerCase())
    );
  }
  
  return originalProduct;
}

// Create product images for imported products using original dummy data
async function createProductImages(products, originalProducts) {
  console.log('🖼️ Creating product images from original dummy data...');
  
  const images = [];
  let foundImages = 0;
  let notFoundImages = 0;
  
  for (const product of products) {
    const originalProduct = findOriginalProduct(product, originalProducts);
    
    if (originalProduct && originalProduct.images && originalProduct.images.length > 0) {
      // Use the original product images
      originalProduct.images.forEach((imageUrl, index) => {
        images.push({
          id: uuidv4(),
          product_id: product.id,
          image_url: imageUrl,
          alt_text: `${product.title} - Image ${index + 1}`,
          sort_order: index + 1,
          is_primary: index === 0 // First image is primary
        });
      });
      foundImages++;
      console.log(`   ✅ Found ${originalProduct.images.length} images for: ${product.title}`);
    } else {
      // Fallback to generic image if no original images found
      const fallbackImageUrl = `https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop&auto=format&q=80`;
      images.push({
        id: uuidv4(),
        product_id: product.id,
        image_url: fallbackImageUrl,
        alt_text: product.title,
        sort_order: 1,
        is_primary: true
      });
      notFoundImages++;
      console.log(`   ⚠️ No original images found for: ${product.title}, using fallback`);
    }
  }
  
  console.log(`\n📊 Image summary:`);
  console.log(`   ✅ Products with original images: ${foundImages}`);
  console.log(`   ⚠️ Products with fallback images: ${notFoundImages}`);
  console.log(`   🖼️ Total images to create: ${images.length}`);
  
  if (images.length === 0) {
    console.log('⚠️ No images to create');
    return;
  }
  
  // Insert images in batches
  let importedImages = 0;
  for (let i = 0; i < images.length; i += BATCH_SIZE) {
    const batch = images.slice(i, i + BATCH_SIZE);
    
    try {
      const { data, error } = await supabase
        .from('product_images')
        .insert(batch)
        .select('id');
      
      if (error) {
        console.error(`❌ Error inserting image batch:`, error);
        continue;
      }
      
      importedImages += data.length;
      
    } catch (error) {
      console.error(`❌ Exception inserting image batch:`, error);
    }
  }
  
  console.log(`✅ Created ${importedImages} product images`);
}

// Main import function
async function importProcessedProducts() {
  try {
    console.log('🚀 Starting product import process...\n');
    
    // Read processed products file
    console.log(`📖 Reading ${INPUT_FILE}...`);
    const fileData = await fs.readFile(INPUT_FILE, 'utf-8');
    const processedData = JSON.parse(fileData);
    
    console.log(`✅ Loaded processed data:`);
    console.log(`   📊 Total categories: ${processedData.metadata.total_categories}`);
    console.log(`   📦 Total products: ${processedData.metadata.total_products}`);
    console.log(`   🤖 AI service: ${processedData.metadata.ai_service_url}`);
    console.log(`   📅 Processed: ${processedData.metadata.processed_at}\n`);
    
    // Get database mappings
    console.log('🔍 Fetching database mappings...');
    const categoryMap = await getCategoryIds();
    const userMap = await getUserIds();
    
    // Log category mappings
    console.log('\n📋 Category mappings:');
    for (const [name, id] of categoryMap.entries()) {
      console.log(`   ${name}: ${id}`);
    }
    
    console.log('\n👥 User mappings:');
    for (const [name, id] of userMap.entries()) {
      console.log(`   ${name}: ${id}`);
    }
    
    // Flatten all products from all categories and add category name to each product
    const allProducts = [];
    for (const [categoryName, categoryData] of Object.entries(processedData.categories)) {
      console.log(`📦 Found ${categoryData.products.length} products in ${categoryName}`);
      
      // Add category name to each product
      const productsWithCategory = categoryData.products.map(product => ({
        ...product,
        category_name: categoryName
      }));
      
      allProducts.push(...productsWithCategory);
    }
    
    console.log(`\n📊 Total products to process: ${allProducts.length}\n`);
    
    // Load original dummy products for images
    console.log('\n📖 Loading original dummy products for images...');
    const originalProducts = await loadOriginalDummyProducts();
    
    // Import products
    const importResult = await importProducts(allProducts, categoryMap, userMap);
    
    // Create images for successfully imported products
    if (importResult.imported > 0) {
      console.log('\n🖼️ Creating product images...');
      // Get the products that were actually imported
      const importedProducts = allProducts.slice(0, importResult.imported);
      await createProductImages(importedProducts, originalProducts);
    }
    
    console.log('\n🎉 Product import completed successfully!');
    console.log('==================================================');
    console.log(`📦 Products imported: ${importResult.imported}`);
    console.log(`⏭️ Products skipped: ${importResult.skipped}`);
    console.log(`❌ Products with errors: ${importResult.errors || 0}`);
    console.log(`🖼️ Images created: ${importResult.imported}`);
    console.log('==================================================');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the import
console.log('Script starting...');
importProcessedProducts().catch(e => {
  console.error('Script failed:', e);
  process.exit(1);
});

export { importProcessedProducts };
