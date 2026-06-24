import i18n from '../i18n';

/**
 * Generic interface for multilingual objects that can have various field patterns
 */
interface MultilingualObject {
  // Standard name pattern (for attributes, categories, tags)
  name?: string;
  ar_name?: string;
  
  // Title pattern (for products)
  title?: string;
  ar_title?: string;
  
  // Description pattern
  description?: string;
  ar_description?: string;
  
  // Allow for any additional properties
  [key: string]: any;
}

/**
 * Options for customizing the display behavior
 */
interface DisplayOptions {
  /** Fallback language when current language content is missing */
  fallbackLanguage?: 'en' | 'ar';
  /** Whether to return empty string if no content found */
  returnEmptyIfMissing?: boolean;
  /** Custom field prefix (e.g., 'title' instead of 'name') */
  fieldPrefix?: 'name' | 'title' | 'description';
}

/**
 * Gets the appropriate language-specific field from a multilingual object
 * 
 * @param obj - The multilingual object containing name/ar_name or title/ar_title fields
 * @param options - Configuration options for display behavior
 * @returns The appropriate text based on current language
 * 
 * @example
 * ```typescript
 * // For attributes with name/ar_name
 * const attribute = { name: "Brand", ar_name: "العلامة التجارية" };
 * const displayName = getLocalizedText(attribute);
 * // Returns "Brand" if current language is 'en', "العلامة التجارية" if 'ar'
 * 
 * // For products with title/ar_title
 * const product = { title: "iPhone 15", ar_title: "آيفون 15" };
 * const displayTitle = getLocalizedText(product, { fieldPrefix: 'title' });
 * 
 * // For description fields
 * const category = { 
 *   name: "Electronics", 
 *   ar_name: "إلكترونيات",
 *   description: "Electronic devices",
 *   ar_description: "أجهزة إلكترونية"
 * };
 * const displayDesc = getLocalizedText(category, { fieldPrefix: 'description' });
 * ```
 */
export function getLocalizedText(
  obj: MultilingualObject | null | undefined,
  options: DisplayOptions = {}
): string {
  if (!obj) {
    return '';
  }

  const {
    fallbackLanguage = 'en',
    returnEmptyIfMissing = false,
    fieldPrefix = 'name'
  } = options;

  // Get current language from i18n
  const currentLanguage = i18n.language || 'en';
  const isArabic = currentLanguage === 'ar';

  // Determine field names based on prefix
  const primaryField = fieldPrefix;
  const arabicField = `ar_${fieldPrefix}`;

  // Get the appropriate field values
  const primaryValue = obj[primaryField];
  const arabicValue = obj[arabicField];

  // Return based on current language with fallback logic
  if (isArabic) {
    // Arabic is preferred
    if (arabicValue && arabicValue.trim()) {
      return arabicValue.trim();
    }
    // Fallback to primary language if Arabic not available
    if (primaryValue && primaryValue.trim()) {
      return primaryValue.trim();
    }
  } else {
    // English/other language is preferred
    if (primaryValue && primaryValue.trim()) {
      return primaryValue.trim();
    }
    // Fallback to Arabic if primary not available
    if (arabicValue && arabicValue.trim()) {
      return arabicValue.trim();
    }
  }

  // If no content found and returnEmptyIfMissing is false, return a default
  return returnEmptyIfMissing ? '' : (primaryValue || arabicValue || '');
}

/**
 * Specialized function for displaying attribute names
 * 
 * @param attribute - ProductAttribute object with name/ar_name
 * @returns Localized attribute name
 */
export function getAttributeName(attribute: MultilingualObject | null | undefined): string {
  return getLocalizedText(attribute, { fieldPrefix: 'name' });
}

/**
 * Specialized function for displaying attribute term names
 * 
 * @param term - ProductAttributeTerm object with name/ar_name
 * @returns Localized term name
 */
export function getAttributeTermName(term: MultilingualObject | null | undefined): string {
  return getLocalizedText(term, { fieldPrefix: 'name' });
}

/**
 * Specialized function for displaying category names
 * 
 * @param category - Category object with name/ar_name
 * @returns Localized category name
 */
export function getCategoryName(category: MultilingualObject | null | undefined): string {
  return getLocalizedText(category, { fieldPrefix: 'name' });
}

/**
 * Specialized function for displaying product titles
 * 
 * @param product - Product object with title/ar_title
 * @returns Localized product title
 */
export function getProductTitle(product: MultilingualObject | null | undefined): string {
  return getLocalizedText(product, { fieldPrefix: 'title' });
}

/**
 * Specialized function for displaying descriptions
 * 
 * @param obj - Any object with description/ar_description
 * @returns Localized description
 */
export function getLocalizedDescription(obj: MultilingualObject | null | undefined): string {
  return getLocalizedText(obj, { fieldPrefix: 'description' });
}

/**
 * Utility function to get both name and description in current language
 * 
 * @param obj - Object with name/ar_name and description/ar_description
 * @returns Object with localized name and description
 */
export function getLocalizedNameAndDescription(obj: MultilingualObject | null | undefined) {
  return {
    name: getLocalizedText(obj, { fieldPrefix: 'name' }),
    description: getLocalizedText(obj, { fieldPrefix: 'description' })
  };
}

/**
 * Check if the current language is RTL (Right-to-Left)
 * 
 * @returns true if current language is Arabic (RTL)
 */
export function isRTL(): boolean {
  const currentLanguage = i18n.language || 'en';
  return currentLanguage === 'ar';
}

/**
 * Get current language code
 * 
 * @returns Current language code ('en' or 'ar')
 */
export function getCurrentLanguage(): string {
  return i18n.language || 'en';
}

/**
 * Format attribute value display with proper localization
 * Useful for displaying attribute-value pairs in product details
 * 
 * @param attribute - The attribute object
 * @param term - The attribute term/value object
 * @returns Formatted string like "Brand: Samsung" or "العلامة التجارية: سامسونج"
 */
export function formatAttributeValuePair(
  attribute: MultilingualObject | null | undefined,
  term: MultilingualObject | null | undefined,
  separator: string = ': '
): string {
  const attributeName = getAttributeName(attribute);
  const termName = getAttributeTermName(term);
  
  if (!attributeName || !termName) {
    return '';
  }
  
  return `${attributeName}${separator}${termName}`;
}

/**
 * Default export - the main function for backward compatibility
 */
export default getLocalizedText;
