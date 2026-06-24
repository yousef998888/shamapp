import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration - Update these with your actual credentials
// Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Specific categories to import (manually selected)
const SELECTED_CATEGORIES = [
  "Decor",
  "Sunglasses", 
  "Graphics Tablets",
  "Skin Care",
  "Furniture",
  "Shoes",
  "Clothing Tops",
  "Dresses",
  "One-Pieces",
  "Sports Bras",
  "Shirts",
  "Motorcycle Outerwear",
  "Laptops",
  "Watches",
  "Home Fragrances",
  "Mobile & Smart Phone Accessories",
  "Health & Beauty"
];

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

// Find a category by name in the taxonomy
function findCategoryByName(categories, categoryName, parentPath = '') {
  for (const category of categories) {
    const currentPath = parentPath ? `${parentPath} > ${category.name}` : category.name;
    
    if (category.name === categoryName) {
      return {
        ...category,
        full_path: currentPath,
        parent_path: parentPath
      };
    }
    
    // Recursively search children
    if (category.children && category.children.length > 0) {
      const found = findCategoryByName(category.children, categoryName, currentPath);
      if (found) return found;
    }
  }
  return null;
}

// Find a category by name recursively through all categories (including nested ones)
function findCategoryRecursively(categories, categoryName, parentPath = '') {
  for (const category of categories) {
    const currentPath = parentPath ? `${parentPath} > ${category.name}` : category.name;
    
    if (category.name === categoryName) {
      return {
        ...category,
        full_path: currentPath,
        parent_path: parentPath
      };
    }
    
    // Recursively search children
    if (category.children && category.children.length > 0) {
      const found = findCategoryRecursively(category.children, categoryName, currentPath);
      if (found) return found;
    }
  }
  return null;
}

// Get all parent categories for a given category (complete hierarchy)
function getParentCategories(categories, targetCategory, parentPath = '') {
  for (const category of categories) {
    const currentPath = parentPath ? `${parentPath} > ${category.name}` : category.name;
    
    // If this is our target category, return empty (no parents needed)
    if (category.name === targetCategory.name) {
      return [];
    }
    
    // If this category has children, check if our target is in there
    if (category.children && category.children.length > 0) {
      const found = findCategoryByName(category.children, targetCategory.name, currentPath);
      if (found) {
        // This category is a parent, add it and get its parents
        const parents = [{
          ...category,
          full_path: currentPath,
          parent_path: parentPath
        }];
        
        // Recursively get parents of this parent
        const grandParents = getParentCategories(category.children, targetCategory, currentPath);
        parents.push(...grandParents);
        return parents;
      }
    }
  }
  
  return [];
}

// Import attributes and terms for selected categories
async function importAttributesAndTerms(selectedCategories, taxonomyData) {
  console.log('🏷️ Starting attribute and term import...');
  
  const allAttributes = new Map();
  const allTerms = [];
  
  // Process ALL attributes from taxonomy (like original script)
  for (const attribute of taxonomyData.attributes) {
    if (!allAttributes.has(attribute.id)) {
      allAttributes.set(attribute.id, {
        ...attribute,
        source: 'taxonomy'
      });
    }
  }
  
  // Also collect attributes from selected categories for linking
  const selectedCategoryAttributes = new Map();
  for (const category of selectedCategories) {
    if (category.attributes) {
      for (const attribute of category.attributes) {
        if (!selectedCategoryAttributes.has(attribute.id)) {
          selectedCategoryAttributes.set(attribute.id, {
            ...attribute,
            category_name: category.name
          });
        }
      }
    }
  }
  
  console.log(`📊 Found ${allAttributes.size} unique attributes from taxonomy`);
  console.log(`📊 Found ${selectedCategoryAttributes.size} attributes from selected categories`);
  
  // Check for existing attributes (with batching to avoid URI too long)
  const attributeSlugs = Array.from(allAttributes.values()).map(attr => generateSlug(attr.name));
  const batchSize = 100; // Process in smaller batches
  const existingAttributes = [];
  
  console.log(`🔍 Checking existing attributes in batches of ${batchSize}...`);
  for (let i = 0; i < attributeSlugs.length; i += batchSize) {
    const batch = attributeSlugs.slice(i, i + batchSize);
    const { data: batchAttributes, error: checkAttrError } = await supabase
      .from('product_attributes')
      .select('id, slug, name')
      .in('slug', batch);
      
    if (checkAttrError) {
      console.error('❌ Error checking existing attributes batch:', checkAttrError);
      throw checkAttrError;
    }
    
    existingAttributes.push(...batchAttributes);
    console.log(`   📊 Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(attributeSlugs.length/batchSize)}`);
  }
  
  const existingAttributeSlugMap = new Map(existingAttributes.map(attr => [attr.slug, attr.id]));
  const newAttributes = Array.from(allAttributes.values()).filter(attr => 
    !existingAttributeSlugMap.has(generateSlug(attr.name))
  );
  
  console.log(`📝 Inserting ${newAttributes.length} new attributes...`);
  
  if (newAttributes.length > 0) {
    const attributeData = newAttributes.map(attr => ({
      id: generateId(),
      name: attr.name,
      slug: generateSlug(attr.name),
      description: `Attribute: ${attr.name}`,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    const { data: insertedAttributes, error: insertAttrError } = await supabase
      .from('product_attributes')
      .insert(attributeData)
      .select('id, slug, name');
      
    if (insertAttrError) {
      console.error('❌ Error inserting attributes:', insertAttrError);
      throw insertAttrError;
    }
    
    console.log(`✅ Successfully inserted ${insertedAttributes.length} attributes`);
    
    // Add inserted attributes to existing map
    insertedAttributes.forEach(attr => {
      existingAttributeSlugMap.set(attr.slug, attr.id);
    });
  }
  
  // Import attribute terms
  for (const [attrId, attr] of allAttributes) {
    const attributeSlug = generateSlug(attr.name);
    const attributeId = existingAttributeSlugMap.get(attributeSlug);
    
    if (attributeId && attr.values) {
      for (const value of attr.values) {
        allTerms.push({
          id: generateId(),
          attribute_id: attributeId,
          name: value.name,
          slug: generateSlug(value.name),
          description: `Term: ${value.name}`,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }
  }
  
  // Deduplicate terms by slug before checking database
  const uniqueTerms = [];
  const seenSlugs = new Set();
  for (const term of allTerms) {
    if (!seenSlugs.has(term.slug)) {
      seenSlugs.add(term.slug);
      uniqueTerms.push(term);
    }
  }
  
  console.log(`📝 Inserting ${uniqueTerms.length} unique attribute terms (${allTerms.length} total, ${allTerms.length - uniqueTerms.length} duplicates removed)...`);
  
  if (uniqueTerms.length > 0) {
    // Check for existing terms to avoid duplicates
    const termSlugs = uniqueTerms.map(term => term.slug);
    const batchSize = 100;
    const existingTerms = [];
    
    console.log(`🔍 Checking existing terms in batches of ${batchSize}...`);
    for (let i = 0; i < termSlugs.length; i += batchSize) {
      const batch = termSlugs.slice(i, i + batchSize);
      const { data: batchTerms, error: checkTermError } = await supabase
        .from('product_attribute_terms')
        .select('slug')
        .in('slug', batch);
        
      if (checkTermError) {
        console.error('❌ Error checking existing terms batch:', checkTermError);
        throw checkTermError;
      }
      
      existingTerms.push(...batchTerms);
      console.log(`   📊 Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(termSlugs.length/batchSize)}`);
    }
    
    const existingTermSlugs = new Set(existingTerms.map(term => term.slug));
    const newTerms = uniqueTerms.filter(term => !existingTermSlugs.has(term.slug));
    
    console.log(`📊 Found ${existingTerms.length} existing terms, inserting ${newTerms.length} new ones`);
    
    if (newTerms.length > 0) {
      const { error: insertTermsError } = await supabase
        .from('product_attribute_terms')
        .insert(newTerms);
        
      if (insertTermsError) {
        console.error('❌ Error inserting attribute terms:', insertTermsError);
        throw insertTermsError;
      }
      
      console.log(`✅ Successfully inserted ${newTerms.length} attribute terms`);
    } else {
      console.log('✅ All terms already exist, skipping insert');
    }
  }
  
  return existingAttributeSlugMap;
}

// Link categories to attributes
async function linkCategoriesToAttributes(selectedCategories, categorySlugMap, attributeSlugMap) {
  console.log('🔗 Linking categories to attributes...');
  
  const relationships = [];
  
  for (const category of selectedCategories) {
    const categorySlug = generateSlug(category.name);
    const categoryId = categorySlugMap.get(categorySlug);
    
    if (categoryId && category.attributes) {
      for (const attribute of category.attributes) {
        const attributeSlug = generateSlug(attribute.name);
        const attributeId = attributeSlugMap.get(attributeSlug);
        
        if (attributeId) {
          relationships.push({
            id: generateId(),
            category_id: categoryId,
            attribute_id: attributeId,
            created_at: new Date().toISOString()
          });
        }
      }
    }
  }
  
  console.log(`📝 Inserting ${relationships.length} category-attribute relationships...`);
  
  if (relationships.length > 0) {
    // Check for existing relationships first
    const categoryIds = [...new Set(relationships.map(r => r.category_id))];
    const attributeIds = [...new Set(relationships.map(r => r.attribute_id))];
    
    const { data: existingRels, error: checkRelError } = await supabase
      .from('category_attribute_relationships')
      .select('category_id, attribute_id')
      .in('category_id', categoryIds)
      .in('attribute_id', attributeIds);
      
    if (checkRelError) {
      console.error('❌ Error checking existing relationships:', checkRelError);
      throw checkRelError;
    }
    
    // Filter out existing relationships
    const existingSet = new Set(existingRels.map(r => `${r.category_id}-${r.attribute_id}`));
    const newRelationships = relationships.filter(r => 
      !existingSet.has(`${r.category_id}-${r.attribute_id}`)
    );
    
    console.log(`📊 Found ${existingRels.length} existing relationships, inserting ${newRelationships.length} new ones`);
    
    if (newRelationships.length > 0) {
      const { error: insertRelError } = await supabase
        .from('category_attribute_relationships')
        .insert(newRelationships);
        
      if (insertRelError) {
        console.error('❌ Error inserting relationships:', insertRelError);
        throw insertRelError;
      }
      
      console.log(`✅ Successfully inserted ${newRelationships.length} relationships`);
    } else {
      console.log('✅ All relationships already exist, skipping insert');
    }
  }
}

// Import categories to database
async function importCategories(categories) {
  console.log('🌳 Starting category import...');
  
  // Check for existing categories
  const slugs = categories.map(cat => generateSlug(cat.name));
  const { data: existingCategories, error: checkError } = await supabase
    .from('categories')
    .select('id, slug, name')
    .in('slug', slugs);
    
  if (checkError) {
    console.error('❌ Error checking existing categories:', checkError);
    throw checkError;
  }
  
  const existingSlugMap = new Map(existingCategories.map(cat => [cat.slug, cat.id]));
  const newCategories = categories.filter(cat => !existingSlugMap.has(generateSlug(cat.name)));
  
  console.log(`📊 Found ${existingCategories.length} existing categories`);
  console.log(`📝 Inserting ${newCategories.length} new categories...`);
  
  if (newCategories.length > 0) {
    const categoryData = newCategories.map(category => ({
      id: generateId(),
      name: category.name,
      slug: generateSlug(category.name),
      description: `Category: ${category.full_path || category.name}`,
      parent_id: null, // Will be set later
      is_active: true,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    const { data: insertedCategories, error: insertError } = await supabase
      .from('categories')
      .insert(categoryData)
      .select('id, slug, name');
      
    if (insertError) {
      console.error('❌ Error inserting categories:', insertError);
      throw insertError;
    }
    
    console.log(`✅ Successfully inserted ${insertedCategories.length} categories`);
    
    // Add inserted categories to existing map
    insertedCategories.forEach(cat => {
      existingSlugMap.set(cat.slug, cat.id);
    });
  }
  
  return existingSlugMap;
}

// Set up parent-child relationships
async function setupParentChildRelationships(categories, categorySlugMap) {
  console.log('🔗 Setting up parent-child relationships...');
  
  const updatePromises = [];
  
  // Create a map of category names to their full paths for easier lookup
  const categoryPathMap = new Map();
  categories.forEach(cat => {
    categoryPathMap.set(cat.name, cat.full_path || cat.name);
  });
  
  for (const category of categories) {
    const fullPath = category.full_path || category.name;
    const pathParts = fullPath.split(' > ');
    
    // If this category has a parent in the path
    if (pathParts.length > 1) {
      const parentName = pathParts[pathParts.length - 2]; // Get the parent name
      const parentSlug = generateSlug(parentName);
      const parentId = categorySlugMap.get(parentSlug);
      const childSlug = generateSlug(category.name);
      const childId = categorySlugMap.get(childSlug);
      
      if (parentId && childId && parentId !== childId) {
        updatePromises.push(
          supabase
            .from('categories')
            .update({ parent_id: parentId })
            .eq('id', childId)
        );
        console.log(`   🔗 Linking: ${category.name} → ${parentName}`);
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
}

async function importSpecificCategories(filePath) {
  try {
    console.log('🚀 Starting specific category import...');
    console.log(`📁 Reading file: ${filePath}`);
    
    // Read and parse the taxonomy file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const taxonomyData = JSON.parse(fileContent);
    
    console.log(`📊 Taxonomy loaded: ${taxonomyData.verticals.length} verticals`);
    
    // Find selected categories and their parents
    console.log('\n🔍 Finding selected categories and their parents...');
    const allCategoriesToImport = [];
    
    for (const selectedCategoryName of SELECTED_CATEGORIES) {
      console.log(`\n📂 Processing: ${selectedCategoryName}`);
      
      // Find the category in the taxonomy (search through all categories in the flat structure)
      let foundCategory = null;
      for (const vertical of taxonomyData.verticals) {
        // Search through all categories in this vertical (they're in a flat list)
        for (const category of vertical.categories) {
          if (category.name === selectedCategoryName) {
            foundCategory = {
              ...category,
              full_path: category.full_name || category.name,
              parent_path: ''
            };
            break;
          }
        }
        if (foundCategory) break;
      }
      
      if (!foundCategory) {
        console.log(`   ❌ Category not found: ${selectedCategoryName}`);
        continue;
      }
      
      console.log(`   ✅ Found: ${foundCategory.full_path}`);
      
      // Debug: Check if ancestors exist
      console.log(`   🔍 Debug - Ancestors: ${foundCategory.ancestors ? foundCategory.ancestors.length : 'none'}`);
      if (foundCategory.ancestors && foundCategory.ancestors.length > 0) {
        console.log(`   🔍 Debug - Ancestor names: ${foundCategory.ancestors.map(a => a.name).join(' > ')}`);
      }
      
      // Get parent categories from ancestors array (ancestors array does NOT include the category itself)
      const parentCategories = [];
      if (foundCategory.ancestors && foundCategory.ancestors.length > 0) {
        // Use all ancestors as they are the parent categories
        const parentAncestors = foundCategory.ancestors;
        console.log(`   🔍 Debug - Parent ancestors: ${parentAncestors.map(a => a.name).join(' > ')}`);
        for (const ancestor of parentAncestors) {
          let ancestorCategory = null;
          // Search through all categories in all verticals to find the full category object
          for (const vertical of taxonomyData.verticals) {
            for (const category of vertical.categories) {
              if (category.name === ancestor.name) {
                ancestorCategory = {
                  ...category,
                  full_path: category.full_name || category.name,
                  parent_path: ''
                };
                console.log(`   🔍 Debug - Found parent category: ${ancestor.name} in vertical: ${vertical.name}`);
                break;
              }
            }
            if (ancestorCategory) break;
          }
          if (!ancestorCategory) {
            console.log(`   🔍 Debug - Searching for parent: ${ancestor.name} - NOT FOUND in any vertical`);
          }
          if (ancestorCategory) {
            parentCategories.push(ancestorCategory);
            console.log(`   🔍 Debug - Found parent: ${ancestorCategory.name}`);
          } else {
            console.log(`   🔍 Debug - Parent not found: ${ancestor.name}`);
          }
        }
      }
      
      console.log(`   📋 Parents: ${parentCategories.length}`);
      parentCategories.forEach((parent, index) => {
        const indent = '      ' + '  '.repeat(index);
        console.log(`${indent}• ${parent.name} (${parent.full_path})`);
      });
      
      // Add parents and the selected category to import list
      allCategoriesToImport.push(...parentCategories, foundCategory);
    }
    
    // Remove duplicates
    const uniqueCategories = [];
    const seenNames = new Set();
    
    for (const category of allCategoriesToImport) {
      if (!seenNames.has(category.name)) {
        seenNames.add(category.name);
        uniqueCategories.push(category);
      }
    }
    
    console.log(`\n📊 Total categories to import: ${uniqueCategories.length}`);
    console.log(`   - Selected categories: ${SELECTED_CATEGORIES.length}`);
    console.log(`   - Parent categories: ${uniqueCategories.length - SELECTED_CATEGORIES.length}`);
    
    // Show the hierarchy
    console.log('\n🌳 Category hierarchy:');
    uniqueCategories.forEach(category => {
      const indent = category.parent_path ? '  ' : '';
      console.log(`${indent}• ${category.name}${category.parent_path ? ` (parent: ${category.parent_path})` : ''}`);
    });
    
    // Debug: Show which selected categories were found
    console.log('\n🔍 Debug - Selected categories found:');
    SELECTED_CATEGORIES.forEach(selectedName => {
      const found = uniqueCategories.find(cat => cat.name === selectedName);
      console.log(`${found ? '✅' : '❌'} ${selectedName} ${found ? `(${found.full_path})` : 'NOT FOUND'}`);
    });
    
    // Debug: Show attributes for each selected category
    console.log('\n🏷️ Debug - Attributes per selected category:');
    const selectedCategoriesOnly = uniqueCategories.filter(cat => 
      SELECTED_CATEGORIES.includes(cat.name)
    );
    selectedCategoriesOnly.forEach(category => {
      const attrCount = category.attributes ? category.attributes.length : 0;
      console.log(`• ${category.name}: ${attrCount} attributes`);
      if (category.attributes && category.attributes.length > 0) {
        category.attributes.slice(0, 3).forEach(attr => {
          console.log(`  - ${attr.name}`);
        });
        if (category.attributes.length > 3) {
          console.log(`  ... and ${category.attributes.length - 3} more`);
        }
      }
    });
    
    // Import to database
    console.log('\n📥 Starting database import...');
    const categorySlugMap = await importCategories(uniqueCategories);
    await setupParentChildRelationships(uniqueCategories, categorySlugMap);
    
    // Import attributes and terms for selected categories only
    const attributeSlugMap = await importAttributesAndTerms(uniqueCategories, taxonomyData);
    await linkCategoriesToAttributes(uniqueCategories, categorySlugMap, attributeSlugMap);
    
    console.log('\n🎉 Import complete!');
    console.log(`✅ Imported ${uniqueCategories.length} categories with proper hierarchy`);
    console.log(`✅ Imported attributes and terms for ${selectedCategoriesOnly.length} selected categories`);
    
  } catch (error) {
    console.error('❌ Error processing taxonomy:', error);
    throw error;
  }
}

// Main execution
const filePath = process.argv[2];
if (!filePath) {
  console.error('❌ Please provide a taxonomy file path');
  console.log('Usage: node import-specific-categories.js <taxonomy-file>');
  process.exit(1);
}

importSpecificCategories(filePath);
