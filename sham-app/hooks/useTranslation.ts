import { Language } from '@/locales';
import { useLanguageContext } from '@/contexts/LanguageContext';

/**
 * Legacy hook that uses LanguageContext
 * This hook now delegates to the LanguageContext for global language state
 * which ensures all components re-render when language changes
 */
export const useTranslation = () => {
  return useLanguageContext();
};

// Define page names type
export type PageName = 
  | 'homePage'
  | 'authPages'
  | 'createListingPage'
  | 'productDetailPage'
  | 'searchPage'
  | 'searchResultsPage'
  | 'sellingPage'
  | 'buyingPage'
  | 'checkoutPage'
  | 'accountPage'
  | 'common'
  | 'inboxPage'
  | 'chatPage'
  | 'categoryPage'
  | 'sellerProfilePage'
  | 'listingSuccessPage'
  | 'explorePage'
  | 'helpCenterPage'
  | 'locationPickerPage'
  | 'favoritesPage';

/**
 * Hook for specific page translations
 * Returns translations for a specific page
 * Supports both object property access (backward compatible) and i18n.t() method
 */
export const usePageTranslation = (page: PageName) => {
  const { translations, language, changeLanguage, loading, isRTL, i18n } = useLanguageContext();
  
  const pageTranslations = translations?.[page] || {};
  
  // Create a proxy object that supports both property access and function call
  const t = new Proxy(pageTranslations as any, {
    get: (target, prop: string) => {
      // If accessing a property, return it directly
      if (prop in target) {
        return target[prop];
      }
      // If calling as function with a key, use i18n.t()
      if (typeof prop === 'string') {
        const fullKey = `${page}.${prop}`;
        return i18n.t(fullKey, { defaultValue: prop });
      }
      return target[prop];
    },
  });
  
  return {
    t,
    translations: pageTranslations,
    language,
    changeLanguage,
    loading,
    isRTL,
    i18n,
  };
};
