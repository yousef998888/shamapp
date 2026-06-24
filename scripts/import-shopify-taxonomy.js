import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Configuration
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Utility functions
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function generateId() {
  return crypto.randomUUID();
}

// Category mapping cache
const categoryMap = new Map();
const attributeMap = new Map();

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
  
  // Check for existing categories and get their IDs
  console.log('🔍 Checking for existing categories...');
  const slugs = categories.map(cat => cat.slug);
  const { data: existingCategories, error: checkError } = await supabase
    .from('categories')
    .select('id, slug')
    .in('slug', slugs);
    
  if (checkError) {
    console.error('❌ Error checking existing categories:', checkError);
    throw checkError;
  }
  
  // Create a map of existing slugs to their IDs
  const existingSlugMap = new Map(existingCategories.map(cat => [cat.slug, cat.id]));
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
    });
  } else {
    console.log('✅ No new categories to insert');
  }
  
  // Now establish parent-child relationships using existing category IDs
  console.log('🔗 Establishing parent-child relationships...');
  const updatePromises = [];
  
  for (const vertical of taxonomyData.verticals) {
    for (const category of vertical.categories) {
      if (category.parent_id) {
        const childSlug = generateSlug(category.name);
        const parentSlug = generateSlug(taxonomyData.verticals
          .flatMap(v => v.categories)
          .find(c => c.id === category.parent_id)?.name || '');
        
        const childId = existingSlugMap.get(childSlug);
        const parentId = existingSlugMap.get(parentSlug);
        
        if (childId && parentId && childId !== parentId) {
          updatePromises.push(
            supabase
              .from('categories')
              .update({ parent_id: parentId })
              .eq('id', childId)
          );
        }
      }
    }
  }
  
  if (updatePromises.length > 0) {
    console.log(`📝 Updating ${updatePromises.length} parent-child relationships...`);
    const results = await Promise.all(updatePromises);
    
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('❌ Errors updating parent-child relationships:', errors);
      throw errors[0].error;
    }
    
    console.log('✅ Successfully updated parent-child relationships');
  }
  
  return existingSlugMap;
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
  
  // Check for existing attributes and get their IDs
  console.log('🔍 Checking for existing attributes...');
  const attributeSlugs = attributes.map(attr => attr.slug);
  const { data: existingAttributes, error: checkAttrError } = await supabase
    .from('product_attributes')
    .select('id, slug, name')
    .in('slug', attributeSlugs);
    
  if (checkAttrError) {
    console.error('❌ Error checking existing attributes:', checkAttrError);
    throw checkAttrError;
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
  
  // Check for existing attribute terms and skip duplicates
  console.log('🔍 Checking for existing attribute terms...');
  const termSlugs = updatedAttributeTerms.map(term => term.slug);
  const { data: existingTerms, error: checkTermError } = await supabase
    .from('product_attribute_terms')
    .select('slug')
    .in('slug', termSlugs);
    
  if (checkTermError) {
    console.error('❌ Error checking existing attribute terms:', checkTermError);
    throw checkTermError;
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

async function linkCategoriesToAttributes(taxonomyData, categorySlugMap, attributeData) {
  console.log('🔗 Linking categories to attributes...');
  
  const categoryAttributeRelationships = [];
  
  // Get all attributes from database to map by name
  const { data: allAttributes, error: attrError } = await supabase
    .from('product_attributes')
    .select('id, name, slug');
    
  if (attrError) {
    console.error('❌ Error fetching attributes:', attrError);
    throw attrError;
  }
  
  const attributeNameMap = new Map(allAttributes.map(attr => [attr.name, attr.id]));
  
  for (const vertical of taxonomyData.verticals) {
    for (const category of vertical.categories) {
      const categorySlug = generateSlug(category.name);
      const categoryId = categorySlugMap.get(categorySlug);
      
      if (categoryId && category.attributes) {
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
          }
        }
      }
    }
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
    
    // Import categories first
    const categorySlugMap = await importCategories(taxonomyData);
    
    // Import attributes and terms
    const attributeData = await importAttributes(taxonomyData);
    
    // Link categories to attributes
    await linkCategoriesToAttributes(taxonomyData, categorySlugMap, attributeData);
    
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

  console.log('taxonomyFilePath', taxonomyFilePath);
  
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