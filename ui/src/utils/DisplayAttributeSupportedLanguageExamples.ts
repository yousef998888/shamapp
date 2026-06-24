/**
 * Example usage of DisplayAttributeSupportedLanguage utility functions
 * 
 * This file demonstrates how to use the multilingual display utilities
 * throughout your application for proper localization support.
 */

import { 
  getLocalizedText,
  getAttributeName,
  getAttributeTermName,
  getCategoryName,
  getProductTitle,
  getLocalizedDescription,
  formatAttributeValuePair,
  isRTL,
  getCurrentLanguage,
  getLocalizedNameAndDescription
} from './DisplayAtteibuteSupportedLanguage';

// Example data structures (as they come from your database)
const exampleAttribute = {
  id: '1',
  name: 'Brand',
  ar_name: 'العلامة التجارية',
  description: 'Product brand or manufacturer',
  ar_description: 'ماركة أو مصنع المنتج'
};

const exampleTerm = {
  id: '1',
  name: 'Samsung',
  ar_name: 'سامسونج',
  description: 'Samsung Electronics',
  ar_description: 'سامسونج إلكترونيكس'
};

const exampleCategory = {
  id: '1',
  name: 'Electronics',
  ar_name: 'إلكترونيات',
  description: 'Electronic devices and gadgets',
  ar_description: 'أجهزة إلكترونية وتقنية'
};

const exampleProduct = {
  id: '1',
  title: 'iPhone 15 Pro',
  ar_title: 'آيفون 15 برو',
  description: 'Latest iPhone with advanced features',
  ar_description: 'أحدث آيفون بميزات متقدمة'
};

/**
 * BASIC USAGE EXAMPLES
 */

// 1. Display attribute names
export function displayAttributeName() {
  // Returns: "Brand" (if English) or "العلامة التجارية" (if Arabic)
  const attributeName = getAttributeName(exampleAttribute);
  console.log('Attribute Name:', attributeName);
  return attributeName;
}

// 2. Display attribute term names
export function displayAttributeTermName() {
  // Returns: "Samsung" (if English) or "سامسونج" (if Arabic)
  const termName = getAttributeTermName(exampleTerm);
  console.log('Term Name:', termName);
  return termName;
}

// 3. Display category names
export function displayCategoryName() {
  // Returns: "Electronics" (if English) or "إلكترونيات" (if Arabic)
  const categoryName = getCategoryName(exampleCategory);
  console.log('Category Name:', categoryName);
  return categoryName;
}

// 4. Display product titles
export function displayProductTitle() {
  // Returns: "iPhone 15 Pro" (if English) or "آيفون 15 برو" (if Arabic)
  const productTitle = getProductTitle(exampleProduct);
  console.log('Product Title:', productTitle);
  return productTitle;
}

// 5. Display descriptions
export function displayDescription() {
  // Returns localized description
  const description = getLocalizedDescription(exampleProduct);
  console.log('Product Description:', description);
  return description;
}

/**
 * ADVANCED USAGE EXAMPLES
 */

// 6. Format attribute-value pairs (very useful for product details)
export function displayAttributeValuePair() {
  // Returns: "Brand: Samsung" (if English) or "العلامة التجارية: سامسونج" (if Arabic)
  const formattedPair = formatAttributeValuePair(exampleAttribute, exampleTerm);
  console.log('Attribute-Value Pair:', formattedPair);
  return formattedPair;
}

// 7. Custom separator for attribute pairs
export function displayAttributeValuePairCustomSeparator() {
  // Returns: "Brand - Samsung" (if English) or "العلامة التجارية - سامسونج" (if Arabic)
  const formattedPair = formatAttributeValuePair(exampleAttribute, exampleTerm, ' - ');
  console.log('Custom Separator Pair:', formattedPair);
  return formattedPair;
}

// 8. Get both name and description together
export function displayNameAndDescription() {
  const { name, description } = getLocalizedNameAndDescription(exampleCategory);
  console.log('Name:', name, 'Description:', description);
  return { name, description };
}

// 9. Use with custom options
export function displayWithCustomOptions() {
  // Force return empty string if translation missing
  const strictName = getLocalizedText(exampleAttribute, { 
    fieldPrefix: 'name',
    returnEmptyIfMissing: true 
  });
  
  // Use title field instead of name
  const productTitleCustom = getLocalizedText(exampleProduct, {
    fieldPrefix: 'title'
  });
  
  console.log('Strict Name:', strictName);
  console.log('Product Title Custom:', productTitleCustom);
  return { strictName, productTitleCustom };
}

/**
 * UTILITY FUNCTIONS EXAMPLES
 */

// 10. Check if current language is RTL
export function checkLanguageDirection() {
  const isRightToLeft = isRTL();
  console.log('Is RTL:', isRightToLeft);
  return isRightToLeft;
}

// 11. Get current language
export function getCurrentLang() {
  const currentLang = getCurrentLanguage();
  console.log('Current Language:', currentLang);
  return currentLang;
}

/**
 * REACT COMPONENT USAGE EXAMPLES
 */

// Example React component showing how to use in practice
export const ProductDetailsComponent = () => {
  // Simulated product data with attribute relationships
  const product = {
    id: '1',
    title: 'Samsung Galaxy S24',
    ar_title: 'سامسونج جالاكسي اس 24',
    description: 'Premium smartphone with AI features',
    ar_description: 'هاتف ذكي متميز بميزات ذكية',
    category: {
      name: 'Mobile Phones',
      ar_name: 'هواتف محمولة'
    },
    attribute_relationships: [
      {
        id: '1',
        attribute: {
          name: 'Brand',
          ar_name: 'العلامة التجارية'
        },
        term: {
          name: 'Samsung',
          ar_name: 'سامسونج'
        }
      },
      {
        id: '2',
        attribute: {
          name: 'Storage',
          ar_name: 'سعة التخزين'
        },
        term: {
          name: '256GB',
          ar_name: '256 جيجابايت'
        }
      }
    ]
  };

  return `
    <div className="${isRTL() ? 'rtl' : 'ltr'}">
      {/* Product Title */}
      <h1>{getProductTitle(product)}</h1>
      
      {/* Category */}
      <p>Category: {getCategoryName(product.category)}</p>
      
      {/* Description */}
      <p>{getLocalizedDescription(product)}</p>
      
      {/* Product Attributes */}
      <div>
        {product.attribute_relationships.map(rel => (
          <div key={rel.id}>
            {formatAttributeValuePair(rel.attribute, rel.term)}
          </div>
        ))}
      </div>
    </div>
  `;
};

/**
 * ERROR HANDLING EXAMPLES
 */

// 12. Handle null/undefined objects gracefully
export function handleNullObjects() {
  const nullAttributeName = getAttributeName(null); // Returns: ""
  const undefinedCategoryName = getCategoryName(undefined); // Returns: ""
  const emptyObjectName = getLocalizedText({}); // Returns: ""
  
  console.log('Null Attribute:', nullAttributeName);
  console.log('Undefined Category:', undefinedCategoryName);
  console.log('Empty Object:', emptyObjectName);
  
  return { nullAttributeName, undefinedCategoryName, emptyObjectName };
}

// 13. Handle objects with missing translations
export function handleMissingTranslations() {
  const partialObject = {
    name: 'English Only Name',
    // ar_name is missing
  };
  
  // Will fallback to English name if Arabic is not available
  const displayName = getAttributeName(partialObject);
  console.log('Partial Object Name:', displayName);
  return displayName;
}

/**
 * INTEGRATION EXAMPLES WITH EXISTING COMPONENTS
 */

// 14. Replace existing attribute displays
export function replaceExistingAttributeDisplay() {
  const product = {
    attribute_relationships: [
      {
        id: '1',
        attribute: { name: 'Color', ar_name: 'اللون' },
        term: { name: 'Blue', ar_name: 'أزرق' }
      }
    ]
  };

  // OLD WAY (not localized):
  // const oldDisplay = `${rel.attribute?.name}: ${rel.term?.name}`;
  
  // NEW WAY (properly localized):
  const newDisplay = product.attribute_relationships.map(rel => 
    formatAttributeValuePair(rel.attribute, rel.term)
  );
  
  console.log('Localized Attributes:', newDisplay);
  return newDisplay;
}

/**
 * PERFORMANCE CONSIDERATIONS
 */

// 15. Memoization example for React components
export function memoizedAttributeDisplay() {
  // In a React component, you might want to memoize these calls:
  /*
  const productTitle = useMemo(() => getProductTitle(product), [product]);
  const categoryName = useMemo(() => getCategoryName(category), [category]);
  const attributePairs = useMemo(() => 
    attributes.map(attr => formatAttributeValuePair(attr.attribute, attr.term)),
    [attributes]
  );
  */
  
  return 'See commented code above for React memoization example';
}

console.log('🌍 Multilingual Display Utility Examples Loaded!');
console.log('💡 Current Language:', getCurrentLanguage());
console.log('🔄 Is RTL:', isRTL()); 