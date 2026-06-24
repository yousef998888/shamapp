import fs from 'fs/promises';
import { createClient } from '@supabase/supabase-js';

// Configuration
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Translation API endpoint
const TRANSLATION_ENDPOINT = 'http://72.61.183.11:5000/translate';

// Batch size for API calls
const BATCH_SIZE = 100;

// Utility function to chunk array into batches
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Helper function to fetch all pages from Supabase (handles pagination)
async function fetchAllPages(query, tableName) {
  const pageSize = 1000;
  let allData = [];
  let from = 0;
  let hasMore = true;
  let page = 1;

  while (hasMore) {
    const { data, error } = await query.range(from, from + pageSize - 1);
    
    if (error) {
      console.error(`❌ Error fetching ${tableName} page ${page}:`, error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allData = allData.concat(data);
      console.log(`   📄 Page ${page}: ${data.length} items (total: ${allData.length})`);
      from += pageSize;
      page++;
      
      // If we got less than pageSize, we've reached the end
      if (data.length < pageSize) {
        hasMore = false;
      }
    }
  }

  return allData;
}

// Function to fetch items that need translation
async function fetchItemsNeedingTranslation() {
  console.log('🔍 Fetching items that need Arabic translations...');
  
  const items = [];
  
  // Fetch categories without Arabic names (with pagination)
  console.log('📂 Fetching categories...');
  const categoriesQuery = supabase
    .from('categories')
    .select('id, name, description')
    .or('ar_name.is.null,ar_name.eq.')
    .is('ar_name', null);
  
  const categories = await fetchAllPages(categoriesQuery, 'categories');
  console.log(`📊 Found ${categories.length} categories needing translation`);
  categories.forEach(cat => {
    items.push({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      type: 'category'
    });
  });
  
  // Fetch attributes without Arabic names (with pagination)
  console.log('🏷️ Fetching attributes...');
  const attributesQuery = supabase
    .from('product_attributes')
    .select('id, name, description')
    .or('ar_name.is.null,ar_name.eq.')
    .is('ar_name', null);
  
  const attributes = await fetchAllPages(attributesQuery, 'product_attributes');
  console.log(`📊 Found ${attributes.length} attributes needing translation`);
  attributes.forEach(attr => {
    items.push({
      id: attr.id,
      name: attr.name,
      description: attr.description,
      type: 'attribute'
    });
  });
  
  // Fetch attribute terms without Arabic names (with pagination)
  console.log('📝 Fetching attribute terms...');
  const termsQuery = supabase
    .from('product_attribute_terms')
    .select('id, name, description')
    .or('ar_name.is.null,ar_name.eq.')
    .is('ar_name', null);
  
  const terms = await fetchAllPages(termsQuery, 'product_attribute_terms');
  console.log(`📊 Found ${terms.length} attribute terms needing translation`);
  terms.forEach(term => {
    items.push({
      id: term.id,
      name: term.name,
      description: term.description,
      type: 'term'
    });
  });
  
  console.log(`📈 Total items needing translation: ${items.length}`);
  return items;
}

// Function to translate a batch of items (all in parallel)
async function translateBatch(items) {
  try {
    console.log(`🔄 Translating batch of ${items.length} items in parallel...`);
    const batchStartTime = Date.now();
    let requestsCompleted = 0;
    
    // Create all promises immediately - this fires all requests in parallel
    console.log(`   📤 Firing all ${items.length} requests simultaneously...`);
    const requestStartTime = Date.now();
    const requestTimings = [];
    
    const translationPromises = items.map(async (item, index) => {
      const requestIndex = index;
      const requestStart = Date.now();
      
      try {
        const nameResponse = await fetch(TRANSLATION_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: item.name,
            source: 'en',
            target: 'ar'
          })
        });
        
        const requestDuration = Date.now() - requestStart;
        requestTimings.push(requestDuration);
        
        requestsCompleted++;
        if (requestsCompleted % 10 === 0 || requestsCompleted === items.length) {
          const avgTime = requestTimings.reduce((a, b) => a + b, 0) / requestTimings.length;
          const maxTime = Math.max(...requestTimings);
          const minTime = Math.min(...requestTimings);
          console.log(`   ✅ Completed ${requestsCompleted}/${items.length} | Avg: ${avgTime.toFixed(0)}ms | Min: ${minTime}ms | Max: ${maxTime}ms`);
        }
        
        let arabicName = '';
        if (nameResponse.ok) {
          const nameResult = await nameResponse.json();
          arabicName = nameResult.translatedText || nameResult.text || nameResult.translation || '';
        }
        
        return {
          id: item.id,
          type: item.type,
          translated: arabicName !== '',
          arabicName: arabicName,
          arabicDescription: ""
        };
      } catch (error) {
        const requestDuration = Date.now() - requestStart;
        requestTimings.push(requestDuration);
        
        requestsCompleted++;
        if (requestsCompleted % 10 === 0 || requestsCompleted === items.length) {
          const avgTime = requestTimings.reduce((a, b) => a + b, 0) / requestTimings.length;
          const maxTime = Math.max(...requestTimings);
          const minTime = Math.min(...requestTimings);
          console.log(`   ⚠️  Completed ${requestsCompleted}/${items.length} (with errors) | Avg: ${avgTime.toFixed(0)}ms`);
        }
        console.error(`❌ Error translating item ${item.id}:`, error.message);
        return {
          id: item.id,
          type: item.type,
          translated: false,
          arabicName: '',
          arabicDescription: ""
        };
      }
    });
    
    console.log(`   ⏳ All ${items.length} requests fired, waiting for responses...`);
    
    // Wait for all translations to complete
    const translations = await Promise.all(translationPromises);
    
    const batchDuration = Date.now() - batchStartTime;
    const avgRequestTime = requestTimings.reduce((a, b) => a + b, 0) / requestTimings.length;
    const maxRequestTime = Math.max(...requestTimings);
    const minRequestTime = Math.min(...requestTimings);
    
    console.log(`   ⏱️  Batch timing analysis:`);
    console.log(`      - Total batch time: ${(batchDuration / 1000).toFixed(2)}s`);
    console.log(`      - Average request time: ${avgRequestTime.toFixed(0)}ms`);
    console.log(`      - Fastest request: ${minRequestTime}ms`);
    console.log(`      - Slowest request: ${maxRequestTime}ms`);
    console.log(`      - If truly parallel, should take ~${maxRequestTime}ms (${(maxRequestTime / 1000).toFixed(2)}s)`);
    console.log(`      - Actual time: ${(batchDuration / 1000).toFixed(2)}s (${batchDuration > maxRequestTime ? '❌ NOT parallel - server is processing sequentially' : '✅ Parallel!'})`);
    console.log('translations', translations);
    const successCount = translations.filter(t => t.translated).length;
    console.log(`✅ Batch completed: ${successCount}/${items.length} translated`);
    return translations;
    
  } catch (error) {
    console.error('❌ Translation batch failed:', error);
    throw error;
  }
}

// Function to update database with translations
async function updateDatabaseWithTranslations(translations) {
  console.log('💾 Updating database with translations...');
  
  const updates = {
    categories: [],
    attributes: [],
    terms: []
  };
  
  // Group translations by type
  translations.forEach(translation => {
    if (translation.translated) {
      const update = {
        id: translation.id,
        ar_name: translation.arabicName,
        ar_description: translation.arabicDescription
      };
      
      switch (translation.type) {
        case 'category':
          updates.categories.push(update);
          break;
        case 'attribute':
          updates.attributes.push(update);
          break;
        case 'term':
          updates.terms.push(update);
          break;
      }
    }
  });
  
  // Update categories in parallel
  if (updates.categories.length > 0) {
    console.log(`📝 Updating ${updates.categories.length} categories in parallel...`);
    const categoryPromises = updates.categories.map(async (update) => {
      const { error } = await supabase
        .from('categories')
        .update({
          ar_name: update.ar_name,
          ar_description: update.ar_description,
          updated_at: new Date().toISOString()
        })
        .eq('id', update.id);
        
      if (error) {
        console.error(`❌ Error updating category ${update.id}:`, error);
        return false;
      }
      return true;
    });
    await Promise.all(categoryPromises);
  }
  
  // Update attributes in parallel
  if (updates.attributes.length > 0) {
    console.log(`📝 Updating ${updates.attributes.length} attributes in parallel...`);
    const attributePromises = updates.attributes.map(async (update) => {
      const { error } = await supabase
        .from('product_attributes')
        .update({
          ar_name: update.ar_name,
          ar_description: update.ar_description,
          updated_at: new Date().toISOString()
        })
        .eq('id', update.id);
        
      if (error) {
        console.error(`❌ Error updating attribute ${update.id}:`, error);
        return false;
      }
      return true;
    });
    await Promise.all(attributePromises);
  }
  
  // Update terms in parallel
  if (updates.terms.length > 0) {
    console.log(`📝 Updating ${updates.terms.length} attribute terms in parallel...`);
    const termPromises = updates.terms.map(async (update) => {
      const { error } = await supabase
        .from('product_attribute_terms')
        .update({
          ar_name: update.ar_name,
          ar_description: update.ar_description,
          updated_at: new Date().toISOString()
        })
        .eq('id', update.id);
        
      if (error) {
        console.error(`❌ Error updating term ${update.id}:`, error);
        return false;
      }
      return true;
    });
    await Promise.all(termPromises);
  }
  
  console.log('✅ Database updates completed');
}

// Main function
async function bulkTranslate() {
  try {
    console.log('🚀 Starting bulk translation process...');
    
    // Fetch items that need translation
    const items = await fetchItemsNeedingTranslation();
    
    if (items.length === 0) {
      console.log('✅ No items need translation!');
      return;
    }
    
    // Split items into batches
    const batches = chunkArray(items, BATCH_SIZE);
    console.log(`📦 Processing ${batches.length} batches of ${BATCH_SIZE} items each`);
    
    let totalTranslated = 0;
    let totalFailed = 0;
    
    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`\n📦 Processing batch ${i + 1}/${batches.length} (${batch.length} items)`);
      
      try {
        // Add delay between batches to avoid rate limiting
        if (i > 0) {
          console.log('⏳ Waiting 2 seconds before next batch...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Translate batch
        const translations = await translateBatch(batch);
        
        // Update database
        await updateDatabaseWithTranslations(translations);
        
        // Count results
        const translated = translations.filter(t => t.translated).length;
        const failed = translations.filter(t => !t.translated).length;
        
        totalTranslated += translated;
        totalFailed += failed;
        
        console.log(`✅ Batch ${i + 1} completed: ${translated} translated, ${failed} failed`);
        
      } catch (error) {
        console.error(`❌ Batch ${i + 1} failed:`, error);
        totalFailed += batch.length;
      }
    }
    
    // Final summary
    console.log('\n🎉 Bulk translation completed!');
    console.log(`📈 Final Summary:`);
    console.log(`   - Total items processed: ${items.length}`);
    console.log(`   - Successfully translated: ${totalTranslated}`);
    console.log(`   - Failed: ${totalFailed}`);
    console.log(`   - Success rate: ${((totalTranslated / items.length) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Bulk translation failed:', error);
    process.exit(1);
  }
}

// Run the script
bulkTranslate(); 