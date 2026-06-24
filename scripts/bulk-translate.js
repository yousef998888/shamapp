import fs from 'fs/promises';
import { createClient } from '@supabase/supabase-js';

// Configuration
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3005';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Translation API endpoint
const TRANSLATION_ENDPOINT = `${API_BASE_URL}/api/bulk-translations/translate-items`;

// Batch size for API calls
const BATCH_SIZE = 50;

// Utility function to chunk array into batches
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Function to fetch items that need translation
async function fetchItemsNeedingTranslation() {
  console.log('🔍 Fetching items that need Arabic translations...');
  
  const items = [];
  
  // Fetch categories without Arabic names
  console.log('📂 Fetching categories...');
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('id, name, description')
    .or('ar_name.is.null,ar_name.eq.')
    .is('ar_name', null);
    
  if (catError) {
    console.error('❌ Error fetching categories:', catError);
    throw catError;
  }
  
  console.log(`📊 Found ${categories.length} categories needing translation`);
  categories.forEach(cat => {
    items.push({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      type: 'category'
    });
  });
  
  // Fetch attributes without Arabic names
  console.log('🏷️ Fetching attributes...');
  const { data: attributes, error: attrError } = await supabase
    .from('product_attributes')
    .select('id, name, description')
    .or('ar_name.is.null,ar_name.eq.')
    .is('ar_name', null);
    
  if (attrError) {
    console.error('❌ Error fetching attributes:', attrError);
    throw attrError;
  }
  
  console.log(`📊 Found ${attributes.length} attributes needing translation`);
  attributes.forEach(attr => {
    items.push({
      id: attr.id,
      name: attr.name,
      description: attr.description,
      type: 'attribute'
    });
  });
  
  // Fetch attribute terms without Arabic names
  console.log('📝 Fetching attribute terms...');
  const { data: terms, error: termError } = await supabase
    .from('product_attribute_terms')
    .select('id, name, description')
    .or('ar_name.is.null,ar_name.eq.')
    .is('ar_name', null);
    
  if (termError) {
    console.error('❌ Error fetching attribute terms:', termError);
    throw termError;
  }
  
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

// Function to translate a batch of items
async function translateBatch(items) {
  try {
    console.log(`🔄 Translating batch of ${items.length} items...`);
    
    const response = await fetch(TRANSLATION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Translation API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(`Translation failed: ${result.error || 'Unknown error'}`);
    }
    
    console.log(`✅ Batch completed: ${result.stats.translated}/${result.stats.total} translated`);
    return result.translations;
    
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
  
  // Update categories
  if (updates.categories.length > 0) {
    console.log(`📝 Updating ${updates.categories.length} categories...`);
    for (const update of updates.categories) {
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
      }
    }
  }
  
  // Update attributes
  if (updates.attributes.length > 0) {
    console.log(`📝 Updating ${updates.attributes.length} attributes...`);
    for (const update of updates.attributes) {
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
      }
    }
  }
  
  // Update terms
  if (updates.terms.length > 0) {
    console.log(`📝 Updating ${updates.terms.length} attribute terms...`);
    for (const update of updates.terms) {
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
      }
    }
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