import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const INPUT_FILE = 'dummy-products-by-taxonomy.json';
const OUTPUT_FILE = 'processed-dummy-products.json';
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3005';

// Rate limiting configuration - using your actual limits
const REQUESTS_PER_MINUTE = 5000; // Conservative limit (well below your 10,000 RPM)
const DELAY_BETWEEN_REQUESTS = (60 * 1000) / REQUESTS_PER_MINUTE; // 12ms delay
const BATCH_SIZE = 20; // Process in larger batches
const BATCH_DELAY = 1 * 1000; // 1 second delay between batches

// Mapping of DummyJSON categories to your taxonomy categories
const CATEGORY_MAPPING = {
  "Dresses": "Dresses",
  "Laptops": "Laptops",
  "Watches": "Watches",
  "Home Fragrances": "Home Fragrances",
  "Mobile & Smart Phone Accessories": "Mobile & Smart Phone Accessories"
};

// Sample users for assigning products (you can modify these)
const SAMPLE_USERS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'John Doe',
    location: 'New York, NY'
  },
  {
    id: '22222222-2222-2222-2222-222222222222', 
    name: 'Sarah Smith',
    location: 'Los Angeles, CA'
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Mike Johnson', 
    location: 'Chicago, IL'
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Emma Wilson',
    location: 'Houston, TX'
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    name: 'David Brown',
    location: 'Miami, FL'
  }
];

// Translation cache to avoid repeated API calls
const translationCache = new Map();

// Helper function to translate text using OpenAI API
async function translateText(text, targetLanguage = 'ar', retryCount = 0) {
  const maxRetries = 3;
  const cacheKey = `${text}_${targetLanguage}`;
  
  // Check cache first
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }
  
  try {
    console.log(`🔄 Translating: "${text}" to ${targetLanguage}`);
    
    const response = await fetch(`${API_BASE_URL}/api/translations-v2/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        target_language: targetLanguage,
        source_language: 'auto'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Translation API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(`Translation failed: ${result.error}`);
    }

    // Cache the result
    translationCache.set(cacheKey, result.translated_text);
    
    console.log(`✅ Translation successful: "${text}" → "${result.translated_text}"`);
    return result.translated_text;
    
  } catch (error) {
    console.error(`❌ Translation failed for "${text}":`, error.message);
    
    // If we haven't exceeded max retries, try again
    if (retryCount < maxRetries) {
      const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
      console.log(`   🔄 Retrying translation in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return translateText(text, targetLanguage, retryCount + 1);
    }
    
    // Fallback to original text if translation fails
    console.log(`   ⚠️ Using original text as fallback: "${text}"`);
    return text;
  }
}

// Helper function to generate Arabic text using translation API
const generateArabicText = async (englishText) => {
  if (!englishText || englishText.trim() === '') {
    return englishText;
  }
  
  return await translateText(englishText, 'ar');
};

// Helper function to determine condition from DummyJSON data
const getCondition = (product) => {
  // DummyJSON doesn't have condition field, so we'll randomly assign
  const conditions = ['new', 'used', 'refurbished'];
  return conditions[Math.floor(Math.random() * conditions.length)];
};

// Helper function to get random user
const getRandomUser = () => {
  return SAMPLE_USERS[Math.floor(Math.random() * SAMPLE_USERS.length)];
};

// Helper function to generate Arabic description using translation API
const generateArabicDescription = async (englishDescription) => {
  if (!englishDescription || englishDescription.trim() === '') {
    return englishDescription;
  }
  
  return await translateText(englishDescription, 'ar');
};

// Process a single product through AI service with retry logic
async function processProductWithAI(product, retryCount = 0) {
  const maxRetries = 3;
  const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
  
  try {
    console.log(`🤖 Processing: ${product.title}${retryCount > 0 ? ` (retry ${retryCount}/${maxRetries})` : ''}`);
    
    // Generate Arabic translations first
    const arTitle = await generateArabicText(product.category + ' - ' + product.title);
    const arDescription = await generateArabicDescription(product.description);
    
    const response = await fetch(`${API_BASE_URL}/api/product-ai/process-product`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: product.title,
        description: product.description,
        ar_title: arTitle,
        ar_description: arDescription
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = errorText.substring(0, 100) + '...';
      }
      
      // Check if it's a rate limit error
      if (response.status === 429 || errorMessage.includes('rate limit') || errorMessage.includes('Too many')) {
        if (retryCount < maxRetries) {
          console.log(`   ⏳ Rate limit hit, retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return processProductWithAI(product, retryCount + 1);
        }
      }
      
      throw new Error(`AI service error: ${errorMessage}`);
    }

    const aiResult = await response.json();
    
    if (!aiResult.success) {
      throw new Error('AI processing failed');
    }

    console.log(`✅ Generated ${aiResult.tags.length} tags and ${aiResult.embedding.length}D embedding`);
    return aiResult;
    
  } catch (error) {
    console.error(`❌ AI processing failed for ${product.title}:`, error.message);
    
    // If we haven't exceeded max retries and it's not a rate limit, try again
    if (retryCount < maxRetries && !error.message.includes('rate limit') && !error.message.includes('Too many')) {
      console.log(`   🔄 Retrying in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return processProductWithAI(product, retryCount + 1);
    }
    
    // No fallback - throw the error
    throw error;
  }
}

// Convert DummyJSON product to database schema
async function convertProductToDbSchema(dummyProduct, taxonomyCategory, categoryId) {
  const user = getRandomUser();
  const condition = getCondition(dummyProduct);
  
  // Process with AI
  const aiResult = await processProductWithAI(dummyProduct);
  
  return {
    id: uuidv4(),
    seller_id: user.id,
    category_id: categoryId,
    title: dummyProduct.title,
    ar_title: await generateArabicText(taxonomyCategory + ' - ' + dummyProduct.title),
    description: dummyProduct.description,
    ar_description: await generateArabicDescription(dummyProduct.description),
    price: parseFloat(dummyProduct.price),
    currency: 'USD', // DummyJSON uses USD
    condition: condition,
    status: 'active',
    location: user.location,
    is_negotiable: Math.random() > 0.5, // Random negotiable
    view_count: Math.floor(Math.random() * 500), // Random view count
    is_auction: false,
    starting_price: null,
    bid_end_date: null,
    latitude: null,
    longitude: null,
    delivery_option: 'both',
    tags: aiResult.tags,
    ar_tags: aiResult.ar_tags || [], // Include Arabic tags
    embedding: aiResult.embedding,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

// Main processing function
async function processDummyProducts() {
  try {
    console.log('🚀 Starting to process dummy products...\n');
    
    // Read the input file
    console.log(`📖 Reading ${INPUT_FILE}...`);
    const inputData = await fs.readFile(INPUT_FILE, 'utf-8');
    const dummyProducts = JSON.parse(inputData);
    
    console.log(`✅ Loaded ${Object.keys(dummyProducts).length} categories\n`);
    
    // Initialize output data structure
    const outputData = {
      metadata: {
        total_categories: Object.keys(dummyProducts).length,
        total_products: 0,
        processed_at: new Date().toISOString(),
        ai_service_url: API_BASE_URL,
        status: 'processing'
      },
      categories: {}
    };
    
    // Write initial file
    console.log(`💾 Creating initial output file: ${OUTPUT_FILE}`);
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(outputData, null, 2), 'utf-8');
    
    // Process each category with rate limiting
    let totalProcessed = 0;
    const categoryNames = Object.keys(dummyProducts);
    
    for (let catIndex = 0; catIndex < categoryNames.length; catIndex++) {
      const taxonomyCategory = categoryNames[catIndex];
      const products = dummyProducts[taxonomyCategory];
      
      console.log(`📦 Processing ${taxonomyCategory} (${products.length} products)... [${catIndex + 1}/${categoryNames.length}]`);
      
      // Generate a category ID (you'll need to map this to actual category IDs from your DB)
      const categoryId = uuidv4(); // Placeholder - you'll need real category IDs
      
      const categoryProducts = [];
      
      // Process products in batches with rate limiting
      for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batch = products.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(products.length / BATCH_SIZE);
        
        console.log(`   📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} products)...`);
        
        for (let j = 0; j < batch.length; j++) {
          const product = batch[j];
          const productIndex = i + j + 1;
          console.log(`   ${productIndex}/${products.length}: ${product.title}`);
          
          try {
            const dbProduct = await convertProductToDbSchema(product, taxonomyCategory, categoryId);
            categoryProducts.push(dbProduct);
            totalProcessed++;
            
            // Rate limiting delay between requests
            if (j < batch.length - 1) { // Don't delay after the last item in batch
              console.log(`   ⏳ Waiting ${DELAY_BETWEEN_REQUESTS}ms for rate limiting...`);
              await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
            }
            
          } catch (error) {
            console.error(`   ❌ Failed to process ${product.title}:`, error.message);
          }
        }
        
        // Delay between batches (except for the last batch)
        if (i + BATCH_SIZE < products.length) {
          console.log(`   ⏳ Batch complete, waiting ${BATCH_DELAY}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
      }
      
      // Add this category to the output data
      outputData.categories[taxonomyCategory] = {
        category_id: categoryId,
        category_name: taxonomyCategory,
        products: categoryProducts
      };
      
      // Update metadata
      outputData.metadata.total_products = totalProcessed;
      outputData.metadata.last_processed_category = taxonomyCategory;
      outputData.metadata.last_processed_at = new Date().toISOString();
      
      // Write incremental update to file
      console.log(`💾 Saving progress... (${totalProcessed} products processed so far)`);
      await fs.writeFile(OUTPUT_FILE, JSON.stringify(outputData, null, 2), 'utf-8');
      
      console.log(`✅ Processed ${categoryProducts.length}/${products.length} products for ${taxonomyCategory}\n`);
    }
    
    // Final update - mark as completed
    outputData.metadata.status = 'completed';
    outputData.metadata.completed_at = new Date().toISOString();
    
    // Write final file
    console.log(`💾 Writing final processed data to ${OUTPUT_FILE}...`);
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(outputData, null, 2), 'utf-8');
    
    console.log('\n🎉 Processing completed successfully!');
    console.log('==================================================');
    console.log(`Total categories: ${Object.keys(outputData.categories).length}`);
    console.log(`Total products: ${totalProcessed}`);
    console.log(`Output file: ${OUTPUT_FILE}`);
    console.log('==================================================');
    
    // Show summary by category
    console.log('\n📊 Summary by category:');
    for (const [category, data] of Object.entries(outputData.categories)) {
      console.log(`${category}: ${data.products.length} products`);
    }
    
  } catch (error) {
    console.error('❌ Processing failed:', error);
    
    // Try to save whatever we have so far
    try {
      if (typeof outputData !== 'undefined') {
        outputData.metadata.status = 'failed';
        outputData.metadata.error = error.message;
        outputData.metadata.failed_at = new Date().toISOString();
        await fs.writeFile(OUTPUT_FILE, JSON.stringify(outputData, null, 2), 'utf-8');
        console.log(`💾 Saved partial results to ${OUTPUT_FILE}`);
      }
    } catch (saveError) {
      console.error('❌ Failed to save partial results:', saveError);
    }
    
    process.exit(1);
  }
}

// Check if AI service is available
async function checkAIService() {
  try {
    console.log('🔍 Checking AI service availability...');
    const response = await fetch(`${API_BASE_URL}/api/product-ai/status`);
    const data = await response.json();
    
    if (data.openaiConfigured) {
      console.log('✅ AI service is available and configured');
      return true;
    } else {
      console.log('⚠️ AI service is available but OpenAI is not configured');
      return false;
    }
  } catch (error) {
    console.log('❌ AI service is not available, will use fallback processing');
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 Dummy Products Processor');
  console.log('==========================\n');
  
  try {
    // Check AI service
    const aiAvailable = await checkAIService();
    if (!aiAvailable) {
      console.log('⚠️ AI service not available, using fallback processing\n');
    }
    
    // Process products
    await processDummyProducts();
  } catch (error) {
    console.error('❌ Main execution failed:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(e => console.error('Main function error:', e));

export { processDummyProducts, convertProductToDbSchema };
