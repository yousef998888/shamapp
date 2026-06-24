import fetch from 'node-fetch';

// Mapping of taxonomy categories to DummyJSON categories
const TAXONOMY_MAPPING = {
  "Sunglasses": "sunglasses",
  "Skin Care": "skin-care", 
  "Furniture": "furniture",
  "Shoes": "mens-shoes",
  "Clothing Tops": "tops",
  "Dresses": "womens-dresses",
  "Laptops": "laptops",
  "Watches": "mens-watches",
  "Home Fragrances": "fragrances",
  "Mobile & Smart Phone Accessories": "mobile-accessories"
};

// Function to fetch products for a specific category
async function fetchProductsForCategory(dummyCategory) {
  try {
    const response = await fetch(`https://dummyjson.com/products/category/${dummyCategory}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch products for category: ${dummyCategory}`);
    }
    
    const data = await response.json();
    return data.products || [];
  } catch (error) {
    console.error(`❌ Error fetching products for ${dummyCategory}:`, error.message);
    return [];
  }
}

// Main function to fetch all products
async function fetchAllDummyProducts() {
  console.log('🚀 Starting to fetch DummyJSON products...');
  
  const result = {};
  const totalCategories = Object.keys(TAXONOMY_MAPPING).length;
  let processedCategories = 0;
  
  for (const [taxonomyCategory, dummyCategory] of Object.entries(TAXONOMY_MAPPING)) {
    console.log(`📦 Fetching products for ${taxonomyCategory} (${dummyCategory})...`);
    
    const products = await fetchProductsForCategory(dummyCategory);
    result[taxonomyCategory] = products;
    
    processedCategories++;
    console.log(`✅ Fetched ${products.length} products for ${taxonomyCategory} (${processedCategories}/${totalCategories})`);
    
    // Add a small delay to be nice to the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return result;
}

// Function to save the results to a JSON file
async function saveResultsToFile(data) {
  const fs = await import('fs/promises');
  const filePath = './dummy-products-by-taxonomy.json';
  
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    console.log(`💾 Results saved to ${filePath}`);
  } catch (error) {
    console.error('❌ Error saving file:', error.message);
  }
}

// Function to display summary
function displaySummary(data) {
  console.log('\n📊 Summary:');
  console.log('='.repeat(50));
  
  let totalProducts = 0;
  for (const [category, products] of Object.entries(data)) {
    console.log(`${category}: ${products.length} products`);
    totalProducts += products.length;
  }
  
  console.log('='.repeat(50));
  console.log(`Total products: ${totalProducts}`);
  console.log(`Total categories: ${Object.keys(data).length}`);
}

// Main execution
async function main() {
  try {
    const productsByTaxonomy = await fetchAllDummyProducts();
    
    // Display summary
    displaySummary(productsByTaxonomy);
    
    // Save to file
    await saveResultsToFile(productsByTaxonomy);
    
    console.log('\n🎉 All done! Products fetched and organized by taxonomy category.');
    
  } catch (error) {
    console.error('❌ Error in main execution:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
