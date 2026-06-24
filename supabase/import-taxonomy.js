import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Utility functions
function generateSlug(name) {
  let baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  
  // Handle duplicates by appending a number
  let slug = baseSlug;
  let counter = 1;
  while (usedSlugs.has(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  usedSlugs.add(slug);
  return slug;
}

function generateId() {
  return crypto.randomUUID();
}

// Category mapping cache
const categoryMap = new Map();
const attributeMap = new Map();
const usedSlugs = new Set();

async function importCategories(taxonomyData) {
  console.log('🌳 Starting category import...');
  
  const categories = [];
  const categoryRelationships = [];
  
  // First pass: collect all categories
  for (const vertical of taxonomyData.verticals) {
    for (const category of vertical.categories) {
      const categoryData = {
        id: generateId(),
        name: category.name,
        slug: generateSlug(category.name),
        description: `Category: ${category.full_name}`,
        parent_id: null,
        is_active: true,
        sort_order: category.level || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      categories.push(categoryData);
      categoryMap.set(category.id, categoryData);
    }
  }
  
  // Check for existing categories and get their IDs (in batches to avoid URI too long)
  console.log('🔍 Checking for existing categories...');
  const slugs = categories.map(cat => cat.slug);
  
  // Process in batches of 100 to avoid URI too long error
  const categoryBatchSize = 50;
  const existingCategories = [];
  
  for (let i = 0; i < slugs.length; i += categoryBatchSize) {
    const batch = slugs.slice(i, i + categoryBatchSize);
    console.log(`🔍 Checking batch ${Math.floor(i / categoryBatchSize) + 1}/${Math.ceil(slugs.length / categoryBatchSize)} (${batch.length} slugs)...`);
    
    // Debug: show some sample slugs and their lengths
    if (i === 0) {
      console.log(`📏 Sample slugs: ${batch.slice(0, 3).map(s => `"${s}" (${s.length} chars)`).join(', ')}`);
    }
    
    const { data: batchCategories, error: checkError } = await supabase
      .from('categories')
      .select('id, slug')
      .in('slug', batch);
      
    if (checkError) {
      console.error('❌ Error checking existing categories:', checkError);
      throw checkError;
    }
    
    existingCategories.push(...batchCategories);
  }
  
  // Create a map of existing slugs to their IDs and populate usedSlugs set
  const existingSlugMap = new Map(existingCategories.map(cat => [cat.slug, cat.id]));
  existingCategories.forEach(cat => usedSlugs.add(cat.slug));
  
  const newCategories = categories.filter(cat => !existingSlugMap.has(cat.slug));
  
  console.log(`📊 Found ${existingCategories.length} existing categories`);
  console.log(`📝 Inserting ${newCategories.length} new categories...`);
  
  // Insert new categories first
  if (newCategories.length > 0) {
    const { data: insertedCategories, error } = await supabase
      .from('categories')
      .insert(newCategories)
      .select();
      
    if (error) {
      console.error('❌ Error inserting categories:', error);
      throw error;
    }
    
    console.log(`✅ Successfully inserted ${insertedCategories.length} categories`);
    
    // Update the existing slug map with newly inserted categories
    insertedCategories.forEach(cat => {
      existingSlugMap.set(cat.slug, cat.id);
      usedSlugs.add(cat.slug);
    });
  } else {
    console.log('✅ No new categories to insert');
  }
  
  // Now establish parent-child relationships using actual parent_id from taxonomy
  console.log('🔗 Establishing parent-child relationships...');
  const updatePromises = [];
  let relationshipsFound = 0;
  let relationshipsProcessed = 0;
  
  // Create a map of taxonomy IDs to database IDs using slug mapping
  // categoryMap has: taxonomy.id -> categoryData (with slug)
  // existingSlugMap has: slug -> database.id
  // Combine them to get: taxonomy.id -> database.id
  const taxonomyIdToDbIdMap = new Map();
  
  for (const vertical of taxonomyData.verticals) {
    for (const category of vertical.categories) {
      const categoryData = categoryMap.get(category.id);
      if (categoryData) {
        const dbId = existingSlugMap.get(categoryData.slug);
        if (dbId) {
          taxonomyIdToDbIdMap.set(category.id, dbId);
        }
      }
    }
  }
  
  console.log(`📊 Created taxonomy ID map with ${taxonomyIdToDbIdMap.size} entries`);
  
  for (const vertical of taxonomyData.verticals) {
    for (const category of vertical.categories) {
      // Use parent_id directly from taxonomy data
      if (category.parent_id) {
        relationshipsFound++;
        const childDbId = taxonomyIdToDbIdMap.get(category.id);
        const parentDbId = taxonomyIdToDbIdMap.get(category.parent_id);
        
        if (childDbId && parentDbId && childDbId !== parentDbId) {
          updatePromises.push(
            supabase
              .from('categories')
              .update({ parent_id: parentDbId })
              .eq('id', childDbId)
          );
          relationshipsProcessed++;
          console.log(`   🔗 Linking: ${category.name} → parent`);
        } else {
          console.log(`   ⚠️  Could not link ${category.name} (childId: ${childDbId}, parentId: ${parentDbId})`);
        }
      }
    }
  }
  
  console.log(`📊 Found ${relationshipsFound} categories with parent relationships`);
  console.log(`📊 Processed ${relationshipsProcessed} relationships for database update`);
  
  // Debug: Show some sample slug lookups
  console.log('🔍 Debug: Sample slug lookups from taxonomy:');
  const sampleCategories = ['Clothing', 'Dresses', 'Bird Cage Accessories'];
  for (const catName of sampleCategories) {
    const slug = generateSlug(catName);
    const id = existingSlugMap.get(slug);
    console.log(`   - ${catName} → slug: '${slug}' → id: ${id || 'NOT FOUND'}`);
  }
  
  // Debug: Check if categories exist in database
  console.log('🔍 Debug: Checking if categories exist in database...');
  const sampleSlugs = ['toys-games', 'vehicles-parts', 'animals-pet-supplies'];
  for (const slug of sampleSlugs) {
    const { data: sampleCategory, error: sampleError } = await supabase
      .from('categories')
      .select('id, name, slug')
      .eq('slug', slug)
      .limit(1);
    
    if (sampleError) {
      console.log(`   ❌ Error checking sample category ${slug}:`, sampleError);
    } else {
      console.log(`   ${sampleCategory.length > 0 ? '✅' : '❌'} Sample category ${slug}: ${sampleCategory.length > 0 ? sampleCategory[0].name : 'NOT FOUND'}`);
    }
  }
  
  // Debug: Show some sample slugs from taxonomy
  console.log('🔍 Debug: Sample slugs from taxonomy:');
  const sampleTaxonomySlugs = categories.slice(0, 5).map(cat => cat.slug);
  sampleTaxonomySlugs.forEach(slug => {
    console.log(`   - ${slug}`);
  });
  
  // Debug: Check existingSlugMap
  console.log('🔍 Debug: Checking existingSlugMap...');
  console.log(`   - Map size: ${existingSlugMap.size}`);
  console.log(`   - Sample lookups:`);
  sampleSlugs.forEach(slug => {
    const id = existingSlugMap.get(slug);
    console.log(`     ${slug}: ${id || 'NOT FOUND'}`);
  });
  
  if (updatePromises.length > 0) {
    console.log(`📝 Updating ${updatePromises.length} parent-child relationships in batches...`);
    
    // Process updates in batches of 50 to avoid overwhelming the database
    const batchSize = 50;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < updatePromises.length; i += batchSize) {
      const batch = updatePromises.slice(i, i + batchSize);
      console.log(`   📊 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(updatePromises.length/batchSize)} (${batch.length} updates)`);
      
      try {
        const results = await Promise.all(batch);
        const errors = results.filter(result => result.error);
        
        if (errors.length > 0) {
          console.error(`   ⚠️  Batch ${Math.floor(i/batchSize) + 1} had ${errors.length} errors`);
          errorCount += errors.length;
        } else {
          successCount += batch.length;
        }
      } catch (error) {
        console.error(`   ❌ Batch ${Math.floor(i/batchSize) + 1} failed:`, error.message);
        errorCount += batch.length;
      }
      
      // Add a small delay between batches to be gentle on the database
      if (i + batchSize < updatePromises.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`✅ Parent-child relationships update complete: ${successCount} successful, ${errorCount} failed`);
  }
  
  return { categorySlugMap: existingSlugMap, existingSlugMap };
}

async function importAttributes(taxonomyData) {
  console.log('🏷️ Starting attribute import...');
  
  const attributes = [];
  const attributeTerms = [];
  
  // Process attributes from taxonomy
  for (const attribute of taxonomyData.attributes) {
    const attributeData = {
      id: generateId(),
      name: attribute.name,
      slug: generateSlug(attribute.name),
      description: attribute.description,
      is_active: true,
      enable_archives: false,
      sort_order: 'name',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    attributes.push(attributeData);
    attributeMap.set(attribute.id, attributeData);
    
    // Process attribute terms/values
    if (attribute.values) {
      for (const value of attribute.values) {
        const termData = {
          id: generateId(),
          attribute_id: attributeData.id,
          name: value.name,
          slug: generateSlug(value.name),
          description: `Term for ${attribute.name}: ${value.name}`,
          sort_order: 0,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        attributeTerms.push(termData);
      }
    }
  }
  
  // Check for existing attributes and get their IDs (in batches to avoid URI too long)
  console.log('🔍 Checking for existing attributes...');
  const attributeSlugs = attributes.map(attr => attr.slug);
  
  // Process in batches of 100 to avoid URI too long error
  const attributeBatchSize = 50;
  const existingAttributes = [];
  
  for (let i = 0; i < attributeSlugs.length; i += attributeBatchSize) {
    const batch = attributeSlugs.slice(i, i + attributeBatchSize);
    console.log(`🔍 Checking attribute batch ${Math.floor(i / attributeBatchSize) + 1}/${Math.ceil(attributeSlugs.length / attributeBatchSize)} (${batch.length} slugs)...`);
    
    const { data: batchAttributes, error: checkAttrError } = await supabase
      .from('product_attributes')
      .select('id, slug, name')
      .in('slug', batch);
      
    if (checkAttrError) {
      console.error('❌ Error checking existing attributes:', checkAttrError);
      throw checkAttrError;
    }
    
    existingAttributes.push(...batchAttributes);
  }
  
  // Create a map of existing attribute slugs to their IDs
  const existingAttributeSlugMap = new Map(existingAttributes.map(attr => [attr.slug, attr.id]));
  const newAttributes = attributes.filter(attr => !existingAttributeSlugMap.has(attr.slug));
  
  console.log(`📊 Found ${existingAttributes.length} existing attributes`);
  console.log(`📝 Inserting ${newAttributes.length} new attributes...`);
  
  // Insert new attributes first
  if (newAttributes.length > 0) {
    const { data: insertedAttributes, error: attrError } = await supabase
      .from('product_attributes')
      .insert(newAttributes)
      .select();
      
    if (attrError) {
      console.error('❌ Error inserting attributes:', attrError);
      throw attrError;
    }
    
    console.log(`✅ Successfully inserted ${insertedAttributes.length} attributes`);
    
    // Update the existing attribute slug map with newly inserted attributes
    insertedAttributes.forEach(attr => {
      existingAttributeSlugMap.set(attr.slug, attr.id);
    });
  } else {
    console.log('✅ No new attributes to insert');
  }
  
  // Now update attribute terms to use the correct attribute IDs
  console.log('🔄 Updating attribute terms with correct attribute IDs...');
  const updatedAttributeTerms = attributeTerms.map(term => {
    // Find the attribute that this term belongs to
    const attribute = attributes.find(attr => attr.id === term.attribute_id);
    if (attribute) {
      const correctAttributeId = existingAttributeSlugMap.get(attribute.slug);
      if (correctAttributeId) {
        return {
          ...term,
          attribute_id: correctAttributeId
        };
      }
    }
    return term;
  }).filter(term => term.attribute_id); // Remove terms that couldn't be mapped
  
  // Check for existing attribute terms and skip duplicates (in batches to avoid URI too long)
  console.log('🔍 Checking for existing attribute terms...');
  const termSlugs = updatedAttributeTerms.map(term => term.slug);
  
  // Process in batches of 100 to avoid URI too long error
  const termBatchSize = 50;
  const existingTerms = [];
  
  for (let i = 0; i < termSlugs.length; i += termBatchSize) {
    const batch = termSlugs.slice(i, i + termBatchSize);
    console.log(`🔍 Checking term batch ${Math.floor(i / termBatchSize) + 1}/${Math.ceil(termSlugs.length / termBatchSize)} (${batch.length} slugs)...`);
    
    const { data: batchTerms, error: checkTermError } = await supabase
      .from('product_attribute_terms')
      .select('slug')
      .in('slug', batch);
      
    if (checkTermError) {
      console.error('❌ Error checking existing attribute terms:', checkTermError);
      throw checkTermError;
    }
    
    existingTerms.push(...batchTerms);
  }
  
  const existingTermSlugs = new Set(existingTerms.map(term => term.slug));
  const newTerms = updatedAttributeTerms.filter(term => !existingTermSlugs.has(term.slug));
  
  console.log(`📊 Found ${existingTerms.length} existing attribute terms`);
  console.log(`📝 Inserting ${newTerms.length} new attribute terms...`);
  
  if (newTerms.length === 0) {
    console.log('✅ No new attribute terms to insert');
    return { attributes: existingAttributeSlugMap, terms: [] };
  }
  
  const { data: insertedTerms, error: termError } = await supabase
    .from('product_attribute_terms')
    .insert(newTerms)
    .select();
    
  if (termError) {
    console.error('❌ Error inserting attribute terms:', termError);
    throw termError;
  }
  
  console.log(`✅ Successfully inserted ${insertedTerms.length} attribute terms`);
  return { attributes: existingAttributeSlugMap, terms: insertedTerms };
}

async function linkCategoriesToAttributes(taxonomyData, existingSlugMap, attributeData) {
  console.log('🔗 Linking categories to attributes...');
  
  const categoryAttributeRelationships = [];
  let categoriesWithAttributes = 0;
  let totalAttributesLinked = 0;
  
  // Get all attributes from database to map by name
  const { data: allAttributes, error: attrError } = await supabase
    .from('product_attributes')
    .select('id, name, slug');
    
  if (attrError) {
    console.error('❌ Error fetching attributes:', attrError);
    throw attrError;
  }
  
  const attributeNameMap = new Map(allAttributes.map(attr => [attr.name, attr.id]));
  console.log(`📊 Found ${allAttributes.length} attributes in database`);
  
  // Create taxonomy ID to database ID map using slug mapping (same as parent-child relationships)
  // categoryMap has: taxonomy.id -> categoryData (with slug)
  // existingSlugMap has: slug -> database.id
  // Combine them to get: taxonomy.id -> database.id
  const taxonomyIdToDbIdMap = new Map();
  
  for (const vertical of taxonomyData.verticals) {
    for (const category of vertical.categories) {
      const categoryData = categoryMap.get(category.id);
      if (categoryData) {
        const dbId = existingSlugMap.get(categoryData.slug);
        if (dbId) {
          taxonomyIdToDbIdMap.set(category.id, dbId);
        }
      }
    }
  }
  
  for (const vertical of taxonomyData.verticals) {
    for (const category of vertical.categories) {
      const categoryId = taxonomyIdToDbIdMap.get(category.id);
      
      if (categoryId && category.attributes) {
        categoriesWithAttributes++;
        let categoryAttributeCount = 0;
        
        for (const attribute of category.attributes) {
          const attributeId = attributeNameMap.get(attribute.name);
          
          if (attributeId) {
            const relationship = {
              id: generateId(),
              category_id: categoryId,
              attribute_id: attributeId,
              created_at: new Date().toISOString()
            };
            
            categoryAttributeRelationships.push(relationship);
            categoryAttributeCount++;
            totalAttributesLinked++;
          } else {
            console.log(`   ⚠️  Attribute not found in database: ${attribute.name}`);
          }
        }
        
        console.log(`   🔗 ${category.name}: ${categoryAttributeCount} attributes linked`);
      }
    }
  }
  
  console.log(`📊 Categories with attributes: ${categoriesWithAttributes}`);
  console.log(`📊 Total attribute relationships: ${totalAttributesLinked}`);
  
  // Debug: Check sample categories for attributes
  console.log('🔍 Debug: Checking sample categories for attributes...');
  let sampleCount = 0;
  for (const vertical of taxonomyData.verticals) {
    for (const category of vertical.categories) {
      if (sampleCount < 5) {
        const hasAttributes = !!category.attributes;
        const attrCount = category.attributes ? category.attributes.length : 0;
        console.log(`   - ${category.name}: ${hasAttributes ? `${attrCount} attributes` : 'NO attributes'}`);
        sampleCount++;
      }
    }
    if (sampleCount >= 5) break;
  }
  
  if (categoryAttributeRelationships.length > 0) {
    // Check for existing relationships and skip duplicates
    console.log('🔍 Checking for existing category-attribute relationships...');
    const relationshipKeys = categoryAttributeRelationships.map(rel => 
      `${rel.category_id}-${rel.attribute_id}`
    );
    
    const { data: existingRelationships, error: checkRelError } = await supabase
      .from('category_attribute_relationships')
      .select('category_id, attribute_id');
      
    if (checkRelError) {
      console.error('❌ Error checking existing relationships:', checkRelError);
      throw checkRelError;
    }
    
    const existingKeys = new Set(existingRelationships.map(rel => 
      `${rel.category_id}-${rel.attribute_id}`
    ));
    
    const newRelationships = categoryAttributeRelationships.filter(rel => 
      !existingKeys.has(`${rel.category_id}-${rel.attribute_id}`)
    );
    
    console.log(`📊 Found ${existingRelationships.length} existing relationships`);
    console.log(`📝 Inserting ${newRelationships.length} new relationships...`);
    
    if (newRelationships.length > 0) {
      const { error } = await supabase
        .from('category_attribute_relationships')
        .insert(newRelationships);
        
      if (error) {
        console.error('❌ Error inserting category-attribute relationships:', error);
        throw error;
      }
      
      console.log(`✅ Successfully linked categories to attributes`);
    } else {
      console.log('✅ No new relationships to insert');
    }
  }
}

async function importTaxonomyData(taxonomyFilePath) {
  try {
    console.log('📖 Reading taxonomy file...');
    const taxonomyContent = await fs.readFile(taxonomyFilePath, 'utf-8');
    const taxonomyData = JSON.parse(taxonomyContent);
    
    console.log(`📊 Processing taxonomy with ${taxonomyData.verticals.length} verticals`);
  
  // Debug: Show sample category structure
  if (taxonomyData.verticals.length > 0 && taxonomyData.verticals[0].categories.length > 0) {
    const sampleCategory = taxonomyData.verticals[0].categories[0];
    console.log(`🔍 Sample category structure:`, {
      name: sampleCategory.name,
      hasAncestors: !!sampleCategory.ancestors,
      ancestorsCount: sampleCategory.ancestors?.length || 0,
      hasParentId: !!sampleCategory.parent_id,
      hasAttributes: !!sampleCategory.attributes,
      attributesCount: sampleCategory.attributes?.length || 0
    });
  }
    
    // Import categories first
    const { categorySlugMap, existingSlugMap } = await importCategories(taxonomyData);
    
    // Import attributes and terms
    const attributeData = await importAttributes(taxonomyData);
    
    // Link categories to attributes
    await linkCategoriesToAttributes(taxonomyData, existingSlugMap, attributeData);
    
    console.log('🎉 Taxonomy import completed successfully!');
    
    // Print summary
    console.log('\n📈 Import Summary:');
    console.log(`   - Categories: ${categoryMap.size}`);
    console.log(`   - Attributes: ${attributeMap.size}`);
    
  } catch (error) {
    console.error('❌ Error importing taxonomy:', error);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const taxonomyFilePath = process.argv[2];
  
  if (!taxonomyFilePath) {
    console.error('❌ Please provide the path to the taxonomy JSON file');
    console.log('Usage: node import-shopify-taxonomy.js <taxonomy-file-path>');
    process.exit(1);
  }
  
  console.log('🚀 Starting Shopify taxonomy import...');
  console.log(`📁 Taxonomy file: ${taxonomyFilePath}`);
  
  await importTaxonomyData(taxonomyFilePath);
}

main(); 